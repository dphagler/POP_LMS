import { NextResponse } from 'next/server';

import type { Prisma } from '@prisma/client';

import { requireRole } from '@/lib/authz';
import { prisma } from '@/lib/prisma';

const CSV_HEADER = [
  'userId',
  'userEmail',
  'lessonId',
  'lessonTitle',
  'startedAt',
  'completedAt',
  'uniqueSeconds',
  'durationS',
  'percent',
  'orgId',
  'groupIds',
].join(',');

function escapeCsvValue(value: unknown): string {
  if (value == null) {
    return '';
  }

  const stringValue = typeof value === 'string' ? value : String(value);
  if (stringValue.includes(',') || stringValue.includes('\"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function parseDate(value: string | null, options?: { endOfDay?: boolean }) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  if (options?.endOfDay) {
    parsed.setHours(23, 59, 59, 999);
  } else {
    parsed.setHours(0, 0, 0, 0);
  }

  return parsed;
}

export async function GET(request: Request) {
  const session = await requireRole('ADMIN');
  const { orgId } = session.user;

  if (!orgId) {
    throw new Error('Organization not found for admin user');
  }

  const url = new URL(request.url);
  const groupId = url.searchParams.get('groupId');
  const startDate = parseDate(url.searchParams.get('start'));
  const endDate = parseDate(url.searchParams.get('end'), { endOfDay: true });

  const where: Prisma.ProgressWhereInput = {
    user: {
      orgId,
      ...(groupId ? { groupMemberships: { some: { groupId } } } : {}),
    },
  };

  if (startDate || endDate) {
    const range: Prisma.DateTimeFilter = {};
    if (startDate) {
      range.gte = startDate;
    }
    if (endDate) {
      range.lte = endDate;
    }
    where.updatedAt = range;
  }

  const encoder = new TextEncoder();
  const pageSize = 200;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(`${CSV_HEADER}\n`));

      let cursor: string | undefined;

      try {
        for (;;) {
          const batch = await prisma.progress.findMany({
            where,
            orderBy: { id: 'asc' },
            take: pageSize,
            ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
            select: {
              id: true,
              userId: true,
              lessonId: true,
              uniqueSeconds: true,
              createdAt: true,
              updatedAt: true,
              isComplete: true,
              lesson: {
                select: {
                  id: true,
                  title: true,
                  durationS: true,
                },
              },
              user: {
                select: {
                  id: true,
                  email: true,
                  groupMemberships: {
                    select: {
                      groupId: true,
                      group: {
                        select: {
                          orgId: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          });

          if (batch.length === 0) {
            break;
          }

          for (const record of batch) {
            const lessonDuration = record.lesson?.durationS ?? 0;
            const uniqueSeconds = record.uniqueSeconds ?? 0;
            const percent = lessonDuration > 0 ? Math.min(1, uniqueSeconds / lessonDuration) : 0;
            const groups = record.user.groupMemberships
              .filter((membership) => membership.group?.orgId === orgId)
              .map((membership) => membership.groupId);

            const values: Array<string | number> = [
              record.userId,
              record.user.email ?? '',
              record.lessonId,
              record.lesson?.title ?? '',
              record.createdAt.toISOString(),
              record.isComplete ? record.updatedAt.toISOString() : '',
              uniqueSeconds,
              lessonDuration,
              percent.toFixed(4),
              orgId,
              groups.join(';'),
            ];

            controller.enqueue(encoder.encode(`${values.map(escapeCsvValue).join(',')}\n`));
          }

          if (batch.length < pageSize) {
            break;
          }

          cursor = batch[batch.length - 1]?.id;
        }
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename=analytics-progress.csv',
    },
  });
}
