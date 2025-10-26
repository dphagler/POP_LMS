-- CreateTable
CREATE TABLE "AugmentationServed" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "augmentationId" TEXT NOT NULL,
    "objectiveId" TEXT NOT NULL,
    "assetRef" TEXT NOT NULL,
    "ruleIndex" INTEGER NOT NULL,
    "diagnosticJson" JSONB,
    "plannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AugmentationServed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AugmentationServed_userId_lessonId_augmentationId_key" ON "AugmentationServed"("userId", "lessonId", "augmentationId");

-- CreateIndex
CREATE INDEX "AugmentationServed_userId_lessonId_idx" ON "AugmentationServed"("userId", "lessonId");

-- CreateIndex
CREATE INDEX "AugmentationServed_lessonId_idx" ON "AugmentationServed"("lessonId");

-- AddForeignKey
ALTER TABLE "AugmentationServed" ADD CONSTRAINT "AugmentationServed_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AugmentationServed" ADD CONSTRAINT "AugmentationServed_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
