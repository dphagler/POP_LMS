-- Add org link and reflection tracking to Progress
ALTER TABLE "Progress" ADD COLUMN "orgId" TEXT;
ALTER TABLE "Progress" ALTER COLUMN "uniqueSeconds" DROP NOT NULL;
ALTER TABLE "Progress" ALTER COLUMN "uniqueSeconds" DROP DEFAULT;
ALTER TABLE "Progress" ADD COLUMN "reflectionAt" TIMESTAMP(3);

UPDATE "Progress" AS p
SET "orgId" = u."orgId"
FROM "User" AS u
WHERE p."userId" = u."id" AND p."orgId" IS NULL;

ALTER TABLE "Progress" ALTER COLUMN "orgId" SET NOT NULL;

-- Add foreign key to Organization
ALTER TABLE "Progress" ADD CONSTRAINT "Progress_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add new index for org scoped lookups
CREATE INDEX "Progress_orgId_lessonId_userId_idx" ON "Progress"("orgId", "lessonId", "userId");

-- Update AugmentationServed structure
ALTER TABLE "AugmentationServed"
  ADD COLUMN IF NOT EXISTS "orgId" TEXT,
  ADD COLUMN IF NOT EXISTS "kind" TEXT;

UPDATE "AugmentationServed" AS a
SET "orgId" = u."orgId",
    "kind" = 'remediation'
FROM "User" AS u
WHERE a."userId" = u."id";

ALTER TABLE "AugmentationServed" ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "AugmentationServed" ALTER COLUMN "kind" SET NOT NULL;

ALTER TABLE "AugmentationServed" ADD CONSTRAINT "AugmentationServed_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "AugmentationServed_userId_lessonId_idx" ON "AugmentationServed"("userId", "lessonId");
CREATE INDEX IF NOT EXISTS "AugmentationServed_lessonId_idx" ON "AugmentationServed"("lessonId");
CREATE UNIQUE INDEX IF NOT EXISTS "AugmentationServed_userId_lessonId_augmentationId_key" ON "AugmentationServed"("userId", "lessonId", "augmentationId");

CREATE INDEX "AugmentationServed_orgId_lessonId_createdAt_idx" ON "AugmentationServed"("orgId", "lessonId", "createdAt");

-- New AugmentationMessage table
CREATE TABLE "AugmentationMessage" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "evidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AugmentationMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AugmentationMessage_orgId_userId_lessonId_createdAt_idx" ON "AugmentationMessage"("orgId", "userId", "lessonId", "createdAt");

ALTER TABLE "AugmentationMessage" ADD CONSTRAINT "AugmentationMessage_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AugmentationMessage" ADD CONSTRAINT "AugmentationMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AugmentationMessage" ADD CONSTRAINT "AugmentationMessage_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
