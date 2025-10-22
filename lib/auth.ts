// lib/auth.ts
import NextAuth from "next-auth";
import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import EmailProvider from "next-auth/providers/email";
import Google from "next-auth/providers/google";
import { UserRole } from "@prisma/client";
import { buildAuthAdapter } from "./auth-adapter";
import { env } from "./env";
import { sendSignInEmail } from "./email";
import { enforceRateLimit } from "./rate-limit";

const adapter = buildAuthAdapter();

const emailAuthEnabled =
  env.AUTH_EMAIL_ENABLED && Boolean(env.RESEND_API_KEY) && Boolean(env.AUTH_EMAIL_FROM);

type AdapterUserWithOrg = {
  id?: string | null;
  orgId?: string | null;
  role?: UserRole | null;
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

export const authConfig = {
  adapter,
  session: { strategy: "jwt" as const },
  providers: [
    Google({
      clientId: env.GOOGLE_CLIENT_ID!,
      clientSecret: env.GOOGLE_CLIENT_SECRET!,
    }),
    ...(emailAuthEnabled
      ? [
          EmailProvider({
            name: "Email",
            from: env.AUTH_EMAIL_FROM!,
            maxAge: env.AUTH_EMAIL_TOKEN_MAX_AGE,
            async sendVerificationRequest({ identifier, url, provider, request }) {
              const email = identifier.toLowerCase();
              const host = new URL(url).host;

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

              const subject = env.AUTH_EMAIL_SUBJECT ?? `Sign in to ${host}`;

              await sendSignInEmail({
                email,
                url,
                host,
                subject,
                expiresInMinutes: Math.max(1, Math.floor(env.AUTH_EMAIL_TOKEN_MAX_AGE / 60)),
              });
            },
          }),
        ]
      : []),
  ],
  trustHost: true,
  callbacks: {
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

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
