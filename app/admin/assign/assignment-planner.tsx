"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { assignToGroupsAction, type AssignToGroupsResult } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { DataDensityToggle, type DataDensity } from "@/components/admin/data-density-toggle";
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
            <div className="form-control w-full">
              <label htmlFor="course-select" className="label">
                <span className="label-text font-semibold">Course</span>
              </label>
              <Select
                id="course-select"
                value={selectedCourseId}
                onChange={(event) => setSelectedCourseId(event.target.value)}
              >
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </Select>
            </div>
          ) : (
            <div className="form-control w-full">
              <label htmlFor="module-select" className="label">
                <span className="label-text font-semibold">Module</span>
              </label>
              <Select
                id="module-select"
                value={selectedModuleId}
                onChange={(event) => setSelectedModuleId(event.target.value)}
              >
                {moduleOptions.map((module) => (
                  <option key={module.id} value={module.id}>
                    {module.courseTitle} — {module.title}
                  </option>
                ))}
              </Select>
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
              {groups.map((group) => {
                const checkboxId = `group-${group.id}`;
                return (
                  <label
                    key={group.id}
                    htmlFor={checkboxId}
                    className={cn(
                      "card cursor-pointer border border-base-200 bg-base-100 transition hover:border-primary/40 hover:shadow-lg",
                      isCompact ? "p-3" : "p-4"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        id={checkboxId}
                        type="checkbox"
                        className="checkbox checkbox-primary mt-1"
                        checked={selectedGroupIds.includes(group.id)}
                        onChange={() => handleGroupToggle(group.id)}
                      />
                      <span className="space-y-1">
                        <span className="block font-semibold text-base-content">{group.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {group.members.length} member{group.members.length === 1 ? "" : "s"}
                        </span>
                      </span>
                    </div>
                  </label>
                );
              })}
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
              <div className="max-h-64 overflow-y-auto rounded-box border border-base-200 bg-base-100 p-3 shadow-inner">
                <ul className={cn("flex flex-col", memberListSpacing)}>
                  {preview.newMembers.map((member) => (
                    <li
                      key={member.id}
                      className={cn(
                        "rounded-box bg-base-200 px-3 text-sm",
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
            <div className="alert alert-error">
              <span>{error}</span>
            </div>
          ) : null}
          {result ? (
            <div className={cn("alert", result.enrollmentsCreated > 0 ? "alert-success" : "alert-info")}> 
              {result.enrollmentsCreated > 0 ? (
                <span>
                  Enrolled {result.enrollmentsCreated} learner{result.enrollmentsCreated === 1 ? "" : "s"}. {result.alreadyEnrolled} were already enrolled.
                </span>
              ) : (
                <span>Everything is already assigned—no new enrollments were needed.</span>
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
    <Button
      type="button"
      onClick={onClick}
      variant={active ? "primary" : "outline"}
      className={cn(
        "min-w-[140px] max-w-xs flex flex-1 flex-col items-start gap-1 whitespace-normal text-left text-sm sm:w-auto",
        "h-auto px-4 py-3"
      )}
      aria-pressed={active}
    >
      <span className={cn("font-semibold", active ? "text-primary-foreground" : "text-foreground")}>{label}</span>
      <span className={cn("text-xs", active ? "text-primary-foreground/80" : "text-muted-foreground")}>{description}</span>
    </Button>
  );
}
