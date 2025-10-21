import Link from "next/link";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { computeStreak } from "@/lib/streak";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

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
  const upNext = lessons[0];
  const completion = progresses.reduce((acc, item) => acc + (item.isComplete ? 1 : 0), 0);
  const total = Math.max(progresses.length, 1);
  const percent = Math.round((completion / total) * 100);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">Welcome back, {session.user?.name ?? "Learner"}</h1>
        <p className="text-sm text-muted-foreground">
          Keep your streak alive by watching today&apos;s featured lesson.
        </p>
      </header>

      <Tabs defaultValue="today" className="w-full">
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="up-next">Up Next</TabsTrigger>
          <TabsTrigger value="recent">Recently Earned</TabsTrigger>
        </TabsList>
        <TabsContent value="today" className="rounded-lg border bg-card">
          <Card className="border-0 shadow-none">
            <CardHeader>
              <CardTitle>Today&apos;s Focus</CardTitle>
              <CardDescription>Watch your top lesson to maintain momentum.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {upNext ? (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-lg font-semibold">{upNext.title}</p>
                    <p className="text-sm text-muted-foreground">{upNext.durationS} seconds</p>
                  </div>
                  <Button asChild>
                    <Link href={`/app/lesson/${upNext.id}`}>Resume lesson</Link>
                  </Button>
                </div>
              ) : (
                <p className="text-muted-foreground">No lessons assigned yet.</p>
              )}
              <div>
                <p className="mb-2 text-sm font-medium">Weekly completion</p>
                <Progress value={percent} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="up-next" className="rounded-lg border bg-card">
          <Card className="border-0 shadow-none">
            <CardHeader>
              <CardTitle>Upcoming lessons</CardTitle>
              <CardDescription>Stay ahead by previewing what&apos;s next.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {lessons.map((lesson) => (
                <div key={lesson.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="font-medium">{lesson.title}</p>
                    <p className="text-xs text-muted-foreground">{lesson.durationS} seconds</p>
                  </div>
                  <Button variant="ghost" asChild>
                    <Link href={`/app/lesson/${lesson.id}`}>Open</Link>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="recent" className="rounded-lg border bg-card">
          <Card className="border-0 shadow-none">
            <CardHeader>
              <CardTitle>Badges & streaks</CardTitle>
              <CardDescription>Celebrate your progress and keep the streak alive.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Badge variant="secondary">Streak: {streak} days</Badge>
              {badges.map((item) => (
                <Badge key={item.id}>{item.badge.name}</Badge>
              ))}
              {badges.length === 0 && <p className="text-sm text-muted-foreground">Earn badges by completing lessons.</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
