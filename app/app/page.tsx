import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { computeStreak } from "@/lib/streak";
import { CheckCircle2, Clock, PlayCircle, Target } from "lucide-react";

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
  const progressLabel = hasAssignments
    ? `${completion} of ${totalLessons} lessons complete`
    : "Progress will appear once a lesson is assigned.";

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Your learning</h1>
        <p className="text-sm text-base-content/70">
          Track today&apos;s priorities, keep momentum with what&apos;s next, and revisit your wins.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section
          id="today"
          aria-labelledby="today-heading"
          className="card rounded-2xl border border-base-200 bg-base-100 shadow-sm"
        >
          <div className="card-body space-y-5 p-6">
            <header className="flex items-start gap-3">
              <span className="rounded-full bg-primary/10 p-2.5 text-primary" aria-hidden>
                <Target className="h-5 w-5" />
              </span>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Today</p>
                <h2 id="today-heading" className="card-title text-xl">
                  Make today count
                </h2>
                <p className="text-sm text-base-content/70">
                  Focus on the priority assignment to keep your streak alive.
                </p>
              </div>
            </header>

            <ul className="list-none space-y-3 p-0">
              {hasAssignments ? (
                upNext ? (
                  <li>
                    <article className="space-y-3 rounded-box border border-base-300 bg-base-200/60 p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-base-content">{upNext.title}</p>
                          <p className="flex items-center gap-2 text-xs text-base-content/70">
                            <Clock className="h-3.5 w-3.5" aria-hidden />
                            {formatLessonDuration(upNext.durationS)}
                          </p>
                        </div>
                        <Button
                          asChild
                          size="sm"
                          aria-label={`${upNextCta?.description ?? "Open lesson"}: ${upNext.title}`}
                        >
                          <Link href={`/app/lesson/${upNext.id}`}>
                            {upNextCta?.label ?? "Start"}
                          </Link>
                        </Button>
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
                              ? "Resume where you left off to build momentum."
                              : "Start fresh and make today count."}
                        </p>
                      </div>
                    </article>
                  </li>
                ) : (
                  <li>
                    <div className="space-y-3 rounded-box border border-dashed border-base-300 bg-base-200/50 p-6 text-sm text-base-content/70">
                      <p className="font-medium text-base-content">All caught up</p>
                      <p>Everything assigned is complete—new lessons will drop here when they&apos;re ready.</p>
                      <div className="space-y-2">
                        <div className="skeleton h-3 w-full" />
                        <div className="skeleton h-3 w-2/3" />
                      </div>
                      {isAdmin ? (
                        <Button asChild size="sm" variant="outline" className="w-fit">
                          <Link href="/admin/assign">Assign a lesson</Link>
                        </Button>
                      ) : null}
                    </div>
                  </li>
                )
              ) : (
                <li>
                  <div className="space-y-3 rounded-box border border-dashed border-base-300 bg-base-200/50 p-6 text-sm text-base-content/70">
                    <p className="font-medium text-base-content">No assignments yet</p>
                    <p>We&apos;ll add your first lesson as soon as your organization assigns one.</p>
                    <div className="space-y-2">
                      <div className="skeleton h-3 w-full" />
                      <div className="skeleton h-3 w-1/2" />
                    </div>
                    {isAdmin ? (
                      <Button asChild size="sm" variant="outline" className="w-fit">
                        <Link href="/admin/assign">Assign a lesson</Link>
                      </Button>
                    ) : null}
                  </div>
                </li>
              )}
            </ul>

            <div className="space-y-2 rounded-box border border-base-300 bg-base-100 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-base-content">Overall progress</p>
                <span className="text-sm text-base-content/70">{hasAssignments ? `${percent}% complete` : "0% complete"}</span>
              </div>
              <progress
                className="progress progress-primary w-full"
                value={hasAssignments ? percent : 0}
                max={100}
                aria-label="Overall assignment progress"
              />
              <p className="text-xs text-base-content/70">{progressLabel}</p>
              <p className="text-xs text-base-content/70">
                Daily streak: <span className="font-medium text-base-content">{streak}</span> day{streak === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </section>

        <section
          id="up-next"
          aria-labelledby="up-next-heading"
          className="card rounded-2xl border border-base-200 bg-base-100 shadow-sm"
        >
          <div className="card-body space-y-5 p-6">
            <header className="flex items-start gap-3">
              <span className="rounded-full bg-secondary/10 p-2.5 text-secondary" aria-hidden>
                <PlayCircle className="h-5 w-5" />
              </span>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-secondary">Up next</p>
                <h2 id="up-next-heading" className="card-title text-xl">
                  Keep your flow
                </h2>
                <p className="text-sm text-base-content/70">
                  Jump back into in-progress lessons or preview what&apos;s coming up.
                </p>
              </div>
            </header>

            <ul className="list-none space-y-3 p-0">
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
                  <li key={lesson.id}>
                    <article className="space-y-3 rounded-box border border-base-300 bg-base-100 p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-base-content">{lesson.title}</p>
                          <p className="flex items-center gap-2 text-xs text-base-content/70">
                            <Clock className="h-3.5 w-3.5" aria-hidden />
                            {formatLessonDuration(lesson.durationS)}
                          </p>
                        </div>
                        <Button
                          asChild
                          size="sm"
                          variant={lessonCta.label === "Review" ? "outline" : "primary"}
                          aria-label={`${lessonCta.description}: ${lesson.title}`}
                        >
                          <Link href={`/app/lesson/${lesson.id}`}>{lessonCta.label}</Link>
                        </Button>
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
                  </li>
                );
              })}

              {queueLessons.length === 0 ? (
                <li>
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
                      <Button asChild size="sm" variant="outline" className="w-fit">
                        <Link href="/admin/assign">Assign a lesson</Link>
                      </Button>
                    ) : null}
                  </div>
                </li>
              ) : null}
            </ul>
          </div>
        </section>

        <section
          id="completed"
          aria-labelledby="completed-heading"
          className="card rounded-2xl border border-base-200 bg-base-100 shadow-sm lg:col-span-2"
        >
          <div className="card-body space-y-6 p-6">
            <header className="flex items-start gap-3">
              <span className="rounded-full bg-success/10 p-2.5 text-success" aria-hidden>
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-success">Completed</p>
                <h2 id="completed-heading" className="card-title text-xl">
                  Celebrate your wins
                </h2>
                <p className="text-sm text-base-content/70">
                  Review recent lessons and show off the badges you&apos;ve earned.
                </p>
              </div>
            </header>

            <div className="space-y-5">
              <div className="space-y-3 rounded-box border border-base-300 bg-base-100 p-5">
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
                <ul className="list-none space-y-3 p-0">
                  {completedLessons.map((item) => (
                    <li key={item.id}>
                      <article className="space-y-3 rounded-box border border-base-300 bg-base-100 p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-base-content">{item.lesson.title}</p>
                            <p className="flex items-center gap-2 text-xs text-base-content/70">
                              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Completed lesson
                            </p>
                          </div>
                          <Button asChild size="sm" variant="outline" aria-label={`Review lesson: ${item.lesson.title}`}>
                            <Link href={`/app/lesson/${item.lesson.id}`}>Review</Link>
                          </Button>
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
                    </li>
                  ))}

                  {completedLessons.length === 0 ? (
                    <li>
                      <div className="space-y-3 rounded-box border border-dashed border-base-300 bg-base-200/50 p-6 text-sm text-base-content/70">
                        <p className="font-medium text-base-content">No completed lessons yet</p>
                        <p>Lessons you finish will show up here for quick review.</p>
                        <div className="space-y-2">
                          <div className="skeleton h-3 w-full" />
                          <div className="skeleton h-3 w-2/3" />
                        </div>
                        {!hasAssignments && isAdmin ? (
                          <Button asChild size="sm" variant="outline" className="w-fit">
                            <Link href="/admin/assign">Assign a lesson</Link>
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  ) : null}
                </ul>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
