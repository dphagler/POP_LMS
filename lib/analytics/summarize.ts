import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/prisma";

function startOfUtcDay(value: Date): Date {
  const date = new Date(value.getTime());
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function addUtcDays(date: Date, amount: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + amount);
  return result;
}

function normalizeDateValue(value: Date | string): Date {
  if (value instanceof Date) {
    return startOfUtcDay(value);
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Unable to parse date value: ${value}`);
  }
  return parsed;
}

function parseInteger(value: unknown): number {
  if (value == null) {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.trunc(value) : 0;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

function parseFloatValue(value: unknown): number {
  if (value == null) {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}

function formatDateIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

type SummaryMapKey = string;

type DailySummary = {
  orgId: string;
  lessonId: string;
  date: Date;
  viewers: number;
  uniqueSecondsSum: number;
  avgPercent: number;
  completes: number;
};

type WatcherRow = {
  orgId: string;
  lessonId: string;
  date: Date | string;
  viewers: number | string | bigint | null;
  uniqueSecondsSum: number | string | bigint | null;
  avgPercent: number | string | bigint | null;
};

type CompletionRow = {
  orgId: string;
  lessonId: string;
  date: Date | string;
  completes: number | string | bigint | null;
};

function createSummaryKey(orgId: string, lessonId: string, date: Date): SummaryMapKey {
  return `${orgId}::${lessonId}::${formatDateIso(date)}`;
}

export type SummarizeProgressDailyResult = {
  attemptedRangeStart: string | null;
  attemptedRangeEnd: string | null;
  firstProcessedDate: string | null;
  lastProcessedDate: string | null;
  processedDayCount: number;
  upsertedRowCount: number;
};

export async function summarizeProgressDaily(
  client: PrismaClient = prisma,
): Promise<SummarizeProgressDailyResult> {
  const todayUtc = startOfUtcDay(new Date());
  const endDateExclusive = todayUtc;

  const latestSummary = await client.progressDaily.aggregate({
    _max: { date: true },
  });

  const lastSummaryDate = latestSummary._max.date
    ? startOfUtcDay(new Date(latestSummary._max.date))
    : null;

  const progressBounds = await client.progress.aggregate({
    _min: {
      lastTickAt: true,
      completedAt: true,
    },
  });

  const earliestCandidates: Date[] = [];
  if (progressBounds._min.lastTickAt) {
    earliestCandidates.push(startOfUtcDay(new Date(progressBounds._min.lastTickAt)));
  }
  if (progressBounds._min.completedAt) {
    earliestCandidates.push(startOfUtcDay(new Date(progressBounds._min.completedAt)));
  }

  const earliestActivity =
    earliestCandidates.length > 0
      ? earliestCandidates.reduce((earliest, current) =>
          current.getTime() < earliest.getTime() ? current : earliest,
        )
      : null;

  let startDate = lastSummaryDate ? addUtcDays(lastSummaryDate, 1) : earliestActivity;

  if (earliestActivity && startDate && startDate.getTime() < earliestActivity.getTime()) {
    startDate = earliestActivity;
  }

  if (!startDate) {
    return {
      attemptedRangeStart: null,
      attemptedRangeEnd: null,
      firstProcessedDate: null,
      lastProcessedDate: null,
      processedDayCount: 0,
      upsertedRowCount: 0,
    };
  }

  if (startDate.getTime() >= endDateExclusive.getTime()) {
    return {
      attemptedRangeStart: null,
      attemptedRangeEnd: null,
      firstProcessedDate: null,
      lastProcessedDate: null,
      processedDayCount: 0,
      upsertedRowCount: 0,
    };
  }

  const attemptedRangeStart = formatDateIso(startDate);
  const attemptedRangeEnd = formatDateIso(addUtcDays(endDateExclusive, -1));

  const watcherRows = await client.$queryRaw<WatcherRow[]>(Prisma.sql`
    SELECT
      c."orgId" AS "orgId",
      p."lessonId" AS "lessonId",
      (p."lastTickAt" AT TIME ZONE 'UTC')::date AS "date",
      COUNT(DISTINCT p."userId") AS "viewers",
      SUM(
        LEAST(
          GREATEST(COALESCE(p."uniqueSeconds", 0), 0),
          l."durationS"
        )
      ) AS "uniqueSecondsSum",
      AVG(
        CASE
          WHEN l."durationS" > 0 THEN LEAST(
            1,
            GREATEST(COALESCE(p."uniqueSeconds", 0)::double precision / NULLIF(l."durationS", 0), 0)
          )
          ELSE NULL
        END
      ) AS "avgPercent"
    FROM "Progress" p
    JOIN "Lesson" l ON l."id" = p."lessonId"
    JOIN "Module" m ON m."id" = l."moduleId"
    JOIN "Course" c ON c."id" = m."courseId"
    WHERE p."lastTickAt" IS NOT NULL
      AND p."lastTickAt" >= ${startDate}
      AND p."lastTickAt" < ${endDateExclusive}
      AND COALESCE(p."uniqueSeconds", 0) > 0
    GROUP BY c."orgId", p."lessonId", (p."lastTickAt" AT TIME ZONE 'UTC')::date
  `);

  const completionRows = await client.$queryRaw<CompletionRow[]>(Prisma.sql`
    SELECT
      c."orgId" AS "orgId",
      p."lessonId" AS "lessonId",
      (p."completedAt" AT TIME ZONE 'UTC')::date AS "date",
      COUNT(*) AS "completes"
    FROM "Progress" p
    JOIN "Lesson" l ON l."id" = p."lessonId"
    JOIN "Module" m ON m."id" = l."moduleId"
    JOIN "Course" c ON c."id" = m."courseId"
    WHERE p."completedAt" IS NOT NULL
      AND p."completedAt" >= ${startDate}
      AND p."completedAt" < ${endDateExclusive}
    GROUP BY c."orgId", p."lessonId", (p."completedAt" AT TIME ZONE 'UTC')::date
  `);

  const summaryMap = new Map<SummaryMapKey, DailySummary>();

  for (const row of watcherRows) {
    const date = normalizeDateValue(row.date);
    const key = createSummaryKey(row.orgId, row.lessonId, date);
    const entry = summaryMap.get(key) ?? {
      orgId: row.orgId,
      lessonId: row.lessonId,
      date,
      viewers: 0,
      uniqueSecondsSum: 0,
      avgPercent: 0,
      completes: 0,
    };

    entry.viewers = Math.max(0, parseInteger(row.viewers));
    entry.uniqueSecondsSum = Math.max(0, parseInteger(row.uniqueSecondsSum));
    entry.avgPercent = clampPercent(parseFloatValue(row.avgPercent));
    summaryMap.set(key, entry);
  }

  for (const row of completionRows) {
    const date = normalizeDateValue(row.date);
    const key = createSummaryKey(row.orgId, row.lessonId, date);
    const entry = summaryMap.get(key) ?? {
      orgId: row.orgId,
      lessonId: row.lessonId,
      date,
      viewers: 0,
      uniqueSecondsSum: 0,
      avgPercent: 0,
      completes: 0,
    };

    entry.completes = Math.max(0, parseInteger(row.completes));
    summaryMap.set(key, entry);
  }

  const rows = Array.from(summaryMap.values());

  if (rows.length === 0) {
    return {
      attemptedRangeStart,
      attemptedRangeEnd,
      firstProcessedDate: null,
      lastProcessedDate: null,
      processedDayCount: 0,
      upsertedRowCount: 0,
    };
  }

  rows.sort((a, b) => {
    const dateDiff = a.date.getTime() - b.date.getTime();
    if (dateDiff !== 0) {
      return dateDiff;
    }
    const orgDiff = a.orgId.localeCompare(b.orgId);
    if (orgDiff !== 0) {
      return orgDiff;
    }
    return a.lessonId.localeCompare(b.lessonId);
  });

  const transactions = rows.map((row) =>
    client.progressDaily.upsert({
      where: {
        orgId_lessonId_date: {
          orgId: row.orgId,
          lessonId: row.lessonId,
          date: row.date,
        },
      },
      update: {
        viewers: row.viewers,
        avgPercent: row.avgPercent,
        completes: row.completes,
        uniqueSecondsSum: row.uniqueSecondsSum,
      },
      create: {
        orgId: row.orgId,
        lessonId: row.lessonId,
        date: row.date,
        viewers: row.viewers,
        avgPercent: row.avgPercent,
        completes: row.completes,
        uniqueSecondsSum: row.uniqueSecondsSum,
      },
    }),
  );

  await client.$transaction(transactions);

  const processedDates = new Set<string>();
  for (const row of rows) {
    processedDates.add(formatDateIso(row.date));
  }

  const firstProcessed = rows[0]?.date ?? null;
  const lastProcessed = rows[rows.length - 1]?.date ?? null;

  return {
    attemptedRangeStart,
    attemptedRangeEnd,
    firstProcessedDate: firstProcessed ? formatDateIso(firstProcessed) : null,
    lastProcessedDate: lastProcessed ? formatDateIso(lastProcessed) : null,
    processedDayCount: processedDates.size,
    upsertedRowCount: rows.length,
  };
}
