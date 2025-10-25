-- Phase 1: enum updates and structural changes

ALTER TYPE "EnrollmentStatus" RENAME TO "EnrollmentStatus_old";
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'WITHDRAWN');
ALTER TABLE "Enrollment"
  ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Enrollment"
  ALTER COLUMN "status" TYPE "EnrollmentStatus"
  USING (
    CASE
      WHEN "status"::text = 'ARCHIVED' THEN 'WITHDRAWN'
      WHEN "status"::text = 'PAUSED' THEN 'PAUSED'
      WHEN "status"::text = 'COMPLETED' THEN 'COMPLETED'
      WHEN "status"::text = 'ACTIVE' THEN 'ACTIVE'
      WHEN "status"::text = 'WITHDRAWN' THEN 'WITHDRAWN'
      ELSE 'ACTIVE'
    END
  )::"EnrollmentStatus";
DROP TYPE "EnrollmentStatus_old";
ALTER TABLE "Enrollment"
  ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::"EnrollmentStatus";

-- 2. Ensure supporting enum types exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'membershipsource') THEN
    CREATE TYPE "MembershipSource" AS ENUM ('manual', 'csv', 'invite', 'sso');
  END IF;
END $$;

-- 3. Add temporal and soft-delete columns
ALTER TABLE "Lesson" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Lesson" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Lesson" ADD COLUMN "streamId" TEXT;
UPDATE "Lesson" SET "streamId" = "youtubeId" WHERE "streamId" IS NULL;
ALTER TABLE "Lesson" ALTER COLUMN "streamId" SET NOT NULL;
ALTER TABLE "Lesson" DROP COLUMN "youtubeId";

ALTER TABLE "Assignment" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Assignment" ADD COLUMN "deletedAt" TIMESTAMP(3);

ALTER TABLE "OrgGroup" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "OrgGroup" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "OrgGroup" ADD COLUMN "deletedAt" TIMESTAMP(3);

ALTER TABLE "Enrollment" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Enrollment" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Enrollment" ADD COLUMN "deletedAt" TIMESTAMP(3);

ALTER TABLE "Progress" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Progress" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Assessment" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "AuditLog" ADD COLUMN "actorRole" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "OrgMembership" ADD COLUMN "source" "MembershipSource" NOT NULL DEFAULT 'manual';
ALTER TABLE "OrgMembership" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "UserCertification" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 4. Backfill memberships from legacy user org references
INSERT INTO "OrgMembership" ("id", "userId", "orgId", "role", "source", "createdAt", "updatedAt")
SELECT 'mem_' || md5(random()::text || clock_timestamp()::text),
       u."id",
       u."orgId",
       CASE u."role"::text
         WHEN 'ADMIN' THEN 'ADMIN'
         WHEN 'INSTRUCTOR' THEN 'INSTRUCTOR'
         WHEN 'LEARNER' THEN 'LEARNER'
         WHEN 'OWNER' THEN 'OWNER'
         ELSE 'LEARNER'
       END::"OrgMembershipRole",
       'manual',
       NOW(),
       NOW()
FROM "User" u
WHERE u."orgId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "OrgMembership" m
    WHERE m."userId" = u."id" AND m."orgId" = u."orgId"
  );

-- 5. Hydrate audit actor roles where possible
UPDATE "AuditLog" AS a
SET "actorRole" = m."role"::text
FROM "OrgMembership" AS m
WHERE a."actorId" = m."userId"
  AND a."orgId" = m."orgId"
  AND a."actorRole" IS NULL;

-- 6. Ensure domain index exists (idempotent guard)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'OrgDomain_domain_idx' AND n.nspname = current_schema()
  ) THEN
    CREATE INDEX "OrgDomain_domain_idx" ON "OrgDomain" ("domain");
  END IF;
END $$;
