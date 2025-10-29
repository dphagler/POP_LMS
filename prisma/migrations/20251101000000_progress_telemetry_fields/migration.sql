-- AlterTable
ALTER TABLE "Progress"
  ADD COLUMN IF NOT EXISTS "provider" TEXT,
  ADD COLUMN IF NOT EXISTS "lastTickAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "heartbeatVer" INTEGER NOT NULL DEFAULT 1;

-- Ensure heartbeatVer default is set even if column existed without it
ALTER TABLE "Progress" ALTER COLUMN "heartbeatVer" SET DEFAULT 1;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Progress'
      AND column_name = 'heartbeatVer'
      AND is_nullable = 'YES'
  ) THEN
    EXECUTE 'UPDATE "Progress" SET "heartbeatVer" = 1 WHERE "heartbeatVer" IS NULL';
    EXECUTE 'ALTER TABLE "Progress" ALTER COLUMN "heartbeatVer" SET NOT NULL';
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Progress'
      AND column_name = 'uniqueSeconds'
  ) THEN
    EXECUTE 'ALTER TABLE "Progress" ALTER COLUMN "uniqueSeconds" DROP DEFAULT';

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'Progress'
        AND column_name = 'uniqueSeconds'
        AND data_type <> 'integer'
    ) THEN
      EXECUTE 'ALTER TABLE "Progress" ALTER COLUMN "uniqueSeconds" TYPE INTEGER USING CASE WHEN "uniqueSeconds" IS NULL THEN NULL ELSE CAST(ROUND("uniqueSeconds") AS INTEGER) END';
    END IF;

    EXECUTE 'ALTER TABLE "Progress" ALTER COLUMN "uniqueSeconds" DROP NOT NULL';
  ELSE
    EXECUTE 'ALTER TABLE "Progress" ADD COLUMN "uniqueSeconds" INTEGER';
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS "Progress_userId_lessonId_idx" ON "Progress"("userId", "lessonId");
