import NextAuth, { type DefaultSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import { env } from "./env";
import type { AdapterUser } from "next-auth/adapters";
import { getOrCreateUserForEmail } from "./user-service";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user?: DefaultSession["user"] & {
      id: string;
      orgId: string | null;
      role: string;
    };
  }

  interface User extends AdapterUser {
    orgId: string | null;
    role: string;
  }
}

export const { handlers: authHandlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  secret: env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET
    })
  ],
  callbacks: {
    async jwt({ token, account, profile, trigger }) {
      if (trigger === "signIn" && account && profile?.email) {
        const user = await getOrCreateUserForEmail(profile.email, profile.name ?? undefined);
        token.sub = user.id;
        token.orgId = user.orgId;
        token.role = user.role;
      }

      if (token.sub && !token.orgId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { orgId: true, role: true }
        });
        token.orgId = dbUser?.orgId ?? null;
        token.role = dbUser?.role ?? "LEARNER";
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.orgId = (token as { orgId?: string | null }).orgId ?? null;
        session.user.role = (token as { role?: string }).role ?? "LEARNER";
      }
      return session;
    }
  }
});
