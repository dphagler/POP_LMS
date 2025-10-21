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
  // You can add callbacks as needed, e.g. to carry orgId in the token/session
  // callbacks: {
  //   async jwt({ token, user }) {
  //     if (user && 'orgId' in user) token.orgId = (user as any).orgId;
  //     return token;
  //   },
  //   async session({ session, token }) {
  //     if (token?.orgId) (session.user as any).orgId = token.orgId;
  //     return session;
  //   },
  // },
} satisfies Parameters<typeof NextAuth>[0];

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
