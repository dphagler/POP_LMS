import Link from "next/link";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getMissingSanityEnvVars } from "@/lib/sanity";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ContentSyncControls from "./content-sync-controls";

const numberFormatter = new Intl.NumberFormat("en-US");

export default async function AdminDashboard() {
  const session = await requireRole("ADMIN");
  const { orgId } = session.user;

  if (!orgId) {
    throw new Error("Organization not found for admin user");
  }

  const missingSanityEnvVars = getMissingSanityEnvVars();
  const syncDisabledReason =
    missingSanityEnvVars.length > 0
      ? `Sanity sync is unavailable. Missing environment variables: ${missingSanityEnvVars.join(", ")}.`
      : undefined;

  const [userCount, courseCount, groupCount] = await Promise.all([
    prisma.user.count({ where: { orgId } }),
    prisma.course.count({ where: { orgId } }),
    prisma.orgGroup.count({ where: { orgId } })
  ]);

  const overviewStats = [
    {
      id: "learners",
      title: "Learners",
      value: userCount,
      description: "Active members across your organization.",
    },
    {
      id: "courses",
      title: "Courses",
      value: courseCount,
      description: "Courses published to your learners.",
    },
    {
      id: "groups",
      title: "Groups",
      value: groupCount,
      description: "Peer or cohort groups you&apos;ve created.",
    },
  ] as const;

  return (
    <div className="space-y-10">
      <Card className="relative overflow-hidden border border-border/70 bg-card/70 shadow-xl">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(150%_150%_at_0%_0%,theme(colors.primary/0.18),transparent_60%)]"
        />
        <CardHeader className="relative flex flex-col gap-6 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <CardTitle className="text-2xl font-semibold tracking-tight">Organization overview</CardTitle>
            <CardDescription className="max-w-2xl text-sm text-muted-foreground">
              Manage learners, assignments, and keep your Sanity content in sync with the LMS.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/assign">Assign learning</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/groups">Manage groups</Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {overviewStats.map((stat) => (
          <Card
            key={stat.id}
            className="group relative overflow-hidden border border-border/70 bg-card/80 shadow-lg transition hover:border-primary/50 hover:shadow-xl"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 translate-y-[-10%] bg-[radial-gradient(140%_90%_at_0%_0%,theme(colors.primary/0.12),transparent_65%)] opacity-0 transition group-hover:opacity-100"
            />
            <CardHeader className="relative space-y-3 pb-6">
              <CardTitle className="text-base font-semibold tracking-tight text-foreground">{stat.title}</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">{stat.description}</CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <p className="text-4xl font-semibold tracking-tight text-foreground">
                {numberFormatter.format(stat.value)}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="relative overflow-hidden border border-border/70 bg-card/70 shadow-xl">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(130%_90%_at_100%_0%,theme(colors.primary/0.16),transparent_60%)]"
        />
        <CardHeader className="relative space-y-3 pb-6">
          <CardTitle className="text-xl font-semibold tracking-tight">Content sync</CardTitle>
          <CardDescription className="max-w-2xl text-sm text-muted-foreground">
            Pull the latest courses, modules, and lessons from Sanity without leaving the admin dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Ensure your database stays aligned with your headless CMS. Dry runs preview changes before committing them, and you
              can optionally allow deletes when you&apos;re ready to mirror removals from Sanity.
            </p>
            {syncDisabledReason ? (
              <p className="font-medium text-destructive">{syncDisabledReason}</p>
            ) : (
              <p className="text-xs uppercase tracking-wide text-muted-foreground/80">
                Syncs run in the background—feel free to navigate away once submitted.
              </p>
            )}
          </div>
          <ContentSyncControls disabled={Boolean(syncDisabledReason)} disabledReason={syncDisabledReason} />
        </CardContent>
      </Card>

      <section className="grid gap-5 lg:grid-cols-3">
        <Card className="relative overflow-hidden border border-border/70 bg-card/70 shadow-lg transition hover:border-primary/50">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_70%_at_0%_0%,theme(colors.primary/0.12),transparent_60%)]"
          />
          <CardHeader className="relative space-y-3 pb-6">
            <CardTitle className="text-lg font-semibold tracking-tight">Assignments</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Enroll learners into modules and courses with guided previews before you commit.
            </CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <Button asChild>
              <Link href="/admin/assign">Create assignment</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border border-border/70 bg-card/70 shadow-lg transition hover:border-primary/50">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_70%_at_50%_-20%,theme(colors.primary/0.12),transparent_65%)]"
          />
          <CardHeader className="relative space-y-3 pb-6">
            <CardTitle className="text-lg font-semibold tracking-tight">Analytics</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Track assignments, active learners, and completion rates across your organization.
            </CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <Button asChild variant="outline">
              <Link href="/admin/analytics">View analytics snapshot</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border border-border/70 bg-card/70 shadow-lg transition hover:border-primary/50">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_70%_at_100%_0%,theme(colors.primary/0.12),transparent_60%)]"
          />
          <CardHeader className="relative space-y-3 pb-6">
            <CardTitle className="text-lg font-semibold tracking-tight">Groups</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Create cohorts, manage CSV roster uploads, and keep memberships in sync.
            </CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <Button asChild>
              <Link href="/admin/groups">Manage groups</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
