import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole, UserSource } from '@prisma/client';

import type { GroupMemberItem } from '@/lib/db/group';

function createInMemoryPrisma() {
  let userCounter = 1;
  let membershipCounter = 1;

  const store = {
    orgGroups: new Map<string, { id: string; orgId: string }>(),
    users: new Map<string, { id: string; email: string; name: string | null; orgId: string; role: UserRole; source: UserSource }>(),
    usersByEmail: new Map<string, string>(),
    memberships: new Map<string, { id: string; groupId: string; userId: string; groupManager: boolean }>(),
    membershipsByComposite: new Map<string, string>(),
  };

  function reset() {
    store.orgGroups.clear();
    store.users.clear();
    store.usersByEmail.clear();
    store.memberships.clear();
    store.membershipsByComposite.clear();
    userCounter = 1;
    membershipCounter = 1;
  }

  function seedGroup(group: { id: string; orgId: string }) {
    store.orgGroups.set(group.id, { ...group });
  }

  function seedUser(user: { id?: string; email: string; name?: string | null; orgId: string }) {
    const id = user.id ?? `user-${userCounter++}`;
    const record = {
      id,
      email: user.email.toLowerCase(),
      name: user.name ?? null,
      orgId: user.orgId,
      role: UserRole.LEARNER,
      source: UserSource.sso,
    };
    store.users.set(id, record);
    store.usersByEmail.set(record.email, id);
    return record;
  }

  function seedMembership(membership: { id?: string; groupId: string; userId: string; groupManager?: boolean }) {
    const id = membership.id ?? `membership-${membershipCounter++}`;
    const record = {
      id,
      groupId: membership.groupId,
      userId: membership.userId,
      groupManager: membership.groupManager ?? false,
    };
    store.memberships.set(id, record);
    store.membershipsByComposite.set(`${record.groupId}:${record.userId}`, id);
    return record;
  }

  function buildMembership(
    record: { id: string; groupId: string; userId: string; groupManager: boolean },
    include?: { user?: { select: { id: boolean; email: boolean; name: boolean } } }
  ) {
    const userRecord = store.users.get(record.userId);
    if (!userRecord) {
      throw new Error('User not found for membership');
    }

    const membership: GroupMemberItem & { user?: { id: string; email: string; name: string | null } } = {
      membershipId: record.id,
      userId: record.userId,
      email: userRecord.email,
      name: userRecord.name,
      groupManager: record.groupManager,
    };

    if (include?.user) {
      membership.user = {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
      };
    }

    return membership;
  }

  const orgGroup = {
    findUnique: async ({ where: { id } }: { where: { id: string } }) => store.orgGroups.get(id) ?? null,
  };

  const user = {
    findUnique: async ({ where }: { where: { email?: string; id?: string } }) => {
      if (where.email) {
        const userId = store.usersByEmail.get(where.email.toLowerCase());
        if (!userId) return null;
        return { ...store.users.get(userId)! };
      }
      if (where.id) {
        const record = store.users.get(where.id);
        return record ? { ...record } : null;
      }
      return null;
    },
    create: async ({ data }: { data: { email: string; name?: string | null; orgId: string; role: UserRole; source: UserSource } }) => {
      const id = `user-${userCounter++}`;
      const record = {
        id,
        email: data.email,
        name: data.name ?? null,
        orgId: data.orgId,
        role: data.role,
        source: data.source,
      };
      store.users.set(id, record);
      store.usersByEmail.set(record.email, id);
      return { ...record };
    },
    update: async ({ where, data }: { where: { id: string }; data: { name?: string | null } }) => {
      const existing = store.users.get(where.id);
      if (!existing) {
        throw new Error('User not found');
      }
      const updated = { ...existing, ...data };
      store.users.set(where.id, updated);
      return { ...updated };
    },
  };

  const groupMember = {
    findUnique: async ({ where, include }: { where: { id?: string; groupId_userId?: { groupId: string; userId: string } }; include?: { user?: { select: { id: boolean; email: boolean; name: boolean } } } }) => {
      if (where.id) {
        const record = store.memberships.get(where.id);
        return record ? buildMembership(record, include) : null;
      }
      if (where.groupId_userId) {
        const key = `${where.groupId_userId.groupId}:${where.groupId_userId.userId}`;
        const id = store.membershipsByComposite.get(key);
        if (!id) return null;
        const record = store.memberships.get(id)!;
        return buildMembership(record, include);
      }
      return null;
    },
    create: async ({ data, include }: { data: { groupId: string; userId: string; groupManager?: boolean }; include?: { user?: { select: { id: boolean; email: boolean; name: boolean } } } }) => {
      const id = `membership-${membershipCounter++}`;
      const record = {
        id,
        groupId: data.groupId,
        userId: data.userId,
        groupManager: data.groupManager ?? false,
      };
      store.memberships.set(id, record);
      store.membershipsByComposite.set(`${record.groupId}:${record.userId}`, id);
      return buildMembership(record, include);
    },
    update: async ({ where, data, include }: { where: { id: string }; data: { groupManager?: boolean }; include?: { user?: { select: { id: boolean; email: boolean; name: boolean } } } }) => {
      const existing = store.memberships.get(where.id);
      if (!existing) {
        throw new Error('Membership not found');
      }
      const updated = { ...existing, ...data };
      store.memberships.set(where.id, updated);
      store.membershipsByComposite.set(`${updated.groupId}:${updated.userId}`, updated.id);
      return buildMembership(updated, include);
    },
    delete: async ({ where }: { where: { id: string } }) => {
      const existing = store.memberships.get(where.id);
      if (!existing) {
        throw new Error('Membership not found');
      }
      store.memberships.delete(where.id);
      store.membershipsByComposite.delete(`${existing.groupId}:${existing.userId}`);
      return { ...existing };
    },
  };

  const prisma = {
    orgGroup,
    user,
    groupMember,
    $transaction: async <T>(fn: (tx: { user: typeof user; groupMember: typeof groupMember }) => Promise<T>) => fn({ user, groupMember }),
  };

  return {
    prisma,
    store,
    reset,
    seedGroup,
    seedUser,
    seedMembership,
    getUserByEmail(email: string) {
      const id = store.usersByEmail.get(email.toLowerCase());
      return id ? store.users.get(id) ?? null : null;
    },
  };
}

const fake = createInMemoryPrisma();

vi.mock('@/lib/prisma', () => ({
  prisma: fake.prisma,
}));

import { importGroupMembers } from '@/lib/db/group';

describe('importGroupMembers', () => {
  beforeEach(() => {
    fake.reset();
    fake.seedGroup({ id: 'group-1', orgId: 'org-1' });
  });

  it('imports mixed known and unknown users', async () => {
    const existingUser = fake.seedUser({ email: 'known@example.com', name: 'Known User', orgId: 'org-1' });

    const result = await importGroupMembers({
      orgId: 'org-1',
      groupId: 'group-1',
      rows: [
        { email: 'known@example.com', name: 'Known User', rowNumber: 2 },
        { email: 'new@example.com', name: 'New User', rowNumber: 3 },
        { email: 'invalid', name: 'Invalid', rowNumber: 4 },
        { email: 'KNOWN@example.com', name: 'Duplicate', rowNumber: 5 },
      ],
    });

    expect(result.summary.added).toBe(2);
    expect(result.summary.createdUsers).toBe(1);
    expect(result.summary.errors).toHaveLength(2);

    const membershipUserIds = Array.from(fake.store.memberships.values()).map((membership) => membership.userId);
    expect(membershipUserIds).toContain(existingUser.id);

    const createdUser = fake.getUserByEmail('new@example.com');
    expect(createdUser).toMatchObject({ email: 'new@example.com', orgId: 'org-1' });

    expect(result.members).toHaveLength(2);
    const addedEmails = result.members.map((member) => member.email).sort();
    expect(addedEmails).toEqual(['known@example.com', 'new@example.com']);
  });

  it('ignores duplicate memberships on subsequent imports', async () => {
    const rows = [{ email: 'repeat@example.com', name: 'Repeat User', rowNumber: 2 }];

    const first = await importGroupMembers({ orgId: 'org-1', groupId: 'group-1', rows });
    expect(first.summary.added).toBe(1);
    expect(first.summary.createdUsers).toBe(1);

    const second = await importGroupMembers({ orgId: 'org-1', groupId: 'group-1', rows });
    expect(second.summary.added).toBe(0);
    expect(second.summary.createdUsers).toBe(0);
    expect(second.summary.errors).toHaveLength(0);

    expect(fake.store.memberships.size).toBe(1);
  });
});
