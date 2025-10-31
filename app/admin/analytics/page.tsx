import { Button as ChakraButton } from "@chakra-ui/react";
import { BarChart3 } from "lucide-react";

import { AdminShell } from "@/components/admin/AdminShell";
import { PageHeader } from "@/components/admin/PageHeader";
import { requireAdminAccess } from "@/lib/authz";
import { loadOrgAnalyticsSnapshot } from "@/lib/admin-analytics";
import { capturePosthogEvent } from "@/lib/posthog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminNavLink } from "@/components/admin/AdminNavLink";
import {
  fetchAugmentationUsage,
  fetchCompletionFunnel,
  fetchConfusionSpikes,
  fetchGroupCohorts,
  fetchNowPlayingLessons
} from "@/lib/db/analytics";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

const numberFormatter = new Intl.NumberFormat("en-US");
const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric"
});

const filterKeys = ["groupId", "dateFrom", "dateTo", "lessonId"] as const;
type FilterKey = (typeof filterKeys)[number];

function formatSecondsLabel(value: number): string {
  if (!Number.isFinite(value) || value < 0) {
    return "00:00";
  }
  const total = Math.floor(value);
  const minutes = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (total % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function formatTimeRange(start: number, end: number): string {
  return `${formatSecondsLabel(start)}–${formatSecondsLabel(end)}`;
}

function parseDateParam(
  value: string,
  options?: { endOfDay?: boolean }
): Date | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  if (options?.endOfDay) {
    parsed.setHours(23, 59, 59, 999);
  } else {
    parsed.setHours(0, 0, 0, 0);
  }

  return parsed;
}

type AnalyticsSearchParams = {
  groupId?: string;
  start?: string;
  end?: string;
  dateFrom?: string;
  dateTo?: string;
  lessonId?: string;
};

export default async function AdminAnalyticsPage({
  searchParams
}: {
  searchParams?: Promise<AnalyticsSearchParams>;
}) {
  const { session } = await requireAdminAccess(["ADMIN", "MANAGER"]);
  const { id: userId, orgId } = session.user;

  if (!orgId) {
    throw new Error("Organization not found for admin user");
  }

  const resolvedSearchParams = (await searchParams) ?? {};

  const groupFilter =
    typeof resolvedSearchParams.groupId === "string"
      ? resolvedSearchParams.groupId
      : "";
  const dateFromFilter =
    typeof resolvedSearchParams.dateFrom === "string"
      ? resolvedSearchParams.dateFrom
      : typeof resolvedSearchParams.start === "string"
        ? resolvedSearchParams.start
        : "";
  const dateToFilter =
    typeof resolvedSearchParams.dateTo === "string"
      ? resolvedSearchParams.dateTo
      : typeof resolvedSearchParams.end === "string"
        ? resolvedSearchParams.end
        : "";
  const lessonFilter =
    typeof resolvedSearchParams.lessonId === "string"
      ? resolvedSearchParams.lessonId
      : "";

  const startDate = parseDateParam(dateFromFilter);
  const endDate = parseDateParam(dateToFilter, { endOfDay: true });

  const [
    snapshot,
    nowPlayingLessons,
    completionFunnel,
    cohortGroups,
    augmentationUsage,
    confusionSpikes,
    selectedLessonRecord
  ] = await Promise.all([
    loadOrgAnalyticsSnapshot(orgId),
    fetchNowPlayingLessons({ orgId, groupId: groupFilter || undefined }),
    fetchCompletionFunnel({
      orgId,
      groupId: groupFilter || undefined,
      startDate,
      endDate,
      lessonId: lessonFilter || undefined
    }),
    fetchGroupCohorts({ orgId, startDate, endDate }),
    fetchAugmentationUsage({
      orgId,
      groupId: groupFilter || undefined,
      startDate,
      endDate,
      lessonId: lessonFilter || undefined
    }),
    fetchConfusionSpikes({
      orgId,
      groupId: groupFilter || undefined,
      startDate,
      endDate,
      lessonId: lessonFilter || undefined
    }),
    lessonFilter
      ? prisma.lesson.findUnique({
          where: { id: lessonFilter },
          select: { id: true, title: true }
        })
      : null
  ]);

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

  const completionRateLabel = percentFormatter.format(
    snapshot.completionRate || 0
  );
  const hasAssignments = snapshot.assignments.length > 0;
  const funnelCompletionRate =
    completionFunnel.starts === 0
      ? 0
      : completionFunnel.completes / completionFunnel.starts;
  const funnelCompletionRateLabel = percentFormatter.format(
    funnelCompletionRate || 0
  );

  const currentFilterValues: Record<FilterKey, string | undefined> = {
    groupId: groupFilter || undefined,
    dateFrom: dateFromFilter || undefined,
    dateTo: dateToFilter || undefined,
    lessonId: lessonFilter || undefined
  };

  const buildSearchParams = (
    updates?: Partial<Record<FilterKey, string | null | undefined>>
  ): URLSearchParams => {
    const params = new URLSearchParams();
    for (const key of filterKeys) {
      const override = updates?.[key];
      if (override === null) {
        continue;
      }
      const value =
        override !== undefined ? override : currentFilterValues[key];
      if (value) {
        params.set(key, value);
      }
    }
    return params;
  };

  const buildAnalyticsHref = (
    updates?: Partial<Record<FilterKey, string | null | undefined>>
  ): string => {
    const params = buildSearchParams(updates);
    const query = params.toString();
    return query ? `/admin/analytics?${query}` : "/admin/analytics";
  };

  const groupHref = (value: string | null) =>
    buildAnalyticsHref({ groupId: value === null ? null : value });

  const lessonHref = (value: string | null) =>
    buildAnalyticsHref({ lessonId: value === null ? null : value });

  const downloadParams = buildSearchParams();

  const dateRangeDescription = (() => {
    if (startDate && endDate) {
      return `${dateFormatter.format(startDate)} – ${dateFormatter.format(endDate)}`;
    }
    if (startDate) {
      return `Since ${dateFormatter.format(startDate)}`;
    }
    if (endDate) {
      return `Until ${dateFormatter.format(endDate)}`;
    }
    return "All time";
  })();

  const selectedCohort = cohortGroups.find(
    (group) => group.groupId === groupFilter
  );
  const selectedLessonTitle = selectedLessonRecord?.title ?? "";

  const exportHref = downloadParams.toString()
    ? `/admin/analytics/export?${downloadParams.toString()}`
    : "/admin/analytics/export";

  const filterChips: Array<{ key: string; label: string; href: string }> = [];

  if (groupFilter) {
    filterChips.push({
      key: `group-${groupFilter}`,
      label: `Group: ${selectedCohort ? selectedCohort.name : groupFilter}`,
      href: groupHref(null)
    });
  }

  if (lessonFilter) {
    filterChips.push({
      key: `lesson-${lessonFilter}`,
      label: `Lesson: ${selectedLessonTitle || lessonFilter}`,
      href: lessonHref(null)
    });
  }

  if (dateFromFilter || dateToFilter) {
    filterChips.push({
      key: `date-${dateFromFilter || "any"}-${dateToFilter || "any"}`,
      label: `Date range: ${dateRangeDescription}`,
      href: buildAnalyticsHref({ dateFrom: null, dateTo: null })
    });
  }

  return (
    <AdminShell title="Analytics" breadcrumb={[{ label: "Analytics" }]}>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <PageHeader
          title="Analytics snapshot"
          subtitle="Review cohort health at a glance. Metrics update when assignments or learner progress changes."
          actions={
            <ChakraButton
              as="a"
              href={exportHref}
              colorScheme="primary"
              download
            >
              Download CSV
            </ChakraButton>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle>Export filters</CardTitle>
            <CardDescription>
              Filters apply to the CSV export of learner progress.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-4" method="get">
              <div className="flex flex-col gap-2">
                <Label htmlFor="groupId">Group ID</Label>
                <Input
                  id="groupId"
                  name="groupId"
                  placeholder="group_123"
                  defaultValue={groupFilter}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="dateFrom">Start date</Label>
                <Input
                  id="dateFrom"
                  name="dateFrom"
                  type="date"
                  defaultValue={dateFromFilter}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="dateTo">End date</Label>
                <Input
                  id="dateTo"
                  name="dateTo"
                  type="date"
                  defaultValue={dateToFilter}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button type="submit">Apply filters</Button>
                <AdminNavLink href="/admin/analytics" variant="outline">
                  Reset
                </AdminNavLink>
              </div>
            </form>
          </CardContent>
        </Card>

        {filterChips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {filterChips.map((chip) => (
              <Button
                key={chip.key}
                as="a"
                href={chip.href}
                size="sm"
                variant="outline"
                className="flex items-center gap-1"
              >
                <span>{chip.label}</span>
                <span aria-hidden>×</span>
              </Button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid flex-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Assignments</CardTitle>
                <CardDescription>
                  Total active assignments for your organization.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">
                  {numberFormatter.format(snapshot.assignmentCount)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Active learners</CardTitle>
                <CardDescription>
                  Learners enrolled in at least one assignment.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">
                  {numberFormatter.format(snapshot.activeLearnerCount)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Completion rate</CardTitle>
                <CardDescription>
                  Lesson completions across all assignments.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{completionRateLabel}</p>
              </CardContent>
            </Card>
          </div>
          <Button
            as="a"
            href={exportHref}
            download
            variant="outline"
            className="shrink-0"
          >
            Download CSV
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Now playing</CardTitle>
              <CardDescription>
                Lessons with active viewers in the last 5 minutes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {nowPlayingLessons.length > 0 ? (
                <div className="divide-y">
                  {nowPlayingLessons.map((lesson) => (
                    <div
                      key={lesson.lessonId}
                      className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {lesson.lessonTitle}
                        </p>
                        <p className="text-xs text-muted-foreground">Lesson</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-lg font-semibold">
                          {numberFormatter.format(lesson.activeViewers)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Active viewers
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No learners are actively watching lessons right now.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Completion funnel</CardTitle>
              <CardDescription>
                Lesson starts vs completions ({dateRangeDescription}).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-3">
                <div>
                  <dt className="text-xs font-medium uppercase text-muted-foreground">
                    Lesson starts
                  </dt>
                  <dd className="text-2xl font-semibold">
                    {numberFormatter.format(completionFunnel.starts)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-muted-foreground">
                    Completions
                  </dt>
                  <dd className="text-2xl font-semibold">
                    {numberFormatter.format(completionFunnel.completes)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-muted-foreground">
                    Completion rate
                  </dt>
                  <dd className="text-2xl font-semibold">
                    {funnelCompletionRateLabel}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Augmentation usage</CardTitle>
              <CardDescription>
                Augmentations served ({dateRangeDescription}).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {augmentationUsage.total > 0 ? (
                <div className="space-y-5">
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      Total served
                    </p>
                    <p className="text-2xl font-semibold">
                      {numberFormatter.format(augmentationUsage.total)}
                    </p>
                  </div>
                  {augmentationUsage.countsByKind.length > 0 && (
                    <div>
                      <p className="text-xs font-medium uppercase text-muted-foreground">
                        Usage by kind
                      </p>
                      <dl className="mt-2 grid gap-3 sm:grid-cols-2">
                        {augmentationUsage.countsByKind.map((item) => {
                          const kindLabel = item.kind.replace(/_/g, " ");
                          return (
                            <div
                              key={item.kind}
                              className="rounded-lg border border-muted-foreground/20 p-3"
                            >
                              <dt className="text-sm font-medium capitalize">
                                {kindLabel}
                              </dt>
                              <dd className="text-lg font-semibold">
                                {numberFormatter.format(item.count)}
                              </dd>
                            </div>
                          );
                        })}
                      </dl>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      Top lessons
                    </p>
                    {augmentationUsage.topLessons.length > 0 ? (
                      <div className="mt-2 space-y-3">
                        {augmentationUsage.topLessons.map((lesson) => {
                          const isActive = lesson.lessonId === lessonFilter;
                          return (
                            <div
                              key={lesson.lessonId}
                              className={cn(
                                "flex flex-col gap-3 rounded-lg border border-muted-foreground/20 p-3 sm:flex-row sm:items-center sm:justify-between",
                                isActive && "border-primary/40 bg-primary/5"
                              )}
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                  {lesson.lessonTitle}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {numberFormatter.format(lesson.count)}{" "}
                                  augmentation
                                  {lesson.count === 1 ? "" : "s"}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  as="a"
                                  href={lessonHref(lesson.lessonId)}
                                  size="sm"
                                  variant={isActive ? "solid" : "outline"}
                                >
                                  Focus
                                </Button>
                                <Button
                                  as="a"
                                  href={`/lesson/${lesson.lessonId}`}
                                  size="sm"
                                  variant="ghost"
                                  colorScheme="gray"
                                >
                                  Open lesson
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">
                        No lessons served augmentations in this range.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No augmentations were served during this period.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Confusion spikes</CardTitle>
              <CardDescription>
                Clustered rewatches ({dateRangeDescription}).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {confusionSpikes.length > 0 ? (
                <div className="space-y-4">
                  {confusionSpikes.map((lesson) => {
                    const isActive = lesson.lessonId === lessonFilter;
                    const spikeLabel =
                      lesson.spikes.length === 1
                        ? "1 spike"
                        : `${lesson.spikes.length} spikes`;
                    const watchersLabel =
                      lesson.watchers === 1
                        ? "1 learner rewatching"
                        : `${numberFormatter.format(lesson.watchers)} learners rewatching`;
                    return (
                      <div
                        key={lesson.lessonId}
                        className={cn(
                          "rounded-lg border border-muted-foreground/20 p-3",
                          isActive && "border-primary/40 bg-primary/5"
                        )}
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-medium">
                              {lesson.lessonTitle}
                            </p>
                            <p className="text-xs text-muted-foreground">{`${spikeLabel} • ${watchersLabel}`}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              as="a"
                              href={lessonHref(lesson.lessonId)}
                              size="sm"
                              variant={isActive ? "solid" : "outline"}
                            >
                              Focus
                            </Button>
                            <Button
                              as="a"
                              href={`/lesson/${lesson.lessonId}`}
                              size="sm"
                              variant="ghost"
                              colorScheme="gray"
                            >
                              Open lesson
                            </Button>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {lesson.spikes.map((spike, index) => (
                            <span
                              key={`${lesson.lessonId}-spike-${index}`}
                              className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground"
                            >
                              {formatTimeRange(spike.start, spike.end)} •{" "}
                              {numberFormatter.format(spike.count)} overlaps
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  We didn&apos;t detect confusion spikes for this selection.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cohort breakdown</CardTitle>
            <CardDescription>
              Compare lesson engagement by group. Use the chips to filter the
              analytics across the page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Button
                as="a"
                href={groupHref(null)}
                size="sm"
                variant={groupFilter ? "outline" : "solid"}
                colorScheme={groupFilter ? "gray" : "primary"}
              >
                All cohorts
              </Button>
              {cohortGroups.map((group) => {
                const isActive = group.groupId === groupFilter;
                return (
                  <Button
                    key={group.groupId}
                    as="a"
                    href={groupHref(group.groupId)}
                    size="sm"
                    variant={isActive ? "solid" : "outline"}
                    colorScheme={isActive ? "primary" : "gray"}
                  >
                    {group.name}
                  </Button>
                );
              })}
            </div>

            <p className="text-xs text-muted-foreground">
              Filtering analytics for{" "}
              {selectedCohort ? selectedCohort.name : "all cohorts"}.
            </p>

            {cohortGroups.length > 0 ? (
              <div className="space-y-3">
                {cohortGroups.map((group) => {
                  const isActive = group.groupId === groupFilter;
                  const conversion =
                    group.starts === 0 ? 0 : group.completes / group.starts;
                  const conversionLabel = percentFormatter.format(
                    conversion || 0
                  );
                  const memberLabel =
                    group.memberCount === 1
                      ? "1 member"
                      : `${numberFormatter.format(group.memberCount)} members`;

                  return (
                    <div
                      key={group.groupId}
                      className={cn(
                        "flex flex-col gap-3 rounded-lg border border-muted-foreground/30 p-4 sm:flex-row sm:items-center sm:justify-between",
                        isActive && "border-primary/40 bg-primary/5"
                      )}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {group.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {memberLabel}
                        </p>
                      </div>
                      <dl className="grid gap-3 text-sm sm:grid-cols-3">
                        <div>
                          <dt className="text-xs font-medium uppercase text-muted-foreground">
                            Starts
                          </dt>
                          <dd className="font-semibold">
                            {numberFormatter.format(group.starts)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium uppercase text-muted-foreground">
                            Completions
                          </dt>
                          <dd className="font-semibold">
                            {numberFormatter.format(group.completes)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium uppercase text-muted-foreground">
                            Conversion
                          </dt>
                          <dd className="font-semibold">{conversionLabel}</dd>
                        </div>
                      </dl>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Create cohorts to compare performance across groups.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assignment details</CardTitle>
            <CardDescription>
              See enrollments and lesson completion counts for each assignment.
              Export the CSV for spreadsheet analysis.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasAssignments ? (
              <div className="divide-y">
                {snapshot.assignments.map((assignment) => {
                  const assignmentCompletionRate = percentFormatter.format(
                    assignment.completionRate || 0
                  );
                  const scopeLabel =
                    assignment.targetType === "MODULE"
                      ? `${assignment.courseTitle} • ${assignment.moduleTitle ?? "Module"}`
                      : assignment.courseTitle;

                  return (
                    <div
                      key={assignment.assignmentId}
                      className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0"
                    >
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
                          <p className="text-sm font-semibold">
                            {assignmentCompletionRate}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {`${numberFormatter.format(assignment.completedLessonTargets)} of ${numberFormatter.format(assignment.totalLessonTargets)} lesson completions`}
                          </p>
                        </div>
                      </div>
                      <dl className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <dt className="text-xs font-medium uppercase text-muted-foreground">
                            Scope
                          </dt>
                          <dd className="text-sm">
                            {assignment.targetType === "MODULE"
                              ? "Module"
                              : "Course"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium uppercase text-muted-foreground">
                            Lessons
                          </dt>
                          <dd className="text-sm">
                            {numberFormatter.format(assignment.lessonCount)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium uppercase text-muted-foreground">
                            Total targets
                          </dt>
                          <dd className="text-sm">
                            {numberFormatter.format(
                              assignment.totalLessonTargets
                            )}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-muted-foreground/40 bg-muted">
                  <BarChart3 className="h-7 w-7 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-medium">No assignments yet</p>
                  <p className="max-w-md text-sm text-muted-foreground">
                    Create an assignment to start tracking learner progress.
                    Once learners begin completing lessons, you&apos;ll see
                    metrics here.
                  </p>
                </div>
                <AdminNavLink href="/admin/assign" colorScheme="primary">
                  Create assignment
                </AdminNavLink>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
