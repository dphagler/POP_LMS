import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeStreak } from "@/lib/streak";
import { logServerError } from "@/lib/server-logger";
import LearnerDashboardClient, {
  type LearnerDashboardAssignment,
  type LearnerDashboardBadge,
  type LearnerDashboardProgress,
} from "./learner-dashboard-client";

import type { Prisma, UserRole } from "@prisma/client";

const assignmentInclude = {
  module: {
    include: {
      lessons: true,
      course: true,
    },
  },
  course: {
    include: {
      modules: {
        include: {
          lessons: true,
        },
      },
    },
  },
} as const satisfies Prisma.AssignmentInclude;

type AssignmentWithRelations = Prisma.AssignmentGetPayload<{
  include: typeof assignmentInclude;
}>;

const progressInclude = {
  lesson: true,
} as const satisfies Prisma.ProgressInclude;

type ProgressWithLesson = Prisma.ProgressGetPayload<{
  include: typeof progressInclude;
}>;

const userBadgeInclude = {
  badge: true,
} as const satisfies Prisma.UserBadgeInclude;

type UserBadgeWithBadge = Prisma.UserBadgeGetPayload<{
  include: typeof userBadgeInclude;
}>;

export default async function LearnerDashboard() {
  try {
    return await renderLearnerDashboard();
  } catch (err) {
    logServerError("app/page", err);
    throw err;
  }
}

async function renderLearnerDashboard() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/signin?callbackUrl=${encodeURIComponent("/app")}`);
  }

  const { id: userId, orgId } = session.user;
  const role = (session.user.role ?? "LEARNER") as UserRole;
  const isAdmin = role === "ADMIN";

  if (!orgId) {
    return <LearnerDashboardClient status="no-org" isAdmin={isAdmin} />;
  }

  let assignments: AssignmentWithRelations[] = [];
  let badges: UserBadgeWithBadge[] = [];
  let progresses: ProgressWithLesson[] = [];
  let streak = 0;

  try {
    [assignments, badges, progresses] = await Promise.all([
      prisma.assignment.findMany({
        where: {
          orgId,
          enrollments: {
            some: { userId },
          },
        },
        include: assignmentInclude,
      }),
      prisma.userBadge.findMany({
        where: { userId },
        include: userBadgeInclude,
      }),
      prisma.progress.findMany({
        where: { userId },
        include: progressInclude,
      }),
    ]);

    streak = await computeStreak(userId);
  } catch (err) {
    logServerError("app/page:db", err, { userId, orgId });

    return <LearnerDashboardClient status="error" isAdmin={isAdmin} />;
  }

  const assignmentsData: LearnerDashboardAssignment[] = assignments.map((assignment) => ({
    id: assignment.id,
    module: assignment.module
      ? {
          lessons: assignment.module.lessons.map((lesson) => ({
            id: lesson.id,
            title: lesson.title,
            durationS: lesson.durationS,
          })),
        }
      : null,
    course: assignment.course
      ? {
          modules: assignment.course.modules.map((module) => ({
            lessons: module.lessons.map((lesson) => ({
              id: lesson.id,
              title: lesson.title,
              durationS: lesson.durationS,
            })),
          })),
        }
      : null,
  }));

  const badgesData: LearnerDashboardBadge[] = badges.map((badge) => ({
    id: badge.id,
    badge: {
      name: badge.badge.name,
    },
  }));

  const progressData: LearnerDashboardProgress[] = progresses.map((progress) => ({
    id: progress.id,
    lessonId: progress.lessonId,
    isComplete: progress.isComplete,
    watchedSeconds: progress.watchedSeconds,
    lesson: progress.lesson
      ? {
          id: progress.lesson.id,
          title: progress.lesson.title,
        }
      : null,
  }));

  return (
    <LearnerDashboardClient
      status="loaded"
      isAdmin={isAdmin}
      streak={streak}
      assignments={assignmentsData}
      badges={badgesData}
      progresses={progressData}
    />
  );
}
