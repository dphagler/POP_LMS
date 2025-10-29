-- CreateTable
CREATE TABLE "LessonRuntimeSnapshot" (
    "orgId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "runtimeJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonRuntimeSnapshot_pkey" PRIMARY KEY ("orgId", "lessonId", "version")
);

CREATE INDEX "LessonRuntimeSnapshot_orgId_lessonId_version_idx" ON "LessonRuntimeSnapshot"("orgId", "lessonId", "version" DESC);

-- AddForeignKey
ALTER TABLE "LessonRuntimeSnapshot" ADD CONSTRAINT "LessonRuntimeSnapshot_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonRuntimeSnapshot" ADD CONSTRAINT "LessonRuntimeSnapshot_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
