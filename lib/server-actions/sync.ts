"use server";

import { Prisma } from "@prisma/client";
import { z } from "zod";

import { requireAdminAccess } from "@/lib/authz";
import { logAudit } from "@/lib/db/audit";
import { prisma } from "@/lib/prisma";
import {
  appendSyncJobLog,
  createSyncJob,
  getActiveSyncJobForOrg,
  getLatestSyncStatusForOrg,
  getSyncStatusForOrg,
  type SyncJobCounts,
  type SyncJobOptions,
  type SyncStatus,
  updateSyncJob
} from "@/lib/jobs/syncStatus";
import {
  fetchPublishedCourses,
  getMissingSanityEnvVars,
  type SanityLessonDocument
} from "@/lib/sanity";

const RunSanitySyncSchema = z
  .object({
    dryRun: z.boolean().optional(),
    allowDeletes: z.boolean().optional(),
    removeMissing: z.boolean().optional()
  })
  .optional();

export type RunSanitySyncInput = z.infer<typeof RunSanitySyncSchema>;

export type RunSanitySyncResult =
  | { ok: true; jobId: string; status: SyncStatus }
  | {
      ok: false;
      reason: "missing_org" | "missing_env" | "already_running" | "unknown";
      message: string;
      status?: SyncStatus | null;
    };

type EnqueueSyncArgs = {
  orgId: string;
  actorId: string;
  options: SyncJobOptions;
};

type SyncJobContext = EnqueueSyncArgs & { jobId: string };

export async function runSanitySync(rawInput?: RunSanitySyncInput): Promise<RunSanitySyncResult> {
  const { session } = await requireAdminAccess(["ADMIN"]);
  const orgId = session.user.orgId;

  if (!orgId) {
    return { ok: false, reason: "missing_org", message: "Organization not found for admin user." };
  }

  const normalizedOptions = normalizeOptions(rawInput ?? {});

  try {
    return await enqueueSanitySyncJob({
      orgId,
      actorId: session.user.id,
      options: normalizedOptions
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to start Sanity sync at this time.";
    return { ok: false, reason: "unknown", message };
  }
}

export async function getSyncStatus(jobId?: string): Promise<SyncStatus | null> {
  const { session } = await requireAdminAccess(["ADMIN"]);
  const orgId = session.user.orgId;

  if (!orgId) {
    return null;
  }

  if (jobId) {
    return getSyncStatusForOrg(orgId, jobId);
  }

  return getLatestSyncStatusForOrg(orgId);
}

export async function enqueueSanitySyncJob({
  orgId,
  actorId,
  options
}: EnqueueSyncArgs): Promise<RunSanitySyncResult> {
  const activeJob = getActiveSyncJobForOrg(orgId);
  if (activeJob) {
    return {
      ok: false,
      reason: "already_running",
      message: "A sync is already running for this organization.",
      status: activeJob
    };
  }

  const missingEnv = getMissingSanityEnvVars();
  if (missingEnv.length > 0) {
    return {
      ok: false,
      reason: "missing_env",
      message: `Sanity configuration is incomplete. Missing: ${missingEnv.join(", ")}`
    };
  }

  let status = createSyncJob(orgId, options, "Sync job queued");
  status = updateSyncJob(status.id, {
    message: "Fetching content from Sanity…",
    counts: status.counts
  }) ?? status;

  appendSyncJobLog(
    status.id,
    `Started by user ${actorId}. Options: dryRun=${options.dryRun}, allowDeletes=${options.allowDeletes}, removeMissing=${options.removeMissing}`
  );

  await logAudit({
    orgId,
    actorId,
    action: "sync.start",
    targetId: status.id,
    metadata: {
      jobId: status.id,
      options
    }
  });

  setTimeout(() => {
    void runSyncJob({ jobId: status.id, orgId, actorId, options });
  }, 0);

  return { ok: true, jobId: status.id, status };
}

function normalizeOptions(input: RunSanitySyncInput | undefined): SyncJobOptions {
  const base: SyncJobOptions = {
    dryRun: Boolean(input?.dryRun),
    allowDeletes: Boolean(input?.allowDeletes),
    removeMissing: Boolean(input?.removeMissing)
  };

  if (base.dryRun) {
    base.allowDeletes = false;
    base.removeMissing = false;
  } else if (!base.allowDeletes) {
    base.removeMissing = false;
  }

  return base;
}

async function runSyncJob({ jobId, orgId, actorId, options }: SyncJobContext) {
  const counts: SyncJobCounts = { created: 0, updated: 0, deleted: 0, skipped: 0 };
  const startedAt = Date.now();
  let success = false;
  let error: unknown = null;

  const commitStatus = (update: { phase?: SyncStatus["phase"]; message?: string } = {}) => {
    const payload: {
      phase?: SyncStatus["phase"];
      message?: string;
      counts: SyncJobCounts;
    } = {
      counts: { ...counts }
    };

    if (update.phase) {
      payload.phase = update.phase;
    }
    if (typeof update.message === "string") {
      payload.message = update.message;
    }

    updateSyncJob(jobId, payload);
  };

  const increment = (key: keyof SyncJobCounts) => {
    counts[key] += 1;
    commitStatus();
  };

  try {
    commitStatus({ phase: "fetch", message: "Fetching content from Sanity…" });

    const limit = options.dryRun ? 5 : undefined;
    const courses = await fetchPublishedCourses({ limit });

    appendSyncJobLog(
      jobId,
      `Fetched ${courses.length} course${courses.length === 1 ? "" : "s"} from Sanity.`
    );

    commitStatus({ phase: "upsert", message: "Applying updates to LMS content…" });

    const seenCourseIds = new Set<string>();
    const seenModuleIds = new Set<string>();
    const seenLessonIds = new Set<string>();

    for (const [courseIndex, course] of courses.entries()) {
      const courseDocId = resolveDocId(course);
      const courseTitle = course?.title ?? "Untitled Course";

      if (!courseDocId) {
        increment("skipped");
        appendSyncJobLog(
          jobId,
          `Skipped course ${courseIndex + 1}: missing Sanity document identifier.`
        );
        continue;
      }

      const courseId = `sanity-${courseDocId}`;
      const courseData = {
        orgId,
        title: courseTitle,
        description: course?.description ?? null
      };

      seenCourseIds.add(courseId);

      const existingCourse = await prisma.course.findUnique({ where: { id: courseId } });

      if (options.dryRun) {
        counts[existingCourse ? "updated" : "created"] += 1;
        commitStatus({ message: `Previewing course ${courseIndex + 1}: ${courseTitle}` });
      } else if (existingCourse) {
        await prisma.course.update({ where: { id: courseId }, data: courseData });
        counts.updated += 1;
        commitStatus({ message: `Updated course ${courseIndex + 1}: ${courseTitle}` });
      } else {
        await prisma.course.create({ data: { id: courseId, ...courseData } });
        counts.created += 1;
        commitStatus({ message: `Created course ${courseIndex + 1}: ${courseTitle}` });
      }

      if (!Array.isArray(course?.modules)) {
        continue;
      }

      for (const [moduleIndex, moduleDoc] of course.modules.entries()) {
        if (!moduleDoc) {
          increment("skipped");
          appendSyncJobLog(
            jobId,
            `Skipped module ${moduleIndex + 1} in course ${courseTitle}: empty module reference.`
          );
          continue;
        }

        const moduleDocId = resolveDocId(moduleDoc);
        const moduleTitle = moduleDoc?.title ?? "Untitled Module";

        if (!moduleDocId) {
          increment("skipped");
          appendSyncJobLog(
            jobId,
            `Skipped module ${moduleIndex + 1} in course ${courseTitle}: missing Sanity document identifier.`
          );
          continue;
        }

        const moduleId = `sanity-${moduleDocId}`;
        const moduleData = {
          courseId,
          title: moduleTitle,
          order:
            typeof moduleDoc?.order === "number" && Number.isFinite(moduleDoc.order)
              ? moduleDoc.order
              : moduleIndex
        };

        seenModuleIds.add(moduleId);

        const existingModule = await prisma.module.findUnique({ where: { id: moduleId } });

        if (options.dryRun) {
          counts[existingModule ? "updated" : "created"] += 1;
          commitStatus();
        } else if (existingModule) {
          await prisma.module.update({ where: { id: moduleId }, data: moduleData });
          counts.updated += 1;
          commitStatus();
        } else {
          await prisma.module.create({ data: { id: moduleId, ...moduleData } });
          counts.created += 1;
          commitStatus();
        }

        if (!Array.isArray(moduleDoc.lessons)) {
          continue;
        }

        for (const lessonDoc of moduleDoc.lessons) {
          if (!lessonDoc) {
            increment("skipped");
            continue;
          }

          const lessonDocId = resolveDocId(lessonDoc);
          const lessonTitle = lessonDoc?.title ?? "Untitled Lesson";

          if (!lessonDocId) {
            increment("skipped");
            appendSyncJobLog(
              jobId,
              `Skipped lesson in module ${moduleTitle}: missing Sanity document identifier.`
            );
            continue;
          }

          const lessonId = `sanity-${lessonDocId}`;
          const lessonData = buildLessonData(moduleId, lessonDoc, lessonTitle);

          seenLessonIds.add(lessonId);

          const existingLesson = await prisma.lesson.findUnique({ where: { id: lessonId } });

          if (options.dryRun) {
            counts[existingLesson ? "updated" : "created"] += 1;
            commitStatus();
          } else if (existingLesson) {
            await prisma.lesson.update({ where: { id: lessonId }, data: lessonData });
            counts.updated += 1;
            commitStatus();
          } else {
            await prisma.lesson.create({ data: { id: lessonId, ...lessonData } });
            counts.created += 1;
            commitStatus();
          }
        }
      }
    }

    if (!options.dryRun && options.allowDeletes && options.removeMissing) {
      await removeMissingRecords({
        jobId,
        orgId,
        seenCourseIds,
        seenModuleIds,
        seenLessonIds,
        counts,
        commitStatus
      });
    }

    const completionMessage = options.dryRun
      ? "Dry run completed successfully."
      : "Sync completed successfully.";

    appendSyncJobLog(jobId, completionMessage);
    appendSyncJobLog(
      jobId,
      `Totals — created: ${counts.created}, updated: ${counts.updated}, deleted: ${counts.deleted}, skipped: ${counts.skipped}.`
    );

    commitStatus({ phase: "done", message: completionMessage });
    success = true;
  } catch (err) {
    error = err;
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred while syncing.";
    appendSyncJobLog(jobId, `Sync failed: ${message}`);
    commitStatus({ phase: "error", message });
  } finally {
    const durationMs = Date.now() - startedAt;
    await logAudit({
      orgId,
      actorId,
      action: "sync.finish",
      targetId: jobId,
      metadata: {
        jobId,
        counts,
        options,
        durationMs,
        success,
        error: error instanceof Error ? { message: error.message, stack: error.stack } : undefined
      }
    }).catch(() => {
      /* noop */
    });
  }
}

function resolveDocId(doc: { _id?: string; _ref?: string } | null | undefined): string | undefined {
  if (doc && typeof doc._id === "string" && doc._id.length > 0) {
    return doc._id;
  }
  if (doc && typeof doc._ref === "string" && doc._ref.length > 0) {
    return doc._ref;
  }
  return undefined;
}

function buildLessonData(
  moduleId: string,
  lessonDoc: SanityLessonDocument,
  lessonTitle: string
) {
  return {
    moduleId,
    title: lessonTitle,
    streamId: lessonDoc?.streamId ?? lessonDoc?.youtubeId ?? "",
    durationS:
      typeof lessonDoc?.durationS === "number" && Number.isFinite(lessonDoc.durationS)
        ? lessonDoc.durationS
        : 0,
    requiresFullWatch:
      typeof lessonDoc?.requiresFullWatch === "boolean" ? lessonDoc.requiresFullWatch : true
  };
}

type RemoveMissingParams = {
  jobId: string;
  orgId: string;
  seenCourseIds: Set<string>;
  seenModuleIds: Set<string>;
  seenLessonIds: Set<string>;
  counts: SyncJobCounts;
  commitStatus: (update?: { phase?: SyncStatus["phase"]; message?: string }) => void;
};

async function removeMissingRecords({
  jobId,
  orgId,
  seenCourseIds,
  seenModuleIds,
  seenLessonIds,
  counts,
  commitStatus
}: RemoveMissingParams) {
  commitStatus({ message: "Removing local records missing from Sanity…" });

  const seenCourseList = Array.from(seenCourseIds);
  const courseWhere: Prisma.CourseWhereInput = {
    orgId,
    id: { startsWith: "sanity-" }
  };

  if (seenCourseList.length > 0) {
    courseWhere.NOT = { id: { in: seenCourseList } };
  }

  const coursesToDelete = await prisma.course.findMany({
    where: courseWhere,
    select: { id: true, title: true }
  });

  const deletedCourseIds = new Set<string>();

  for (const course of coursesToDelete) {
    await prisma.course.delete({ where: { id: course.id } });
    counts.deleted += 1;
    deletedCourseIds.add(course.id);
  }

  if (coursesToDelete.length > 0) {
    appendSyncJobLog(
      jobId,
      `Removed ${coursesToDelete.length} course${coursesToDelete.length === 1 ? "" : "s"} missing from Sanity.`
    );
    commitStatus();
  }

  const seenModuleList = Array.from(seenModuleIds);
  const moduleWhere: Prisma.ModuleWhereInput = {
    id: { startsWith: "sanity-" },
    course: { orgId }
  };

  if (seenModuleList.length > 0) {
    moduleWhere.NOT = { id: { in: seenModuleList } };
  }

  const modulesToDelete = await prisma.module.findMany({
    where: moduleWhere,
    select: {
      id: true,
      title: true,
      courseId: true
    }
  });

  const deletedModuleIds = new Set<string>();

  for (const moduleRecord of modulesToDelete) {
    if (deletedCourseIds.has(moduleRecord.courseId)) {
      continue;
    }
    await prisma.module.delete({ where: { id: moduleRecord.id } });
    counts.deleted += 1;
    deletedModuleIds.add(moduleRecord.id);
  }

  if (modulesToDelete.length > 0) {
    appendSyncJobLog(
      jobId,
      `Removed ${deletedModuleIds.size} module${deletedModuleIds.size === 1 ? "" : "s"} missing from Sanity.`
    );
    commitStatus();
  }

  const seenLessonList = Array.from(seenLessonIds);
  const lessonWhere: Prisma.LessonWhereInput = {
    id: { startsWith: "sanity-" },
    module: { course: { orgId } }
  };

  if (seenLessonList.length > 0) {
    lessonWhere.NOT = { id: { in: seenLessonList } };
  }

  const lessonsToDelete = await prisma.lesson.findMany({
    where: lessonWhere,
    select: {
      id: true,
      moduleId: true,
      module: {
        select: {
          courseId: true
        }
      }
    }
  });

  let deletedLessons = 0;

  for (const lesson of lessonsToDelete) {
    if (lesson.module?.courseId && deletedCourseIds.has(lesson.module.courseId)) {
      continue;
    }
    if (deletedModuleIds.has(lesson.moduleId)) {
      continue;
    }
    await prisma.lesson.delete({ where: { id: lesson.id } });
    counts.deleted += 1;
    deletedLessons += 1;
  }

  if (deletedLessons > 0) {
    appendSyncJobLog(
      jobId,
      `Removed ${deletedLessons} lesson${deletedLessons === 1 ? "" : "s"} missing from Sanity.`
    );
    commitStatus();
  }
}
