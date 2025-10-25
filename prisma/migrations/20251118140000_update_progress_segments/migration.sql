-- AlterTable
ALTER TABLE "Progress"
ADD COLUMN     "segments" JSONB,
ADD COLUMN     "thresholdPct" DECIMAL NOT NULL DEFAULT 0.95;

-- CreateIndex
CREATE UNIQUE INDEX "Progress_userId_lessonId_key" ON "Progress"("userId", "lessonId");
