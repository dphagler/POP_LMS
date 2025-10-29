DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = current_schema()
          AND indexname = 'LessonRuntimeSnapshot_org_lesson_version_idx'
    ) THEN
        ALTER INDEX "LessonRuntimeSnapshot_org_lesson_version_idx" RENAME TO "LessonRuntimeSnapshot_orgId_lessonId_version_idx";
    END IF;
END;
$$;
