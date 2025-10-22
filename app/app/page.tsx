import Link from "next/link";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { computeStreak } from "@/lib/streak";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Clock } from "lucide-react";

import type { Progress as ProgressModel } from "@prisma/client";

function getLessonCta(progress: ProgressModel | undefined) {
  if (progress?.isComplete) {
    return { label: "Review", description: "Review lesson" };
  }

  if (progress && progress.watchedSeconds > 0) {
    return { label: "Resume", description: "Resume lesson" };
  }

  return { label: "Start", description: "Start lesson" };
}

export default async function LearnerDashboard() {
  const session = await requireUser();
  const { id: userId, orgId } = session.user;

  if (!orgId) {
    throw new Error("Organization not found for learner");
  }

  const [lessons, badges, progresses] = await Promise.all([
    prisma.lesson.findMany({
      where: { module: { course: { orgId } } },
      take: 5,
      orderBy: { title: "asc" }
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

  const streak = await computeStreak(userId);
  const progressByLesson = new Map(progresses.map((item) => [item.lessonId, item]));
  const sortedLessons = [...lessons].sort((a, b) => {
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
  const upNext = sortedLessons[0];
  const lessonSchedule = sortedLessons.slice(1);
  const completion = progresses.reduce((acc, item) => acc + (item.isComplete ? 1 : 0), 0);
  const totalLessons = lessons.length;
  const percent = totalLessons === 0 ? 0 : Math.round((completion / totalLessons) * 100);
  const completedLessons = progresses
    .filter((item) => item.isComplete)
    .sort((a, b) => a.lesson.title.localeCompare(b.lesson.title))
    .slice(0, 6);
  const isAdmin = session.user.role === "ADMIN";
  const allLessonsComplete = totalLessons > 0 && completion === totalLessons;
  const upNextProgress = upNext ? progressByLesson.get(upNext.id) : undefined;
  const upNextCta = upNext ? getLessonCta(upNextProgress) : null;
  const upNextStatusLabel = upNextProgress?.isComplete
    ? "Ready to review"
    : upNextProgress && upNextProgress.watchedSeconds > 0
      ? "In progress"
      : "Now playing";

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section id="today" className="lg:col-span-1">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Today&apos;s focus</CardTitle>
            <CardDescription>Keep your streak alive by watching today&apos;s featured lesson.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Tabs defaultValue="focus" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="focus">Focus</TabsTrigger>
                <TabsTrigger value="progress">Progress</TabsTrigger>
              </TabsList>
              <TabsContent value="focus" className="mt-4 space-y-4">
                {upNext ? (
                  <div className="flex flex-col gap-3">
                    <div className="space-y-1">
                      <p className="text-base font-semibold leading-tight">{upNext.title}</p>
                      <p className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" aria-hidden />
                        {upNext.durationS} seconds
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
                      <p className="text-xs text-muted-foreground">
                        You&apos;ve completed every assignment—review anytime to keep the streak alive.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <p>No assignments yet. Check back soon!</p>
                    {isAdmin ? (
                      <Button variant="outline" asChild>
                        <Link href="/admin/assign">Assign a lesson</Link>
                      </Button>
                    ) : null}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="progress" className="mt-4 space-y-4">
                {totalLessons > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Weekly completion</p>
                    <Progress value={percent} />
                    <p className="text-xs text-muted-foreground">
                      {completion} of {totalLessons} lessons complete
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Weekly completion</p>
                    <Progress value={0} />
                    <p className="text-xs text-muted-foreground">
                      Progress will appear after your first assignment.
                    </p>
                  </div>
                )}
                <Badge variant="secondary">Streak: {streak} days</Badge>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </section>

      <section id="up-next" className="lg:col-span-1">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Up next</CardTitle>
            <CardDescription>Stay ahead by previewing what&apos;s coming this week.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {upNext ? (
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm font-medium text-muted-foreground">{upNextStatusLabel}</p>
                <p className="text-base font-semibold leading-tight">{upNext.title}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  {upNext.durationS} seconds
                </p>
                <Button className="mt-3" asChild>
                  <Link
                    href={`/app/lesson/${upNext.id}`}
                    aria-label={`${upNextCta?.description ?? "Open lesson"}: ${upNext.title}`}
                  >
                    {upNextCta?.label ?? "Start"}
                  </Link>
                </Button>
              </div>
            ) : null}
            {lessonSchedule.map((lesson) => {
              const lessonProgress = progressByLesson.get(lesson.id);
              const lessonCta = getLessonCta(lessonProgress);
              return (
                <div key={lesson.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-1">
                    <p className="font-medium leading-tight">{lesson.title}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" aria-hidden />
                      {lesson.durationS} seconds
                    </p>
                  </div>
                  <Button variant="ghost" asChild>
                    <Link
                      href={`/app/lesson/${lesson.id}`}
                      aria-label={`${lessonCta.description}: ${lesson.title}`}
                    >
                      {lessonCta.label}
                    </Link>
                  </Button>
                </div>
              );
            })}
            {sortedLessons.length === 0 && (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                <p>No assignments yet. Once lessons are assigned, they&apos;ll appear here.</p>
                {isAdmin ? (
                  <Button className="mt-3" variant="outline" asChild>
                    <Link href="/admin/assign">Assign a lesson</Link>
                  </Button>
                ) : null}
              </div>
            )}
            {allLessonsComplete && (
              <p className="text-sm text-muted-foreground">
                You&apos;re all caught up! Revisit completed lessons anytime for a quick refresher.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <section id="completed" className="lg:col-span-1">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Completed</CardTitle>
            <CardDescription>Celebrate wins and review what you&apos;ve finished.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Tabs defaultValue="badges" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="badges">Badges</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>
              <TabsContent value="badges" className="mt-4 flex flex-wrap gap-2">
                <Badge variant="secondary">Streak: {streak} days</Badge>
                {badges.map((item) => (
                  <Badge key={item.id}>{item.badge.name}</Badge>
                ))}
                {badges.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Earn badges by completing lessons and reflections.
                  </p>
                )}
              </TabsContent>
              <TabsContent value="activity" className="mt-4 space-y-3">
                {completedLessons.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 rounded-lg border p-3"
                  >
                    <div className="space-y-1">
                      <p className="font-medium leading-tight">{item.lesson.title}</p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
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
                ))}
                {completedLessons.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Lessons you finish will show up here for quick review.
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
