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

const datasources = resolveDatasourceUrl();
const usingPrismaAccelerate = Boolean(
  datasources?.db?.url && isPrismaAccelerateUrl(datasources.db.url)
);

if (usingPrismaAccelerate) {
  const currentEngineType = process.env.PRISMA_CLIENT_ENGINE_TYPE;

  if (!currentEngineType) {
    process.env.PRISMA_CLIENT_ENGINE_TYPE = "dataproxy";
    logOnce(
      "info",
      "[prisma] Prisma Accelerate connection detected. Configuring Prisma Client to use the Data Proxy engine (PRISMA_CLIENT_ENGINE_TYPE=dataproxy)."
    );
  } else if (currentEngineType !== "dataproxy") {
    logOnce(
      "warn",
      `[prisma] Prisma Accelerate connection detected but PRISMA_CLIENT_ENGINE_TYPE=${currentEngineType}. Overriding to dataproxy so the client can reach the Accelerate endpoint.`
    );
    process.env.PRISMA_CLIENT_ENGINE_TYPE = "dataproxy";
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
    datasources,
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
      "[prisma] DATABASE_URL appears to use Prisma Accelerate but no direct connection string (DATABASE_DIRECT_URL, DIRECT_URL, POSTGRES_URL_NON_POOLING, or POSTGRES_URL) is set. Falling back to DATABASE_URL which may be unavailable locally."
    );
  }

  return { db: { url: databaseUrl } };
}

function isPrismaAccelerateUrl(url: string): boolean {
  return url.startsWith("prisma://") || url.includes("prisma-data.net");
}
