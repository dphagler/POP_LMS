// lib/auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const authConfig = {
  adapter: PrismaAdapter(prisma),
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
      // On first sign-in, `user` is defined (comes from DB via PrismaAdapter).
      if (user) {
        // @ts-expect-error prisma user has orgId
        token.orgId = (user as any).orgId ?? null;
      }
      // If user updated session (optional), keep orgId
      if (trigger === "update" && session?.user) {
        // @ts-expect-error custom
        token.orgId = (session.user as any).orgId ?? token.orgId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      // Expose orgId on the session user
      (session.user as any).orgId = (token as any).orgId ?? null;
      return session;
    },
  },
} satisfies Parameters<typeof NextAuth>[0];

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
