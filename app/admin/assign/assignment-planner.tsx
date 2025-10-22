"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { assignToGroupsAction, type AssignToGroupsResult } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataDensityToggle, type DataDensity } from "@/components/admin/data-density-toggle";
import { Label } from "@/components/ui/label";
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
  email: string;
};

type GroupOption = {
  id: string;
  name: string;
  members: GroupMember[];
};

type AssignmentOption = {
  id: string;
  courseId: string | null;
  moduleId: string | null;
  enrollments: { userId: string }[];
};

type AssignmentPlannerProps = {
  courses: CourseOption[];
  groups: GroupOption[];
  assignments: AssignmentOption[];
};

type AssignmentMode = "course" | "module";

type PreviewSummary = {
  selectedGroups: GroupOption[];
  allMembers: GroupMember[];
  newMembers: GroupMember[];
  existingMembers: GroupMember[];
};

function formatMemberLabel(member: GroupMember) {
  return member.name ? `${member.name} (${member.email})` : member.email;
}

export default function AssignmentPlanner({ courses, groups, assignments }: AssignmentPlannerProps) {
  const [mode, setMode] = useState<AssignmentMode>("course");
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courses[0]?.id ?? "");
  const [selectedModuleId, setSelectedModuleId] = useState<string>("");
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [result, setResult] = useState<AssignToGroupsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [density, setDensity] = useState<DataDensity>("comfortable");

  const moduleOptions = useMemo(() =>
    courses.flatMap((course) =>
      course.modules.map((module) => ({
        ...module,
        courseTitle: course.title,
        courseId: course.id
      }))
    ),
  [courses]);

  useEffect(() => {
    if (mode === "course") {
      if (!selectedCourseId && courses.length > 0) {
        setSelectedCourseId(courses[0].id);
      }
      setSelectedModuleId("");
    } else if (mode === "module") {
      if (!selectedModuleId && moduleOptions.length > 0) {
        setSelectedModuleId(moduleOptions[0].id);
      }
    }
  }, [mode, courses, moduleOptions, selectedCourseId, selectedModuleId]);

  const selectedModule = useMemo(
    () => moduleOptions.find((module) => module.id === selectedModuleId) ?? null,
    [moduleOptions, selectedModuleId]
  );

  const targetAssignment = useMemo(() => {
    if (mode === "module" && selectedModuleId) {
      return assignments.find((assignment) => assignment.moduleId === selectedModuleId) ?? null;
    }

    if (mode === "course" && selectedCourseId) {
      return assignments.find(
        (assignment) => assignment.courseId === selectedCourseId && assignment.moduleId === null
      ) ?? null;
    }

    return null;
  }, [assignments, mode, selectedCourseId, selectedModuleId]);

  const preview = useMemo<PreviewSummary>(() => {
    const selectedGroups = groups.filter((group) => selectedGroupIds.includes(group.id));
    const memberMap = new Map<string, GroupMember>();

    selectedGroups.forEach((group) => {
      group.members.forEach((member) => {
        if (!memberMap.has(member.id)) {
          memberMap.set(member.id, member);
        }
      });
    });

    const allMembers = Array.from(memberMap.values());
    const existingEnrollmentIds = new Set(
      (targetAssignment?.enrollments ?? []).map((enrollment) => enrollment.userId)
    );
    const newMembers = allMembers.filter((member) => !existingEnrollmentIds.has(member.id));
    const existingMembers = allMembers.filter((member) => existingEnrollmentIds.has(member.id));

    return {
      selectedGroups,
      allMembers,
      newMembers,
      existingMembers
    };
  }, [groups, selectedGroupIds, targetAssignment]);

  const assignmentLabel = useMemo(() => {
    if (mode === "module") {
      if (!selectedModule) return "";
      return `${selectedModule.courseTitle} — ${selectedModule.title}`;
    }

    const course = courses.find((item) => item.id === selectedCourseId);
    return course ? course.title : "";
  }, [mode, selectedModule, courses, selectedCourseId]);

  const canAssign =
    (mode === "course" ? Boolean(selectedCourseId) : Boolean(selectedModuleId)) &&
    selectedGroupIds.length > 0 &&
    preview.newMembers.length > 0 &&
    !isPending;

  const handleGroupToggle = (groupId: string) => {
    setSelectedGroupIds((previous) =>
      previous.includes(groupId)
        ? previous.filter((id) => id !== groupId)
        : [...previous, groupId]
    );
  };

  const handleAssign = () => {
    if ((mode === "module" && !selectedModule) || (mode === "course" && !selectedCourseId)) {
      return;
    }

    setError(null);
    setResult(null);

    const payload = {
      mode,
      courseId: mode === "course" ? selectedCourseId : selectedModule?.courseId ?? "",
      moduleId: mode === "module" ? selectedModuleId : null,
      groupIds: selectedGroupIds
    };

    if (!payload.courseId) {
      setError("Select a course to continue");
      return;
    }

    startTransition(async () => {
      try {
        const response = await assignToGroupsAction(payload);
        setResult(response);
      } catch (assignmentError) {
        setError(assignmentError instanceof Error ? assignmentError.message : "Unable to assign. Please try again.");
      }
    });
  };

  const isCompact = density === "compact";
  const groupListClasses = cn("grid", isCompact ? "gap-2" : "gap-3", groups.length > 1 ? "sm:grid-cols-2" : "");
  const memberListSpacing = isCompact ? "space-y-1.5" : "space-y-2";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-4 pb-4">
          <div className="space-y-1">
            <CardTitle>Choose what to assign</CardTitle>
            <CardDescription className="prose prose-sm text-muted-foreground max-w-none">
              Select a course or module, then pick the groups that should receive it.
            </CardDescription>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-foreground">Assignment scope</legend>
            <div className="flex flex-wrap gap-2">
              <ScopeToggleButton
                active={mode === "course"}
                label="Course"
                description="Enroll the full course and its modules."
                onClick={() => setMode("course")}
              />
              <ScopeToggleButton
                active={mode === "module"}
                label="Module"
                description="Target a single module within a course."
                onClick={() => setMode("module")}
              />
            </div>
          </fieldset>
        </CardHeader>
        <CardContent className="space-y-4">
          {mode === "course" ? (
            <div className="space-y-2">
              <Label htmlFor="course-select">Course</Label>
              <select
                id="course-select"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={selectedCourseId}
                onChange={(event) => setSelectedCourseId(event.target.value)}
              >
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="module-select">Module</Label>
              <select
                id="module-select"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={selectedModuleId}
                onChange={(event) => setSelectedModuleId(event.target.value)}
              >
                {moduleOptions.map((module) => (
                  <option key={module.id} value={module.id}>
                    {module.courseTitle} — {module.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Select groups</CardTitle>
            <CardDescription className="prose prose-sm text-muted-foreground max-w-none">
              Members from the selected groups will be enrolled if they are not already assigned.
            </CardDescription>
          </div>
          {groups.length > 0 ? (
            <DataDensityToggle
              density={density}
              onDensityChange={setDensity}
              className="sm:mt-1"
            />
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">No groups available. Create a group first to assign content.</p>
          ) : (
            <div className={groupListClasses}>
              {groups.map((group) => (
                <label
                  key={group.id}
                  className={cn(
                    "flex items-start rounded-xl border border-slate-200/10 bg-white/10 text-sm shadow-sm backdrop-blur transition hover:border-slate-200/30 hover:bg-white/20 focus-within:border-primary focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background dark:border-slate-800/40 dark:bg-slate-900/20 dark:hover:border-slate-700/60 dark:hover:bg-slate-900/30",
                    isCompact ? "gap-2 p-2" : "gap-3 p-3"
                  )}
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border border-input"
                    checked={selectedGroupIds.includes(group.id)}
                    onChange={() => handleGroupToggle(group.id)}
                  />
                  <span className="space-y-1">
                    <span className="block font-medium text-foreground">{group.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {group.members.length} member{group.members.length === 1 ? "" : "s"}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Preview enrollment</CardTitle>
          <CardDescription className="prose prose-sm text-muted-foreground max-w-none">
            Double-check who will gain access before assigning.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1 text-sm">
            <p>
              <span className="font-medium">Assignment:</span> {assignmentLabel || "Select a course or module"}
            </p>
            <p>
              <span className="font-medium">Selected groups:</span> {preview.selectedGroups.length}
            </p>
            <p>
              <span className="font-medium">Learners to enroll:</span> {preview.newMembers.length}
            </p>
            {preview.existingMembers.length > 0 ? (
              <p className="text-muted-foreground">
                {preview.existingMembers.length} already enrolled learner{preview.existingMembers.length === 1 ? "" : "s"} will be skipped automatically.
              </p>
            ) : null}
          </div>

          {preview.newMembers.length > 0 ? (
            <div className="space-y-4">
              <p className="text-sm font-medium">Learners gaining access</p>
              <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200/10 bg-white/10 p-3 shadow-sm backdrop-blur dark:border-slate-800/40 dark:bg-slate-900/20">
                <ul className={cn("flex flex-col", memberListSpacing)}>
                  {preview.newMembers.map((member) => (
                    <li
                      key={member.id}
                      className={cn(
                        "rounded-lg border border-slate-200/20 bg-white/20 px-3 text-sm shadow-sm backdrop-blur dark:border-slate-800/40 dark:bg-slate-900/40",
                        isCompact ? "py-1.5" : "py-2"
                      )}
                    >
                      {formatMemberLabel(member)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No new learners to enroll based on the current selection.</p>
          )}

          {error ? (
            <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          {result ? (
            <div
              className={cn(
                "rounded-md border px-3 py-2 text-sm shadow-sm backdrop-blur",
                result.enrollmentsCreated > 0
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-900"
                  : "border-sky-500/40 bg-sky-500/10 text-sky-900"
              )}
            >
              {result.enrollmentsCreated > 0 ? (
                <p>
                  Enrolled {result.enrollmentsCreated} learner{result.enrollmentsCreated === 1 ? "" : "s"}. {result.alreadyEnrolled} were already enrolled.
                </p>
              ) : (
                <p>Everything is already assigned—no new enrollments were needed.</p>
              )}
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button type="button" onClick={handleAssign} disabled={!canAssign}>
              {isPending ? "Assigning..." : "Assign to groups"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

type ScopeToggleButtonProps = {
  active: boolean;
  label: string;
  description: string;
  onClick: () => void;
};

function ScopeToggleButton({ active, label, description, onClick }: ScopeToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-w-[140px] max-w-xs flex-1 flex-col gap-1 rounded-xl border border-slate-200/10 bg-white/10 px-3 py-2 text-left text-sm shadow-sm backdrop-blur transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-auto dark:border-slate-800/40 dark:bg-slate-900/20",
        active
          ? "border-primary/40 bg-primary/10"
          : "hover:border-slate-200/40 hover:bg-white/20 dark:hover:bg-slate-900/30"
      )}
      aria-pressed={active}
    >
      <span className={cn("font-medium", active ? "text-primary" : "text-foreground")}>{label}</span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </button>
  );
}
