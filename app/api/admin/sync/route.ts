import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { fetchPublishedCourses, getMissingSanityEnvVars } from "@/lib/sanity";
import { prisma } from "@/lib/prisma";
import { createRequestLogger, serializeError, type Logger } from "@/lib/logger";

type SummaryCounts = {
  created: number;
  updated: number;
  skipped: number;
};

type SyncSummary = {
  courses: SummaryCounts;
  modules: SummaryCounts;
  lessons: SummaryCounts;
};

type SyncRequestBody = {
  dryRun?: boolean;
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
    const limit = dryRun ? 5 : undefined;

    logger.info({
      event: "admin.sanity_sync.start",
      orgId,
      dryRun
    });

    const courses = (await fetchPublishedCourses({ limit })) as any[];

    logger.info({
      event: "admin.sanity_sync.fetched",
      orgId,
      dryRun,
      fetchedCourses: courses.length
    });

    const summary: SyncSummary = {
      courses: { created: 0, updated: 0, skipped: 0 },
      modules: { created: 0, updated: 0, skipped: 0 },
      lessons: { created: 0, updated: 0, skipped: 0 }
    };

    for (const course of courses ?? []) {
      if (!course?._id) {
        summary.courses.skipped += 1;
        continue;
      }

      const courseId = `sanity-${course._id}`;
      const courseData = {
        orgId,
        title: course.title ?? "Untitled Course",
        description: course.description ?? null
      };
      const existingCourse = await prisma.course.findUnique({ where: { id: courseId } });

      if (dryRun) {
        if (existingCourse) {
          summary.courses.updated += 1;
        } else {
          summary.courses.created += 1;
        }
      } else if (existingCourse) {
        await prisma.course.update({ where: { id: courseId }, data: courseData });
        summary.courses.updated += 1;
      } else {
        await prisma.course.create({ data: { id: courseId, ...courseData } });
        summary.courses.created += 1;
      }

      if (!Array.isArray(course.modules)) {
        continue;
      }

      for (const [moduleIndex, moduleDoc] of course.modules.entries()) {
        if (!moduleDoc) {
          summary.modules.skipped += 1;
          continue;
        }

        const moduleKey = moduleDoc._id ?? moduleDoc._ref;
        if (!moduleKey) {
          summary.modules.skipped += 1;
          continue;
        }

        const moduleId = `sanity-${moduleKey}`;
        const moduleData = {
          courseId,
          title: moduleDoc.title ?? "Untitled Module",
          order:
            typeof moduleDoc.order === "number" && Number.isFinite(moduleDoc.order)
              ? moduleDoc.order
              : moduleIndex
        };
        const existingModule = await prisma.module.findUnique({ where: { id: moduleId } });

        if (dryRun) {
          if (existingModule) {
            summary.modules.updated += 1;
          } else {
            summary.modules.created += 1;
          }
        } else if (existingModule) {
          await prisma.module.update({ where: { id: moduleId }, data: moduleData });
          summary.modules.updated += 1;
        } else {
          await prisma.module.create({ data: { id: moduleId, ...moduleData } });
          summary.modules.created += 1;
        }

        if (!Array.isArray(moduleDoc.lessons)) {
          continue;
        }

        for (const [lessonIndex, lessonDoc] of moduleDoc.lessons.entries()) {
          if (!lessonDoc) {
            summary.lessons.skipped += 1;
            continue;
          }

          const lessonKey = lessonDoc._id ?? lessonDoc._ref;
          if (!lessonKey) {
            summary.lessons.skipped += 1;
            continue;
          }

          const lessonId = `sanity-${lessonKey}`;
          const lessonData = {
            moduleId,
            title: lessonDoc.title ?? "Untitled Lesson",
            youtubeId: lessonDoc.youtubeId ?? "",
            durationS:
              typeof lessonDoc.durationS === "number" && Number.isFinite(lessonDoc.durationS)
                ? lessonDoc.durationS
                : 0,
            requiresFullWatch:
              typeof lessonDoc.requiresFullWatch === "boolean"
                ? lessonDoc.requiresFullWatch
                : true
          };
          const existingLesson = await prisma.lesson.findUnique({ where: { id: lessonId } });

          if (dryRun) {
            if (existingLesson) {
              summary.lessons.updated += 1;
            } else {
              summary.lessons.created += 1;
            }
          } else if (existingLesson) {
            await prisma.lesson.update({ where: { id: lessonId }, data: lessonData });
            summary.lessons.updated += 1;
          } else {
            await prisma.lesson.create({ data: { id: lessonId, ...lessonData } });
            summary.lessons.created += 1;
          }
        }
      }
    }

    const durationMs = Date.now() - startedAt;

    logger.info({
      event: "admin.sanity_sync.complete",
      orgId,
      dryRun,
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
