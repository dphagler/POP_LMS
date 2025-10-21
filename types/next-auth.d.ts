// types/next-auth.d.ts
import { DefaultSession } from "next-auth";
import type { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      orgId: string | null;
      role: UserRole;
    };
  }

  interface User {
    orgId: string | null;
    role: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    orgId: string | null;
    role?: UserRole;
  }
}

declare module "next-auth/adapters" {
  interface AdapterUser {
    orgId: string | null;
    role: UserRole;
  }
}
