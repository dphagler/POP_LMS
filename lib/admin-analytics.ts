import { prisma } from "@/lib/prisma";

type AssignmentTargetType = "COURSE" | "MODULE";

export type AssignmentSnapshot = {
  assignmentId: string;
  targetType: AssignmentTargetType;
  courseTitle: string;
  moduleTitle: string | null;
  enrollmentCount: number;
  lessonCount: number;
  totalLessonTargets: number;
  completedLessonTargets: number;
  completionRate: number;
};

export type OrgAnalyticsSnapshot = {
  assignmentCount: number;
  activeLearnerCount: number;
  completionRate: number;
  assignments: AssignmentSnapshot[];
};

type AssignmentBase = {
  id: string;
  targetType: AssignmentTargetType;
  courseTitle: string;
  moduleTitle: string | null;
  lessonIds: string[];
  enrollmentUserIds: string[];
};

export async function loadOrgAnalyticsSnapshot(orgId: string): Promise<OrgAnalyticsSnapshot> {
  const assignments = await prisma.assignment.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    include: {
      enrollments: { select: { userId: true } },
      course: {
        select: {
          title: true,
          modules: {
            select: {
              lessons: {
                select: {
                  id: true
                }
              }
            }
          }
        }
      },
      module: {
        select: {
          title: true,
          lessons: {
            select: {
              id: true
            }
          },
          course: {
            select: {
              title: true
            }
          }
        }
      }
    }
  });

  const assignmentBases: AssignmentBase[] = assignments.map((assignment) => {
    const moduleRecord = assignment.module;
    const courseRecord = assignment.course;
    const lessonIds = moduleRecord
      ? moduleRecord.lessons.map((lesson) => lesson.id)
      : courseRecord
        ? courseRecord.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id))
        : [];

    return {
      id: assignment.id,
      targetType: moduleRecord ? "MODULE" : "COURSE",
      courseTitle: courseRecord?.title ?? moduleRecord?.course?.title ?? "Untitled course",
      moduleTitle: moduleRecord?.title ?? null,
      lessonIds,
      enrollmentUserIds: assignment.enrollments.map((enrollment) => enrollment.userId)
    };
  });

  const activeLearnerIds = new Set<string>();
  const allLessonIds = new Set<string>();
  const allUserIds = new Set<string>();

  for (const base of assignmentBases) {
    for (const userId of base.enrollmentUserIds) {
      activeLearnerIds.add(userId);
      allUserIds.add(userId);
    }

    for (const lessonId of base.lessonIds) {
      allLessonIds.add(lessonId);
    }
  }

  const progressRecords =
    allLessonIds.size > 0 && allUserIds.size > 0
      ? await prisma.progress.findMany({
          where: {
            completedAt: { not: null },
            lessonId: { in: Array.from(allLessonIds) },
            userId: { in: Array.from(allUserIds) }
          },
          select: {
            userId: true,
            lessonId: true
          }
        })
      : [];

  const progressSet = new Set(progressRecords.map((record) => `${record.userId}:${record.lessonId}`));

  let totalLessonTargets = 0;
  let totalCompletedTargets = 0;

  const snapshots: AssignmentSnapshot[] = assignmentBases.map((base) => {
    const lessonCount = base.lessonIds.length;
    const enrollmentCount = base.enrollmentUserIds.length;
    let assignmentLessonTargets = 0;
    let assignmentCompletedTargets = 0;

    if (lessonCount > 0 && enrollmentCount > 0) {
      for (const userId of base.enrollmentUserIds) {
        assignmentLessonTargets += lessonCount;
        for (const lessonId of base.lessonIds) {
          if (progressSet.has(`${userId}:${lessonId}`)) {
            assignmentCompletedTargets += 1;
          }
        }
      }
    }

    totalLessonTargets += assignmentLessonTargets;
    totalCompletedTargets += assignmentCompletedTargets;

    const completionRate = assignmentLessonTargets === 0 ? 0 : assignmentCompletedTargets / assignmentLessonTargets;

    return {
      assignmentId: base.id,
      targetType: base.targetType,
      courseTitle: base.courseTitle,
      moduleTitle: base.moduleTitle,
      enrollmentCount,
      lessonCount,
      totalLessonTargets: assignmentLessonTargets,
      completedLessonTargets: assignmentCompletedTargets,
      completionRate
    };
  });

  const completionRate = totalLessonTargets === 0 ? 0 : totalCompletedTargets / totalLessonTargets;

  return {
    assignmentCount: assignments.length,
    activeLearnerCount: activeLearnerIds.size,
    completionRate,
    assignments: snapshots
  };
}
