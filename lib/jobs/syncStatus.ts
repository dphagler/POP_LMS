import { randomUUID } from "node:crypto";

export type SyncJobPhase = "fetch" | "upsert" | "done" | "error";

export type SyncJobOptions = {
  dryRun: boolean;
  allowDeletes: boolean;
  removeMissing: boolean;
  since?: string;
  limit?: number;
};

export type SyncJobCounts = {
  created: number;
  updated: number;
  deleted: number;
  skipped: number;
};

export type SyncStatus = {
  id: string;
  startedAt: Date;
  updatedAt: Date;
  finishedAt: Date | null;
  phase: SyncJobPhase;
  counts: SyncJobCounts;
  message?: string;
  logs?: string[];
  options: SyncJobOptions;
};

type StoredSyncStatus = SyncStatus & {
  orgId: string;
};

type SyncJobUpdate = {
  phase?: SyncJobPhase;
  message?: string;
  counts?: SyncJobCounts;
  appendLog?: string;
  logs?: string[];
};

const jobsById = new Map<string, StoredSyncStatus>();
const latestJobByOrg = new Map<string, string>();

const DEFAULT_COUNTS: SyncJobCounts = {
  created: 0,
  updated: 0,
  deleted: 0,
  skipped: 0
};

export function isTerminalPhase(phase: SyncJobPhase): boolean {
  return phase === "done" || phase === "error";
}

function cloneStatus(status: StoredSyncStatus): SyncStatus {
  return {
    id: status.id,
    startedAt: new Date(status.startedAt),
    updatedAt: new Date(status.updatedAt),
    finishedAt: status.finishedAt ? new Date(status.finishedAt) : null,
    phase: status.phase,
    counts: { ...status.counts },
    message: status.message,
    logs: status.logs ? [...status.logs] : undefined,
    options: { ...status.options }
  };
}

function ensureCounts(counts?: SyncJobCounts): SyncJobCounts {
  if (!counts) {
    return { ...DEFAULT_COUNTS };
  }
  return {
    created: counts.created ?? 0,
    updated: counts.updated ?? 0,
    deleted: counts.deleted ?? 0,
    skipped: counts.skipped ?? 0
  };
}

export function createSyncJob(
  orgId: string,
  options: SyncJobOptions,
  message = "Preparing sync job"
): SyncStatus {
  const now = new Date();
  const record: StoredSyncStatus = {
    id: randomUUID(),
    orgId,
    startedAt: now,
    updatedAt: now,
    finishedAt: null,
    phase: "fetch",
    counts: { ...DEFAULT_COUNTS },
    message,
    logs: [message],
    options: { ...options }
  };

  jobsById.set(record.id, record);
  latestJobByOrg.set(orgId, record.id);

  return cloneStatus(record);
}

export function updateSyncJob(
  jobId: string,
  update: SyncJobUpdate
): SyncStatus | null {
  const current = jobsById.get(jobId);
  if (!current) {
    return null;
  }

  const nextCounts = ensureCounts(update.counts ?? current.counts);
  const nextLogs = current.logs ? [...current.logs] : [];
  if (update.logs) {
    nextLogs.splice(0, nextLogs.length, ...update.logs);
  }
  if (update.appendLog) {
    nextLogs.push(update.appendLog);
  }

  const next: StoredSyncStatus = {
    ...current,
    phase: update.phase ?? current.phase,
    message: update.message ?? current.message,
    counts: nextCounts,
    logs: nextLogs,
    updatedAt: new Date()
  };

  if (update.phase && isTerminalPhase(update.phase)) {
    next.finishedAt = new Date();
  }

  jobsById.set(jobId, next);
  return cloneStatus(next);
}

export function appendSyncJobLog(
  jobId: string,
  entry: string
): SyncStatus | null {
  return updateSyncJob(jobId, { appendLog: entry });
}

export function getSyncStatus(jobId: string): SyncStatus | null {
  const status = jobsById.get(jobId);
  return status ? cloneStatus(status) : null;
}

export function getLatestSyncStatusForOrg(orgId: string): SyncStatus | null {
  const jobId = latestJobByOrg.get(orgId);
  if (!jobId) {
    return null;
  }
  const status = jobsById.get(jobId);
  return status && status.orgId === orgId ? cloneStatus(status) : null;
}

export function getSyncStatusForOrg(
  orgId: string,
  jobId: string
): SyncStatus | null {
  const status = jobsById.get(jobId);
  if (!status || status.orgId !== orgId) {
    return null;
  }
  return cloneStatus(status);
}

export function getActiveSyncJobForOrg(orgId: string): SyncStatus | null {
  const status = getLatestSyncStatusForOrg(orgId);
  if (!status) {
    return null;
  }
  return isTerminalPhase(status.phase) ? null : status;
}

export function syncStatusToJson(status: SyncStatus | null) {
  if (!status) {
    return null;
  }
  return {
    ...status,
    startedAt: status.startedAt.toISOString(),
    updatedAt: status.updatedAt.toISOString(),
    finishedAt: status.finishedAt ? status.finishedAt.toISOString() : null,
    counts: { ...status.counts },
    logs: status.logs ? [...status.logs] : undefined,
    options: { ...status.options }
  };
}

export function resetSyncJobsForTests() {
  jobsById.clear();
  latestJobByOrg.clear();
}
