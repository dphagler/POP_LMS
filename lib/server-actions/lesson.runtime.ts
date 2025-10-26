'use server';

import { Prisma } from '@prisma/client';

import type {
  AugmentationRule,
  LessonObjective,
  LessonRuntime,
} from '../lesson/contracts';
import { prisma } from '../prisma';

interface GetNextLessonInput {
  userId: string;
  assignmentId: string;
}

interface GetLessonRuntimeInput {
  userId: string;
  lessonId: string;
}

type LessonAssignment = {
  moduleId: string | null;
  courseId: string | null;
};

type LessonRuntimeSnapshotRow = {
  runtimeJson: unknown;
};

const DEFAULT_ASSESSMENT_TYPE = 'QUIZ';
const NO_ASSESSMENT_TYPE = 'NONE';

const LESSON_ORDER = [
  { createdAt: 'asc' as const },
  { id: 'asc' as const },
];

const MODULE_ORDER = [
  { order: 'asc' as const },
  { id: 'asc' as const },
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const normalizeObjectives = (value: unknown): LessonObjective[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }

      const id = typeof item.id === 'string' ? item.id : undefined;
      const summary = typeof item.summary === 'string' ? item.summary : undefined;

      if (!id || !summary) {
        return null;
      }

      return { id, summary } satisfies LessonObjective;
    })
    .filter((objective): objective is LessonObjective => objective !== null);
};

const normalizeAugmentations = (value: unknown): AugmentationRule[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }

      const rawTargets = item.targets;
      const targets = Array.isArray(rawTargets)
        ? rawTargets.filter((target): target is string => typeof target === 'string' && target.length > 0)
        : [];
      const whenExpr = typeof item.whenExpr === 'string' ? item.whenExpr : '';
      const assetRef = typeof item.assetRef === 'string' ? item.assetRef : '';

      if (targets.length === 0 || !assetRef) {
        return null;
      }

      return { targets, whenExpr, assetRef } satisfies AugmentationRule;
    })
    .filter((rule): rule is AugmentationRule => rule !== null);
};

async function ensureUserOrgId(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { orgId: true },
  });

  if (!user?.orgId) {
    throw new Error('User not found or missing organization context');
  }

  return user.orgId;
}

async function fetchAssignment(orgId: string, assignmentId: string): Promise<LessonAssignment | null> {
  const assignment = await prisma.assignment.findFirst({
    where: {
      id: assignmentId,
      orgId,
      deletedAt: null,
    },
    select: {
      moduleId: true,
      courseId: true,
    },
  });

  if (!assignment) {
    return null;
  }

  return assignment;
}

async function fetchAssignmentLessonIds(orgId: string, assignment: LessonAssignment): Promise<string[]> {
  if (assignment.moduleId) {
    const moduleRecord = await prisma.module.findFirst({
      where: {
        id: assignment.moduleId,
        course: { orgId },
      },
      select: {
        lessons: {
          orderBy: LESSON_ORDER,
          select: { id: true },
        },
      },
    });

    return moduleRecord?.lessons.map((lesson) => lesson.id) ?? [];
  }

  if (assignment.courseId) {
    const modules = await prisma.module.findMany({
      where: {
        courseId: assignment.courseId,
        course: { orgId },
      },
      orderBy: MODULE_ORDER,
      select: {
        lessons: {
          orderBy: LESSON_ORDER,
          select: { id: true },
        },
      },
    });

    return modules.flatMap((module) => module.lessons.map((lesson) => lesson.id));
  }

  return [];
}

async function loadLessonRuntimeSnapshot(orgId: string, lessonId: string): Promise<LessonRuntime | null> {
  try {
    const rows = await prisma.$queryRaw<LessonRuntimeSnapshotRow[]>`
      SELECT "runtimeJson"
      FROM "LessonRuntimeSnapshot"
      WHERE "orgId" = ${orgId} AND "lessonId" = ${lessonId}
      ORDER BY "version" DESC
      LIMIT 1
    `;

    const snapshot = rows[0]?.runtimeJson;
    if (!isRecord(snapshot)) {
      return null;
    }

    const objectives = normalizeObjectives(snapshot.objectives);
    const augmentations = normalizeAugmentations(snapshot.augmentations);
    const id = typeof snapshot.id === 'string' ? snapshot.id : lessonId;
    const title = typeof snapshot.title === 'string' ? snapshot.title : '';
    const streamId = typeof snapshot.streamId === 'string' ? snapshot.streamId : '';
    const durationSec = typeof snapshot.durationSec === 'number' ? snapshot.durationSec : 0;
    const assessmentType = typeof snapshot.assessmentType === 'string'
      ? snapshot.assessmentType
      : DEFAULT_ASSESSMENT_TYPE;

    if (!title || !streamId) {
      return null;
    }

    return {
      id,
      title,
      objectives,
      streamId,
      durationSec,
      assessmentType,
      augmentations,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
      return null;
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === 'P2010' || error.code === 'P2022') &&
      /LessonRuntimeSnapshot/i.test(error.message)
    ) {
      return null;
    }

    if (error instanceof Error && /LessonRuntimeSnapshot/i.test(error.message)) {
      return null;
    }

    throw error;
  }
}

export const getLessonRuntime = async ({
  userId,
  lessonId,
}: GetLessonRuntimeInput): Promise<LessonRuntime> => {
  const orgId = await ensureUserOrgId(userId);

  const snapshotRuntime = await loadLessonRuntimeSnapshot(orgId, lessonId);
  if (snapshotRuntime) {
    return snapshotRuntime;
  }

  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      module: { course: { orgId } },
    },
    select: {
      id: true,
      title: true,
      streamId: true,
      durationS: true,
      quiz: { select: { id: true } },
    },
  });

  if (!lesson) {
    throw new Error('Lesson not found');
  }

  return {
    id: lesson.id,
    title: lesson.title,
    objectives: [],
    streamId: lesson.streamId,
    durationSec: lesson.durationS,
    assessmentType: lesson.quiz ? 'QUIZ' : NO_ASSESSMENT_TYPE,
    augmentations: [],
  };
};

export const getNextLesson = async ({
  userId,
  assignmentId,
}: GetNextLessonInput): Promise<LessonRuntime | null> => {
  const orgId = await ensureUserOrgId(userId);

  const enrollment = await prisma.enrollment.findFirst({
    where: {
      userId,
      assignmentId,
      deletedAt: null,
      assignment: { orgId },
    },
    select: { id: true },
  });

  if (!enrollment) {
    return null;
  }

  const assignment = await fetchAssignment(orgId, assignmentId);
  if (!assignment) {
    return null;
  }

  const lessonIds = await fetchAssignmentLessonIds(orgId, assignment);
  if (lessonIds.length === 0) {
    return null;
  }

  const progresses = await prisma.progress.findMany({
    where: {
      userId,
      lessonId: { in: lessonIds },
    },
    select: {
      lessonId: true,
      isComplete: true,
    },
  });

  const completionByLesson = new Map(progresses.map((progress) => [progress.lessonId, progress.isComplete]));
  const nextLessonId = lessonIds.find((lessonId) => completionByLesson.get(lessonId) !== true);

  if (!nextLessonId) {
    return null;
  }

  return getLessonRuntime({ userId, lessonId: nextLessonId });
};
