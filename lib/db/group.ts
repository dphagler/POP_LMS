import { Prisma, PrismaClient, UserRole, UserSource } from '@prisma/client';

import { prisma } from '@/lib/prisma';

export type GroupListItem = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
};

export type GroupMemberItem = {
  membershipId: string;
  userId: string;
  email: string;
  name: string | null;
  groupManager: boolean;
};

export type GroupDetail = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  members: GroupMemberItem[];
};

export type ImportRow = {
  email: string;
  name?: string | null;
  groupManager?: boolean;
  rowNumber?: number;
};

export type ImportError = {
  rowNumber: number;
  email: string;
  message: string;
};

export type ImportSummary = {
  added: number;
  createdUsers: number;
  errors: ImportError[];
};

export type ImportResult = {
  summary: ImportSummary;
  members: GroupMemberItem[];
};

type Client = PrismaClient | Prisma.TransactionClient;

type EnsureMembershipResult = {
  membership: GroupMemberItem;
  createdUser: boolean;
  createdMembership: boolean;
};

type EnsureMembershipParams = {
  client: Prisma.TransactionClient;
  orgId: string;
  groupId: string;
  email: string;
  name?: string | null;
  groupManager?: boolean;
  updateExistingManager?: boolean;
};

type AddMemberParams = {
  orgId: string;
  groupId: string;
  email: string;
  name?: string | null;
  groupManager?: boolean;
};

type RemoveMemberParams = {
  orgId: string;
  groupId: string;
  membershipId: string;
  requestorUserId?: string;
};

type ToggleManagerParams = {
  orgId: string;
  groupId: string;
  membershipId: string;
  groupManager: boolean;
};

type ImportMembersParams = {
  orgId: string;
  groupId: string;
  rows: ImportRow[];
};

type UpdateGroupParams = {
  orgId: string;
  groupId: string;
  name?: string;
  description?: string | null;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeName(name: string | null | undefined): string | null {
  const trimmed = name?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function getClient(client?: Client): Client {
  return client ?? prisma;
}

async function ensureGroupOwnership(orgId: string, groupId: string, client: Client) {
  const group = await client.orgGroup.findUnique({
    where: { id: groupId },
    select: { id: true, orgId: true },
  });

  if (!group || group.orgId !== orgId) {
    throw new Error('Group not found');
  }
}

function mapMembership(payload: Prisma.GroupMemberGetPayload<{
  include: { user: { select: { id: true, email: true, name: true } } };
}>): GroupMemberItem {
  return {
    membershipId: payload.id,
    userId: payload.user.id,
    email: payload.user.email,
    name: payload.user.name,
    groupManager: payload.groupManager,
  };
}

async function ensureMembership({
  client,
  orgId,
  groupId,
  email,
  name,
  groupManager = false,
  updateExistingManager = false,
}: EnsureMembershipParams): Promise<EnsureMembershipResult> {
  const normalizedEmail = normalizeEmail(email);
  const normalizedName = normalizeName(name ?? null);

  let createdUser = false;
  let user = await client.user.findUnique({ where: { email: normalizedEmail } });

  if (!user) {
    user = await client.user.create({
      data: {
        email: normalizedEmail,
        name: normalizedName,
        orgId,
        role: UserRole.LEARNER,
        source: UserSource.csv,
      },
    });
    createdUser = true;
  } else if (user.orgId !== orgId) {
    throw new Error('Email belongs to a user in another organization');
  } else if (normalizedName && user.name !== normalizedName) {
    user = await client.user.update({
      where: { id: user.id },
      data: { name: normalizedName },
    });
  }

  const existingMembership = await client.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: user.id } },
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  if (existingMembership) {
    if (updateExistingManager) {
      const updated = await client.groupMember.update({
        where: { id: existingMembership.id },
        data: { groupManager },
        include: { user: { select: { id: true, email: true, name: true } } },
      });
      return {
        membership: mapMembership(updated),
        createdUser,
        createdMembership: false,
      };
    }

    return {
      membership: mapMembership(existingMembership),
      createdUser,
      createdMembership: false,
    };
  }

  const membership = await client.groupMember.create({
    data: {
      groupId,
      userId: user.id,
      groupManager,
    },
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  return {
    membership: mapMembership(membership),
    createdUser,
    createdMembership: true,
  };
}

export async function listOrgGroups({
  orgId,
  client,
}: {
  orgId: string;
  client?: Client;
}): Promise<GroupListItem[]> {
  const activeClient = getClient(client);
  const groups = await activeClient.orgGroup.findMany({
    where: { orgId },
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { members: true } },
    },
  });

  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    description: group.description ?? null,
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
    memberCount: group._count.members,
  }));
}

export async function getGroupDetail({
  orgId,
  groupId,
  client,
}: {
  orgId: string;
  groupId: string;
  client?: Client;
}): Promise<GroupDetail | null> {
  const activeClient = getClient(client);
  const group = await activeClient.orgGroup.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, email: true, name: true },
          },
        },
        orderBy: {
          user: {
            email: 'asc',
          },
        },
      },
    },
  });

  if (!group || group.orgId !== orgId) {
    return null;
  }

  return {
    id: group.id,
    name: group.name,
    description: group.description ?? null,
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
    members: group.members.map(mapMembership),
  };
}

export async function createGroup({
  orgId,
  name,
  description,
}: {
  orgId: string;
  name: string;
  description?: string | null;
}): Promise<GroupListItem> {
  const group = await prisma.orgGroup.create({
    data: {
      orgId,
      name,
      description: normalizeName(description ?? null),
    },
  });

  return {
    id: group.id,
    name: group.name,
    description: group.description ?? null,
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
    memberCount: 0,
  };
}

export async function updateGroup({ orgId, groupId, name, description }: UpdateGroupParams): Promise<GroupDetail> {
  await ensureGroupOwnership(orgId, groupId, prisma);

  const group = await prisma.orgGroup.update({
    where: { id: groupId },
    data: {
      name,
      description: normalizeName(description ?? null),
    },
    include: {
      members: {
        include: { user: { select: { id: true, email: true, name: true } } },
        orderBy: { user: { email: 'asc' } },
      },
    },
  });

  return {
    id: group.id,
    name: group.name,
    description: group.description ?? null,
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
    members: group.members.map(mapMembership),
  };
}

export async function deleteGroup({
  orgId,
  groupId,
}: {
  orgId: string;
  groupId: string;
}): Promise<void> {
  await ensureGroupOwnership(orgId, groupId, prisma);
  await prisma.orgGroup.delete({ where: { id: groupId } });
}

export async function addGroupMember({ orgId, groupId, email, name, groupManager = false }: AddMemberParams) {
  await ensureGroupOwnership(orgId, groupId, prisma);

  return prisma.$transaction(async (tx) =>
    ensureMembership({
      client: tx,
      orgId,
      groupId,
      email,
      name,
      groupManager,
      updateExistingManager: true,
    })
  );
}

export async function removeGroupMember({ orgId, groupId, membershipId, requestorUserId }: RemoveMemberParams) {
  await ensureGroupOwnership(orgId, groupId, prisma);

  return prisma.$transaction(async (tx) => {
    const membership = await tx.groupMember.findUnique({
      where: { id: membershipId },
      include: { user: { select: { id: true } } },
    });

    if (!membership || membership.groupId !== groupId) {
      throw new Error('Membership not found');
    }

    if (requestorUserId && membership.userId === requestorUserId) {
      throw new Error('You cannot remove yourself from the group');
    }

    await tx.groupMember.delete({ where: { id: membershipId } });

    return {
      membershipId,
      userId: membership.userId,
    };
  });
}

export async function toggleGroupManager({
  orgId,
  groupId,
  membershipId,
  groupManager,
}: ToggleManagerParams): Promise<GroupMemberItem> {
  await ensureGroupOwnership(orgId, groupId, prisma);

  const membership = await prisma.groupMember.update({
    where: { id: membershipId },
    data: { groupManager },
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  if (membership.groupId !== groupId) {
    throw new Error('Membership not found');
  }

  return mapMembership(membership);
}

function chunkRows<T>(rows: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < rows.length; i += size) {
    result.push(rows.slice(i, i + size));
  }
  return result;
}

export async function importGroupMembers({ orgId, groupId, rows }: ImportMembersParams): Promise<ImportResult> {
  await ensureGroupOwnership(orgId, groupId, prisma);

  const errors: ImportError[] = [];
  const seen = new Set<string>();
  const validRows: Required<ImportRow>[] = [];

  rows.forEach((row, index) => {
    const rowNumber = row.rowNumber ?? index + 1;
    const normalizedEmail = normalizeEmail(row.email ?? '');

    if (!normalizedEmail) {
      errors.push({ rowNumber, email: '', message: 'Email is required' });
      return;
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      errors.push({ rowNumber, email: normalizedEmail, message: 'Email is invalid' });
      return;
    }

    if (seen.has(normalizedEmail)) {
      errors.push({ rowNumber, email: normalizedEmail, message: 'Duplicate email in file' });
      return;
    }

    seen.add(normalizedEmail);
    validRows.push({
      email: normalizedEmail,
      name: normalizeName(row.name ?? null),
      groupManager: row.groupManager ?? false,
      rowNumber,
    });
  });

  let createdUsers = 0;
  let added = 0;
  const members: GroupMemberItem[] = [];

  for (const chunk of chunkRows(validRows, 100)) {
    await prisma.$transaction(async (tx) => {
      for (const row of chunk) {
        try {
          const result = await ensureMembership({
            client: tx,
            orgId,
            groupId,
            email: row.email,
            name: row.name,
            groupManager: row.groupManager,
          });

          if (result.createdUser) {
            createdUsers += 1;
          }

          if (result.createdMembership) {
            added += 1;
            members.push(result.membership);
          }
        } catch (error) {
          if (error instanceof Error && error.message.includes('another organization')) {
            errors.push({
              rowNumber: row.rowNumber ?? 0,
              email: row.email,
              message: 'Email belongs to another organization',
            });
          } else {
            errors.push({
              rowNumber: row.rowNumber ?? 0,
              email: row.email,
              message: 'Unexpected error while importing row',
            });
          }
        }
      }
    });
  }

  return {
    summary: { added, createdUsers, errors },
    members,
  };
}
