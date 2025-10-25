import { Prisma } from "@prisma/client";

import { prisma } from "./prisma";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

export type AuditLogFilters = {
  action?: string;
  actions?: string[];
  actorId?: string;
  actorIds?: string[];
  dateRange?: {
    start?: string | Date | null;
    end?: string | Date | null;
  };
};

export type ListAuditLogInput = {
  orgId: string;
  cursor?: string | null;
  limit?: number;
  filters?: AuditLogFilters | null;
};

export type AuditLogListItem = {
  id: string;
  actor: {
    id: string;
    name: string | null;
    email: string | null;
  };
  action: string;
  target: {
    id: string;
    type: string;
    name: string | null;
  };
  changes?: Record<string, unknown>;
  createdAt: string;
  ipAddress: string | null;
  userAgent: string | null;
};

export type ListAuditLogResult = {
  items: AuditLogListItem[];
  nextCursor: string | null;
};

function coerceDate(value: string | Date | null | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed;
}

function sanitizeAuditLogValue(value: unknown, depth = 0): unknown {
  if (value == null) {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return trimmed;
    }

    if (trimmed.length > 256) {
      return "[redacted]";
    }

    if (/\r|\n/u.test(trimmed)) {
      return "[redacted]";
    }

    if (EMAIL_REGEX.test(trimmed)) {
      return trimmed;
    }

    const commaCount = (trimmed.match(/,/gu) ?? []).length;
    if (commaCount >= 5) {
      return "[redacted]";
    }

    if (/\s/u.test(trimmed) && !/^[\w\-]+$/u.test(trimmed)) {
      return "[redacted]";
    }

    return trimmed;
  }

  if (Array.isArray(value)) {
    return { count: value.length };
  }

  if (typeof value === "object") {
    if (depth >= 1) {
      return "[redacted]";
    }

    const entries = Object.entries(value as Record<string, unknown>);
    const result: Record<string, unknown> = {};

    for (const [key, child] of entries) {
      const sanitized = sanitizeAuditLogValue(child, depth + 1);
      if (typeof sanitized !== "undefined") {
        result[key] = sanitized;
      }
    }

    return Object.keys(result).length > 0 ? result : undefined;
  }

  return undefined;
}

function extractAuditLogMeta(meta: Prisma.JsonValue | null | undefined) {
  const target = {
    name: null as string | null,
  };
  let ipAddress: string | null = null;
  let userAgent: string | null = null;
  const changes: Record<string, unknown> = {};

  if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
    return { target, changes: undefined as Record<string, unknown> | undefined, ipAddress, userAgent };
  }

  for (const [key, value] of Object.entries(meta as Record<string, unknown>)) {
    if (key === "targetName" && typeof value === "string") {
      target.name = value;
      continue;
    }

    if ((key === "ip" || key === "ipAddress") && typeof value === "string") {
      ipAddress = value;
      continue;
    }

    if ((key === "userAgent" || key === "ua") && typeof value === "string") {
      userAgent = value;
      continue;
    }

    const sanitized = sanitizeAuditLogValue(value);
    if (typeof sanitized !== "undefined") {
      changes[key] = sanitized;
    }
  }

  return {
    target,
    changes: Object.keys(changes).length > 0 ? changes : undefined,
    ipAddress,
    userAgent,
  };
}

export async function listAuditLog({
  orgId,
  cursor,
  limit = 50,
  filters,
}: ListAuditLogInput): Promise<ListAuditLogResult> {
  const take = Math.max(1, Math.min(limit, 100));

  const where: Prisma.AuditLogWhereInput = {
    orgId,
  };

  const resolvedFilters = filters ?? undefined;

  if (resolvedFilters?.action) {
    where.action = resolvedFilters.action;
  } else if (resolvedFilters?.actions?.length) {
    where.action = { in: resolvedFilters.actions };
  }

  if (resolvedFilters?.actorId) {
    where.actorId = resolvedFilters.actorId;
  } else if (resolvedFilters?.actorIds?.length) {
    where.actorId = { in: resolvedFilters.actorIds };
  }

  if (resolvedFilters?.dateRange) {
    const range: Prisma.DateTimeFilter = {};
    const start = coerceDate(resolvedFilters.dateRange.start ?? undefined);
    const end = coerceDate(resolvedFilters.dateRange.end ?? undefined);

    if (start) {
      range.gte = start;
    }

    if (end) {
      range.lte = end;
    }

    if (Object.keys(range).length > 0) {
      where.createdAt = range;
    }
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  let nextCursor: string | null = null;
  if (logs.length > take) {
    const nextItem = logs.pop();
    nextCursor = nextItem?.id ?? null;
  }

  const items = logs.map((log) => {
    const { target, changes, ipAddress, userAgent } = extractAuditLogMeta(log.meta);

    return {
      id: log.id,
      actor: {
        id: log.actor?.id ?? "system",
        name: log.actor?.name ?? null,
        email: log.actor?.email ?? null,
      },
      action: log.action,
      target: {
        id: log.entityId,
        type: log.entity,
        name: target.name,
      },
      changes,
      createdAt: log.createdAt.toISOString(),
      ipAddress,
      userAgent,
    } satisfies AuditLogListItem;
  });

  return { items, nextCursor };
}
