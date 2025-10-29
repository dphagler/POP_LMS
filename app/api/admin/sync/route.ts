import { NextResponse } from "next/server";

import { requireRole } from "@/lib/authz";
import {
  getLatestSyncStatusForOrg,
  getSyncStatusForOrg,
  syncStatusToJson,
  type SyncJobOptions
} from "@/lib/jobs/syncStatus";
import { createRequestLogger, serializeError, type Logger } from "@/lib/logger";
import { enqueueSanitySyncJob, type RunSanitySyncInput } from "@/lib/server-actions/sync";

function normalizeOptions(input: RunSanitySyncInput | undefined): SyncJobOptions {
  const options: SyncJobOptions = {
    dryRun: Boolean(input?.dryRun),
    allowDeletes: Boolean(input?.allowDeletes),
    removeMissing: Boolean(input?.removeMissing)
  };

  if (options.dryRun) {
    options.allowDeletes = false;
    options.removeMissing = false;
  } else if (!options.allowDeletes) {
    options.removeMissing = false;
  }

  return options;
}

async function parseRequestBody(request: Request, logger: Logger): Promise<RunSanitySyncInput | undefined> {
  const contentType = request.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    return undefined;
  }

  try {
    return (await request.json()) as RunSanitySyncInput;
  } catch (error) {
    logger.warn({
      event: "admin.sanity_sync.invalid_json",
      message: "Invalid JSON payload received for sync request",
      error: serializeError(error)
    });
    return undefined;
  }
}

export async function POST(request: Request) {
  const { logger, requestId } = createRequestLogger(request, { route: "admin.sanity_sync" });

  try {
    const session = await requireRole("ADMIN");
    const orgId = session.user.orgId ?? undefined;

    if (!orgId) {
      logger.warn({ event: "admin.sanity_sync.missing_org", message: "Organization missing on admin session" });
      return NextResponse.json(
        { ok: false, error: "Organization not found.", requestId },
        { status: 400 }
      );
    }

    const body = await parseRequestBody(request, logger);
    const options = normalizeOptions(body);

    logger.info({ event: "admin.sanity_sync.requested", orgId, options });

    const result = await enqueueSanitySyncJob({
      orgId,
      actorId: session.user.id,
      options
    });

    if (!result.ok) {
      const status = result.reason === "already_running" ? 409 : result.reason === "missing_env" ? 400 : 500;
      logger.warn({ event: "admin.sanity_sync.rejected", orgId, reason: result.reason, message: result.message });
      return NextResponse.json(
        {
          ok: false,
          error: result.message,
          reason: result.reason,
          status: syncStatusToJson(result.status ?? null),
          requestId
        },
        { status }
      );
    }

    logger.info({ event: "admin.sanity_sync.accepted", orgId, jobId: result.jobId });

    return NextResponse.json(
      {
        ok: true,
        jobId: result.jobId,
        status: syncStatusToJson(result.status),
        requestId
      },
      { status: 202 }
    );
  } catch (error) {
    logger.error({
      event: "admin.sanity_sync.error",
      error: serializeError(error)
    });

    return NextResponse.json(
      { ok: false, error: "Unable to start sync job.", requestId },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { logger, requestId } = createRequestLogger(request, { route: "admin.sanity_sync.status" });

  try {
    const session = await requireRole("ADMIN");
    const orgId = session.user.orgId ?? undefined;

    if (!orgId) {
      return NextResponse.json(
        { ok: false, error: "Organization not found.", requestId },
        { status: 400 }
      );
    }

    const url = new URL(request.url);
    const jobId = url.searchParams.get("jobId") ?? undefined;
    const status = jobId ? getSyncStatusForOrg(orgId, jobId) : getLatestSyncStatusForOrg(orgId);

    logger.info({ event: "admin.sanity_sync.status", orgId, jobId, phase: status?.phase });

    return NextResponse.json(
      { ok: true, status: syncStatusToJson(status), requestId },
      { status: 200 }
    );
  } catch (error) {
    logger.error({
      event: "admin.sanity_sync.status_error",
      error: serializeError(error)
    });

    return NextResponse.json(
      { ok: false, error: "Unable to load sync status.", requestId },
      { status: 500 }
    );
  }
}
