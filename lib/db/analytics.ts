import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { coerceSegments, type Segment } from "@/lib/lesson/progress";

type BaseFilter = {
  orgId: string;
  groupId?: string;
};

type DateRangeFilter = {
  startDate?: Date;
  endDate?: Date;
};

type LessonFilter = {
  lessonId?: string;
};

export type AnalyticsFilters = BaseFilter & DateRangeFilter & LessonFilter;

const NOW_PLAYING_WINDOW_MS = 5 * 60 * 1000;

export type NowPlayingLesson = {
  lessonId: string;
  lessonTitle: string;
  activeViewers: number;
};

export async function fetchNowPlayingLessons({
  orgId,
  groupId
}: BaseFilter): Promise<NowPlayingLesson[]> {
  const windowStart = new Date(Date.now() - NOW_PLAYING_WINDOW_MS);

  const baseWhere: Prisma.ProgressWhereInput = {
    lastTickAt: { gte: windowStart },
    user: {
      orgId,
      ...(groupId ? { groupMemberships: { some: { groupId } } } : {})
    }
  };

  const lessonBuckets = await prisma.progress.groupBy({
    where: baseWhere,
    by: ["lessonId"],
    _count: { lessonId: true },
    orderBy: { _count: { lessonId: "desc" } },
    take: 10
  });

  if (lessonBuckets.length === 0) {
    return [];
  }

  const lessonIds = lessonBuckets.map((bucket) => bucket.lessonId);

  const lessons = await prisma.lesson.findMany({
    where: { id: { in: lessonIds } },
    select: { id: true, title: true }
  });

  const lessonTitleMap = new Map(
    lessons.map((lesson) => [lesson.id, lesson.title])
  );

  return lessonBuckets.map((bucket) => ({
    lessonId: bucket.lessonId,
    lessonTitle: lessonTitleMap.get(bucket.lessonId) ?? "Untitled lesson",
    activeViewers: bucket._count?.lessonId ?? 0
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
  lessonId
}: AnalyticsFilters): Promise<CompletionFunnel> {
  const userFilter: Prisma.ProgressWhereInput["user"] = {
    orgId,
    ...(groupId ? { groupMemberships: { some: { groupId } } } : {})
  };

  const dateRange: Prisma.DateTimeFilter | undefined =
    startDate || endDate
      ? {
          ...(startDate ? { gte: startDate } : {}),
          ...(endDate ? { lte: endDate } : {})
        }
      : undefined;

  const baseWhere: Prisma.ProgressWhereInput = {
    user: userFilter,
    ...(lessonId ? { lessonId } : {})
  };

  const [starts, completes] = await Promise.all([
    prisma.progress.count({
      where: {
        ...baseWhere,
        ...(dateRange ? { createdAt: dateRange } : {})
      }
    }),
    prisma.progress.count({
      where: {
        ...baseWhere,
        completedAt: { not: null },
        ...(dateRange ? { completedAt: dateRange } : {})
      }
    })
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
  endDate
}: {
  orgId: string;
} & DateRangeFilter): Promise<CohortGroupMetrics[]> {
  const groups = await prisma.orgGroup.findMany({
    where: { orgId, deletedAt: null },
    select: {
      id: true,
      name: true,
      _count: { select: { members: true } }
    },
    orderBy: { name: "asc" }
  });

  if (groups.length === 0) {
    return [];
  }

  const groupIds = groups.map((group) => group.id);

  const startWhereParts: Prisma.Sql[] = [
    Prisma.sql`u."orgId" = ${orgId}`,
    Prisma.sql`gm."groupId" IN (${Prisma.join(groupIds)})`
  ];

  const completeWhereParts: Prisma.Sql[] = [
    Prisma.sql`u."orgId" = ${orgId}`,
    Prisma.sql`gm."groupId" IN (${Prisma.join(groupIds)})`,
    Prisma.sql`p."completedAt" IS NOT NULL`
  ];

  if (startDate) {
    startWhereParts.push(Prisma.sql`p."createdAt" >= ${startDate}`);
    completeWhereParts.push(Prisma.sql`p."completedAt" >= ${startDate}`);
  }

  if (endDate) {
    startWhereParts.push(Prisma.sql`p."createdAt" <= ${endDate}`);
    completeWhereParts.push(Prisma.sql`p."completedAt" <= ${endDate}`);
  }

  const startRows = await prisma.$queryRaw<
    Array<{ groupId: string; count: bigint }>
  >(Prisma.sql`
    SELECT gm."groupId" AS "groupId", COUNT(*)::bigint AS "count"
    FROM "GroupMember" gm
    JOIN "User" u ON u."id" = gm."userId"
    JOIN "Progress" p ON p."userId" = gm."userId"
    WHERE ${Prisma.join(startWhereParts, " AND ")}
    GROUP BY gm."groupId"
  `);

  const completeRows = await prisma.$queryRaw<
    Array<{ groupId: string; count: bigint }>
  >(Prisma.sql`
    SELECT gm."groupId" AS "groupId", COUNT(*)::bigint AS "count"
    FROM "GroupMember" gm
    JOIN "User" u ON u."id" = gm."userId"
    JOIN "Progress" p ON p."userId" = gm."userId"
    WHERE ${Prisma.join(completeWhereParts, " AND ")}
    GROUP BY gm."groupId"
  `);

  const startMap = new Map(
    startRows.map((row) => [row.groupId, Number(row.count)])
  );
  const completeMap = new Map(
    completeRows.map((row) => [row.groupId, Number(row.count)])
  );

  return groups.map((group) => ({
    groupId: group.id,
    name: group.name,
    memberCount: group._count.members,
    starts: startMap.get(group.id) ?? 0,
    completes: completeMap.get(group.id) ?? 0
  }));
}

export type AugmentationUsageSummary = {
  total: number;
  countsByKind: Array<{ kind: string; count: number }>;
  topLessons: Array<{ lessonId: string; lessonTitle: string; count: number }>;
};

export async function fetchAugmentationUsage({
  orgId,
  groupId,
  startDate,
  endDate,
  lessonId
}: AnalyticsFilters): Promise<AugmentationUsageSummary> {
  const where: Prisma.AugmentationServedWhereInput = {
    orgId,
    ...(lessonId ? { lessonId } : {}),
    ...(groupId ? { user: { groupMemberships: { some: { groupId } } } } : {})
  };

  if (startDate || endDate) {
    where.createdAt = {
      ...(startDate ? { gte: startDate } : {}),
      ...(endDate ? { lte: endDate } : {})
    };
  }

  const [countsByKind, topLessonBuckets] = await Promise.all([
    prisma.augmentationServed.groupBy({
      where,
      by: ["kind"],
      _count: { kind: true },
      orderBy: { _count: { kind: "desc" } }
    }),
    prisma.augmentationServed.groupBy({
      where,
      by: ["lessonId"],
      _count: { lessonId: true },
      orderBy: { _count: { lessonId: "desc" } },
      take: 5
    })
  ]);

  const lessonIds = topLessonBuckets.map((bucket) => bucket.lessonId);

  const lessons =
    lessonIds.length > 0
      ? await prisma.lesson.findMany({
          where: { id: { in: lessonIds } },
          select: { id: true, title: true }
        })
      : [];

  const lessonTitleMap = new Map(
    lessons.map((lesson) => [lesson.id, lesson.title])
  );

  const topLessons = topLessonBuckets.map((bucket) => ({
    lessonId: bucket.lessonId,
    lessonTitle: lessonTitleMap.get(bucket.lessonId) ?? "Untitled lesson",
    count: bucket._count?.lessonId ?? 0
  }));

  const total = countsByKind.reduce(
    (sum, bucket) => sum + (bucket._count?.kind ?? 0),
    0
  );

  return {
    total,
    countsByKind: countsByKind.map((bucket) => ({
      kind: bucket.kind,
      count: bucket._count?.kind ?? 0
    })),
    topLessons
  };
}

export type ConfusionSpike = {
  lessonId: string;
  lessonTitle: string;
  watchers: number;
  spikes: Array<{ start: number; end: number; count: number }>;
};

const CONFUSION_BUCKET_SIZE = 10; // seconds
const MAX_REWATCH_SEGMENT_LENGTH = 120; // seconds

type LessonSegments = {
  watchers: number;
  segments: Segment[];
};

const toBucketIndex = (value: number): number =>
  Math.floor(value / CONFUSION_BUCKET_SIZE);

export async function fetchConfusionSpikes({
  orgId,
  groupId,
  startDate,
  endDate,
  lessonId
}: AnalyticsFilters): Promise<ConfusionSpike[]> {
  const where: Prisma.ProgressWhereInput = {
    orgId,
    segments: { not: Prisma.JsonNull },
    ...(lessonId ? { lessonId } : {}),
    ...(groupId ? { user: { groupMemberships: { some: { groupId } } } } : {})
  };

  if (startDate || endDate) {
    where.createdAt = {
      ...(startDate ? { gte: startDate } : {}),
      ...(endDate ? { lte: endDate } : {})
    };
  }

  const progressRows = await prisma.progress.findMany({
    where,
    select: { lessonId: true, segments: true }
  });

  const lessonSegments = new Map<string, LessonSegments>();

  for (const row of progressRows) {
    const segments = coerceSegments(row.segments).map(([start, end]) => {
      const lower = Math.min(start, end);
      const upper = Math.max(start, end);
      return [Math.max(lower, 0), Math.max(upper, 0)] as Segment;
    });

    const filteredSegments = segments.filter(([start, end]) => {
      const duration = end - start;
      return (
        Number.isFinite(duration) &&
        duration > 5 &&
        duration <= MAX_REWATCH_SEGMENT_LENGTH
      );
    });

    if (filteredSegments.length === 0) {
      continue;
    }

    const existing = lessonSegments.get(row.lessonId);
    if (existing) {
      existing.watchers += 1;
      existing.segments.push(...filteredSegments);
    } else {
      lessonSegments.set(row.lessonId, {
        watchers: 1,
        segments: [...filteredSegments]
      });
    }
  }

  if (lessonSegments.size === 0) {
    return [];
  }

  const lessonsWithSpikes: ConfusionSpike[] = [];

  for (const [lessonKey, data] of lessonSegments) {
    const { watchers, segments } = data;

    if (watchers < 2 || segments.length === 0) {
      continue;
    }

    const bucketStats = new Map<
      number,
      { count: number; minStart: number; maxEnd: number }
    >();

    for (const [start, end] of segments) {
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
        continue;
      }

      const startBucket = toBucketIndex(start);
      const endBucket = toBucketIndex(Math.max(start, end - 0.0001));

      for (let bucket = startBucket; bucket <= endBucket; bucket += 1) {
        const current = bucketStats.get(bucket) ?? {
          count: 0,
          minStart: Number.POSITIVE_INFINITY,
          maxEnd: 0
        };
        current.count += 1;
        current.minStart = Math.min(current.minStart, start);
        current.maxEnd = Math.max(current.maxEnd, end);
        bucketStats.set(bucket, current);
      }
    }

    if (bucketStats.size === 0) {
      continue;
    }

    const sortedBuckets = Array.from(bucketStats.keys()).sort((a, b) => a - b);
    const threshold =
      watchers <= 3 ? 2 : Math.max(2, Math.ceil(watchers * 0.5));

    const clusters: Array<{
      startBucket: number;
      endBucket: number;
      maxCount: number;
      minStart: number;
      maxEnd: number;
    }> = [];
    let currentCluster: (typeof clusters)[number] | null = null;

    for (const bucket of sortedBuckets) {
      const stats = bucketStats.get(bucket)!;
      if (stats.count < threshold) {
        if (currentCluster) {
          clusters.push(currentCluster);
          currentCluster = null;
        }
        continue;
      }

      if (currentCluster && bucket <= currentCluster.endBucket + 1) {
        currentCluster.endBucket = bucket;
        currentCluster.maxCount = Math.max(
          currentCluster.maxCount,
          stats.count
        );
        currentCluster.minStart = Math.min(
          currentCluster.minStart,
          stats.minStart
        );
        currentCluster.maxEnd = Math.max(currentCluster.maxEnd, stats.maxEnd);
      } else {
        if (currentCluster) {
          clusters.push(currentCluster);
        }
        currentCluster = {
          startBucket: bucket,
          endBucket: bucket,
          maxCount: stats.count,
          minStart: stats.minStart,
          maxEnd: stats.maxEnd
        };
      }
    }

    if (currentCluster) {
      clusters.push(currentCluster);
    }

    const spikes = clusters
      .map(({ startBucket, endBucket, maxCount, minStart, maxEnd }) => {
        const start = Math.max(0, Math.floor(minStart));
        const end = Math.max(start + 1, Math.ceil(maxEnd));
        const length = end - start;
        if (length > MAX_REWATCH_SEGMENT_LENGTH * 2) {
          return null;
        }
        return { start, end, count: maxCount };
      })
      .filter(
        (spike): spike is { start: number; end: number; count: number } =>
          spike !== null
      );

    if (spikes.length === 0) {
      continue;
    }

    lessonsWithSpikes.push({
      lessonId: lessonKey,
      lessonTitle: "",
      watchers,
      spikes
    });
  }

  if (lessonsWithSpikes.length === 0) {
    return [];
  }

  const lessonIds = lessonsWithSpikes.map((item) => item.lessonId);
  const lessonRecords = await prisma.lesson.findMany({
    where: { id: { in: lessonIds } },
    select: { id: true, title: true }
  });

  const lessonTitleMap = new Map(
    lessonRecords.map((record) => [record.id, record.title])
  );

  lessonsWithSpikes.forEach((item) => {
    item.lessonTitle = lessonTitleMap.get(item.lessonId) ?? "Untitled lesson";
  });

  lessonsWithSpikes.sort((a, b) => {
    if (b.spikes.length === a.spikes.length) {
      return b.watchers - a.watchers;
    }
    return b.spikes.length - a.spikes.length;
  });

  return lessonsWithSpikes;
}
