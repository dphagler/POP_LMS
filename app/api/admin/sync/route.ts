import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/authz";
import { buildRateLimitKey, enforceApiRateLimit } from "@/lib/api-rate-limit";
import {
  fetchPublishedCourses,
  getMissingSanityEnvVars,
  getSanityStudioDocumentUrl
} from "@/lib/sanity";
import { prisma } from "@/lib/prisma";
import { createRequestLogger, serializeError, type Logger } from "@/lib/logger";

type SyncItem = {
  id: string;
  title: string;
  docId?: string;
  url?: string;
  parentTitle?: string;
  reason?: string;
};

type SyncSummarySection = {
  created: SyncItem[];
  updated: SyncItem[];
  skipped: SyncItem[];
  deleted: SyncItem[];
};

type SyncSummary = {
  courses: SyncSummarySection;
  modules: SyncSummarySection;
  lessons: SyncSummarySection;
};

type SyncRequestBody = {
  dryRun?: boolean;
  allowDeletes?: boolean;
};

function createEmptySummarySection(): SyncSummarySection {
  return { created: [], updated: [], skipped: [], deleted: [] };
}

const SYNC_RATE_LIMIT = {
  limit: 3,
  windowInSeconds: 60
};

async function readJsonBody(request: Request, logger: Logger): Promise<SyncRequestBody> {
  const contentType = request.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      return (await request.json()) as SyncRequestBody;
    } catch (error) {
      logger.warn({
        event: "admin.sanity_sync.invalid_json",
        message: "Falling back to default payload due to invalid JSON body",
        error: serializeError(error)
      });
      return {};
    }
  }
  return {};
}

export async function POST(request: Request) {
  const { logger, requestId } = createRequestLogger(request, { route: "admin.sanity_sync" });
  const startedAt = Date.now();
  let orgId: string | undefined;

  try {
    const session = await requireRole("ADMIN");
    orgId = session.user?.orgId ?? undefined;

    if (!orgId) {
      logger.warn({
        event: "admin.sanity_sync.missing_org",
        message: "Organization missing on admin session"
      });
      return NextResponse.json({ error: "Organization not found.", requestId }, { status: 400 });
    }

    const rateLimitKey = buildRateLimitKey("admin.sanity_sync", request, orgId ?? session.user?.id ?? undefined);
    const rateLimitResponse = await enforceApiRateLimit({
      key: rateLimitKey,
      limit: SYNC_RATE_LIMIT.limit,
      windowInSeconds: SYNC_RATE_LIMIT.windowInSeconds,
      requestId,
      message: "Sync requests are temporarily rate limited. Please try again shortly."
    });

    if (rateLimitResponse) {
      logger.warn({
        event: "admin.sanity_sync.rate_limited",
        orgId,
        limit: SYNC_RATE_LIMIT.limit,
        windowInSeconds: SYNC_RATE_LIMIT.windowInSeconds
      });
      return rateLimitResponse;
    }

    const missingEnvVars = getMissingSanityEnvVars();
    if (missingEnvVars.length > 0) {
      logger.warn({
        event: "admin.sanity_sync.missing_env",
        orgId,
        missingEnvVars
      });
      return NextResponse.json(
        {
          error: `Sanity configuration is incomplete. Missing: ${missingEnvVars.join(", ")}`,
          missingEnvVars,
          requestId
        },
        { status: 400 }
      );
    }

    const body = await readJsonBody(request, logger);
    const dryRun = Boolean(body?.dryRun);
    const allowDeletes = Boolean(body?.allowDeletes);
    const limit = dryRun ? 5 : undefined;

    logger.info({
      event: "admin.sanity_sync.start",
      orgId,
      dryRun,
      allowDeletes
    });

    const courses = (await fetchPublishedCourses({ limit })) as any[];

    logger.info({
      event: "admin.sanity_sync.fetched",
      orgId,
      dryRun,
      fetchedCourses: courses.length
    });

    const summary: SyncSummary = {
      courses: createEmptySummarySection(),
      modules: createEmptySummarySection(),
      lessons: createEmptySummarySection()
    };
    const seenCourseIds = new Set<string>();
    const seenModuleIds = new Set<string>();
    const seenLessonIds = new Set<string>();

    for (const course of courses ?? []) {
      const courseDocId = typeof course?._id === "string" ? course._id : undefined;
      const courseTitle = course?.title ?? "Untitled Course";
      const courseUrl = courseDocId ? getSanityStudioDocumentUrl("course", courseDocId) : undefined;

      if (!courseDocId) {
        summary.courses.skipped.push({
          id: "unknown-course",
          title: courseTitle,
          reason: "Missing Sanity document ID"
        });
        continue;
      }

      const courseId = `sanity-${courseDocId}`;
      const courseData = {
        orgId,
        title: courseTitle,
        description: course?.description ?? null
      };
      const existingCourse = await prisma.course.findUnique({ where: { id: courseId } });

      seenCourseIds.add(courseId);

      const summaryItem: SyncItem = {
        id: courseId,
        title: courseTitle,
        docId: courseDocId,
        url: courseUrl,
        reason: dryRun ? "Dry run preview" : undefined
      };

      if (dryRun) {
        if (existingCourse) {
          summary.courses.updated.push(summaryItem);
        } else {
          summary.courses.created.push(summaryItem);
        }
      } else if (existingCourse) {
        await prisma.course.update({ where: { id: courseId }, data: courseData });
        summary.courses.updated.push(summaryItem);
      } else {
        await prisma.course.create({ data: { id: courseId, ...courseData } });
        summary.courses.created.push(summaryItem);
      }

      if (!Array.isArray(course.modules)) {
        continue;
      }

      for (const [moduleIndex, moduleDoc] of course.modules.entries()) {
        if (!moduleDoc) {
          summary.modules.skipped.push({
            id: "unknown-module",
            title: "Untitled Module",
            parentTitle: courseTitle,
            reason: "Module reference was empty"
          });
          continue;
        }

        const moduleDocId =
          typeof moduleDoc?._id === "string"
            ? moduleDoc._id
            : typeof moduleDoc?._ref === "string"
              ? moduleDoc._ref
              : undefined;
        const moduleTitle = moduleDoc?.title ?? "Untitled Module";
        const moduleUrl = moduleDocId ? getSanityStudioDocumentUrl("module", moduleDocId) : undefined;

        if (!moduleDocId) {
          summary.modules.skipped.push({
            id: "unknown-module",
            title: moduleTitle,
            parentTitle: courseTitle,
            reason: "Missing Sanity document ID"
          });
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
        const existingModule = await prisma.module.findUnique({ where: { id: moduleId } });

        seenModuleIds.add(moduleId);

        const summaryItem: SyncItem = {
          id: moduleId,
          title: moduleTitle,
          docId: moduleDocId,
          url: moduleUrl,
          parentTitle: courseTitle,
          reason: dryRun ? "Dry run preview" : undefined
        };

        if (dryRun) {
          if (existingModule) {
            summary.modules.updated.push(summaryItem);
          } else {
            summary.modules.created.push(summaryItem);
          }
        } else if (existingModule) {
          await prisma.module.update({ where: { id: moduleId }, data: moduleData });
          summary.modules.updated.push(summaryItem);
        } else {
          await prisma.module.create({ data: { id: moduleId, ...moduleData } });
          summary.modules.created.push(summaryItem);
        }

        if (!Array.isArray(moduleDoc.lessons)) {
          continue;
        }

        for (const lessonDoc of moduleDoc.lessons) {
          if (!lessonDoc) {
            summary.lessons.skipped.push({
              id: "unknown-lesson",
              title: "Untitled Lesson",
              parentTitle: moduleTitle,
              reason: "Lesson reference was empty"
            });
            continue;
          }

          const lessonDocId =
            typeof lessonDoc?._id === "string"
              ? lessonDoc._id
              : typeof lessonDoc?._ref === "string"
                ? lessonDoc._ref
                : undefined;
          const lessonTitle = lessonDoc?.title ?? "Untitled Lesson";
          const lessonUrl = lessonDocId ? getSanityStudioDocumentUrl("lesson", lessonDocId) : undefined;

          if (!lessonDocId) {
            summary.lessons.skipped.push({
              id: "unknown-lesson",
              title: lessonTitle,
              parentTitle: moduleTitle,
              reason: "Missing Sanity document ID"
            });
            continue;
          }

          const lessonId = `sanity-${lessonDocId}`;
          const lessonData = {
            moduleId,
            title: lessonTitle,
            streamId: lessonDoc?.streamId ?? lessonDoc?.youtubeId ?? "",
            durationS:
              typeof lessonDoc?.durationS === "number" && Number.isFinite(lessonDoc.durationS)
                ? lessonDoc.durationS
                : 0,
            requiresFullWatch:
              typeof lessonDoc?.requiresFullWatch === "boolean"
                ? lessonDoc.requiresFullWatch
                : true
          };
          const existingLesson = await prisma.lesson.findUnique({ where: { id: lessonId } });

          seenLessonIds.add(lessonId);

          const summaryItem: SyncItem = {
            id: lessonId,
            title: lessonTitle,
            docId: lessonDocId,
            url: lessonUrl,
            parentTitle: moduleTitle,
            reason: dryRun ? "Dry run preview" : undefined
          };

          if (dryRun) {
            if (existingLesson) {
              summary.lessons.updated.push(summaryItem);
            } else {
              summary.lessons.created.push(summaryItem);
            }
          } else if (existingLesson) {
            await prisma.lesson.update({ where: { id: lessonId }, data: lessonData });
            summary.lessons.updated.push(summaryItem);
          } else {
            await prisma.lesson.create({ data: { id: lessonId, ...lessonData } });
            summary.lessons.created.push(summaryItem);
          }
        }
      }
    }

    if (!dryRun && allowDeletes) {
      const courseIdList = Array.from(seenCourseIds);
      const courseDeletionWhere: Prisma.CourseWhereInput = {
        orgId,
        id: { startsWith: "sanity-" }
      };
      if (courseIdList.length > 0) {
        courseDeletionWhere.NOT = { id: { in: courseIdList } };
      }

      const coursesToDelete = await prisma.course.findMany({
        where: courseDeletionWhere,
        select: { id: true, title: true }
      });
      const courseDeletionIds = new Set<string>();
      for (const courseToDelete of coursesToDelete) {
        await prisma.course.delete({ where: { id: courseToDelete.id } });
        summary.courses.deleted.push({
          id: courseToDelete.id,
          title: courseToDelete.title,
          reason: "Removed locally because the document no longer exists in Sanity"
        });
        courseDeletionIds.add(courseToDelete.id);
      }

      const moduleIdList = Array.from(seenModuleIds);
      const moduleDeletionWhere: Prisma.ModuleWhereInput = {
        id: { startsWith: "sanity-" },
        course: { orgId }
      };
      if (moduleIdList.length > 0) {
        moduleDeletionWhere.NOT = { id: { in: moduleIdList } };
      }

      const modulesToDelete = await prisma.module.findMany({
        where: moduleDeletionWhere,
        select: {
          id: true,
          title: true,
          courseId: true,
          course: { select: { title: true } }
        }
      });
      const moduleDeletionIds = new Set<string>();
      for (const moduleToDelete of modulesToDelete) {
        if (courseDeletionIds.has(moduleToDelete.courseId)) {
          continue;
        }
        await prisma.module.delete({ where: { id: moduleToDelete.id } });
        summary.modules.deleted.push({
          id: moduleToDelete.id,
          title: moduleToDelete.title,
          parentTitle: moduleToDelete.course?.title,
          reason: "Removed locally because the document no longer exists in Sanity"
        });
        moduleDeletionIds.add(moduleToDelete.id);
      }

      const lessonIdList = Array.from(seenLessonIds);
      const lessonDeletionWhere: Prisma.LessonWhereInput = {
        id: { startsWith: "sanity-" },
        module: { course: { orgId } }
      };
      if (lessonIdList.length > 0) {
        lessonDeletionWhere.NOT = { id: { in: lessonIdList } };
      }

      const lessonsToDelete = await prisma.lesson.findMany({
        where: lessonDeletionWhere,
        select: {
          id: true,
          title: true,
          moduleId: true,
          module: {
            select: {
              title: true,
              courseId: true,
              course: { select: { title: true } }
            }
          }
        }
      });
      for (const lessonToDelete of lessonsToDelete) {
        const courseIdForLesson = lessonToDelete.module?.courseId;
        if (courseIdForLesson && courseDeletionIds.has(courseIdForLesson)) {
          continue;
        }
        if (moduleDeletionIds.has(lessonToDelete.moduleId)) {
          continue;
        }
        await prisma.lesson.delete({ where: { id: lessonToDelete.id } });
        summary.lessons.deleted.push({
          id: lessonToDelete.id,
          title: lessonToDelete.title,
          parentTitle: lessonToDelete.module?.title,
          reason: "Removed locally because the document no longer exists in Sanity"
        });
      }
    }

    const durationMs = Date.now() - startedAt;

    logger.info({
      event: "admin.sanity_sync.complete",
      orgId,
      dryRun,
      allowDeletes,
      summary,
      durationMs
    });

    return NextResponse.json({ ok: true, dryRun, summary, requestId });
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      logger.warn({
        event: "admin.sanity_sync.forbidden",
        orgId,
        message: "User attempted to access sync without sufficient permissions"
      });
      return NextResponse.json({ error: "Forbidden", requestId }, { status: 403 });
    }

    logger.error({
      event: "admin.sanity_sync.error",
      orgId,
      error: serializeError(error)
    });

    return NextResponse.json(
      {
        error: "Unable to sync content from Sanity at this time. Please try again later.",
        requestId
      },
      { status: 500 }
    );
  }
}
