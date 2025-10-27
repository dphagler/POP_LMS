import { MembershipSource, OrgRole, Prisma, PrismaClient, UserRole, UserSource } from "@prisma/client";

import { prisma } from "../prisma";

export type OrgUserListItem = {
  id: string;
  name: string | null;
  email: string;
  role: "learner" | "manager" | "admin";
  status: "invited" | "active" | "suspended" | "deactivated";
  groups: { id: string; name: string }[];
  lastSeenAt: string | null;
  createdAt: string;
};

export class UserOrgConflictError extends Error {
  constructor(message = "Email already belongs to another org") {
    super(message);
    this.name = "UserOrgConflictError";
  }
}

type ClientOrTransaction = PrismaClient | Prisma.TransactionClient;

type WithTransaction<T> = (tx: Prisma.TransactionClient) => Promise<T>;

type UpsertOrgUserParams = {
  orgId: string;
  email: string;
  name?: string | null;
  role: UserRole;
  source: UserSource;
  client?: ClientOrTransaction;
};

type ChangeUserRoleParams = {
  orgId: string;
  userId: string;
  role: UserRole;
  client?: ClientOrTransaction;
};

type FindOrgUserParams = {
  orgId: string;
  userId: string;
  client?: ClientOrTransaction;
};

type ListOrgUsersParams = {
  orgId: string;
  client?: ClientOrTransaction;
};

type UserWithRelations = Prisma.UserGetPayload<{
  include: {
    groupMemberships: {
      include: {
        group: {
          select: {
            id: true;
            name: true;
          };
        };
      };
    };
    sessions: {
      select: {
        id: true;
        expires: true;
      };
    };
  };
}>;

function getClient(client?: ClientOrTransaction): ClientOrTransaction {
  return client ?? prisma;
}

async function runInTransaction<T>(client: ClientOrTransaction, fn: WithTransaction<T>) {
  const maybeClient = client as PrismaClient;
  if (typeof maybeClient.$transaction === "function") {
    return maybeClient.$transaction((tx) => fn(tx));
  }
  return fn(client as Prisma.TransactionClient);
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function mapUserRoleToOrgRole(role: UserRole): OrgRole {
  switch (role) {
    case UserRole.ADMIN:
      return OrgRole.ADMIN;
    case UserRole.INSTRUCTOR:
      return OrgRole.INSTRUCTOR;
    case UserRole.LEARNER:
    default:
      return OrgRole.LEARNER;
  }
}

function mapUserRoleToUi(role: UserRole): OrgUserListItem["role"] {
  switch (role) {
    case UserRole.ADMIN:
      return "admin";
    case UserRole.INSTRUCTOR:
      return "manager";
    case UserRole.LEARNER:
    default:
      return "learner";
  }
}

function mapUserSourceToMembershipSource(
  source: UserSource | null | undefined
): MembershipSource {
  switch (source) {
    case UserSource.invite:
      return MembershipSource.invite;
    case UserSource.csv:
      return MembershipSource.csv;
    case UserSource.sso:
    default:
      return MembershipSource.sso;
  }
}

function toListItem(user: UserWithRelations): OrgUserListItem {
  const role = mapUserRoleToUi(user.role);
  const status: OrgUserListItem["status"] =
    user.source === UserSource.invite && user.sessions.length === 0
      ? "invited"
      : "active";

  return {
    id: user.id,
    name: user.name ?? null,
    email: user.email,
    role,
    status,
    groups: user.groupMemberships.map((membership) => ({
      id: membership.group.id,
      name: membership.group.name,
    })),
    lastSeenAt: null,
    createdAt: user.createdAt.toISOString(),
  };
}

async function fetchUserWithRelations(
  client: Prisma.TransactionClient,
  userId: string
): Promise<UserWithRelations> {
  const user = await client.user.findUnique({
    where: { id: userId },
    include: {
      groupMemberships: {
        include: {
          group: {
            select: { id: true, name: true },
          },
        },
      },
      sessions: {
        select: { id: true, expires: true },
      },
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

export async function getOrgUsers({
  orgId,
  client,
}: ListOrgUsersParams): Promise<OrgUserListItem[]> {
  const activeClient = getClient(client);

  const users = await activeClient.user.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    include: {
      groupMemberships: {
        include: {
          group: {
            select: { id: true, name: true },
          },
        },
      },
      sessions: {
        select: { id: true, expires: true },
      },
    },
  });

  return users.map(toListItem);
}

export async function upsertOrgUser({
  orgId,
  email,
  name,
  role,
  source,
  client,
}: UpsertOrgUserParams): Promise<OrgUserListItem> {
  const activeClient = getClient(client);
  const normalizedEmail = normalizeEmail(email);
  const trimmedName = typeof name === "string" ? name.trim() : name ?? null;

  return runInTransaction(activeClient, async (tx) => {
    const existing = await tx.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        groupMemberships: {
          include: { group: { select: { id: true, name: true } } },
        },
        sessions: {
          select: { id: true, expires: true },
        },
      },
    });

    if (existing && existing.orgId !== orgId) {
      throw new UserOrgConflictError();
    }

    let userId: string;

    if (!existing) {
      const created = await tx.user.create({
        data: {
          email: normalizedEmail,
          name: trimmedName,
          orgId,
          role,
          source,
        },
      });
      userId = created.id;
    } else {
      userId = existing.id;
      const updateData: Prisma.UserUpdateInput = {};

      if (existing.role !== role) {
        updateData.role = role;
      }

      if (existing.source !== source) {
        updateData.source = source;
      }

      if (typeof trimmedName !== "undefined" && existing.name !== trimmedName) {
        updateData.name = trimmedName;
      }

      if (Object.keys(updateData).length > 0) {
        await tx.user.update({
          where: { id: existing.id },
          data: updateData,
        });
      }
    }

    const desiredOrgRole = mapUserRoleToOrgRole(role);
    const membershipSource = mapUserSourceToMembershipSource(source);

    const membership = await tx.orgMembership.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId,
        },
      },
    });

    if (!membership) {
      await tx.orgMembership.create({
        data: {
          userId,
          orgId,
          role: desiredOrgRole,
          source: membershipSource,
        },
      });
    } else {
      const membershipUpdate: Prisma.OrgMembershipUpdateInput = {};

      if (membership.role !== desiredOrgRole) {
        membershipUpdate.role = desiredOrgRole;
      }

      if (membership.source !== membershipSource) {
        membershipUpdate.source = membershipSource;
      }

      if (Object.keys(membershipUpdate).length > 0) {
        await tx.orgMembership.update({
          where: { id: membership.id },
          data: membershipUpdate,
        });
      }
    }

    const fullUser = await fetchUserWithRelations(tx, userId);
    return toListItem(fullUser);
  });
}

export async function changeOrgUserRole({
  orgId,
  userId,
  role,
  client,
}: ChangeUserRoleParams): Promise<OrgUserListItem> {
  const activeClient = getClient(client);

  return runInTransaction(activeClient, async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      include: {
        groupMemberships: {
          include: { group: { select: { id: true, name: true } } },
        },
        sessions: {
          select: { id: true, expires: true },
        },
      },
    });

    if (!user || user.orgId !== orgId) {
      throw new Error("User not found");
    }

    if (user.role !== role) {
      await tx.user.update({
        where: { id: userId },
        data: { role },
      });
    }

    const desiredOrgRole = mapUserRoleToOrgRole(role);

    const membership = await tx.orgMembership.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId,
        },
      },
    });

    if (!membership) {
      await tx.orgMembership.create({
        data: {
          userId,
          orgId,
          role: desiredOrgRole,
          source: MembershipSource.manual,
        },
      });
    } else if (membership.role !== desiredOrgRole) {
      await tx.orgMembership.update({
        where: { id: membership.id },
        data: { role: desiredOrgRole },
      });
    }

    const updated = await fetchUserWithRelations(tx, userId);
    return toListItem(updated);
  });
}

export async function findOrgUserById({
  orgId,
  userId,
  client,
}: FindOrgUserParams) {
  const activeClient = getClient(client);

  const user = await activeClient.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      orgId: true,
    },
  });

  if (!user || user.orgId !== orgId) {
    return null;
  }

  return user;
}

export function mapUiRoleToUserRole(
  role: "LEARNER" | "MANAGER" | "ADMIN"
): UserRole {
  switch (role) {
    case "ADMIN":
      return UserRole.ADMIN;
    case "MANAGER":
      return UserRole.INSTRUCTOR;
    case "LEARNER":
    default:
      return UserRole.LEARNER;
  }
}
