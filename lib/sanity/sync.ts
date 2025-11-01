import { enqueueSanitySyncJob } from "@/lib/server-actions/sync";
import {
  getSyncStatusForOrg,
  isTerminalPhase,
  type SyncJobOptions,
  type SyncStatus
} from "@/lib/jobs/syncStatus";

export type SyncFromSanityArgs = {
  orgId: string;
  dryRun?: boolean;
  allowDelete?: boolean;
  allowDeletes?: boolean;
  removeMissing?: boolean;
  since?: string;
  limit?: number;
  pollIntervalMs?: number;
  timeoutMs?: number;
  actorId?: string;
};

export async function syncFromSanity({
  orgId,
  dryRun = false,
  allowDelete,
  allowDeletes,
  removeMissing = false,
  since,
  limit,
  pollIntervalMs = 500,
  timeoutMs = 60_000,
  actorId = "sanity-sync-cli"
}: SyncFromSanityArgs): Promise<SyncStatus> {
  const options = normalizeOptions({
    dryRun,
    allowDeletes: allowDeletes ?? allowDelete ?? false,
    removeMissing,
    since,
    limit
  });

  const result = await enqueueSanitySyncJob({
    orgId,
    actorId,
    options
  });

  if (!result.ok) {
    throw new Error(
      `Failed to start Sanity sync: ${result.message} (reason: ${result.reason})`
    );
  }

  let status: SyncStatus | null = result.status;
  const start = Date.now();

  while (status && !isTerminalPhase(status.phase)) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(
        `Sanity sync timed out after ${timeoutMs}ms (job ${result.jobId}).`
      );
    }

    await delay(pollIntervalMs);
    status = getSyncStatusForOrg(orgId, result.jobId);
  }

  if (!status) {
    throw new Error(`Unable to load sync status for job ${result.jobId}.`);
  }

  return status;
}

function normalizeOptions({
  dryRun,
  allowDeletes,
  removeMissing,
  since,
  limit
}: {
  dryRun: boolean;
  allowDeletes: boolean;
  removeMissing: boolean;
  since?: string;
  limit?: number;
}): SyncJobOptions {
  const options: SyncJobOptions = {
    dryRun,
    allowDeletes,
    removeMissing
  };

  const normalizedSince = sanitizeSince(since);
  if (normalizedSince) {
    options.since = normalizedSince;
  }

  const normalizedLimit = sanitizeLimit(limit);
  if (normalizedLimit !== undefined) {
    options.limit = normalizedLimit;
  }

  if (options.dryRun) {
    options.allowDeletes = false;
    options.removeMissing = false;
    if (options.limit === undefined) {
      options.limit = 5;
    }
  } else if (!options.allowDeletes) {
    options.removeMissing = false;
  }

  return options;
}

function sanitizeSince(value: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function sanitizeLimit(value: number | undefined): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  const normalized = Math.floor(value);
  if (normalized <= 0) {
    return undefined;
  }

  return Math.min(normalized, 5000);
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}
