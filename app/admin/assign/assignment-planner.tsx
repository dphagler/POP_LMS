"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { assignToGroupsAction, type AssignToGroupsResult } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Choose what to assign</CardTitle>
          <CardDescription>Select a course or module, then pick the groups that should receive it.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-medium">Assignment scope</p>
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="assignment-mode"
                  value="course"
                  checked={mode === "course"}
                  onChange={() => setMode("course")}
                />
                Course
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="assignment-mode"
                  value="module"
                  checked={mode === "module"}
                  onChange={() => setMode("module")}
                />
                Module
              </label>
            </div>
          </div>

          {mode === "course" ? (
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="course-select">
                Course
              </label>
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
              <label className="text-sm font-medium" htmlFor="module-select">
                Module
              </label>
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
        <CardHeader>
          <CardTitle>Select groups</CardTitle>
          <CardDescription>Members from the selected groups will be enrolled if they are not already assigned.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">No groups available. Create a group first to assign content.</p>
          ) : (
            <div className="grid gap-3">
              {groups.map((group) => (
                <label key={group.id} className="flex items-start gap-3 rounded-md border border-border/60 p-3 text-sm shadow-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={selectedGroupIds.includes(group.id)}
                    onChange={() => handleGroupToggle(group.id)}
                  />
                  <span>
                    <span className="block font-medium">{group.name}</span>
                    <span className="text-xs text-muted-foreground">{group.members.length} member{group.members.length === 1 ? "" : "s"}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview enrollment</CardTitle>
          <CardDescription>Double-check who will gain access before assigning.</CardDescription>
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
            <div className="space-y-2">
              <p className="text-sm font-medium">Learners gaining access</p>
              <ul className="space-y-1 text-sm">
                {preview.newMembers.map((member) => (
                  <li key={member.id} className="rounded border border-border/40 bg-muted/40 px-3 py-2">
                    {formatMemberLabel(member)}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No new learners to enroll based on the current selection.</p>
          )}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {result ? (
            <div className="rounded-md border border-border/40 bg-muted/40 p-3 text-sm">
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
