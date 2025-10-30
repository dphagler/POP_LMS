// lib/auth.ts
import NextAuth from "next-auth";
import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Google from "next-auth/providers/google";
import ResendProvider from "next-auth/providers/resend";
import { MembershipSource, OrgRole, UserRole } from "@prisma/client";
import { buildAuthAdapter } from "./auth-adapter";
import { findOrgIdForDomain, getDefaultOrgForEmail, getOrCreateDefaultOrg } from "./org";
import { assertRequiredForProd, env } from "./env";
import { sendSignInEmail } from "./email";
import { enforceRateLimit } from "./rate-limit";
import { prisma } from "./prisma";
import { logAudit } from "./db/audit";

if (env.NODE_ENV === "production") {
  assertRequiredForProd();
}

const adapter = buildAuthAdapter();

const emailProviderEnabled =
  env.authEmailEnabled && Boolean(env.RESEND_API_KEY) && Boolean(env.AUTH_EMAIL_FROM);

type AdapterUserWithOrg = {
  id?: string | null;
  orgId?: string | null;
  role?: UserRole | null;
  email?: string | null;
};

type AppToken = JWT & {
  orgId?: string | null;
  role?: UserRole | null;
};

type AppSession = Session & {
  user: Session["user"] & {
    id: string;
    orgId: string | null;
    role: UserRole;
  };
};

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

async function logSsoResolution({
  domain,
  outcome,
  orgId,
  entityId,
}: {
  domain: string | null;
  outcome: string;
  orgId?: string | null;
  entityId: string;
}) {
  const resolvedOrgId =
    orgId ?? (await getOrCreateDefaultOrg(prisma)).id;

  await logAudit({
    orgId: resolvedOrgId,
    action: "auth.sso.resolve",
    targetId: entityId,
    metadata: {
      domain,
      outcome,
    },
  });
}

export const authConfig = {
  adapter,
  session: { strategy: "jwt" as const },
  providers: [
    Google({
      clientId: env.GOOGLE_CLIENT_ID!,
      clientSecret: env.GOOGLE_CLIENT_SECRET!,
    }),
    ...(emailProviderEnabled
      ? [
          ResendProvider({
            name: "Email",
            from: env.AUTH_EMAIL_FROM!,
            apiKey: env.RESEND_API_KEY!,
            maxAge: env.AUTH_EMAIL_TOKEN_MAX_AGE,
            async sendVerificationRequest({ identifier, url, provider: _provider, request }) {
              const email = identifier.toLowerCase();
              const limit = env.AUTH_EMAIL_RATE_LIMIT_MAX;
              const windowSeconds = env.AUTH_EMAIL_RATE_LIMIT_WINDOW;

              const emailRateLimit = await enforceRateLimit(
                `auth:magic-link:email:${email}`,
                limit,
                windowSeconds
              );

              if (!emailRateLimit.success) {
                throw new Error("Email sign-in rate limit exceeded.");
              }

              const forwardedFor = request?.headers.get("x-forwarded-for");
              const realIp = request?.headers.get("x-real-ip");
              const ip = forwardedFor?.split(",")[0]?.trim() || realIp || undefined;

              if (ip) {
                const ipRateLimit = await enforceRateLimit(
                  `auth:magic-link:ip:${ip}`,
                  limit,
                  windowSeconds
                );

                if (!ipRateLimit.success) {
                  throw new Error("Email sign-in rate limit exceeded.");
                }
              }

              await sendSignInEmail(email, url);
            },
          }),
        ]
      : []),
  ],
  trustHost: true,
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account || account.provider !== "google") {
        return true;
      }

      const adapterUser = user as AdapterUserWithOrg;
      const rawEmail =
        adapterUser.email ??
        (typeof profile?.email === "string" ? profile.email : null) ??
        null;

      const email = rawEmail?.trim().toLowerCase() ?? null;
      const domain = email?.split("@").pop() ?? null;

      if (!email || !adapterUser.id) {
        await logSsoResolution({
          domain,
          outcome: "none",
          orgId: adapterUser.orgId ?? null,
          entityId: adapterUser.id ?? email ?? account.providerAccountId,
        });
        return true;
      }

      let resolvedOrgId: string | null = null;
      let inviteRole: OrgRole | null = null;
      let outcome: "domain" | "invite" | "ambiguous" | "none" = "none";

      if (domain) {
        const resolution = await findOrgIdForDomain(domain, prisma);

        if (resolution) {
          resolvedOrgId = resolution;
          outcome = "domain";
        }
      }

      if (!resolvedOrgId) {
        const now = new Date();
        const invites = await prisma.orgInvite.findMany({
          where: {
            email,
            consumedAt: null,
            expiresAt: { gt: now },
          },
          select: {
            orgId: true,
            role: true,
          },
        });

        const inviteRolesByOrg = new Map<string, OrgRole>();
        for (const invite of invites) {
          const current = inviteRolesByOrg.get(invite.orgId);
          if (!current || ORG_ROLE_RANK[invite.role] > ORG_ROLE_RANK[current]) {
            inviteRolesByOrg.set(invite.orgId, invite.role);
          }
        }

        if (inviteRolesByOrg.size > 1) {
          await logSsoResolution({
            domain,
            outcome: "ambiguous",
            orgId: adapterUser.orgId ?? null,
            entityId: adapterUser.id,
          });
          throw new Error("Select your organization");
        }

        if (inviteRolesByOrg.size === 1) {
          const [orgId, role] = inviteRolesByOrg.entries().next().value as [
            string,
            OrgRole,
          ];
          resolvedOrgId = orgId;
          inviteRole = role;
          outcome = "invite";
        }
      }

      const targetOrgId = resolvedOrgId ?? adapterUser.orgId ?? null;

      if (targetOrgId) {
        const updatedRole = await prisma.$transaction(async (tx) => {
          const existingUser = await tx.user.findUnique({
            where: { id: adapterUser.id! },
            select: {
              id: true,
              orgId: true,
              role: true,
            },
          });

          if (!existingUser) {
            return adapterUser.role ?? UserRole.LEARNER;
          }

          const desiredOrgRole = inviteRole ?? OrgRole.LEARNER;
          const desiredUserRole = mapOrgRoleToUserRole(desiredOrgRole);
          const targetUserRole =
            USER_ROLE_RANK[desiredUserRole] > USER_ROLE_RANK[existingUser.role]
              ? desiredUserRole
              : existingUser.role;

          const userUpdate: Partial<{ orgId: string; role: UserRole }> = {};

          if (existingUser.orgId !== targetOrgId) {
            userUpdate.orgId = targetOrgId;
          }

          if (targetUserRole !== existingUser.role) {
            userUpdate.role = targetUserRole;
          }

          if (Object.keys(userUpdate).length > 0) {
            const updated = await tx.user.update({
              where: { id: existingUser.id },
              data: userUpdate,
              select: { role: true },
            });
            existingUser.role = updated.role;
          }

          const membership = await tx.orgMembership.findUnique({
            where: {
              userId_orgId: {
                userId: existingUser.id,
                orgId: targetOrgId,
              },
            },
            select: {
              id: true,
              role: true,
            },
          });

          if (!membership) {
            await tx.orgMembership.create({
              data: {
                userId: existingUser.id,
                orgId: targetOrgId,
                role: inviteRole ?? OrgRole.LEARNER,
                source: inviteRole ? MembershipSource.invite : MembershipSource.sso,
              },
            });
          } else if (
            inviteRole &&
            ORG_ROLE_RANK[inviteRole] > ORG_ROLE_RANK[membership.role]
          ) {
            await tx.orgMembership.update({
              where: { id: membership.id },
              data: { role: inviteRole },
            });
          }

          return existingUser.role;
        });

        adapterUser.orgId = targetOrgId;
        adapterUser.role = updatedRole;
      }

      await logSsoResolution({
        domain,
        outcome,
        orgId: adapterUser.orgId ?? targetOrgId,
        entityId: adapterUser.id,
      });

      return true;
    },
    async jwt({ token, user, trigger, session }) {
      const appToken = token as AppToken;
      // On first sign-in, `user` is defined (comes from DB via PrismaAdapter).
      if (user) {
        const adapterUser = user as AdapterUserWithOrg;
        appToken.orgId = adapterUser.orgId ?? appToken.orgId ?? null;
        appToken.role = adapterUser.role ?? appToken.role ?? UserRole.LEARNER;
      }
      // If user updated session (optional), keep orgId
      if (trigger === "update" && session?.user) {
        const sessionUser = session.user as AdapterUserWithOrg;
        if (typeof sessionUser.orgId !== "undefined") {
          appToken.orgId = sessionUser.orgId ?? appToken.orgId ?? null;
        }
        if (typeof sessionUser.role !== "undefined" && sessionUser.role !== null) {
          appToken.role = sessionUser.role;
        }
      }
      return appToken;
    },
    async session({ session, token }) {
      const appSession = session as AppSession;
      const appToken = token as AppToken;

      const tokenSub = typeof token.sub === "string" ? token.sub : null;
      const resolvedId = appSession.user.id ?? tokenSub ?? "";
      appSession.user.id = resolvedId;

      appSession.user.orgId = appToken.orgId ?? null;
      appSession.user.role = appToken.role ?? UserRole.LEARNER;

      return appSession;
    },
  },
} satisfies Parameters<typeof NextAuth>[0];

export const {
  handlers,
  auth,
  signIn,
  signOut,
  unstable_update: updateSession,
} = NextAuth(authConfig);
