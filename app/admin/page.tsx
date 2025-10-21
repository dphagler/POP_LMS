import Link from "next/link";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function AdminDashboard() {
  const session = await requireRole("ADMIN");
  const orgId = session.user?.orgId;

  const [userCount, courseCount, groupCount] = await Promise.all([
    prisma.user.count({ where: { orgId } }),
    prisma.course.count({ where: { orgId } }),
    prisma.orgGroup.count({ where: { orgId } })
  ]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">Organization overview</h1>
        <p className="text-sm text-muted-foreground">Manage learners, assignments, and sync content from Sanity.</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Learners</CardTitle>
            <CardDescription>Active members across your organization.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{userCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Courses</CardTitle>
            <CardDescription>Courses published to your learners.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{courseCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Groups</CardTitle>
            <CardDescription>Peer or cohort groups you&apos;ve created.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{groupCount}</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Content sync</CardTitle>
          <CardDescription>Pull the latest courses, modules, and lessons from Sanity.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Ensure your database stays aligned with your headless CMS.</p>
          <form action="/api/admin/sync" method="post">
            <Button type="submit">Sync from Sanity</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Assignments</CardTitle>
          <CardDescription>Enroll learners into modules with one click.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/admin/assign">Create assignment</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
