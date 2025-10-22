import { NextResponse } from "next/server";
import { requireUser, assertSameOrg } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { computeStreak } from "@/lib/streak";
import { createRequestLogger, serializeError } from "@/lib/logger";

export async function POST(request: Request) {
  const { logger, requestId } = createRequestLogger(request, { route: "progress.heartbeat" });

  try {
    const session = await requireUser();
    const { id: userId, orgId } = session.user;
    const body = await request.json();
    const { lessonId, currentTime, duration, isVisible } = body ?? {};

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
    const clampedDuration = Math.max(lesson.durationS, duration, 1);
    const safeCurrent = Math.max(0, Math.min(Math.floor(currentTime), clampedDuration));

    const existing = await prisma.progress.findFirst({
      where: { userId, lessonId: lesson.id }
    });

    const watchedSeconds = Math.max(existing?.watchedSeconds ?? 0, safeCurrent);

    const progress = existing
      ? await prisma.progress.update({
          where: { id: existing.id },
          data: {
            watchedSeconds,
            lastHeartbeatAt: now
          }
        })
      : await prisma.progress.create({
          data: {
            userId,
            lessonId: lesson.id,
            watchedSeconds,
            lastHeartbeatAt: now
          }
        });

    let isComplete = progress.isComplete;
    const threshold = Math.round(clampedDuration * 0.95);
    if (lesson.requiresFullWatch && watchedSeconds >= threshold && isVisible !== false) {
      isComplete = true;
    }

    if (isComplete !== progress.isComplete) {
      await prisma.progress.update({
        where: { id: progress.id },
        data: { isComplete: isComplete }
      });
      await computeStreak(userId);
    }

    return NextResponse.json({ ok: true, watchedSeconds, isComplete, requestId });
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
