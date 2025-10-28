-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN "groupId" TEXT;
ALTER TABLE "Assignment" ADD COLUMN "dueAt" TIMESTAMP(3);
ALTER TABLE "Assignment" ADD COLUMN "label" TEXT;

-- Backfill the new groupId column using the existing AssignmentGroup join table.
UPDATE "Assignment" AS a
SET "groupId" = ag."groupId"
FROM (
  SELECT DISTINCT ON ("assignmentId")
    "assignmentId",
    "groupId",
    "createdAt",
    "id"
  FROM "AssignmentGroup"
  ORDER BY "assignmentId", "createdAt" NULLS LAST, "id"
) AS ag
WHERE a."id" = ag."assignmentId"
  AND a."groupId" IS NULL;

-- Ensure no assignments are left without a group. Fail loudly if any rows remain.
DO $$
DECLARE
  missing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO missing_count
  FROM "Assignment"
  WHERE "groupId" IS NULL;

  IF missing_count > 0 THEN
    RAISE EXCEPTION 'Assignments missing groupId after migration: %', missing_count;
  END IF;
END $$;

-- Enforce the NOT NULL constraint and add the foreign key.
ALTER TABLE "Assignment"
ALTER COLUMN "groupId" SET NOT NULL;

ALTER TABLE "Assignment"
ADD CONSTRAINT "Assignment_groupId_fkey"
FOREIGN KEY ("groupId") REFERENCES "OrgGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
