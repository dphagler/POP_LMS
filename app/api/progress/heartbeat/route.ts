import { NextResponse } from "next/server";
import { z } from "zod";

import { assertSameOrg, getSessionUser } from "@/lib/authz";
import { getOrCreate, saveSegments } from "@/lib/db/progress";
import { coerceSegments, computeUniqueSeconds, mergeSegments, type Segment } from "@/lib/lesson/progress";
import { prisma } from "@/lib/prisma";
import { createRequestLogger, serializeError } from "@/lib/logger";

const MAX_BACKDATE_MS = 5_000;
const MAX_JUMP_SECONDS = 2 * 60 * 60;
const SEGMENT_PADDING = 2;

const REQUIRED_COMPLETION_PCT = (() => {
  const raw = process.env.LESSON_COMPLETE_PCT;
  const parsed = raw ? Number.parseFloat(raw) : NaN;

  if (!Number.isFinite(parsed)) {
    return 0.92;
  }

  return Math.min(Math.max(parsed, 0), 1);
})();

const heartbeatSchema = z.object({
  lessonId: z.string().min(1),
  provider: z.enum(["youtube", "cloudflare"]),
  t: z.number().finite(),
});

const segmentsEqual = (a: Segment[], b: Segment[]): boolean => {
  if (a.length !== b.length) {
    return false;
  }

  for (let index = 0; index < a.length; index += 1) {
    const [aStart, aEnd] = a[index];
    const [bStart, bEnd] = b[index] ?? [];

    if (aStart !== bStart || aEnd !== bEnd) {
      return false;
    }
  }

  return true;
};

export async function POST(request: Request) {
  const { logger, requestId } = createRequestLogger(request, { route: "progress.heartbeat" });

  try {
    const user = await getSessionUser();

    if (!user) {
      logger.warn({
        event: "progress.heartbeat.unauthorized",
      });
      return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401 });
    }

    const body = await request.json();
    const parsed = heartbeatSchema.safeParse(body);

    if (!parsed.success) {
      logger.warn({
        event: "progress.heartbeat.invalid_payload",
        issues: parsed.error.issues,
      });

      return NextResponse.json({ error: "Invalid payload", requestId }, { status: 400 });
    }

    const { lessonId, provider, t } = parsed.data;

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: { include: { course: true } } },
    });

    if (!lesson) {
      logger.warn({
        event: "progress.heartbeat.lesson_not_found",
        lessonId,
      });
      return NextResponse.json({ error: "Lesson not found", requestId }, { status: 404 });
    }

    assertSameOrg(lesson.module?.course.orgId, user.orgId ?? null);

    const progress = await getOrCreate(user.id, lessonId, { provider });

    const now = new Date();

    if (progress.lastTickAt && now.getTime() < progress.lastTickAt.getTime() - MAX_BACKDATE_MS) {
      logger.info({
        event: "progress.heartbeat.out_of_order",
        lastTickAt: progress.lastTickAt.toISOString(),
      });

      return NextResponse.json({
        ok: true,
        uniqueSeconds: progress.uniqueSeconds ?? 0,
        completed: Boolean(progress.completedAt),
        requestId,
      });
    }

    const rawSegments = coerceSegments(progress.segments ?? []);
    const canonicalSegments = rawSegments.length > 0 ? mergeSegments(rawSegments) : [];

    let segmentsChanged = !segmentsEqual(rawSegments, canonicalSegments);
    let nextSegments = canonicalSegments;

    const duration = Number.isFinite(lesson.durationS) ? Math.max(lesson.durationS ?? 0, 0) : 0;

    const previousMax = nextSegments.reduce((max, [, end]) => Math.max(max, end), 0);
    const safeT = Math.max(0, t);

    if (safeT > previousMax) {
      const jump = safeT - previousMax;

      if (jump > MAX_JUMP_SECONDS) {
        logger.warn({
          event: "progress.heartbeat.jump_rejected",
          jump,
          previousMax,
          t: safeT,
        });
      } else {
        const segmentEnd = duration > 0 ? Math.min(safeT, duration) : safeT;
        const segmentStart = Math.max(0, segmentEnd - SEGMENT_PADDING);

        if (segmentEnd > segmentStart) {
          nextSegments = mergeSegments([...nextSegments, [segmentStart, segmentEnd]]);
          segmentsChanged = true;
        }
      }
    }

    const hasStoredUnique =
      typeof progress.uniqueSeconds === "number" && Number.isFinite(progress.uniqueSeconds);
    let uniqueSeconds = hasStoredUnique ? Number(progress.uniqueSeconds) : 0;

    if (segmentsChanged || !hasStoredUnique) {
      uniqueSeconds = Math.round(computeUniqueSeconds(nextSegments, duration));
    }

    let completedAt = progress.completedAt ?? null;

    if (!completedAt && duration > 0 && uniqueSeconds / duration >= REQUIRED_COMPLETION_PCT) {
      completedAt = now;
    }

    const saved = await saveSegments({
      userId: user.id,
      lessonId,
      provider,
      tickAt: now,
      segments: segmentsChanged ? nextSegments : undefined,
      uniqueSeconds: segmentsChanged || !hasStoredUnique ? uniqueSeconds : undefined,
      maybeCompletedAt: completedAt && !progress.completedAt ? completedAt : undefined,
    });

    return NextResponse.json({
      ok: true,
      uniqueSeconds: saved.uniqueSeconds ?? uniqueSeconds ?? 0,
      completed: Boolean(saved.completedAt ?? completedAt),
      requestId,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      logger.warn({
        event: "progress.heartbeat.invalid_json",
        error: serializeError(error),
      });

      return NextResponse.json({ error: "Invalid JSON body", requestId }, { status: 400 });
    }

    if (error instanceof Error && error.message === "Cross-organization access denied") {
      logger.warn({
        event: "progress.heartbeat.cross_org",
        error: serializeError(error),
      });

      return NextResponse.json({ error: "Forbidden", requestId }, { status: 403 });
    }

    logger.error({
      event: "progress.heartbeat.error",
      error: serializeError(error),
    });

    return NextResponse.json({ error: "An unexpected error occurred.", requestId }, { status: 500 });
  }
}
