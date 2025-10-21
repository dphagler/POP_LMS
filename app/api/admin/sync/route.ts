import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { fetchPublishedCourses } from "@/lib/sanity";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await requireRole("ADMIN");
  if (!session.user?.orgId) {
    return NextResponse.json({ error: "Org missing" }, { status: 400 });
  }

  const courses = await fetchPublishedCourses();

  for (const course of courses as any[]) {
    const courseId = `sanity-${course._id}`;
    await prisma.course.upsert({
      where: { id: courseId },
      update: {
        title: course.title ?? "Untitled Course",
        description: course.description ?? null
      },
      create: {
        id: courseId,
        orgId: session.user.orgId,
        title: course.title ?? "Untitled Course",
        description: course.description ?? null
      }
    });

    if (Array.isArray(course.modules)) {
      for (const [index, moduleDoc] of course.modules.entries()) {
        if (!moduleDoc) continue;
        const moduleId = `sanity-${moduleDoc._id ?? moduleDoc._ref ?? index}`;
        await prisma.module.upsert({
          where: { id: moduleId },
          update: {
            courseId,
            title: moduleDoc.title ?? "Untitled Module",
            order: moduleDoc.order ?? index
          },
          create: {
            id: moduleId,
            courseId,
            title: moduleDoc.title ?? "Untitled Module",
            order: moduleDoc.order ?? index
          }
        });

        if (Array.isArray(moduleDoc.lessons)) {
          for (const [lessonIndex, lessonDoc] of moduleDoc.lessons.entries()) {
            if (!lessonDoc) continue;
            const lessonId = `sanity-${lessonDoc._id ?? lessonDoc._ref ?? lessonIndex}`;
            await prisma.lesson.upsert({
              where: { id: lessonId },
              update: {
                moduleId,
                title: lessonDoc.title ?? "Untitled Lesson",
                youtubeId: lessonDoc.youtubeId ?? "",
                durationS: lessonDoc.durationS ?? 0,
                requiresFullWatch: lessonDoc.requiresFullWatch ?? true
              },
              create: {
                id: lessonId,
                moduleId,
                title: lessonDoc.title ?? "Untitled Lesson",
                youtubeId: lessonDoc.youtubeId ?? "",
                durationS: lessonDoc.durationS ?? 0,
                requiresFullWatch: lessonDoc.requiresFullWatch ?? true
              }
            });
          }
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
