import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const applyFixes = process.env.APPLY_FIXES === "true";

async function ensureOrgMemberships() {
  const duplicateMemberships = await prisma.$queryRaw<Array<{
    userId: string;
    orgId: string;
    duplicateCount: bigint;
  }>>`
    SELECT "userId", "orgId", COUNT(*)::bigint AS "duplicateCount"
    FROM "OrgMembership"
    GROUP BY "userId", "orgId"
    HAVING COUNT(*) > 1
  `;

  if (duplicateMemberships.length > 0) {
    console.warn("[OrgMembership] Duplicate rows detected:");
    duplicateMemberships.forEach((row) => {
      console.warn(`  userId=${row.userId} orgId=${row.orgId} duplicates=${row.duplicateCount}`);
    });
    throw new Error("OrgMembership duplicates found. Resolve manually before continuing.");
  }

  const missingMemberships = await prisma.$queryRaw<Array<{ userId: string; orgId: string }>>`
    SELECT u."id" AS "userId", u."orgId"
    FROM "User" u
    WHERE u."orgId" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM "OrgMembership" m
        WHERE m."userId" = u."id" AND m."orgId" = u."orgId"
      )
  `;

  if (missingMemberships.length > 0) {
    console.warn("[OrgMembership] Missing membership rows for users:");
    missingMemberships.forEach(({ userId, orgId }) => {
      console.warn(`  userId=${userId} orgId=${orgId}`);
    });
    throw new Error("OrgMembership missing home-org memberships.");
  }
}

async function resolveAssessmentDuplicates() {
  const duplicates = await prisma.$queryRaw<Array<{
    userId: string;
    lessonId: string;
    type: string;
    ids: string[];
  }>>`
    SELECT "userId", "lessonId", "type", ARRAY_AGG("id" ORDER BY COALESCE("updatedAt", "startedAt") DESC, "id" DESC) AS ids
    FROM "Assessment"
    GROUP BY "userId", "lessonId", "type"
    HAVING COUNT(*) > 1
  `;

  if (duplicates.length === 0) {
    return;
  }

  console.warn(`[Assessment] Found ${duplicates.length} duplicate key group(s).`);

  for (const duplicate of duplicates) {
    const [keepId, ...extraIds] = duplicate.ids;
    console.warn(`  userId=${duplicate.userId} lessonId=${duplicate.lessonId} type=${duplicate.type} keep=${keepId} remove=${extraIds.join(",")}`);

    if (applyFixes && extraIds.length > 0) {
      await prisma.assessment.deleteMany({ where: { id: { in: extraIds } } });
    }
  }

  if (!applyFixes) {
    throw new Error("Assessment duplicates require attention. Rerun with APPLY_FIXES=true to clean up.");
  }
}

function isJsonArray(value: Prisma.JsonValue): value is Prisma.JsonArray {
  return Array.isArray(value);
}

function mergeSegments(records: Array<{ segments: Prisma.JsonValue | null }>): Prisma.JsonArray | null {
  const aggregated: Prisma.JsonArray = [];
  for (const record of records) {
    if (!record.segments) continue;
    if (isJsonArray(record.segments)) {
      aggregated.push(...record.segments);
    } else {
      aggregated.push(record.segments);
    }
  }
  if (aggregated.length === 0) {
    return null;
  }
  return aggregated;
}

async function resolveProgressDuplicates() {
  const duplicates = await prisma.$queryRaw<Array<{
    userId: string;
    lessonId: string;
    ids: string[];
  }>>`
    SELECT "userId", "lessonId", ARRAY_AGG("id" ORDER BY COALESCE("updatedAt", "createdAt") DESC, "id" DESC) AS ids
    FROM "Progress"
    GROUP BY "userId", "lessonId"
    HAVING COUNT(*) > 1
  `;

  if (duplicates.length === 0) {
    return;
  }

  console.warn(`[Progress] Found ${duplicates.length} duplicate key group(s).`);

  for (const duplicate of duplicates) {
    const [keepId, ...extraIds] = duplicate.ids;
    const records = await prisma.progress.findMany({
      where: { id: { in: duplicate.ids } },
      select: {
        id: true,
        uniqueSeconds: true,
        segments: true,
        lastTickAt: true,
        updatedAt: true,
        createdAt: true,
        completedAt: true
      }
    });

    const keptRecord = records.find((record) => record.id === keepId)!;
    const mergedUniqueSeconds = Math.max(
      ...records.map((record) => Number(record.uniqueSeconds ?? 0)),
    );
    const mergedSegments = mergeSegments(records);
    const mergedSegmentsInput =
      mergedSegments === null ? Prisma.JsonNull : (mergedSegments as Prisma.InputJsonValue);
    const mergedLastTickAt = records
      .map((record) => record.lastTickAt)
      .filter((value): value is Date => value != null)
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? keptRecord.lastTickAt ?? null;
    const mergedCompletedAt = records
      .map((record) => record.completedAt)
      .filter((value): value is Date => value != null)
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? keptRecord.completedAt ?? null;

    console.warn(
      `  userId=${duplicate.userId} lessonId=${duplicate.lessonId} keep=${keepId} mergeSeconds=${mergedUniqueSeconds} remove=${extraIds.join(",")}`
    );

    if (applyFixes) {
      await prisma.progress.update({
        where: { id: keepId },
        data: {
          uniqueSeconds: mergedUniqueSeconds,
          segments: mergedSegmentsInput,
          lastTickAt: mergedLastTickAt,
          completedAt: mergedCompletedAt
        }
      });

      if (extraIds.length > 0) {
        await prisma.progress.deleteMany({ where: { id: { in: extraIds } } });
      }
    }
  }

  if (!applyFixes) {
    throw new Error("Progress duplicates require attention. Rerun with APPLY_FIXES=true to merge records.");
  }
}

async function ensureLessonStreams() {
  const missingStreams = await prisma.lesson.count({ where: { streamId: "" } });
  const [nullStreamsRow] = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count FROM "Lesson" WHERE "streamId" IS NULL
  `;
  const nullStreams = Number(nullStreamsRow?.count ?? 0n);

  if (missingStreams > 0 || nullStreams > 0) {
    throw new Error(`Found ${missingStreams + nullStreams} lesson(s) missing streamId values.`);
  }
}

async function main() {
  await ensureOrgMemberships();
  await resolveAssessmentDuplicates();
  await resolveProgressDuplicates();
  await ensureLessonStreams();

  console.log("Verification complete: no blocking issues detected.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
