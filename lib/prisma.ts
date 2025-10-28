// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

import { env } from "./env";

type LogLevel = "info" | "warn";

const loggedMessages = new Set<string>();

function logOnce(level: LogLevel, message: string) {
  if (loggedMessages.has(message)) {
    return;
  }

  loggedMessages.add(message);

  if (level === "info") {
    console.info(message);
  } else {
    console.warn(message);
  }
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
    datasources: resolveDatasourceUrl(),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

function resolveDatasourceUrl(): { db: { url: string } } | undefined {
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    return undefined;
  }

  if (process.env.NODE_ENV !== "production" && isPrismaAccelerateUrl(databaseUrl)) {
    const directUrl = env.DATABASE_DIRECT_URL;

    if (directUrl) {
      logOnce(
        "info",
        "[prisma] Using a direct database connection string because DATABASE_URL points to Prisma Accelerate, which is often unreachable in development environments."
      );

      return { db: { url: directUrl } };
    }

    logOnce(
      "warn",
      "[prisma] DATABASE_URL appears to use Prisma Accelerate but no direct connection string (DATABASE_DIRECT_URL or DIRECT_URL) is set. Falling back to DATABASE_URL which may be unavailable locally."
    );
  }

  return { db: { url: databaseUrl } };
}

function isPrismaAccelerateUrl(url: string): boolean {
  return url.startsWith("prisma://") || url.includes("prisma-data.net");
}
