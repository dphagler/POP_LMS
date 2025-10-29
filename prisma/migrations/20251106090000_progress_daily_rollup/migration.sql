-- CreateTable
CREATE TABLE "ProgressDaily" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "viewers" INTEGER NOT NULL DEFAULT 0,
    "avgPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completes" INTEGER NOT NULL DEFAULT 0,
    "uniqueSecondsSum" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgressDaily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProgressDaily_orgId_lessonId_date_key" ON "ProgressDaily"("orgId", "lessonId", "date");

-- CreateIndex
CREATE INDEX "ProgressDaily_date_idx" ON "ProgressDaily"("date");

-- CreateIndex
CREATE INDEX "ProgressDaily_orgId_date_idx" ON "ProgressDaily"("orgId", "date");

-- AddForeignKey
ALTER TABLE "ProgressDaily"
ADD CONSTRAINT "ProgressDaily_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressDaily"
ADD CONSTRAINT "ProgressDaily_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
