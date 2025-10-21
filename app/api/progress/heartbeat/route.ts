import { NextResponse } from "next/server";
import { requireUser, assertSameOrg } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { computeStreak } from "@/lib/streak";
import { progressByUserAndLesson } from "@/lib/prisma-helpers";

export async function POST(request: Request) {
  const session = await requireUser();
  const { id: userId, orgId } = session.user;
  const { lessonId, currentTime, duration, isVisible } = await request.json();

  if (!lessonId || typeof currentTime !== "number" || typeof duration !== "number") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { include: { course: true } } }
  });

  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  assertSameOrg(lesson.module.course.orgId, orgId);

  const now = new Date();
  const clampedDuration = Math.max(lesson.durationS, duration, 1);
  const safeCurrent = Math.max(0, Math.min(Math.floor(currentTime), clampedDuration));

  const existing = await prisma.progress.findUnique({
    where: progressByUserAndLesson(userId, lesson.id)
  });

  const watchedSeconds = Math.max(existing?.watchedSeconds ?? 0, safeCurrent);

  const progress = await prisma.progress.upsert({
    where: progressByUserAndLesson(userId, lesson.id),
    update: {
      watchedSeconds,
      lastHeartbeatAt: now
    },
    create: {
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
      where: progressByUserAndLesson(userId, lesson.id),
      data: { isComplete: isComplete }
    });
    await computeStreak(userId);
  }

  return NextResponse.json({ ok: true, watchedSeconds, isComplete });
}
