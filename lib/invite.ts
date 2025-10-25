import { createHash, randomBytes } from "crypto";

import { MembershipSource, OrgRole, UserRole } from "@prisma/client";

import { auth } from "./auth";
import { sendInviteEmail } from "./email";
import { env } from "./env";
import { createLogger } from "./logger";
import { prisma } from "./prisma";
import { enforceRateLimit } from "./rate-limit";

const logger = createLogger({ component: "invite" });

const INVITE_TOKEN_BYTES = 32;
const INVITE_TOKEN_TTL_HOURS = 72;
const INVITE_RATE_LIMIT_MAX = 20;
const INVITE_RATE_LIMIT_WINDOW_SECONDS = 60 * 60; // 1 hour per org

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ORG_ROLE_RANK: Record<OrgRole, number> = {
  [OrgRole.LEARNER]: 0,
  [OrgRole.INSTRUCTOR]: 1,
  [OrgRole.ADMIN]: 2,
  [OrgRole.OWNER]: 3,
};

const USER_ROLE_RANK: Record<UserRole, number> = {
  [UserRole.LEARNER]: 0,
  [UserRole.INSTRUCTOR]: 1,
  [UserRole.ADMIN]: 2,
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function mapOrgRoleToUserRole(role: OrgRole): UserRole {
  switch (role) {
    case OrgRole.ADMIN:
    case OrgRole.OWNER:
      return UserRole.ADMIN;
    case OrgRole.INSTRUCTOR:
      return UserRole.INSTRUCTOR;
    case OrgRole.LEARNER:
    default:
      return UserRole.LEARNER;
  }
}

function resolveBaseUrl(explicit?: string | null) {
  const candidate =
    explicit ??
    env.NEXTAUTH_URL ??
    process.env.APP_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_URL ??
    "http://localhost:3000";

  if (candidate.startsWith("http://") || candidate.startsWith("https://")) {
    return candidate;
  }

  return `https://${candidate}`;
}

async function resolveInviter(inviterId?: string, expectedOrgId?: string) {
  if (inviterId) {
    return { inviterId, inviterOrgId: expectedOrgId ?? null };
  }

  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  if (expectedOrgId && session.user.orgId && session.user.orgId !== expectedOrgId) {
    throw new Error("Forbidden");
  }

  return { inviterId: session.user.id, inviterOrgId: session.user.orgId ?? null };
}

type InviteUserArgs = {
  orgId: string;
  email: string;
  role: OrgRole;
  groupIds?: string[];
};

type InviteUserOptions = {
  inviterId?: string;
  baseUrl?: string;
};

type InviteUserResult = {
  inviteId: string;
};

export async function inviteUser(
  { orgId, email, role, groupIds = [] }: InviteUserArgs,
  options: InviteUserOptions = {}
): Promise<InviteUserResult> {
  const normalizedEmail = normalizeEmail(email);

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    throw new Error("A valid email address is required.");
  }

  if (!Object.values(OrgRole).includes(role)) {
    throw new Error("Invalid role specified.");
  }

  const uniqueGroupIds = Array.from(
    new Set(groupIds.map((id) => id?.trim()).filter((id): id is string => Boolean(id)))
  );

  const { inviterId } = await resolveInviter(options.inviterId, orgId);

  const membership = await prisma.orgMembership.findUnique({
    where: {
      userId_orgId: {
        userId: inviterId,
        orgId,
      },
    },
    select: { role: true },
  });

  if (!membership) {
    throw new Error("Inviter is not a member of this organization.");
  }

  const inviterRank = ORG_ROLE_RANK[membership.role];
  if (inviterRank < ORG_ROLE_RANK[OrgRole.ADMIN]) {
    throw new Error("Only organization admins can send invites.");
  }

  if ((role === OrgRole.ADMIN || role === OrgRole.OWNER) && membership.role !== OrgRole.OWNER) {
    throw new Error("Only organization owners can invite admins or owners.");
  }

  const rateLimitKey = `org:${orgId}:invites`;
  const rateLimitResult = await enforceRateLimit(rateLimitKey, INVITE_RATE_LIMIT_MAX, INVITE_RATE_LIMIT_WINDOW_SECONDS);

  if (!rateLimitResult.success) {
    throw new Error("Invite rate limit exceeded. Please wait before sending more invites.");
  }

  const validGroups = uniqueGroupIds.length
    ? await prisma.orgGroup.findMany({
        where: {
          id: { in: uniqueGroupIds },
          orgId,
          deletedAt: null,
        },
        select: { id: true },
      })
    : [];

  if (validGroups.length !== uniqueGroupIds.length) {
    throw new Error("One or more groups could not be found in this organization.");
  }

  const token = randomBytes(INVITE_TOKEN_BYTES).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + INVITE_TOKEN_TTL_HOURS * 60 * 60 * 1000);

  try {
    const invite = await prisma.$transaction(async (tx) => {
      const created = await tx.orgInvite.create({
        data: {
          orgId,
          email: normalizedEmail,
          role,
          tokenHash,
          expiresAt,
          invitedById: inviterId,
          ...(validGroups.length > 0
            ? {
                groups: {
                  create: validGroups.map((group) => ({ groupId: group.id })),
                },
              }
            : {}),
        },
        select: { id: true },
      });

      await tx.auditLog.create({
        data: {
          orgId,
          actorId: inviterId,
          actorRole: membership.role,
          action: "audit.invite.create",
          entity: "OrgInvite",
          entityId: created.id,
          meta: {
            email: normalizedEmail,
            role,
            groupIds: validGroups.map((group) => group.id),
          },
        },
      });

      return created;
    });

    const baseUrl = resolveBaseUrl(options.baseUrl);
    const inviteUrl = new URL("/invite/accept", baseUrl);
    inviteUrl.searchParams.set("token", token);

    await sendInviteEmail(normalizedEmail, inviteUrl.toString());

    return { inviteId: invite.id };
  } catch (error) {
    logger.error({
      event: "invite.create_failed",
      orgId,
      email: normalizedEmail,
      error,
    });
    throw error;
  }
}

type AcceptInviteResult = {
  orgId: string;
  userId: string;
};

export async function acceptInvite(token: string): Promise<AcceptInviteResult> {
  if (!token) {
    throw new Error("Invite token is required.");
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const now = new Date();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const invite = await tx.orgInvite.findUnique({
        where: { tokenHash },
        include: {
          groups: {
            include: {
              group: {
                select: {
                  id: true,
                  orgId: true,
                  deletedAt: true,
                },
              },
            },
          },
        },
      });

      if (!invite) {
        throw new Error("Invite token is invalid.");
      }

      if (invite.consumedAt) {
        throw new Error("This invite has already been used.");
      }

      if (invite.expiresAt < now) {
        await tx.orgInvite.update({
          where: { id: invite.id },
          data: { consumedAt: now },
        });
        throw new Error("This invite has expired.");
      }

      const normalizedEmail = normalizeEmail(invite.email);

      let user = await tx.user.findUnique({ where: { email: normalizedEmail } });

      if (user && user.orgId !== invite.orgId) {
        throw new Error("This invite email is already used by another organization.");
      }

      const desiredUserRole = mapOrgRoleToUserRole(invite.role);

      if (!user) {
        user = await tx.user.create({
          data: {
            email: normalizedEmail,
            orgId: invite.orgId,
            role: desiredUserRole,
          },
        });
      } else if (USER_ROLE_RANK[desiredUserRole] > USER_ROLE_RANK[user.role]) {
        user = await tx.user.update({
          where: { id: user.id },
          data: { role: desiredUserRole },
        });
      }

      const existingMembership = await tx.orgMembership.findUnique({
        where: {
          userId_orgId: {
            userId: user.id,
            orgId: invite.orgId,
          },
        },
        select: {
          id: true,
          role: true,
        },
      });

      let membershipRole = invite.role;

      if (!existingMembership) {
        await tx.orgMembership.create({
          data: {
            userId: user.id,
            orgId: invite.orgId,
            role: invite.role,
            source: MembershipSource.invite,
          },
        });
      } else if (ORG_ROLE_RANK[invite.role] > ORG_ROLE_RANK[existingMembership.role]) {
        await tx.orgMembership.update({
          where: { id: existingMembership.id },
          data: { role: invite.role },
        });
      } else {
        membershipRole = existingMembership.role;
      }

      const validGroupIds = invite.groups
        .map((groupLink) => groupLink.group)
        .filter(
          (group): group is { id: string; orgId: string; deletedAt: Date | null } =>
            Boolean(group) && group.orgId === invite.orgId && group.deletedAt === null
        )
        .map((group) => group.id);

      const uniqueGroupIds = Array.from(new Set(validGroupIds));

      if (uniqueGroupIds.length > 0) {
        for (const groupId of uniqueGroupIds) {
          await tx.groupMember.upsert({
            where: {
              groupId_userId: {
                groupId,
                userId: user.id,
              },
            },
            update: {},
            create: {
              groupId,
              userId: user.id,
            },
          });
        }
      }

      await tx.orgInvite.update({
        where: { id: invite.id },
        data: {
          acceptedAt: now,
          consumedAt: now,
          acceptedById: user.id,
        },
      });

      await tx.auditLog.create({
        data: {
          orgId: invite.orgId,
          actorId: user.id,
          actorRole: membershipRole,
          action: "audit.invite.accept",
          entity: "OrgInvite",
          entityId: invite.id,
          meta: {
            email: normalizedEmail,
            role: invite.role,
            groupIds: uniqueGroupIds,
          },
        },
      });

      return { orgId: invite.orgId, userId: user.id };
    });

    return result;
  } catch (error) {
    logger.error({ event: "invite.accept_failed", error });
    throw error;
  }
}
