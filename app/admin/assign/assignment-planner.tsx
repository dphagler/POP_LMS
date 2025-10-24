"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Tr
} from "@chakra-ui/react";
import { assignToGroupsAction, type AssignToGroupsResult } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isPending) {
      return;
    }

    if ((mode === "module" && !selectedModule) || (mode === "course" && !selectedCourseId)) {
      setError("Select content to assign");
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

    if (selectedGroupIds.length === 0 || preview.newMembers.length === 0) {
      setError("Choose at least one group with learners to enroll");
      return;
    }

    startTransition(async () => {
      try {
        const response = await assignToGroupsAction(payload);
        setResult(response);
      } catch (assignmentError) {
        setError(
          assignmentError instanceof Error
            ? assignmentError.message
            : "Unable to assign. Please try again."
        );
      }
    });
  };

  const isCompact = density === "compact";
  const groupListClasses = cn(
    "grid",
    isCompact ? "gap-2" : "gap-3",
    groups.length > 1 ? "sm:grid-cols-2" : "",
    groups.length > 2 ? "xl:grid-cols-3" : ""
  );
  const hasGroups = groups.length > 0;
  const assignButtonLabel = isPending ? "Assigning…" : "Assign to groups";

  return (
    <Card className="overflow-hidden border border-base-300">
      <form onSubmit={handleSubmit} className="flex h-full flex-col">
        <CardHeader className="gap-4 border-b border-base-200 pb-6">
          <div className="space-y-1">
            <CardTitle>Assignment planner</CardTitle>
            <CardDescription className="max-w-2xl text-base-content/70">
              Pick the scope, choose your groups, and review the enrollment preview before assigning.
            </CardDescription>
          </div>
          <fieldset className="space-y-3">
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
        <CardContent className="flex-1 space-y-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <div className="space-y-6">
              <section className="space-y-4 rounded-box border border-base-300 bg-base-100/80 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-foreground">
                  {mode === "course" ? "Select a course" : "Select a module"}
                </h3>
                {mode === "course" ? (
                  <div className="form-control w-full">
                    <label htmlFor="course-select" className="label">
                      <span className="label-text font-semibold">Course</span>
                    </label>
                    <Select
                      id="course-select"
                      value={selectedCourseId}
                      onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                        setSelectedCourseId(event.target.value)
                      }
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
                      onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                        setSelectedModuleId(event.target.value)
                      }
                    >
                      {moduleOptions.map((module) => (
                        <option key={module.id} value={module.id}>
                          {module.courseTitle} — {module.title}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
              </section>

              <section className="space-y-4 rounded-box border border-base-300 bg-base-100/80 p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-foreground">Select groups</h3>
                    <p className="text-xs text-base-content/70">
                      Members from selected groups are enrolled unless they already have access.
                    </p>
                  </div>
                  {hasGroups ? (
                    <DataDensityToggle density={density} onDensityChange={setDensity} className="sm:mt-0" />
                  ) : null}
                </div>

                {hasGroups ? (
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
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No groups available. Create a group first to assign content.
                  </p>
                )}
              </section>
            </div>

            <div className="space-y-5">
              <section className="space-y-4 rounded-box border border-base-300 bg-base-100/80 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-foreground">Assignment summary</h3>
                <dl className="grid gap-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-base-content/70">Assignment</dt>
                    <dd className="text-right font-medium text-base-content">
                      {assignmentLabel || "Select a course or module"}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-base-content/70">Selected groups</dt>
                    <dd className="text-right font-medium text-base-content">
                      {preview.selectedGroups.length}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-base-content/70">Learners to enroll</dt>
                    <dd className="text-right font-medium text-base-content">
                      {preview.newMembers.length}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-base-content/70">Already enrolled</dt>
                    <dd className="text-right font-medium text-base-content">
                      {preview.existingMembers.length}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="space-y-4 rounded-box border border-base-300 bg-base-100/80 p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    Learners gaining access ({preview.newMembers.length})
                  </h3>
                  {preview.existingMembers.length > 0 ? (
                    <p className="text-xs text-base-content/60">
                      {preview.existingMembers.length} already enrolled learner
                      {preview.existingMembers.length === 1 ? "" : "s"} will be skipped.
                    </p>
                  ) : null}
                </div>

                {preview.newMembers.length > 0 ? (
                  <TableContainer
                    borderRadius="xl"
                    borderWidth="1px"
                    bg="bg.surface"
                    shadow="md"
                    maxH="16rem"
                    overflowY="auto"
                  >
                    <Table size={isCompact ? "sm" : "md"} variant="striped">
                      <Thead position="sticky" top={0} zIndex="docked" bg="bg.surface">
                        <Tr>
                          <Th fontSize="xs" textTransform="uppercase" letterSpacing="0.2em" color="fg.muted">
                            Learner
                          </Th>
                          <Th fontSize="xs" textTransform="uppercase" letterSpacing="0.2em" color="fg.muted">
                            Email
                          </Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {preview.newMembers.map((member) => (
                          <Tr key={member.id}>
                            <Td fontWeight="semibold">{member.name?.trim() || member.email}</Td>
                            <Td fontFamily="mono" fontSize="sm" color="fg.muted">
                              {member.email}
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </TableContainer>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No new learners will be enrolled with the current selection.
                  </p>
                )}
              </section>

              {error ? (
                <Alert status="error" borderRadius="lg">
                  <AlertIcon />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
              {result ? (
                <Alert
                  status={result.enrollmentsCreated > 0 ? "success" : "info"}
                  borderRadius="lg"
                >
                  <AlertIcon />
                  <AlertDescription>
                    {result.enrollmentsCreated > 0
                      ? `Enrolled ${result.enrollmentsCreated} learner${result.enrollmentsCreated === 1 ? "" : "s"}. ${result.alreadyEnrolled} were already enrolled.`
                      : "Everything is already assigned—no new enrollments were needed."}
                  </AlertDescription>
                </Alert>
              ) : null}
            </div>
          </div>
        </CardContent>
        <CardFooter className="mt-auto w-full border-t border-base-200 bg-base-100/80 backdrop-blur supports-[backdrop-filter]:bg-base-100/60">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-base-content/70">
              {preview.newMembers.length > 0
                ? `${preview.newMembers.length} learner${preview.newMembers.length === 1 ? "" : "s"} ready to enroll.`
                : "No new learners selected yet."}
            </p>
            <Button type="submit" disabled={!canAssign} aria-disabled={!canAssign}>
              {assignButtonLabel}
            </Button>
          </div>
        </CardFooter>
      </form>
    </Card>
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
