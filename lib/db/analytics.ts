import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type BaseFilter = {
  orgId: string;
  groupId?: string;
};

type DateRangeFilter = {
  startDate?: Date;
  endDate?: Date;
};

export type AnalyticsFilters = BaseFilter & DateRangeFilter;

const NOW_PLAYING_WINDOW_MS = 5 * 60 * 1000;

export type NowPlayingLesson = {
  lessonId: string;
  lessonTitle: string;
  activeViewers: number;
};

export async function fetchNowPlayingLessons({
  orgId,
  groupId,
}: BaseFilter): Promise<NowPlayingLesson[]> {
  const windowStart = new Date(Date.now() - NOW_PLAYING_WINDOW_MS);

  const baseWhere: Prisma.ProgressWhereInput = {
    lastTickAt: { gte: windowStart },
    user: {
      orgId,
      ...(groupId ? { groupMemberships: { some: { groupId } } } : {}),
    },
  };

  const lessonBuckets = await prisma.progress.groupBy({
    where: baseWhere,
    by: ["lessonId"],
    _count: { lessonId: true },
    orderBy: { _count: { lessonId: "desc" } },
    take: 10,
  });

  if (lessonBuckets.length === 0) {
    return [];
  }

  const lessonIds = lessonBuckets.map((bucket) => bucket.lessonId);

  const lessons = await prisma.lesson.findMany({
    where: { id: { in: lessonIds } },
    select: { id: true, title: true },
  });

  const lessonTitleMap = new Map(lessons.map((lesson) => [lesson.id, lesson.title]));

  return lessonBuckets.map((bucket) => ({
    lessonId: bucket.lessonId,
    lessonTitle: lessonTitleMap.get(bucket.lessonId) ?? "Untitled lesson",
    activeViewers: bucket._count?.lessonId ?? 0,
  }));
}

export type CompletionFunnel = {
  starts: number;
  completes: number;
};

export async function fetchCompletionFunnel({
  orgId,
  groupId,
  startDate,
  endDate,
}: AnalyticsFilters): Promise<CompletionFunnel> {
  const userFilter: Prisma.ProgressWhereInput["user"] = {
    orgId,
    ...(groupId ? { groupMemberships: { some: { groupId } } } : {}),
  };

  const dateRange: Prisma.DateTimeFilter | undefined =
    startDate || endDate
      ? {
          ...(startDate ? { gte: startDate } : {}),
          ...(endDate ? { lte: endDate } : {}),
        }
      : undefined;

  const [starts, completes] = await Promise.all([
    prisma.progress.count({
      where: {
        user: userFilter,
        ...(dateRange ? { createdAt: dateRange } : {}),
      },
    }),
    prisma.progress.count({
      where: {
        user: userFilter,
        isComplete: true,
        ...(dateRange ? { completedAt: dateRange } : {}),
      },
    }),
  ]);

  return { starts, completes };
}

export type CohortGroupMetrics = {
  groupId: string;
  name: string;
  memberCount: number;
  starts: number;
  completes: number;
};

export async function fetchGroupCohorts({
  orgId,
  startDate,
  endDate,
}: {
  orgId: string;
} & DateRangeFilter): Promise<CohortGroupMetrics[]> {
  const groups = await prisma.orgGroup.findMany({
    where: { orgId, deletedAt: null },
    select: {
      id: true,
      name: true,
      _count: { select: { members: true } },
    },
    orderBy: { name: "asc" },
  });

  if (groups.length === 0) {
    return [];
  }

  const groupIds = groups.map((group) => group.id);

  const startWhereParts: Prisma.Sql[] = [
    Prisma.sql`u."orgId" = ${orgId}`,
    Prisma.sql`gm."groupId" IN (${Prisma.join(groupIds)})`,
  ];

  const completeWhereParts: Prisma.Sql[] = [
    Prisma.sql`u."orgId" = ${orgId}`,
    Prisma.sql`gm."groupId" IN (${Prisma.join(groupIds)})`,
    Prisma.sql`p."completedAt" IS NOT NULL`,
  ];

  if (startDate) {
    startWhereParts.push(Prisma.sql`p."createdAt" >= ${startDate}`);
    completeWhereParts.push(Prisma.sql`p."completedAt" >= ${startDate}`);
  }

  if (endDate) {
    startWhereParts.push(Prisma.sql`p."createdAt" <= ${endDate}`);
    completeWhereParts.push(Prisma.sql`p."completedAt" <= ${endDate}`);
  }

  const startRows = await prisma.$queryRaw<Array<{ groupId: string; count: bigint }>>(Prisma.sql`
    SELECT gm."groupId" AS "groupId", COUNT(*)::bigint AS "count"
    FROM "GroupMember" gm
    JOIN "User" u ON u."id" = gm."userId"
    JOIN "Progress" p ON p."userId" = gm."userId"
    WHERE ${Prisma.join(startWhereParts, ' AND ')}
    GROUP BY gm."groupId"
  `);

  const completeRows = await prisma.$queryRaw<Array<{ groupId: string; count: bigint }>>(Prisma.sql`
    SELECT gm."groupId" AS "groupId", COUNT(*)::bigint AS "count"
    FROM "GroupMember" gm
    JOIN "User" u ON u."id" = gm."userId"
    JOIN "Progress" p ON p."userId" = gm."userId"
    WHERE ${Prisma.join(completeWhereParts, ' AND ')}
    GROUP BY gm."groupId"
  `);

  const startMap = new Map(startRows.map((row) => [row.groupId, Number(row.count)]));
  const completeMap = new Map(completeRows.map((row) => [row.groupId, Number(row.count)]));

  return groups.map((group) => ({
    groupId: group.id,
    name: group.name,
    memberCount: group._count.members,
    starts: startMap.get(group.id) ?? 0,
    completes: completeMap.get(group.id) ?? 0,
  }));
}
