// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

import { assertRequiredForProd, env } from "@/lib/env";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

if (env.NODE_ENV === "production") {
  assertRequiredForProd();
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
