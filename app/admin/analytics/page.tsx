import Link from "next/link";

import { requireRole } from "@/lib/authz";
import { loadOrgAnalyticsSnapshot } from "@/lib/admin-analytics";
import { capturePosthogEvent } from "@/lib/posthog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const numberFormatter = new Intl.NumberFormat("en-US");
const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1
});

type AnalyticsSearchParams = {
  groupId?: string;
  start?: string;
  end?: string;
};

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams?: AnalyticsSearchParams;
}) {
  const session = await requireRole("ADMIN");
  const { id: userId, orgId } = session.user;

  if (!orgId) {
    throw new Error("Organization not found for admin user");
  }

  const groupFilter = typeof searchParams?.groupId === "string" ? searchParams.groupId : "";
  const startFilter = typeof searchParams?.start === "string" ? searchParams.start : "";
  const endFilter = typeof searchParams?.end === "string" ? searchParams.end : "";

  const snapshot = await loadOrgAnalyticsSnapshot(orgId);

  await capturePosthogEvent({
    event: "admin.analytics_snapshot_viewed",
    distinctId: userId,
    properties: {
      orgId,
      assignmentCount: snapshot.assignmentCount,
      activeLearnerCount: snapshot.activeLearnerCount,
      completionRate: snapshot.completionRate
    }
  });

  const completionRateLabel = percentFormatter.format(snapshot.completionRate || 0);
  const hasAssignments = snapshot.assignments.length > 0;

  const downloadParams = new URLSearchParams();
  if (groupFilter) {
    downloadParams.set("groupId", groupFilter);
  }
  if (startFilter) {
    downloadParams.set("start", startFilter);
  }
  if (endFilter) {
    downloadParams.set("end", endFilter);
  }

  const exportHref = downloadParams.toString()
    ? `/admin/analytics/export?${downloadParams.toString()}`
    : "/admin/analytics/export";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-balance">Analytics snapshot</h1>
        <p className="text-sm text-muted-foreground">
          Review cohort health at a glance. Metrics update when assignments or learner progress changes.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Export filters</CardTitle>
          <CardDescription>Filters apply to the CSV export of learner progress.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-4" method="get">
            <div className="flex flex-col gap-2">
              <Label htmlFor="groupId">Group ID</Label>
              <Input id="groupId" name="groupId" placeholder="group_123" defaultValue={groupFilter} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="start">Start date</Label>
              <Input id="start" name="start" type="date" defaultValue={startFilter} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="end">End date</Label>
              <Input id="end" name="end" type="date" defaultValue={endFilter} />
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit">Apply filters</Button>
              <Button asChild variant="outline">
                <Link href="/admin/analytics">Reset</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid flex-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Assignments</CardTitle>
              <CardDescription>Total active assignments for your organization.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{numberFormatter.format(snapshot.assignmentCount)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Active learners</CardTitle>
              <CardDescription>Learners enrolled in at least one assignment.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{numberFormatter.format(snapshot.activeLearnerCount)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Completion rate</CardTitle>
              <CardDescription>Lesson completions across all assignments.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{completionRateLabel}</p>
            </CardContent>
          </Card>
        </div>
        <Button as="a" href={exportHref} download variant="outline" className="shrink-0">
          Download CSV
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Assignment details</CardTitle>
          <CardDescription>
            See enrollments and lesson completion counts for each assignment. Export the CSV for spreadsheet analysis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasAssignments ? (
            <div className="divide-y">
              {snapshot.assignments.map((assignment) => {
                const assignmentCompletionRate = percentFormatter.format(assignment.completionRate || 0);
                const scopeLabel =
                  assignment.targetType === "MODULE"
                    ? `${assignment.courseTitle} • ${assignment.moduleTitle ?? "Module"}`
                    : assignment.courseTitle;

                return (
                  <div key={assignment.assignmentId} className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-base font-medium">{scopeLabel}</p>
                        <p className="text-sm text-muted-foreground">
                          {assignment.enrollmentCount === 1
                            ? "1 learner assigned"
                            : `${numberFormatter.format(assignment.enrollmentCount)} learners assigned`}
                        </p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-sm font-semibold">{assignmentCompletionRate}</p>
                        <p className="text-xs text-muted-foreground">
                          {`${numberFormatter.format(assignment.completedLessonTargets)} of ${numberFormatter.format(assignment.totalLessonTargets)} lesson completions`}
                        </p>
                      </div>
                    </div>
                    <dl className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <dt className="text-xs font-medium uppercase text-muted-foreground">Scope</dt>
                        <dd className="text-sm">{assignment.targetType === "MODULE" ? "Module" : "Course"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium uppercase text-muted-foreground">Lessons</dt>
                        <dd className="text-sm">{numberFormatter.format(assignment.lessonCount)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium uppercase text-muted-foreground">Total targets</dt>
                        <dd className="text-sm">{numberFormatter.format(assignment.totalLessonTargets)}</dd>
                      </div>
                    </dl>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <p className="text-base font-medium">No assignments yet</p>
              <p className="max-w-md text-sm text-muted-foreground">
                Create an assignment to start tracking learner progress. Once learners begin completing lessons, you&apos;ll see metrics here.
              </p>
              <Button as={Link} href="/admin/assign">
                Create assignment
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
