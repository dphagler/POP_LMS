import Link from "next/link";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { computeStreak } from "@/lib/streak";
import { CheckCircle2, Clock, Flame, Layers, Target } from "lucide-react";

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
      accent: "bg-primary/10 text-primary",
      icon: Flame,
    },
    {
      label: "Completion",
      value: hasAssignments ? `${percent}%` : "0%",
      helper: progressLabel,
      accent: "bg-secondary/10 text-secondary",
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
      accent: "bg-accent/10 text-accent",
      icon: Clock,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <section id="today" aria-labelledby="today-heading" className="card border border-base-300 bg-base-100 shadow-xl">
          <div className="card-body space-y-6">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <span className="rounded-full bg-primary/10 p-3 text-primary" aria-hidden>
                  <Flame className="h-6 w-6" />
                </span>
                <div className="space-y-2">
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Today</p>
                  <h2 id="today-heading" className="card-title text-2xl">Make today count</h2>
                  <p className="text-sm text-base-content/70">
                    Focus on the featured lesson to build confidence and keep your streak alive.
                  </p>
                </div>
              </div>
            </header>

            {hasAssignments ? (
              upNext ? (
                <div className="space-y-4 rounded-box border border-base-300 bg-base-200/60 p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-base-content/70">Featured lesson</p>
                      <p className="text-xl font-semibold">{upNext.title}</p>
                      <p className="flex items-center gap-2 text-sm text-base-content/70">
                        <Clock className="h-4 w-4" aria-hidden />
                        {formatLessonDuration(upNext.durationS)}
                      </p>
                    </div>
                    <Link
                      href={`/app/lesson/${upNext.id}`}
                      aria-label={`${upNextCta?.description ?? "Open lesson"}: ${upNext.title}`}
                      className="btn btn-primary"
                    >
                      {upNextCta?.label ?? "Start"}
                    </Link>
                  </div>
                  <div className="space-y-2">
                    <progress
                      className="progress progress-primary w-full"
                      value={upNextPercent}
                      max={100}
                      aria-label={`Progress for ${upNext.title}`}
                    />
                    <p className="text-sm text-base-content/70">
                      {upNextProgress?.isComplete
                        ? "Completed — review to stay sharp."
                        : upNextProgress && upNextProgress.watchedSeconds > 0
                          ? "Resume where you left off and keep building momentum."
                          : "Start fresh and make today count."}
                    </p>
                  </div>
                  {allLessonsComplete ? (
                    <p className="rounded-box border border-dashed border-base-300 bg-base-100 p-4 text-sm text-base-content/70">
                      You&apos;ve completed every assignment—review anytime to keep the streak alive.
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-3 rounded-box border border-dashed border-base-300 bg-base-200/50 p-6 text-sm text-base-content/70">
                  <p className="font-medium text-base-content">All caught up</p>
                  <p>Everything assigned is complete—new lessons will drop here when they&apos;re ready.</p>
                  <div className="space-y-2">
                    <div className="skeleton h-3 w-full" />
                    <div className="skeleton h-3 w-2/3" />
                  </div>
                  {isAdmin ? (
                    <Link href="/admin/assign" className="btn btn-outline btn-sm w-fit">
                      Assign a lesson
                    </Link>
                  ) : null}
                </div>
              )
            ) : (
              <div className="space-y-3 rounded-box border border-dashed border-base-300 bg-base-200/50 p-6 text-sm text-base-content/70">
                <p className="font-medium text-base-content">No lessons assigned yet</p>
                <p>We&apos;ll add your first lesson as soon as your organization assigns one.</p>
                <div className="space-y-2">
                  <div className="skeleton h-3 w-full" />
                  <div className="skeleton h-3 w-1/2" />
                </div>
                {isAdmin ? (
                  <Link href="/admin/assign" className="btn btn-outline btn-sm w-fit">
                    Assign a lesson
                  </Link>
                ) : null}
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3 rounded-box border border-base-300 bg-base-100 p-5 shadow-sm">
                <p className="text-sm font-semibold text-base-content">Momentum</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {summaryStats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <div key={stat.label} className="flex items-start gap-3 rounded-box bg-base-200/60 p-4">
                        <span className={`flex h-10 w-10 items-center justify-center rounded-full ${stat.accent}`} aria-hidden>
                          <Icon className="h-5 w-5" />
                        </span>
                        <div className="space-y-1">
                          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-base-content/70">
                            {stat.label}
                          </p>
                          <p className="text-lg font-semibold text-base-content">{stat.value}</p>
                          <p className="text-sm text-base-content/70">{stat.helper}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-3 rounded-box border border-base-300 bg-base-100 p-5 shadow-sm">
                <p className="text-sm font-semibold text-base-content">Assignment progress</p>
                <progress
                  className="progress progress-primary w-full"
                  value={hasAssignments ? percent : 0}
                  max={100}
                  aria-label="Overall assignment progress"
                />
                <p className="text-sm text-base-content/70">{progressLabel}</p>
              </div>
            </div>
          </div>
        </section>

        <section id="up-next" aria-labelledby="up-next-heading" className="card border border-base-300 bg-base-100 shadow-xl">
          <div className="card-body space-y-5">
            <header className="flex items-start gap-4">
              <span className="rounded-full bg-secondary/10 p-3 text-secondary" aria-hidden>
                <Layers className="h-6 w-6" />
              </span>
              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-secondary">Up next</p>
                <h2 id="up-next-heading" className="card-title text-xl">Stay in flow</h2>
                <p className="text-sm text-base-content/70">
                  Dive back into in-progress lessons or preview what&apos;s on deck.
                </p>
              </div>
            </header>

            <div className="space-y-4">
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
                  <article key={lesson.id} className="space-y-3 rounded-box border border-base-300 bg-base-100 p-5 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <p className="text-base font-semibold leading-tight text-base-content">{lesson.title}</p>
                        <p className="flex items-center gap-2 text-xs text-base-content/70">
                          <Clock className="h-3.5 w-3.5" aria-hidden />
                          {formatLessonDuration(lesson.durationS)}
                        </p>
                      </div>
                      <Link
                        href={`/app/lesson/${lesson.id}`}
                        aria-label={`${lessonCta.description}: ${lesson.title}`}
                        className="btn btn-secondary btn-sm"
                      >
                        {lessonCta.label}
                      </Link>
                    </div>
                    <div className="space-y-2">
                      <progress
                        className="progress progress-secondary w-full"
                        value={lessonPercent}
                        max={100}
                        aria-label={`Progress for ${lesson.title}`}
                      />
                      <p className="text-sm text-base-content/70">{helperText}</p>
                    </div>
                  </article>
                );
              })}

              {queueLessons.length === 0 ? (
                <div className="space-y-3 rounded-box border border-dashed border-base-300 bg-base-200/50 p-6 text-sm text-base-content/70">
                  <p className="font-medium text-base-content">No lessons queued</p>
                  {allLessonsComplete ? (
                    <p>Enjoy the breather—new lessons will appear once they&apos;re assigned.</p>
                  ) : hasAssignments ? (
                    <p>As soon as another lesson is assigned, it will land here for a quick resume.</p>
                  ) : (
                    <p>Lessons will appear here after your organization assigns them.</p>
                  )}
                  <div className="space-y-2">
                    <div className="skeleton h-3 w-full" />
                    <div className="skeleton h-3 w-3/4" />
                  </div>
                  {!hasAssignments && isAdmin ? (
                    <Link href="/admin/assign" className="btn btn-outline btn-sm w-fit">
                      Assign a lesson
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>

      <section id="completed" aria-labelledby="completed-heading" className="card border border-base-300 bg-base-100 shadow-xl lg:col-span-2">
        <div className="card-body space-y-6">
          <header className="flex items-start gap-4">
            <span className="rounded-full bg-success/10 p-3 text-success" aria-hidden>
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-success">Completed</p>
              <h2 id="completed-heading" className="card-title text-xl">Celebrate your wins</h2>
              <p className="text-sm text-base-content/70">
                Review recent lessons and showcase the badges you&apos;ve earned.
              </p>
            </div>
          </header>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-4 rounded-box border border-base-300 bg-base-100 p-5 shadow-sm">
              <p className="text-sm font-semibold text-base-content">Badges</p>
              {badges.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {badges.map((item) => (
                    <span key={item.id} className="badge badge-secondary badge-outline">
                      {item.badge.name}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="space-y-2 text-sm text-base-content/70">
                  <p>Earn badges by completing lessons and reflections.</p>
                  <div className="space-y-2">
                    <div className="skeleton h-3 w-1/2" />
                    <div className="skeleton h-3 w-2/3" />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <p className="text-sm font-semibold text-base-content">Latest activity</p>
              {completedLessons.map((item) => (
                <article key={item.id} className="space-y-3 rounded-box border border-base-300 bg-base-100 p-5 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <p className="font-semibold leading-tight text-base-content">{item.lesson.title}</p>
                      <p className="flex items-center gap-2 text-xs text-base-content/70">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Completed lesson
                      </p>
                    </div>
                    <Link
                      href={`/app/lesson/${item.lesson.id}`}
                      aria-label={`Review lesson: ${item.lesson.title}`}
                      className="btn btn-ghost btn-sm"
                    >
                      Review
                    </Link>
                  </div>
                  <div className="space-y-2">
                    <progress
                      className="progress progress-success w-full"
                      value={100}
                      max={100}
                      aria-label={`${item.lesson.title} completion`}
                    />
                    <p className="text-sm text-base-content/70">Great job! Keep the streak going.</p>
                  </div>
                </article>
              ))}

              {completedLessons.length === 0 ? (
                <div className="space-y-3 rounded-box border border-dashed border-base-300 bg-base-200/50 p-6 text-sm text-base-content/70">
                  <p className="font-medium text-base-content">No completed lessons yet</p>
                  <p>Lessons you finish will show up here for quick review.</p>
                  <div className="space-y-2">
                    <div className="skeleton h-3 w-full" />
                    <div className="skeleton h-3 w-2/3" />
                  </div>
                  {!hasAssignments && isAdmin ? (
                    <Link href="/admin/assign" className="btn btn-outline btn-sm w-fit">
                      Assign a lesson
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
