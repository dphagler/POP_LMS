'use server';

import { revalidatePath } from 'next/cache';

import { requireRole } from '@/lib/authz';
import { logAudit } from '@/lib/db/audit';
import {
  backfillAssignmentsEnrollments,
  bulkUpdateAssignmentsDueAt,
  createAssignmentWithEnrollments,
  listAssignmentsForOrg,
  withdrawAssignments,
  type BackfillEnrollmentsResult,
  type BulkUpdateDueAtResult,
  type CreateAssignmentResult,
  type SerializedAssignment,
  type WithdrawAssignmentsResult,
} from '@/lib/db/assignment';

function parseDueAt(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export type CreateAssignmentInput = {
  groupId: string;
  moduleId: string;
  dueAt?: string | null;
  label?: string | null;
};

export type BulkUpdateDueAtInput = {
  ids: string[];
  dueAt?: string | null;
};

export type WithdrawAssignmentsInput = {
  ids: string[];
};

export type BackfillEnrollmentsInput = {
  groupId: string;
  moduleId: string;
};

function sanitizeLabel(label: string | null | undefined): string | null {
  if (!label) {
    return null;
  }

  const trimmed = label.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function sanitizeAssignments(assignments: SerializedAssignment[]): SerializedAssignment[] {
  return assignments.map((assignment) => ({
    ...assignment,
    dueAt: assignment.dueAt,
    createdAt: assignment.createdAt,
    updatedAt: assignment.updatedAt,
  }));
}

export async function createAssignment(input: CreateAssignmentInput): Promise<CreateAssignmentResult> {
  const session = await requireRole('ADMIN');
  const { user } = session;

  if (!user.orgId) {
    throw new Error('Organization context is required.');
  }

  const result = await createAssignmentWithEnrollments({
    orgId: user.orgId,
    createdBy: user.id,
    groupId: input.groupId,
    moduleId: input.moduleId,
    dueAt: parseDueAt(input.dueAt),
    label: sanitizeLabel(input.label ?? null),
  });

  await logAudit({
    orgId: user.orgId,
    actorId: user.id,
    action: 'assignment.create',
    targetId: result.assignment.id,
    metadata: {
      groupId: input.groupId,
      moduleId: input.moduleId,
      dueAt: result.assignment.dueAt,
      enrollmentsCreated: result.enrollmentsCreated,
      totalMembers: result.totalMembers,
    },
  });

  revalidatePath('/admin/assign');
  revalidatePath('/app');

  return {
    ...result,
    assignment: {
      ...result.assignment,
      dueAt: result.assignment.dueAt,
      createdAt: result.assignment.createdAt,
      updatedAt: result.assignment.updatedAt,
    },
  };
}

export async function bulkUpdateDueAt(input: BulkUpdateDueAtInput): Promise<BulkUpdateDueAtResult> {
  const session = await requireRole('ADMIN');
  const { user } = session;

  if (!user.orgId) {
    throw new Error('Organization context is required.');
  }

  const updated = await bulkUpdateAssignmentsDueAt(user.orgId, input.ids, parseDueAt(input.dueAt));

  if (updated.length > 0) {
    revalidatePath('/admin/assign');
    revalidatePath('/app');
  }

  return sanitizeAssignments(updated);
}

export async function withdrawAssignmentsAction(
  input: WithdrawAssignmentsInput
): Promise<WithdrawAssignmentsResult> {
  const session = await requireRole('ADMIN');
  const { user } = session;

  if (!user.orgId) {
    throw new Error('Organization context is required.');
  }

  const leaveEnrollments = process.env.LEAVE_ENROLLMENTS !== 'false';
  const result = await withdrawAssignments(user.orgId, input.ids, { leaveEnrollments });

  if (result.removedIds.length > 0) {
    await logAudit({
      orgId: user.orgId,
      actorId: user.id,
      action: 'assignment.withdraw',
      targetId: result.removedIds.join(','),
      metadata: {
        assignmentIds: result.removedIds,
        leaveEnrollments,
      },
    });
  }

  if (result.removedIds.length > 0) {
    revalidatePath('/admin/assign');
    revalidatePath('/app');
  }

  return result;
}

export async function backfillEnrollments(
  input: BackfillEnrollmentsInput
): Promise<BackfillEnrollmentsResult> {
  const session = await requireRole('ADMIN');
  const { user } = session;

  if (!user.orgId) {
    throw new Error('Organization context is required.');
  }

  const result = await backfillAssignmentsEnrollments(user.orgId, input.groupId, input.moduleId);

  if (result.assignments.length > 0 && result.enrollmentsCreated > 0) {
    revalidatePath('/admin/assign');
    revalidatePath('/app');
  }

  return {
    ...result,
    assignments: sanitizeAssignments(result.assignments),
  };
}

export async function loadAssignmentsForOrg(): Promise<SerializedAssignment[]> {
  const session = await requireRole('ADMIN');
  const { user } = session;

  if (!user.orgId) {
    throw new Error('Organization context is required.');
  }

  const assignments = await listAssignmentsForOrg(user.orgId);
  return sanitizeAssignments(assignments);
}
