import { NextResponse } from "next/server";
import { requireUser, assertSameOrg } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { syncLessonCompletion } from "@/lib/lesson-progress";
import { createRequestLogger, serializeError } from "@/lib/logger";

export async function POST(request: Request) {
  const { logger, requestId } = createRequestLogger(request, { route: "progress.heartbeat" });

  try {
    const session = await requireUser();
    const { id: userId, orgId } = session.user;
    const body = await request.json();
    const { lessonId, currentTime, duration, isVisible, recordedAt, final } = body ?? {};

    if (!lessonId || typeof currentTime !== "number" || typeof duration !== "number") {
      logger.warn({
        event: "progress.heartbeat.invalid_payload",
        body
      });
      return NextResponse.json({ error: "Invalid payload", requestId }, { status: 400 });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: { include: { course: true } } }
    });

    if (!lesson) {
      logger.warn({
        event: "progress.heartbeat.lesson_not_found",
        lessonId
      });
      return NextResponse.json({ error: "Lesson not found", requestId }, { status: 404 });
    }

    assertSameOrg(lesson.module.course.orgId, orgId);

    const now = new Date();
    const recordedDate =
      typeof recordedAt === "number" && Number.isFinite(recordedAt)
        ? new Date(recordedAt)
        : null;
    const heartbeatTimestamp =
      recordedDate && !Number.isNaN(recordedDate.getTime()) ? recordedDate : now;
    const effectiveTimestamp = heartbeatTimestamp > now ? now : heartbeatTimestamp;
    const clampedDuration = Math.max(lesson.durationS, duration, 1);
    const safeCurrent = Math.max(0, Math.min(Math.floor(currentTime), clampedDuration));

    const existing = await prisma.progress.findFirst({
      where: { userId, lessonId: lesson.id }
    });

    const previousWatched = existing?.watchedSeconds ?? 0;
    const lastHeartbeatAt = existing?.lastHeartbeatAt ?? null;
    const targetAdvance = safeCurrent - previousWatched;
    const shouldCountProgress = isVisible !== false || final === true;

    let nextWatched = previousWatched;

    if (targetAdvance > 0 && shouldCountProgress) {
      if (!lastHeartbeatAt) {
        nextWatched = safeCurrent;
      } else {
        const secondsSinceLast = Math.max(
          0,
          Math.round((effectiveTimestamp.getTime() - lastHeartbeatAt.getTime()) / 1000)
        );
        const maxAdvance = Math.max(1, secondsSinceLast + 2);
        const allowedAdvance = Math.min(targetAdvance, maxAdvance);
        nextWatched = previousWatched + allowedAdvance;
      }
    }

    nextWatched = Math.max(0, Math.min(nextWatched, clampedDuration, safeCurrent));

    const nextHeartbeatAt =
      lastHeartbeatAt && lastHeartbeatAt > effectiveTimestamp ? lastHeartbeatAt : effectiveTimestamp;

    const progress = existing
      ? await prisma.progress.update({
          where: { id: existing.id },
          data: {
            watchedSeconds: nextWatched,
            lastHeartbeatAt: nextHeartbeatAt
          }
        })
      : await prisma.progress.create({
          data: {
            userId,
            lessonId: lesson.id,
            watchedSeconds: nextWatched,
            lastHeartbeatAt: nextHeartbeatAt
          }
        });

    const { isComplete } = await syncLessonCompletion({ userId, lessonId: lesson.id });

    return NextResponse.json({
      ok: true,
      watchedSeconds: progress.watchedSeconds,
      isComplete,
      requestId
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      logger.warn({
        event: "progress.heartbeat.invalid_json",
        error: serializeError(error)
      });
      return NextResponse.json({ error: "Invalid JSON body", requestId }, { status: 400 });
    }

    if (error instanceof Error && error.message === "Cross-organization access denied") {
      logger.warn({
        event: "progress.heartbeat.cross_org",
        error: serializeError(error)
      });
      return NextResponse.json({ error: "Forbidden", requestId }, { status: 403 });
    }

    logger.error({
      event: "progress.heartbeat.error",
      error: serializeError(error)
    });
    return NextResponse.json({ error: "An unexpected error occurred.", requestId }, { status: 500 });
  }
}
