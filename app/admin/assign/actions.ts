"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const assignmentInclude = {
  enrollments: { select: { userId: true } }
} as const;

type AssignmentWithEnrollments = Prisma.AssignmentGetPayload<{
  include: typeof assignmentInclude;
}>;

export type AssignToGroupsInput = {
  mode: "course" | "module";
  courseId: string;
  moduleId: string | null;
  groupIds: string[];
};

export type AssignToGroupsResult = {
  assignmentId: string;
  createdAssignment: boolean;
  enrollmentsCreated: number;
  totalLearners: number;
  alreadyEnrolled: number;
};

export async function assignToGroupsAction(input: AssignToGroupsInput): Promise<AssignToGroupsResult> {
  const session = await requireRole("ADMIN");
  const { id: userId, orgId } = session.user;

  if (!orgId) {
    throw new Error("Organization not found for admin user");
  }

  if (!input.groupIds.length) {
    throw new Error("Select at least one group to assign");
  }

  if (!input.courseId) {
    throw new Error("Course is required for assignments");
  }

  const groupIds = Array.from(new Set(input.groupIds));

  const [course, moduleRecord, groups] = await Promise.all([
    prisma.course.findFirst({
      where: { id: input.courseId, orgId }
    }),
    input.mode === "module" && input.moduleId
      ? prisma.module.findFirst({
          where: { id: input.moduleId, course: { orgId } },
          include: { course: true }
        })
      : null,
    prisma.orgGroup.findMany({
      where: { orgId, id: { in: groupIds } },
      include: { members: true }
    })
  ]);

  if (!course) {
    throw new Error("Selected course not found");
  }

  if (groupIds.length !== groups.length) {
    throw new Error("One or more selected groups were not found");
  }

  if (input.mode === "module") {
    if (!moduleRecord) {
      throw new Error("Selected module not found");
    }

    if (moduleRecord.courseId !== course.id) {
      throw new Error("Module does not belong to the selected course");
    }
  }

  const learnerIds = new Set<string>();
  for (const group of groups) {
    for (const member of group.members) {
      learnerIds.add(member.userId);
    }
  }

  const targetCourseId = input.mode === "module" && moduleRecord ? moduleRecord.courseId : course.id;
  const targetModuleId = input.mode === "module" ? moduleRecord?.id ?? null : null;

  let assignment: AssignmentWithEnrollments | null = await prisma.assignment.findFirst({
    where: {
      orgId,
      courseId: targetCourseId,
      moduleId: targetModuleId
    },
    include: assignmentInclude
  });

  let createdAssignment = false;

  if (!assignment) {
    assignment = await prisma.assignment.create({
      data: {
        orgId,
        courseId: targetCourseId,
        moduleId: targetModuleId,
        createdBy: userId
      },
      include: assignmentInclude
    });
    createdAssignment = true;
  }

  const existingEnrollments = new Set(assignment.enrollments.map((enrollment) => enrollment.userId));
  const learnersToEnroll = Array.from(learnerIds).filter((learnerId) => !existingEnrollments.has(learnerId));

  if (learnersToEnroll.length > 0) {
    await prisma.enrollment.createMany({
      data: learnersToEnroll.map((learnerId) => ({
        assignmentId: assignment!.id,
        userId: learnerId
      }))
    });
  }

  revalidatePath("/app");
  revalidatePath("/admin/assign");

  return {
    assignmentId: assignment.id,
    createdAssignment,
    enrollmentsCreated: learnersToEnroll.length,
    totalLearners: learnerIds.size,
    alreadyEnrolled: learnerIds.size - learnersToEnroll.length
  };
}
