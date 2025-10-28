import type { Prisma, PrismaClient } from '@prisma/client';

import { prisma } from '@/lib/prisma';

type Client = PrismaClient | Prisma.TransactionClient;

export type LogAuditParams = {
  orgId: string;
  actorId?: string | null;
  action: string;
  targetId?: string | null;
  metadata?: Prisma.JsonValue;
  client?: Client;
};

export async function logAudit({
  orgId,
  actorId,
  action,
  targetId,
  metadata,
  client,
}: LogAuditParams): Promise<void> {
  const db = client ?? prisma;

  await db.auditLog.create({
    data: {
      orgId,
      action,
      actorId: actorId ?? null,
      targetId: targetId ?? null,
      metadata: metadata ?? undefined,
    },
  });
}

export type AuditLogFilters = {
  action?: string;
  actorId?: string;
  startDate?: Date;
  endDate?: Date;
};

export type AuditLogListItem = {
  id: string;
  action: string;
  targetId: string | null;
  metadata: Prisma.JsonValue | null;
  createdAt: string;
  actor: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
};

export type ListAuditLogsResult = {
  items: AuditLogListItem[];
  actions: string[];
  actors: Array<{ id: string; name: string | null; email: string | null }>;
};

export async function listAuditLogs({
  orgId,
  limit = 100,
  filters,
}: {
  orgId: string;
  limit?: number;
  filters?: AuditLogFilters;
}): Promise<ListAuditLogsResult> {
  const take = Math.max(1, Math.min(limit, 100));
  const where: Prisma.AuditLogWhereInput = {
    orgId,
  };

  if (filters?.action) {
    where.action = filters.action;
  }

  if (filters?.actorId) {
    where.actorId = filters.actorId;
  }

  if (filters?.startDate || filters?.endDate) {
    const range: Prisma.DateTimeFilter = {};

    if (filters.startDate) {
      range.gte = filters.startDate;
    }

    if (filters.endDate) {
      range.lte = filters.endDate;
    }

    where.createdAt = range;
  }

  const [logs, actionRows, actorIdRows] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.auditLog.findMany({
      where: { orgId },
      distinct: ['action'],
      select: { action: true },
      orderBy: { action: 'asc' },
    }),
    prisma.auditLog.findMany({
      where: { orgId, actorId: { not: null } },
      distinct: ['actorId'],
      select: { actorId: true },
    }),
  ]);

  const actorIds = Array.from(
    new Set(
      actorIdRows
        .map((row) => row.actorId)
        .filter((value): value is string => typeof value === 'string' && value.length > 0),
    ),
  );

  const actors = actorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, name: true, email: true },
      })
    : [];

  actors.sort((a, b) => {
    const aLabel = a.name ?? a.email ?? a.id;
    const bLabel = b.name ?? b.email ?? b.id;
    return aLabel.localeCompare(bLabel);
  });

  const items: AuditLogListItem[] = logs.map((log) => ({
    id: log.id,
    action: log.action,
    targetId: log.targetId,
    metadata: log.metadata ?? null,
    createdAt: log.createdAt.toISOString(),
    actor: log.actor
      ? {
          id: log.actor.id,
          name: log.actor.name,
          email: log.actor.email,
        }
      : null,
  }));

  const actions = actionRows
    .map((row) => row.action)
    .filter((value): value is string => typeof value === 'string' && value.length > 0);

  return { items, actions, actors };
}
