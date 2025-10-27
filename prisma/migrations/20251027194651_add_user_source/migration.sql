-- CreateEnum
DO $$
BEGIN
  CREATE TYPE "UserSource" AS ENUM ('invite', 'csv', 'sso');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

-- AlterTable
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "source" "UserSource";

ALTER TABLE "User"
  ALTER COLUMN "source" SET DEFAULT 'sso';

-- Update existing rows to default value
UPDATE "User" SET "source" = 'sso' WHERE "source" IS NULL;
