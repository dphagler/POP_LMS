"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr
} from "@chakra-ui/react";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { SerializedAssignment } from "@/lib/db/assignment";
import {
  backfillEnrollments,
  bulkUpdateDueAt,
  createAssignment,
  withdrawAssignmentsAction
} from "@/lib/server-actions/assignments";
import { cn } from "@/lib/utils";

type ModuleOption = {
  id: string;
  title: string;
  courseId: string;
  courseTitle: string;
};

type CourseOption = {
  id: string;
  title: string;
  modules: ModuleOption[];
};

type GroupMember = {
  id: string;
  name: string | null;
  email: string | null;
};

type GroupOption = {
  id: string;
  name: string;
  members: GroupMember[];
};

function formatDueDate(value: string | null): string {
  if (!value) {
    return "Not set";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Not set";
  }

  return format(parsed, "PP p");
}

type AssignmentPlannerProps = {
  courses: CourseOption[];
  groups: GroupOption[];
  assignments: SerializedAssignment[];
};

type AssignmentFilters = {
  groupId: string;
  moduleId: string;
  status: "all" | "active" | "past";
};

type AssignmentSelection = Record<string, boolean>;

type CreateFormState = {
  groupId: string;
  courseId: string;
  moduleId: string;
  dueAt: string;
  label: string;
};

type BulkDueState = {
  dueAt: string;
};

type AssignmentGap = {
  assignmentId: string;
  groupId: string;
  moduleId: string;
  missingCount: number;
  groupName: string;
  moduleTitle: string;
};

type CSVRow = {
  assignmentId: string;
  group: string;
  module: string;
  dueAt: string;
  learnerCount: number;
};

export default function AssignmentPlanner({ courses, groups, assignments }: AssignmentPlannerProps) {
  const [items, setItems] = useState<SerializedAssignment[]>(assignments);
  const [filters, setFilters] = useState<AssignmentFilters>({ groupId: "all", moduleId: "all", status: "all" });
  const [selection, setSelection] = useState<AssignmentSelection>({});
  const [createForm, setCreateForm] = useState<CreateFormState>(() => {
    const firstCourse = courses[0]?.id ?? "";
    const firstModule = courses[0]?.modules[0]?.id ?? "";
    return {
      groupId: groups[0]?.id ?? "",
      courseId: firstCourse,
      moduleId: firstModule,
      dueAt: "",
      label: "",
    };
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [backfillMessage, setBackfillMessage] = useState<string | null>(null);
  const [bulkDue, setBulkDue] = useState<BulkDueState>({ dueAt: "" });
  const [isCreating, startCreateTransition] = useTransition();
  const [isBulkUpdating, startBulkTransition] = useTransition();
  const [isWithdrawing, startWithdrawTransition] = useTransition();
  const [isBackfilling, startBackfillTransition] = useTransition();

  const moduleOptions = useMemo<ModuleOption[]>(
    () =>
      courses.flatMap((course) =>
        course.modules.map((module) => ({
          ...module,
          courseId: course.id,
          courseTitle: course.title,
        }))
      ),
    [courses]
  );

  const groupedAssignments = useMemo(() => {
    return items.map((assignment) => {
      const enrollmentSet = new Set(assignment.enrollments.map((enrollment) => enrollment.userId));
      const groupMembers = assignment.group.members;
      const missingMembers = groupMembers.filter((member) => !enrollmentSet.has(member.id));
      const status = (() => {
        if (!assignment.dueAt) return "active";
        const due = new Date(assignment.dueAt);
        if (Number.isNaN(due.getTime())) return "active";
        return due.getTime() >= Date.now() ? "active" : "past";
      })();

      return {
        record: assignment,
        missingMembers,
        status,
        learnerCount: assignment.enrollments.length,
        moduleTitle:
          assignment.module?.course && assignment.module
            ? `${assignment.module.course.title} — ${assignment.module.title}`
            : assignment.module?.title ?? assignment.course?.title ?? "Unknown module",
      };
    });
  }, [items]);

  const assignmentsNeedingBackfill = useMemo<AssignmentGap[]>(() => {
    return groupedAssignments
      .filter((entry) => entry.missingMembers.length > 0 && entry.record.module?.id)
      .map((entry) => ({
        assignmentId: entry.record.id,
        groupId: entry.record.group.id,
        moduleId: entry.record.module!.id,
        missingCount: entry.missingMembers.length,
        groupName: entry.record.group.name,
        moduleTitle: entry.moduleTitle,
      }));
  }, [groupedAssignments]);

  const filteredAssignments = useMemo(() => {
    return groupedAssignments.filter((entry) => {
      if (filters.groupId !== "all" && entry.record.group.id !== filters.groupId) {
        return false;
      }
      if (filters.moduleId !== "all") {
        const moduleId = entry.record.module?.id ?? null;
        if (!moduleId || moduleId !== filters.moduleId) {
          return false;
        }
      }
      if (filters.status !== "all" && entry.status !== filters.status) {
        return false;
      }
      return true;
    });
  }, [groupedAssignments, filters]);

  const selectedIds = useMemo(() => Object.keys(selection).filter((id) => selection[id]), [selection]);
  const hasSelection = selectedIds.length > 0;

  const modulesForCourse = useMemo(() =>
    moduleOptions.filter((module) => module.courseId === createForm.courseId),
  [moduleOptions, createForm.courseId]);

  const handleCreateInputChange = (field: keyof CreateFormState, value: string) => {
    setCreateForm((previous) => {
      if (field === "courseId") {
        const modules = moduleOptions.filter((module) => module.courseId === value);
        return {
          ...previous,
          courseId: value,
          moduleId: modules[0]?.id ?? "",
        };
      }

      return {
        ...previous,
        [field]: value,
      };
    });
  };

  const resetCreateForm = () => {
    const firstCourse = courses[0];
    const firstModule = firstCourse?.modules[0];
    setCreateForm({
      groupId: groups[0]?.id ?? "",
      courseId: firstCourse?.id ?? "",
      moduleId: firstModule?.id ?? "",
      dueAt: "",
      label: "",
    });
  };

  const handleCreateAssignment = () => {
    if (!createForm.groupId || !createForm.moduleId) {
      setCreateError("Select a group and module to continue.");
      return;
    }

    setCreateError(null);
    startCreateTransition(async () => {
      try {
        const result = await createAssignment({
          groupId: createForm.groupId,
          moduleId: createForm.moduleId,
          dueAt: createForm.dueAt ? new Date(createForm.dueAt).toISOString() : null,
          label: createForm.label,
        });

        setItems((previous) => {
          const filtered = previous.filter((assignment) => assignment.id !== result.assignment.id);
          return [result.assignment, ...filtered];
        });
        resetCreateForm();
      } catch (error) {
        setCreateError(error instanceof Error ? error.message : "Unable to create assignment.");
      }
    });
  };

  const handleSelectionToggle = (assignmentId: string) => {
    setSelection((previous) => ({
      ...previous,
      [assignmentId]: !previous[assignmentId],
    }));
  };

  const handleSelectAll = (checked: boolean) => {
    const visibleIds = filteredAssignments.map((entry) => entry.record.id);
    setSelection((previous) => {
      const next = { ...previous } as AssignmentSelection;
      visibleIds.forEach((id) => {
        next[id] = checked;
      });
      return next;
    });
  };

  const clearSelection = () => setSelection({});

  const handleBulkDueUpdate = () => {
    if (!hasSelection) {
      setBulkError("Select at least one assignment first.");
      return;
    }

    setBulkError(null);
    startBulkTransition(async () => {
      try {
        const updated = await bulkUpdateDueAt({
          ids: selectedIds,
          dueAt: bulkDue.dueAt ? new Date(bulkDue.dueAt).toISOString() : null,
        });
        setItems((previous) => {
          const lookup = new Map(updated.map((item) => [item.id, item] as const));
          return previous.map((item) => lookup.get(item.id) ?? item);
        });
        setBulkDue({ dueAt: "" });
      } catch (error) {
        setBulkError(error instanceof Error ? error.message : "Unable to update due dates.");
      }
    });
  };

  const handleWithdraw = () => {
    if (!hasSelection) {
      setWithdrawError("Select assignments to withdraw.");
      return;
    }

    setWithdrawError(null);
    startWithdrawTransition(async () => {
      try {
        const result = await withdrawAssignmentsAction({ ids: selectedIds });
        if (result.removedIds.length > 0) {
          setItems((previous) => previous.filter((item) => !result.removedIds.includes(item.id)));
          clearSelection();
        }
      } catch (error) {
        setWithdrawError(error instanceof Error ? error.message : "Unable to withdraw assignments.");
      }
    });
  };

  const handleBackfill = (groupId: string, moduleId: string) => {
    setBackfillMessage(null);
    startBackfillTransition(async () => {
      try {
        const result = await backfillEnrollments({ groupId, moduleId });
        if (result.assignments.length > 0) {
          setItems((previous) => {
            const lookup = new Map(result.assignments.map((item) => [item.id, item] as const));
            return previous.map((item) => lookup.get(item.id) ?? item);
          });
        }
        setBackfillMessage(
          result.enrollmentsCreated > 0
            ? `Enrolled ${result.enrollmentsCreated} learner${result.enrollmentsCreated === 1 ? "" : "s"}.`
            : "No new enrollments were needed."
        );
      } catch (error) {
        setBackfillMessage(error instanceof Error ? error.message : "Unable to backfill enrollments.");
      }
    });
  };

  const downloadCsv = () => {
    const rows: CSVRow[] = filteredAssignments.map((entry) => ({
      assignmentId: entry.record.id,
      group: entry.record.group.name,
      module: entry.moduleTitle,
      dueAt: formatDueDate(entry.record.dueAt),
      learnerCount: entry.learnerCount,
    }));

    const header = "assignmentId,group,module,dueAt,learnerCount";
    const csv = [header, ...rows.map((row) =>
      [row.assignmentId, row.group, row.module, row.dueAt, row.learnerCount.toString()]
        .map((value) => `"${value.replace(/"/g, '""')}"`)
        .join(",")
    )].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `assignments-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFilterChange = (field: keyof AssignmentFilters, value: string) => {
    setFilters((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const renderStatusBadge = (status: "active" | "past") => {
    if (status === "active") {
      return <Badge tone="default">Active</Badge>;
    }
    return <Badge tone="destructive">Past</Badge>;
  };

  const renderBackfillAlerts = () => {
    if (assignmentsNeedingBackfill.length === 0) {
      return null;
    }

    return (
      <div className="space-y-3">
        {assignmentsNeedingBackfill.map((gap) => (
          <Alert key={`${gap.assignmentId}-${gap.groupId}`} status="warning" borderRadius="lg">
            <AlertIcon />
            <div className="flex flex-col gap-1">
              <AlertTitle>Backfill enrollments?</AlertTitle>
              <AlertDescription>
                {gap.missingCount} learner{gap.missingCount === 1 ? "" : "s"} in <strong>{gap.groupName}</strong> are missing access to
                <strong> {gap.moduleTitle}</strong>.
              </AlertDescription>
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleBackfill(gap.groupId, gap.moduleId)}
                  disabled={isBackfilling}
                >
                  {isBackfilling ? "Backfilling…" : "Backfill now"}
                </Button>
              </div>
            </div>
          </Alert>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle>Create a new assignment</CardTitle>
          <CardDescription>Assign a module to a learner group and set an optional due date.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="group-select">Group</Label>
              <Select
                id="group-select"
                value={createForm.groupId}
                onChange={(event) => handleCreateInputChange("groupId", event.target.value)}
              >
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name} ({group.members.length})
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-select">Course</Label>
              <Select
                id="course-select"
                value={createForm.courseId}
                onChange={(event) => handleCreateInputChange("courseId", event.target.value)}
              >
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="module-select">Module</Label>
              <Select
                id="module-select"
                value={createForm.moduleId}
                onChange={(event) => handleCreateInputChange("moduleId", event.target.value)}
              >
                {modulesForCourse.map((module) => (
                  <option key={module.id} value={module.id}>
                    {module.title}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="due-at">Due date (optional)</Label>
              <Input
                id="due-at"
                type="datetime-local"
                value={createForm.dueAt}
                onChange={(event) => handleCreateInputChange("dueAt", event.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="assignment-label">Label (optional)</Label>
              <Input
                id="assignment-label"
                placeholder="Quarterly compliance module"
                value={createForm.label}
                onChange={(event) => handleCreateInputChange("label", event.target.value)}
              />
            </div>
          </div>
          {createError ? (
            <Alert status="error" borderRadius="lg">
              <AlertIcon />
              <AlertDescription>{createError}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button type="button" onClick={handleCreateAssignment} disabled={isCreating}>
            {isCreating ? "Creating…" : "Create assignment"}
          </Button>
        </CardFooter>
      </Card>

      {renderBackfillAlerts()}
      {backfillMessage ? (
        <Alert status="info" borderRadius="lg">
          <AlertIcon />
          <AlertDescription>{backfillMessage}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader className="space-y-2">
          <CardTitle>Assignments</CardTitle>
          <CardDescription>Manage due dates, withdraw assignments, and export enrollment summaries.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="filter-group">Filter by group</Label>
              <Select
                id="filter-group"
                value={filters.groupId}
                onChange={(event) => handleFilterChange("groupId", event.target.value)}
              >
                <option value="all">All groups</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-module">Filter by module</Label>
              <Select
                id="filter-module"
                value={filters.moduleId}
                onChange={(event) => handleFilterChange("moduleId", event.target.value)}
              >
                <option value="all">All modules</option>
                {moduleOptions.map((module) => (
                  <option key={module.id} value={module.id}>
                    {module.courseTitle} — {module.title}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-status">Status</Label>
              <Select
                id="filter-status"
                value={filters.status}
                onChange={(event) => handleFilterChange("status", event.target.value)}
              >
                <option value="all">All assignments</option>
                <option value="active">Active</option>
                <option value="past">Past due</option>
              </Select>
            </div>
            <div className="flex items-end justify-end">
              <Button type="button" variant="outline" onClick={downloadCsv}>
                Export CSV
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-base-300">
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th width="40px">
                    <input
                      type="checkbox"
                      aria-label="Select all assignments"
                      checked={filteredAssignments.length > 0 && filteredAssignments.every((entry) => selection[entry.record.id])}
                      onChange={(event) => handleSelectAll(event.target.checked)}
                    />
                  </Th>
                  <Th>Assignment</Th>
                  <Th>Group</Th>
                  <Th>Module</Th>
                  <Th>Due date</Th>
                  <Th>Learners</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredAssignments.length === 0 ? (
                  <Tr>
                    <Td colSpan={7} className="text-center text-sm text-muted-foreground">
                      No assignments match the current filters.
                    </Td>
                  </Tr>
                ) : (
                  filteredAssignments.map((entry) => (
                    <Tr key={entry.record.id} className={cn(entry.missingMembers.length > 0 ? "bg-yellow-50" : "") }>
                      <Td>
                        <input
                          type="checkbox"
                          aria-label={`Select assignment ${entry.record.id}`}
                          checked={Boolean(selection[entry.record.id])}
                          onChange={() => handleSelectionToggle(entry.record.id)}
                        />
                      </Td>
                      <Td>
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{entry.record.label ?? entry.moduleTitle}</span>
                          <span className="text-xs text-muted-foreground">
                            Created {format(new Date(entry.record.createdAt), "PPp")}
                          </span>
                          {entry.missingMembers.length > 0 ? (
                            <span className="text-xs text-amber-600">
                              {entry.missingMembers.length} learner{entry.missingMembers.length === 1 ? "" : "s"} missing enrollment
                            </span>
                          ) : null}
                        </div>
                      </Td>
                      <Td>{entry.record.group.name}</Td>
                      <Td>{entry.moduleTitle}</Td>
                      <Td>{formatDueDate(entry.record.dueAt)}</Td>
                      <Td>{entry.learnerCount}</Td>
                      <Td>{renderStatusBadge(entry.status as "active" | "past")}</Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </div>

          <div className="space-y-4 rounded-lg border border-base-300 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold">Bulk actions</h3>
                <p className="text-xs text-muted-foreground">
                  Select assignments to update due dates or withdraw access.
                </p>
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="destructive" onClick={handleWithdraw} disabled={isWithdrawing || !hasSelection}>
                  {isWithdrawing ? "Withdrawing…" : "Withdraw"}
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <div className="space-y-2">
                <Label htmlFor="bulk-due-at">New due date</Label>
                <Input
                  id="bulk-due-at"
                  type="datetime-local"
                  value={bulkDue.dueAt}
                  onChange={(event) => setBulkDue((previous) => ({ ...previous, dueAt: event.target.value }))}
                />
              </div>
              <Button
                type="button"
                onClick={handleBulkDueUpdate}
                disabled={isBulkUpdating || !hasSelection}
              >
                {isBulkUpdating ? "Updating…" : "Apply to selected"}
              </Button>
            </div>

            {bulkError ? (
              <Alert status="error" borderRadius="lg">
                <AlertIcon />
                <AlertDescription>{bulkError}</AlertDescription>
              </Alert>
            ) : null}
            {withdrawError ? (
              <Alert status="error" borderRadius="lg">
                <AlertIcon />
                <AlertDescription>{withdrawError}</AlertDescription>
              </Alert>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
