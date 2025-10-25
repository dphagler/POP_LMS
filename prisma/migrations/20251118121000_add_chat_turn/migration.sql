DO $$
BEGIN
    -- Older drafts of this migration attempted to drop these indexes without
    -- guarding for their presence. Ensure the drop is tolerant so we can
    -- recreate them deterministically below.
    IF EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'Assessment_userId_idx'
          AND n.nspname = 'public'
    ) THEN
        EXECUTE 'DROP INDEX "Assessment_userId_idx"';
    END IF;
    IF EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'Assessment_lessonId_idx'
          AND n.nspname = 'public'
    ) THEN
        EXECUTE 'DROP INDEX "Assessment_lessonId_idx"';
    END IF;
END $$;

-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('user', 'assistant', 'system');

-- CreateTable
CREATE TABLE "ChatTurn" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "role" "ChatRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatTurn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatTurn_assessmentId_idx" ON "ChatTurn"("assessmentId");

-- AddForeignKey
ALTER TABLE "ChatTurn" ADD CONSTRAINT "ChatTurn_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Recreate required indexes that legacy migration drafts attempted to remove
CREATE INDEX IF NOT EXISTS "Assessment_userId_idx" ON "Assessment"("userId");
CREATE INDEX IF NOT EXISTS "Assessment_lessonId_idx" ON "Assessment"("lessonId");
