import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { getMissingSanityEnvVars } from "@/lib/sanity";
import { createRequestLogger, serializeError } from "@/lib/logger";

const REQUIRED_ENV_CHECKS: Array<{ key: string; check: () => unknown }> = [
  { key: "NEXTAUTH_SECRET", check: () => env.NEXTAUTH_SECRET },
  { key: "DATABASE_URL", check: () => env.DATABASE_URL },
  { key: "GOOGLE_CLIENT_ID", check: () => env.GOOGLE_CLIENT_ID },
  { key: "GOOGLE_CLIENT_SECRET", check: () => env.GOOGLE_CLIENT_SECRET }
];

export async function GET(request: Request) {
  const { logger, requestId } = createRequestLogger(request, { route: "health" });
  const details: Array<Record<string, unknown>> = [];

  const missingEnvVars: string[] = [];
  for (const { key, check } of REQUIRED_ENV_CHECKS) {
    try {
      check();
    } catch (error) {
      missingEnvVars.push(key);
      logger.warn({
        event: "health.env_missing",
        key,
        error: serializeError(error)
      });
    }
  }

  const missingSanityVars = getMissingSanityEnvVars();
  if (missingSanityVars.length > 0) {
    missingEnvVars.push(...missingSanityVars);
    logger.warn({
      event: "health.sanity_env_missing",
      missingEnvVars: missingSanityVars
    });
  }

  const envOk = missingEnvVars.length === 0;
  details.push({ component: "env", ok: envOk, missing: missingEnvVars });

  let databaseOk = true;
  try {
    await prisma.$queryRaw(Prisma.sql`SELECT 1`);
  } catch (error) {
    databaseOk = false;
    logger.error({
      event: "health.database_error",
      error: serializeError(error)
    });
    details.push({ component: "database", ok: false, error: serializeError(error) });
  }

  if (databaseOk) {
    details.push({ component: "database", ok: true });
  }

  const ok = envOk && databaseOk;
  const payload = ok
    ? { ok: true, requestId }
    : { ok: false, details, requestId };

  return NextResponse.json(payload, { status: ok ? 200 : 503 });
}
