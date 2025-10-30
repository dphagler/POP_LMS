// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

import { env } from "@/lib/env";
import { assertRequiredForProd } from "@/lib/env.runtime";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getOrCreatePrismaClient(): PrismaClient {
  const existing = globalForPrisma.prisma;
  if (existing) {
    return existing;
  }

  if (env.NODE_ENV === "production") {
    assertRequiredForProd();
  }

  const client = new PrismaClient({
    log: env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

  globalForPrisma.prisma = client;
  return client;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getOrCreatePrismaClient();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
}) as PrismaClient;
