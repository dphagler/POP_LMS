import Link from "next/link";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getMissingSanityEnvVars } from "@/lib/sanity";
import { loadOrgAnalyticsSnapshot } from "@/lib/admin-analytics";
import ContentSyncControls from "./content-sync-controls";

const numberFormatter = new Intl.NumberFormat("en-US");
const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1
});

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

  const [groupCount, analyticsSnapshot] = await Promise.all([
    prisma.orgGroup.count({ where: { orgId } }),
    loadOrgAnalyticsSnapshot(orgId)
  ]);

  const overviewStats = [
    {
      id: "active-learners",
      title: "Active learners",
      formattedValue: numberFormatter.format(analyticsSnapshot.activeLearnerCount),
      description: "Learners currently enrolled in at least one assignment.",
    },
    {
      id: "assignments",
      title: "Assignments",
      formattedValue: numberFormatter.format(analyticsSnapshot.assignmentCount),
      description: "Assignments issued across your organization.",
    },
    {
      id: "completion-rate",
      title: "Completion rate",
      formattedValue: percentFormatter.format(analyticsSnapshot.completionRate || 0),
      description: "Completed lesson targets compared to assigned targets.",
    },
    {
      id: "groups",
      title: "Groups",
      formattedValue: numberFormatter.format(groupCount),
      description: "Peer or cohort groups you&apos;ve created.",
    },
  ] as const;

  return (
    <div className="space-y-10">
      <section className="card border border-base-300 bg-base-100 shadow-xl">
        <div className="card-body gap-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <h1 className="card-title text-2xl">Organization overview</h1>
              <p className="max-w-2xl text-sm text-base-content/70">
                Manage learners, assignments, and keep your Sanity content in sync with the LMS.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/admin/assign" className="btn btn-outline btn-sm">
                Assign learning
              </Link>
              <Link href="/admin/groups" className="btn btn-outline btn-sm">
                Manage groups
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Key organization stats">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {overviewStats.map((stat) => (
            <article
              key={stat.id}
              className="rounded-box border border-base-300 bg-base-100 p-5 shadow-lg"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-base-content/70">
                {stat.title}
              </p>
              <p className="mt-2 text-3xl font-semibold text-primary">{stat.formattedValue}</p>
              <p className="mt-2 text-sm text-base-content/70">{stat.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="card border border-base-300 bg-base-100 shadow-xl">
        <div className="card-body space-y-6">
          <div className="space-y-2">
            <h2 className="card-title text-xl">Sync from Sanity</h2>
            <p className="max-w-2xl text-sm text-base-content/70">
              Pull the latest courses, modules, and lessons from Sanity without leaving the admin dashboard.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
            <div className="space-y-3 text-sm text-base-content/70">
              <p>
                Ensure your database stays aligned with your headless CMS. Dry runs preview changes before committing them, and you
                can optionally allow deletes when you&apos;re ready to mirror removals from Sanity.
              </p>
              {syncDisabledReason ? (
                <p className="font-medium text-error">{syncDisabledReason}</p>
              ) : (
                <p className="text-xs uppercase tracking-wide text-base-content/60">
                  Syncs run in the background—feel free to navigate away once submitted.
                </p>
              )}
            </div>
            <ContentSyncControls disabled={Boolean(syncDisabledReason)} disabledReason={syncDisabledReason} />
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <article className="card border border-base-300 bg-base-100 shadow-lg">
          <div className="card-body space-y-3">
            <h3 className="card-title text-lg">Assignments</h3>
            <p className="text-sm text-base-content/70">
              Enroll learners into modules and courses with guided previews before you commit.
            </p>
            <Link href="/admin/assign" className="btn btn-primary btn-sm w-fit">
              Create assignment
            </Link>
          </div>
        </article>
        <article className="card border border-base-300 bg-base-100 shadow-lg">
          <div className="card-body space-y-3">
            <h3 className="card-title text-lg">Analytics</h3>
            <p className="text-sm text-base-content/70">
              Track assignments, active learners, and completion rates across your organization.
            </p>
            <Link href="/admin/analytics" className="btn btn-outline btn-sm w-fit">
              View analytics snapshot
            </Link>
          </div>
        </article>
        <article className="card border border-base-300 bg-base-100 shadow-lg">
          <div className="card-body space-y-3">
            <h3 className="card-title text-lg">Groups</h3>
            <p className="text-sm text-base-content/70">
              Create cohorts, manage CSV roster uploads, and keep memberships in sync.
            </p>
            <Link href="/admin/groups" className="btn btn-primary btn-sm w-fit">
              Manage groups
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}
