import type { Prisma, PrismaClient } from '@prisma/client';

import { prisma } from '../prisma';

const assignmentInclude = {
  group: {
    select: {
      id: true,
      name: true,
      members: {
        select: {
          userId: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  },
  module: {
    select: {
      id: true,
      title: true,
      course: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  },
  course: {
    select: {
      id: true,
      title: true,
    },
  },
  enrollments: {
    select: {
      userId: true,
    },
  },
} satisfies Prisma.AssignmentInclude;

export type AssignmentWithRelations = Prisma.AssignmentGetPayload<{
  include: typeof assignmentInclude;
}>;

export type AssignmentMember = {
  id: string;
  name: string | null;
  email: string | null;
};

export type SerializedAssignment = {
  id: string;
  orgId: string;
  label: string | null;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
  group: {
    id: string;
    name: string;
    members: AssignmentMember[];
  };
  module: {
    id: string;
    title: string;
    course: {
      id: string;
      title: string;
    } | null;
  } | null;
  course: {
    id: string;
    title: string;
  } | null;
  enrollments: { userId: string }[];
};

export type CreateAssignmentParams = {
  orgId: string;
  createdBy: string;
  groupId: string;
  moduleId: string;
  dueAt: Date | null;
  label: string | null;
};

export type CreateAssignmentResult = {
  assignment: SerializedAssignment;
  created: boolean;
  enrollmentsCreated: number;
  totalMembers: number;
};

export type BulkUpdateDueAtResult = SerializedAssignment[];

export type WithdrawAssignmentsResult = {
  removedIds: string[];
};

export type BackfillEnrollmentsResult = {
  assignments: SerializedAssignment[];
  enrollmentsCreated: number;
  totalMembers: number;
};

type PrismaClientOrTx = PrismaClient | Prisma.TransactionClient;

function serializeAssignment(record: AssignmentWithRelations): SerializedAssignment {
  return {
    id: record.id,
    orgId: record.orgId,
    label: record.label,
    dueAt: record.dueAt ? record.dueAt.toISOString() : null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    group: {
      id: record.group.id,
      name: record.group.name,
      members: record.group.members.map((member) => ({
        id: member.userId,
        name: member.user?.name ?? null,
        email: member.user?.email ?? null,
      })),
    },
    module: record.module
      ? {
          id: record.module.id,
          title: record.module.title,
          course: record.module.course
            ? {
                id: record.module.course.id,
                title: record.module.course.title,
              }
            : null,
        }
      : null,
    course: record.course
      ? {
          id: record.course.id,
          title: record.course.title,
        }
      : null,
    enrollments: record.enrollments.map((enrollment) => ({ userId: enrollment.userId })),
  };
}

async function fetchAssignmentWithRelations(
  client: PrismaClientOrTx,
  assignmentId: string
): Promise<SerializedAssignment | null> {
  const record = await client.assignment.findUnique({
    where: { id: assignmentId },
    include: assignmentInclude,
  });

  return record ? serializeAssignment(record) : null;
}

export async function listAssignmentsForOrg(
  orgId: string,
  client: PrismaClientOrTx = prisma
): Promise<SerializedAssignment[]> {
  const records = await client.assignment.findMany({
    where: { orgId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    include: assignmentInclude,
  });
  return records.map(serializeAssignment);
}

export async function createAssignmentWithEnrollments(
  params: CreateAssignmentParams,
  client: PrismaClientOrTx = prisma
): Promise<CreateAssignmentResult> {
  const { orgId, groupId, moduleId, createdBy, dueAt, label } = params;

  const [groupRecord, moduleRecord] = await Promise.all([
    client.orgGroup.findFirst({
      where: { id: groupId, orgId },
      include: {
        members: {
          select: {
            userId: true,
          },
        },
      },
    }),
    client.module.findFirst({
      where: { id: moduleId, course: { orgId } },
      select: {
        id: true,
        courseId: true,
      },
    }),
  ]);

  if (!groupRecord) {
    throw new Error('Group not found for organization.');
  }

  if (!moduleRecord) {
    throw new Error('Module not found for organization.');
  }

  const existingAssignment = await client.assignment.findFirst({
    where: {
      orgId,
      groupId,
      moduleId,
      deletedAt: null,
    },
  });

  let assignmentId: string;
  let created = false;

  if (existingAssignment) {
    const updated = await client.assignment.update({
      where: { id: existingAssignment.id },
      data: {
        dueAt,
        label,
      },
    });
    assignmentId = updated.id;
  } else {
    const createdAssignment = await client.assignment.create({
      data: {
        orgId,
        groupId,
        moduleId,
        courseId: moduleRecord.courseId,
        dueAt,
        label,
        createdBy,
      },
    });
    assignmentId = createdAssignment.id;
    created = true;
  }

  const memberIds = groupRecord.members.map((member) => member.userId);
  let enrollmentsCreated = 0;

  if (memberIds.length > 0) {
    const { count } = await client.enrollment.createMany({
      data: memberIds.map((userId) => ({
        assignmentId,
        userId,
      })),
      skipDuplicates: true,
    });
    enrollmentsCreated = count;
  }

  const assignment = await fetchAssignmentWithRelations(client, assignmentId);
  if (!assignment) {
    throw new Error('Assignment was not found after creation.');
  }

  return {
    assignment,
    created,
    enrollmentsCreated,
    totalMembers: memberIds.length,
  };
}

export async function bulkUpdateAssignmentsDueAt(
  orgId: string,
  assignmentIds: string[],
  dueAt: Date | null,
  client: PrismaClientOrTx = prisma
): Promise<BulkUpdateDueAtResult> {
  if (assignmentIds.length === 0) {
    return [];
  }

  await client.assignment.updateMany({
    where: {
      orgId,
      id: { in: assignmentIds },
      deletedAt: null,
    },
    data: {
      dueAt,
    },
  });

  const updated = await client.assignment.findMany({
    where: {
      id: { in: assignmentIds },
    },
    include: assignmentInclude,
  });

  return updated.map(serializeAssignment);
}

export async function withdrawAssignments(
  orgId: string,
  assignmentIds: string[],
  options: { leaveEnrollments?: boolean } = {},
  client: PrismaClientOrTx = prisma
): Promise<WithdrawAssignmentsResult> {
  if (assignmentIds.length === 0) {
    return { removedIds: [] };
  }

  const existing = await client.assignment.findMany({
    where: {
      orgId,
      id: { in: assignmentIds },
    },
    select: { id: true },
  });

  if (existing.length === 0) {
    return { removedIds: [] };
  }

  const existingIds = existing.map((record) => record.id);
  const leaveEnrollments = options.leaveEnrollments ?? true;

  if (!leaveEnrollments) {
    await client.enrollment.deleteMany({
      where: { assignmentId: { in: existingIds } },
    });
  }

  await client.assignment.deleteMany({
    where: { id: { in: existingIds } },
  });

  return { removedIds: existingIds };
}

export async function backfillAssignmentsEnrollments(
  orgId: string,
  groupId: string,
  moduleId: string,
  client: PrismaClientOrTx = prisma
): Promise<BackfillEnrollmentsResult> {
  const assignments = await client.assignment.findMany({
    where: {
      orgId,
      groupId,
      moduleId,
      deletedAt: null,
    },
    include: assignmentInclude,
  });

  if (assignments.length === 0) {
    return { assignments: [], enrollmentsCreated: 0, totalMembers: 0 };
  }

  const members = await client.groupMember.findMany({
    where: { groupId },
    select: { userId: true },
  });

  const memberIds = members.map((member) => member.userId);
  let enrollmentsCreated = 0;

  if (memberIds.length > 0) {
    for (const assignment of assignments) {
      const { count } = await client.enrollment.createMany({
        data: memberIds.map((userId) => ({ assignmentId: assignment.id, userId })),
        skipDuplicates: true,
      });
      enrollmentsCreated += count;
    }
  }

  const updated = await client.assignment.findMany({
    where: { id: { in: assignments.map((item) => item.id) } },
    include: assignmentInclude,
  });

  return {
    assignments: updated.map(serializeAssignment),
    enrollmentsCreated,
    totalMembers: memberIds.length,
  };
}
