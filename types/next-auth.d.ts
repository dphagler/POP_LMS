// types/next-auth.d.ts
import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string | null;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      orgId?: string | null;
    };
  }

  interface User {
    orgId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    orgId?: string | null;
  }
}
