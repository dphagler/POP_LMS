import Link from "next/link";
import { requireRole } from "@/lib/authz";
import { loadOrgAnalyticsSnapshot } from "@/lib/admin-analytics";
import { capturePosthogEvent } from "@/lib/posthog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const numberFormatter = new Intl.NumberFormat("en-US");
const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1
});

export default async function AdminAnalyticsPage() {
  const session = await requireRole("ADMIN");
  const { id: userId, orgId } = session.user;

  if (!orgId) {
    throw new Error("Organization not found for admin user");
  }

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

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">Analytics snapshot</h1>
        <p className="text-sm text-muted-foreground">
          Review cohort health at a glance. Metrics update when assignments or learner progress changes.
        </p>
      </header>
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
        <Button asChild variant="outline" className="shrink-0">
          <a href="/admin/analytics/export" download>
            Download CSV
          </a>
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
              <Button asChild>
                <Link href="/admin/assign">Create assignment</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
