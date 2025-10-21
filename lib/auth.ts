// lib/auth.ts
import NextAuth from "next-auth";
import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Google from "next-auth/providers/google";
import { UserRole } from "@prisma/client";
import { buildAuthAdapter } from "./auth-adapter";

const adapter = buildAuthAdapter();

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
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
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
