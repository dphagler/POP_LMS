import { NextResponse } from "next/server";

import { summarizeProgressDaily } from "@/lib/analytics/summarize";
import { createRequestLogger, serializeError } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { logger, requestId } = createRequestLogger(request, { route: "jobs.summarize" });

  try {
    const result = await summarizeProgressDaily();

    logger.info({
      event: "jobs.summarize.completed",
      requestId,
      result,
    });

    return NextResponse.json({ ok: true, requestId, result });
  } catch (error) {
    logger.error({
      event: "jobs.summarize.error",
      requestId,
      error: serializeError(error),
    });

    return NextResponse.json(
      { ok: false, requestId, error: "Failed to summarize progress" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
