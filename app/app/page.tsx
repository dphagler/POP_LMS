import Link from "next/link";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { computeStreak } from "@/lib/streak";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Clock, Flame, Target } from "lucide-react";

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
  const engagedLessons = relevantProgresses.filter((item) => !item.isComplete && item.watchedSeconds > 0).length;
  const progressLabel = hasAssignments
    ? `${completion} of ${totalLessons} lessons complete`
    : "Progress will appear once a lesson is assigned.";

  const toneStyles = {
    primary: "bg-primary/10 text-primary",
    secondary: "bg-secondary/10 text-secondary",
    accent: "bg-accent/10 text-accent",
  } as const;

  const summaryStats = [
    {
      label: "Daily streak",
      value: `${streak} day${streak === 1 ? "" : "s"}`,
      helper:
        streak === 0
          ? "Start your first lesson to spark a streak."
          : streak >= 3
            ? "Excellent momentum—keep going."
            : "Keep logging in to build momentum.",
      tone: "primary" as const,
      icon: Flame,
    },
    {
      label: "Completion",
      value: hasAssignments ? `${percent}%` : "0%",
      helper: progressLabel,
      tone: "secondary" as const,
      icon: Target,
    },
    {
      label: "Active lessons",
      value:
        engagedLessons > 0
          ? `${engagedLessons} active`
          : queueLessons.length > 0
            ? `${queueLessons.length} queued`
            : allLessonsComplete
              ? "All caught up"
              : "Just getting started",
      helper:
        engagedLessons > 0
          ? "Finish in-progress lessons to earn more badges."
          : queueLessons.length > 0
            ? "Dive in to keep your momentum going."
            : allLessonsComplete
              ? "Everything assigned is complete—nice work!"
              : "Your organization will assign lessons soon.",
      tone: "accent" as const,
      icon: Clock,
    },
  ];

  return (
    <div className="space-y-6 xl:space-y-8">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <section id="today" aria-labelledby="today-card" className="h-full">
          <Card className="relative h-full overflow-hidden border border-base-300/70 bg-gradient-to-br from-primary/12 via-base-100 to-base-100 shadow-[0_35px_80px_-60px_rgba(79,70,229,0.7)]">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -left-10 top-10 h-56 w-56 rounded-full bg-primary/25 blur-3xl" />
              <div className="absolute bottom-0 right-0 h-72 w-72 translate-x-1/4 rounded-full bg-secondary/25 blur-3xl" />
            </div>
            <CardHeader className="relative gap-5 pb-6">
              <div className="space-y-3">
                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-base-100/80 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-primary">
                  Today
                </span>
                <CardTitle id="today-card" className="text-2xl font-semibold text-foreground sm:text-3xl">
                  Make today count
                </CardTitle>
                <CardDescription className="max-w-xl text-base text-muted-foreground">
                  Focus on the featured lesson to build confidence and keep your streak alive.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="relative flex flex-col gap-8 pt-0">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <div className="space-y-6">
                  {upNext ? (
                    <div className="space-y-6 rounded-3xl border border-white/50 bg-base-100/90 p-6 shadow-lg shadow-primary/20 backdrop-blur">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Featured lesson</p>
                          <p className="text-xl font-semibold text-foreground sm:text-2xl">{upNext.title}</p>
                          <p className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" aria-hidden />
                            {formatLessonDuration(upNext.durationS)}
                          </p>
                        </div>
                        <Button asChild size="lg" className="shrink-0">
                          <Link
                            href={`/app/lesson/${upNext.id}`}
                            aria-label={`${upNextCta?.description ?? "Open lesson"}: ${upNext.title}`}
                          >
                            {upNextCta?.label ?? "Start"}
                          </Link>
                        </Button>
                      </div>
                      <div className="space-y-3">
                        <Progress value={upNextPercent} aria-label={`Progress for ${upNext.title}`} />
                        <p className="text-sm text-muted-foreground">
                          {upNextProgress?.isComplete
                            ? "Completed — review to stay sharp."
                            : upNextProgress && upNextProgress.watchedSeconds > 0
                              ? "Resume where you left off and keep building momentum."
                              : "Start fresh and make today count."}
                        </p>
                      </div>
                      {allLessonsComplete ? (
                        <p className="rounded-2xl border border-dashed border-base-300/70 bg-base-100/70 p-4 text-sm text-muted-foreground">
                          You&apos;ve completed every assignment—review anytime to keep the streak alive.
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <div className="space-y-4 rounded-3xl border border-dashed border-base-300/70 bg-base-100/80 p-6 text-sm text-muted-foreground shadow-inner">
                      <p>🎯 You&apos;re all set for now. We&apos;ll add your next lesson as soon as it&apos;s assigned.</p>
                      {isAdmin ? (
                        <Button variant="outline" asChild>
                          <Link href="/admin/assign">Assign a lesson</Link>
                        </Button>
                      ) : null}
                    </div>
                  )}
                </div>
                <div className="space-y-4 rounded-3xl border border-base-300/70 bg-base-100/80 p-6 shadow-inner shadow-primary/5 backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Momentum</p>
                  <div className="grid gap-4">
                    {summaryStats.map((stat) => {
                      const Icon = stat.icon;
                      return (
                        <div
                          key={stat.label}
                          className="flex items-start gap-3 rounded-2xl border border-base-300/60 bg-base-100/90 p-4 shadow-sm shadow-primary/5"
                        >
                          <span
                            className={`flex h-10 w-10 items-center justify-center rounded-full ${toneStyles[stat.tone]}`}
                            aria-hidden
                          >
                            <Icon className="h-5 w-5" />
                          </span>
                          <div className="space-y-1">
                            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                              {stat.label}
                            </p>
                            <p className="text-lg font-semibold text-foreground">{stat.value}</p>
                            <p className="text-sm text-muted-foreground">{stat.helper}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="space-y-3 rounded-3xl border border-dashed border-base-300/70 bg-base-100/70 p-6">
                <p className="text-sm font-semibold text-foreground">Assignment progress</p>
                <Progress value={hasAssignments ? percent : 0} aria-label="Overall assignment progress" />
                <p className="text-sm text-muted-foreground">{progressLabel}</p>
              </div>
            </CardContent>
          </Card>
        </section>
        <section id="up-next" aria-labelledby="up-next-card">
          <Card className="h-full border border-base-300/60 bg-base-100/85 shadow-xl shadow-primary/10">
            <CardHeader className="gap-4 pb-6">
              <div className="space-y-2">
                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-secondary">
                  Up next
                </span>
                <CardTitle id="up-next-card" className="text-xl font-semibold text-foreground sm:text-2xl">
                  Stay in flow
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Dive back into in-progress lessons or preview what&apos;s on deck.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
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
                    className="space-y-4 rounded-3xl border border-base-300/60 bg-base-100/90 p-5 shadow-md shadow-primary/5 backdrop-blur"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <p className="text-base font-semibold leading-tight text-foreground">{lesson.title}</p>
                        <p className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" aria-hidden />
                          {formatLessonDuration(lesson.durationS)}
                        </p>
                      </div>
                      <Button variant="secondary" size="sm" asChild>
                        <Link href={`/app/lesson/${lesson.id}`} aria-label={`${lessonCta.description}: ${lesson.title}`}>
                          {lessonCta.label}
                        </Link>
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Progress value={lessonPercent} aria-label={`Progress for ${lesson.title}`} />
                      <p className="text-sm text-muted-foreground">{helperText}</p>
                    </div>
                  </div>
                );
              })}
              {queueLessons.length === 0 && (
                <div className="space-y-4 rounded-3xl border border-dashed border-base-300/70 bg-base-100/80 p-6 text-sm text-muted-foreground shadow-inner">
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
      </div>
      <section id="completed" aria-labelledby="completed-card">
        <Card className="border border-base-300/60 bg-base-100/85 shadow-xl shadow-primary/10">
          <CardHeader className="gap-4 pb-6">
            <div className="space-y-2">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-success">
                Completed
              </span>
              <CardTitle id="completed-card" className="text-xl font-semibold text-foreground sm:text-2xl">
                Celebrate your wins
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Review recent lessons and showcase the badges you&apos;ve earned.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-6 pt-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div className="space-y-4 rounded-3xl border border-base-300/60 bg-base-100/90 p-6 shadow-md shadow-primary/5">
              <p className="text-sm font-semibold text-foreground">Badges</p>
              {badges.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {badges.map((item) => (
                    <Badge key={item.id} variant="secondary" className="rounded-full border-none bg-primary/10 text-primary">
                      {item.badge.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Earn badges by completing lessons and reflections.</p>
              )}
            </div>
            <div className="space-y-4">
              <p className="text-sm font-semibold text-foreground">Latest activity</p>
              {completedLessons.map((item) => (
                <div
                  key={item.id}
                  className="space-y-4 rounded-3xl border border-base-300/60 bg-base-100/90 p-5 shadow-md shadow-primary/5 backdrop-blur"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <p className="font-semibold leading-tight text-foreground">{item.lesson.title}</p>
                      <p className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Completed lesson
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/app/lesson/${item.lesson.id}`} aria-label={`Review lesson: ${item.lesson.title}`}>
                        Review
                      </Link>
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Progress value={100} aria-label={`${item.lesson.title} completion`} />
                    <p className="text-sm text-muted-foreground">Great job! Keep the streak going.</p>
                  </div>
                </div>
              ))}
              {completedLessons.length === 0 && (
                <div className="space-y-4 rounded-3xl border border-dashed border-base-300/70 bg-base-100/80 p-6 text-sm text-muted-foreground shadow-inner">
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
