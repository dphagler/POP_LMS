"use server";

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireRole } from '@/lib/authz';
import {
  addGroupMember as addGroupMemberDb,
  createGroup as createGroupDb,
  deleteGroup as deleteGroupDb,
  getGroupDetail,
  importGroupMembers as importGroupMembersDb,
  listOrgGroups,
  removeGroupMember as removeGroupMemberDb,
  toggleGroupManager as toggleGroupManagerDb,
  updateGroup as updateGroupDb,
  type GroupDetail,
  type GroupListItem,
  type GroupMemberItem,
  type ImportResult,
} from '@/lib/db/group';

const GROUPS_PATH = '/admin/groups';

const CreateGroupSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Name must be 120 characters or fewer'),
  description: z
    .string()
    .trim()
    .max(500, 'Description must be 500 characters or fewer')
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
});

const UpdateGroupSchema = CreateGroupSchema.extend({
  groupId: z.string().min(1),
});

const DeleteGroupSchema = z.object({
  groupId: z.string().min(1),
});

const AddMemberSchema = z.object({
  groupId: z.string().min(1),
  email: z.string().email('Valid email is required'),
  name: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  groupManager: z.boolean().optional(),
});

const RemoveMemberSchema = z.object({
  groupId: z.string().min(1),
  membershipId: z.string().min(1),
});

const ToggleManagerSchema = z.object({
  groupId: z.string().min(1),
  membershipId: z.string().min(1),
  groupManager: z.boolean(),
});

const ImportRowSchema = z.object({
  email: z.string(),
  name: z.string().optional(),
  groupManager: z.boolean().optional(),
  rowNumber: z.number().int().positive().optional(),
});

const ImportMembersSchema = z.object({
  groupId: z.string().min(1),
  rows: z.array(ImportRowSchema).min(1, 'At least one row is required'),
});

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function groupDetailPath(groupId: string) {
  return `${GROUPS_PATH}/${groupId}`;
}

async function requireAdminOrgId(): Promise<{ orgId: string; userId: string }> {
  const session = await requireRole('ADMIN');
  const orgId = session.user.orgId;

  if (!orgId) {
    throw new Error('Organization not found for admin user');
  }

  return { orgId, userId: session.user.id };
}

export async function createGroup(input: z.infer<typeof CreateGroupSchema>): Promise<ActionResult<GroupListItem>> {
  const { orgId } = await requireAdminOrgId();
  const payload = CreateGroupSchema.parse(input);

  const group = await createGroupDb({
    orgId,
    name: payload.name,
    description: payload.description ?? null,
  });

  revalidatePath(GROUPS_PATH);

  return { ok: true, data: group };
}

export async function listGroupsForOrg(): Promise<GroupListItem[]> {
  const { orgId } = await requireAdminOrgId();
  return listOrgGroups({ orgId });
}

export async function updateGroup(input: z.infer<typeof UpdateGroupSchema>): Promise<ActionResult<GroupDetail>> {
  const { orgId } = await requireAdminOrgId();
  const payload = UpdateGroupSchema.parse(input);

  const detail = await updateGroupDb({
    orgId,
    groupId: payload.groupId,
    name: payload.name,
    description: payload.description ?? null,
  });

  revalidatePath(GROUPS_PATH);
  revalidatePath(groupDetailPath(payload.groupId));

  return { ok: true, data: detail };
}

export async function deleteGroup(input: z.infer<typeof DeleteGroupSchema>): Promise<ActionResult<void>> {
  const { orgId } = await requireAdminOrgId();
  const payload = DeleteGroupSchema.parse(input);

  await deleteGroupDb({ orgId, groupId: payload.groupId });

  revalidatePath(GROUPS_PATH);
  revalidatePath(groupDetailPath(payload.groupId));

  return { ok: true, data: undefined };
}

export async function addGroupMember(
  input: z.infer<typeof AddMemberSchema>
): Promise<ActionResult<{ member: GroupMemberItem; createdUser: boolean }>> {
  const { orgId } = await requireAdminOrgId();
  const payload = AddMemberSchema.parse(input);

  try {
    const result = await addGroupMemberDb({
      orgId,
      groupId: payload.groupId,
      email: payload.email,
      name: payload.name,
      groupManager: payload.groupManager ?? false,
    });

    revalidatePath(groupDetailPath(payload.groupId));

    return { ok: true, data: { member: result.membership, createdUser: result.createdUser } };
  } catch (error) {
    if (error instanceof Error) {
      return { ok: false, error: error.message };
    }
    return { ok: false, error: 'Unable to add member' };
  }
}

export async function removeGroupMember(input: z.infer<typeof RemoveMemberSchema>): Promise<ActionResult<{ membershipId: string }>> {
  const { orgId, userId } = await requireAdminOrgId();
  const payload = RemoveMemberSchema.parse(input);

  try {
    const result = await removeGroupMemberDb({
      orgId,
      groupId: payload.groupId,
      membershipId: payload.membershipId,
      requestorUserId: userId,
    });

    revalidatePath(groupDetailPath(payload.groupId));

    return { ok: true, data: { membershipId: result.membershipId } };
  } catch (error) {
    if (error instanceof Error) {
      return { ok: false, error: error.message };
    }
    return { ok: false, error: 'Unable to remove member' };
  }
}

export async function toggleGroupManager(
  input: z.infer<typeof ToggleManagerSchema>
): Promise<ActionResult<GroupMemberItem>> {
  const { orgId } = await requireAdminOrgId();
  const payload = ToggleManagerSchema.parse(input);

  try {
    const member = await toggleGroupManagerDb({
      orgId,
      groupId: payload.groupId,
      membershipId: payload.membershipId,
      groupManager: payload.groupManager,
    });

    revalidatePath(groupDetailPath(payload.groupId));

    return { ok: true, data: member };
  } catch (error) {
    if (error instanceof Error) {
      return { ok: false, error: error.message };
    }
    return { ok: false, error: 'Unable to update member role' };
  }
}

export async function importGroupCsv(
  input: z.infer<typeof ImportMembersSchema>
): Promise<ActionResult<ImportResult>> {
  const { orgId } = await requireAdminOrgId();
  const payload = ImportMembersSchema.parse(input);

  try {
    const result = await importGroupMembersDb({
      orgId,
      groupId: payload.groupId,
      rows: payload.rows,
    });

    revalidatePath(groupDetailPath(payload.groupId));

    return { ok: true, data: result };
  } catch (error) {
    if (error instanceof Error) {
      return { ok: false, error: error.message };
    }
    return { ok: false, error: 'Unable to import CSV' };
  }
}

export async function loadGroupDetail(groupId: string): Promise<GroupDetail | null> {
  const { orgId } = await requireAdminOrgId();
  return getGroupDetail({ orgId, groupId });
}
