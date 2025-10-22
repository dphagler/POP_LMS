import Link from "next/link";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { computeStreak } from "@/lib/streak";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, CheckCircle2, Clock, PlayCircle, Target } from "lucide-react";

import type { Lesson as LessonModel, Progress as ProgressModel } from "@prisma/client";

function getLessonCta(progress: ProgressModel | undefined) {
  if (progress?.isComplete) {
    return { label: "Review", description: "Review lesson" };
  }

  if (progress && progress.watchedSeconds > 0) {
    return { label: "Resume", description: "Resume lesson" };
  }

  return { label: "Start", description: "Start lesson" };
}

function getLessonProgressPercent(lesson: LessonModel, progress: ProgressModel | undefined) {
  if (!progress) {
    return 0;
  }

  if (progress.isComplete) {
    return 100;
  }

  if (!lesson.durationS) {
    return progress.watchedSeconds > 0 ? 50 : 0;
  }

  const ratio = (progress.watchedSeconds / lesson.durationS) * 100;
  return Math.max(0, Math.min(100, Math.round(ratio)));
}

function formatLessonDuration(durationS: number) {
  if (!durationS) {
    return "Under a minute";
  }

  if (durationS < 60) {
    return `${durationS} sec`;
  }

  const minutes = Math.round(durationS / 60);
  return `${minutes} min${minutes === 1 ? "" : "s"}`;
}

export default async function LearnerDashboard() {
  const session = await requireUser();
  const { id: userId, orgId } = session.user;

  if (!orgId) {
    throw new Error("Organization not found for learner");
  }

  const [assignments, badges, progresses] = await Promise.all([
    prisma.assignment.findMany({
      where: {
        orgId,
        enrollments: {
          some: { userId }
        }
      },
      include: {
        module: {
          include: {
            lessons: true,
            course: true
          }
        },
        course: {
          include: {
            modules: {
              include: {
                lessons: true
              }
            }
          }
        }
      }
    }),
    prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true }
    }),
    prisma.progress.findMany({
      where: { userId },
      include: { lesson: true }
    })
  ]);

  const lessonMap = new Map<string, LessonModel>();

  assignments.forEach((assignment) => {
    if (assignment.module) {
      assignment.module.lessons.forEach((lesson) => {
        lessonMap.set(lesson.id, lesson);
      });
    } else if (assignment.course) {
      assignment.course.modules.forEach((module) => {
        module.lessons.forEach((lesson) => {
          lessonMap.set(lesson.id, lesson);
        });
      });
    }
  });

  const lessons = Array.from(lessonMap.values());
  const lessonIds = new Set(lessons.map((lesson) => lesson.id));
  const relevantProgresses = progresses.filter((item) => lessonIds.has(item.lessonId));

  const streak = await computeStreak(userId);
  const progressByLesson = new Map(relevantProgresses.map((item) => [item.lessonId, item]));
  const prioritizedLessons = [...lessons].sort((a, b) => {
    const progressA = progressByLesson.get(a.id);
    const progressB = progressByLesson.get(b.id);

    const orderA = progressA?.isComplete
      ? 2
      : progressA && progressA.watchedSeconds > 0
        ? 0
        : 1;
    const orderB = progressB?.isComplete
      ? 2
      : progressB && progressB.watchedSeconds > 0
        ? 0
        : 1;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    return a.title.localeCompare(b.title);
  });
  const sortedLessons = prioritizedLessons.slice(0, 5);
  const upNext = sortedLessons[0];
  const completion = relevantProgresses.reduce((acc, item) => acc + (item.isComplete ? 1 : 0), 0);
  const totalLessons = lessons.length;
  const percent = totalLessons === 0 ? 0 : Math.round((completion / totalLessons) * 100);
  const completedLessons = relevantProgresses
    .filter((item) => item.isComplete)
    .sort((a, b) => a.lesson.title.localeCompare(b.lesson.title))
    .slice(0, 6);
  const isAdmin = session.user.role === "ADMIN";
  const allLessonsComplete = totalLessons > 0 && completion === totalLessons;
  const upNextProgress = upNext ? progressByLesson.get(upNext.id) : undefined;
  const upNextCta = upNext ? getLessonCta(upNextProgress) : null;
  const hasAssignments = totalLessons > 0;
  const upNextPercent = upNext ? getLessonProgressPercent(upNext, upNextProgress) : 0;
  const queueLessons = sortedLessons.filter((lesson) => lesson.id !== upNext?.id);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section id="today" aria-labelledby="today-card" className="lg:col-span-1">
        <Card className="h-full">
          <CardHeader className="pb-0">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-500/10 text-sky-500">
                <Target className="h-6 w-6" aria-hidden />
              </span>
              <div>
                <CardTitle id="today-card" className="text-xl font-semibold">
                  Today
                </CardTitle>
                <CardDescription className="text-sm text-slate-400">
                  Focus on today&apos;s featured lesson to keep your streak strong.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex h-full flex-col gap-6 pt-6">
            <div className="flex items-center justify-between">
              <Badge variant="secondary">Streak: {streak} days</Badge>
              {hasAssignments ? (
                <p className="text-sm text-slate-400" aria-live="polite">
                  {percent}% complete
                </p>
              ) : null}
            </div>
            <div className="rounded-2xl border border-slate-200/10 bg-white/40 p-5 shadow-sm backdrop-blur dark:border-slate-800/40 dark:bg-slate-900/30">
              {upNext ? (
                <div className="flex flex-col gap-5">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Featured lesson</p>
                    <p className="text-lg font-semibold leading-tight text-slate-900 dark:text-slate-50">{upNext.title}</p>
                    <p className="flex items-center gap-1 text-sm text-slate-400">
                      <Clock className="h-4 w-4" aria-hidden />
                      {formatLessonDuration(upNext.durationS)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Progress
                      value={upNextPercent}
                      indicatorClassName="bg-gradient-to-r from-sky-400 to-indigo-500"
                      aria-label={`Progress for ${upNext.title}`}
                    />
                    <p className="text-sm text-slate-400">
                      {upNextProgress?.isComplete
                        ? "Completed — review to stay sharp."
                        : upNextProgress && upNextProgress.watchedSeconds > 0
                          ? "Resume where you left off and keep building momentum."
                          : "Start fresh and make today count."}
                    </p>
                  </div>
                  <Button asChild>
                    <Link
                      href={`/app/lesson/${upNext.id}`}
                      aria-label={`${upNextCta?.description ?? "Open lesson"}: ${upNext.title}`}
                    >
                      {upNextCta?.label ?? "Start"}
                    </Link>
                  </Button>
                  {allLessonsComplete && (
                    <p className="text-sm text-slate-400">
                      You&apos;ve completed every assignment—review anytime to keep the streak alive.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4 text-sm text-slate-400">
                  <p>🎯 You&apos;re all set for now. We&apos;ll add your next lesson as soon as it&apos;s assigned.</p>
                  {isAdmin ? (
                    <Button variant="outline" asChild>
                      <Link href="/admin/assign">Assign a lesson</Link>
                    </Button>
                  ) : null}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Assignment progress</p>
              <Progress
                value={hasAssignments ? percent : 0}
                indicatorClassName="bg-gradient-to-r from-sky-400 to-indigo-500"
                aria-label="Overall assignment progress"
              />
              <p className="text-sm text-slate-400">
                {hasAssignments
                  ? `${completion} of ${totalLessons} lessons complete`
                  : "Progress will appear once a lesson is assigned."}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section id="up-next" aria-labelledby="resume-card" className="lg:col-span-1">
        <Card className="h-full">
          <CardHeader className="pb-0">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-500">
                <PlayCircle className="h-6 w-6" aria-hidden />
              </span>
              <div>
                <CardTitle id="resume-card" className="text-xl font-semibold">
                  Up next
                </CardTitle>
                <CardDescription className="text-sm text-slate-400">
                  Dive back into in-progress lessons or preview what&apos;s on deck.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {queueLessons.map((lesson) => {
              const lessonProgress = progressByLesson.get(lesson.id);
              const lessonCta = getLessonCta(lessonProgress);
              const lessonPercent = getLessonProgressPercent(lesson, lessonProgress);
              const helperText =
                lessonCta.label === "Resume"
                  ? "Pick up where you paused."
                  : lessonCta.label === "Review"
                    ? "Revisit this lesson anytime."
                    : "Preview what&apos;s coming up.";

              return (
                <div
                  key={lesson.id}
                  className="space-y-4 rounded-2xl border border-slate-200/10 bg-white/40 p-5 shadow-sm backdrop-blur dark:border-slate-800/40 dark:bg-slate-900/30"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="font-semibold leading-tight text-slate-900 dark:text-slate-50">{lesson.title}</p>
                      <p className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="h-3.5 w-3.5" aria-hidden />
                        {formatLessonDuration(lesson.durationS)}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link
                        href={`/app/lesson/${lesson.id}`}
                        aria-label={`${lessonCta.description}: ${lesson.title}`}
                      >
                        {lessonCta.label}
                      </Link>
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Progress
                      value={lessonPercent}
                      indicatorClassName="bg-gradient-to-r from-sky-400 to-indigo-500"
                      aria-label={`Progress for ${lesson.title}`}
                    />
                    <p className="text-sm text-slate-400">{helperText}</p>
                  </div>
                </div>
              );
            })}
            {queueLessons.length === 0 && (
              <div className="space-y-4 rounded-2xl border border-dashed border-slate-200/30 bg-white/20 p-6 text-sm text-slate-400 shadow-sm backdrop-blur dark:border-slate-800/40 dark:bg-slate-900/20">
                <p>🔜 No other lessons waiting in your queue.</p>
                {allLessonsComplete ? (
                  <p>Enjoy the breather—new lessons will appear here once they&apos;re assigned.</p>
                ) : hasAssignments ? (
                  <p>Once another lesson is assigned, it will land here for a quick resume.</p>
                ) : (
                  <>
                    <p>As soon as lessons are assigned, you&apos;ll see them here.</p>
                    {isAdmin ? (
                      <Button variant="outline" asChild>
                        <Link href="/admin/assign">Assign a lesson</Link>
                      </Button>
                    ) : null}
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section id="completed" aria-labelledby="review-card" className="lg:col-span-1">
        <Card className="h-full">
          <CardHeader className="pb-0">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                <CheckCircle className="h-6 w-6" aria-hidden />
              </span>
              <div>
                <CardTitle id="review-card" className="text-xl font-semibold">
                  Completed
                </CardTitle>
                <CardDescription className="text-sm text-slate-400">
                  Review recent wins and celebrate your momentum.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex h-full flex-col gap-6 pt-6">
            <div className="space-y-4 rounded-2xl border border-slate-200/10 bg-white/40 p-5 shadow-sm backdrop-blur dark:border-slate-800/40 dark:bg-slate-900/30">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Badges</p>
              {badges.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {badges.map((item) => (
                    <Badge key={item.id} variant="outline">
                      {item.badge.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">
                  Earn badges by completing lessons and reflections.
                </p>
              )}
            </div>
            <div className="space-y-4">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Latest activity</p>
              {completedLessons.map((item) => (
                <div
                  key={item.id}
                  className="space-y-4 rounded-2xl border border-slate-200/10 bg-white/40 p-5 shadow-sm backdrop-blur dark:border-slate-800/40 dark:bg-slate-900/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-semibold leading-tight text-slate-900 dark:text-slate-50">{item.lesson.title}</p>
                      <p className="flex items-center gap-1 text-xs text-slate-400">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Completed lesson
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link
                        href={`/app/lesson/${item.lesson.id}`}
                        aria-label={`Review lesson: ${item.lesson.title}`}
                      >
                        Review
                      </Link>
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Progress
                      value={100}
                      indicatorClassName="bg-gradient-to-r from-sky-400 to-indigo-500"
                      aria-label={`${item.lesson.title} completion`}
                    />
                    <p className="text-sm text-slate-400">Great job! Keep the streak going.</p>
                  </div>
                </div>
              ))}
              {completedLessons.length === 0 && (
                <div className="space-y-4 rounded-2xl border border-dashed border-slate-200/30 bg-white/20 p-6 text-sm text-slate-400 shadow-sm backdrop-blur dark:border-slate-800/40 dark:bg-slate-900/20">
                  <p>✅ Lessons you finish will show up here for quick review.</p>
                  {!hasAssignments && isAdmin ? (
                    <Button variant="outline" asChild>
                      <Link href="/admin/assign">Assign a lesson</Link>
                    </Button>
                  ) : null}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
