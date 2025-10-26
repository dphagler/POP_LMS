'use server';

import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';

import type { DiagnosticResult } from '../lesson/contracts';
import type { Augmentation } from '../lesson/diagnostics';
import { planAugmentations as evaluateAugmentations } from '../lesson/diagnostics';
import { prisma } from '../prisma';
import { getLessonRuntime } from './lesson.runtime';
import { capturePosthogEvent } from '../posthog';
import { lessonEvents } from '../analytics/lessonEvents';
import { syncLessonCompletion } from '../lesson-progress';

const DEVICE_TYPE = 'web';

interface PlanAugmentationsInput {
  userId: string;
  lessonId: string;
}

interface MarkAugmentationCompleteInput {
  userId: string;
  lessonId: string;
  augmentationId: string;
}

type PlannedAugmentation = Augmentation & {
  augmentationId: string;
  completedAt: Date | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const ensureUserOrgId = async (userId: string): Promise<string> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { orgId: true },
  });

  if (!user?.orgId) {
    throw new Error('User not found or missing organization context');
  }

  return user.orgId;
};

const normalizeDiagnostics = (value: unknown): DiagnosticResult[] => {
  if (!isRecord(value)) {
    return [];
  }

  const results = value.results;
  if (!Array.isArray(results)) {
    return [];
  }

  return results
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }

      const objectiveId = typeof item.objectiveId === 'string' ? item.objectiveId : undefined;
      const level = typeof item.level === 'string' ? item.level.toUpperCase() : undefined;
      const score = typeof item.score === 'number' ? item.score : undefined;

      if (!objectiveId || (level !== 'MET' && level !== 'PARTIAL' && level !== 'NOT_MET')) {
        return null;
      }

      return { objectiveId, level: level as DiagnosticResult['level'], score } satisfies DiagnosticResult;
    })
    .filter((result): result is DiagnosticResult => result !== null);
};

const toDiagnosticJson = (diagnostic: DiagnosticResult | undefined): Prisma.JsonObject | undefined => {
  if (!diagnostic) {
    return undefined;
  }

  return {
    objectiveId: diagnostic.objectiveId,
    level: diagnostic.level,
    score: typeof diagnostic.score === 'number' ? diagnostic.score : null,
  } satisfies Prisma.JsonObject;
};

const computeAugmentationId = ({
  lessonId,
  ruleIndex,
  objectiveId,
  assetRef,
}: {
  lessonId: string;
  ruleIndex: number;
  objectiveId: string;
  assetRef: string;
}): string => {
  const hash = createHash('sha256');
  hash.update(lessonId);
  hash.update('|');
  hash.update(String(ruleIndex));
  hash.update('|');
  hash.update(objectiveId);
  hash.update('|');
  hash.update(assetRef);
  return hash.digest('hex');
};

export const planAugmentations = async ({
  userId,
  lessonId,
}: PlanAugmentationsInput): Promise<{ items: PlannedAugmentation[]; trace: string[] }> => {
  const orgId = await ensureUserOrgId(userId);
  const runtime = await getLessonRuntime({ userId, lessonId });

  const latestAssessment = await prisma.assessment.findFirst({
    where: {
      userId,
      lessonId,
      diagnosticJson: {
        not: Prisma.JsonNull,
      },
    },
    orderBy: [
      { completedAt: 'desc' },
      { updatedAt: 'desc' },
      { startedAt: 'desc' },
    ],
    select: { diagnosticJson: true },
  });

  const diagnostics = normalizeDiagnostics(latestAssessment?.diagnosticJson ?? null);
  const plan = evaluateAugmentations({
    objectives: runtime.objectives ?? [],
    diagnostics,
    rules: runtime.augmentations ?? [],
  });

  const plannedAugmentations = plan.augmentations.map<PlannedAugmentation>((augmentation) => ({
    ...augmentation,
    augmentationId: computeAugmentationId({
      lessonId: runtime.id,
      ruleIndex: augmentation.ruleIndex,
      objectiveId: augmentation.objective.id,
      assetRef: augmentation.assetRef,
    }),
    completedAt: null,
  }));

  const plannedIds = plannedAugmentations.map((item) => item.augmentationId);

  const persisted = await prisma.$transaction(async (tx) => {
    if (plannedIds.length === 0) {
      await tx.augmentationServed.deleteMany({
        where: { userId, lessonId },
      });
      return [] as PlannedAugmentation[];
    }

    await tx.augmentationServed.deleteMany({
      where: {
        userId,
        lessonId,
        augmentationId: {
          notIn: plannedIds,
        },
      },
    });

    for (const item of plannedAugmentations) {
      const diagnosticJson = toDiagnosticJson(item.diagnostic);
      await tx.augmentationServed.upsert({
        where: {
          userId_lessonId_augmentationId: {
            userId,
            lessonId,
            augmentationId: item.augmentationId,
          },
        },
        create: {
          userId,
          lessonId,
          augmentationId: item.augmentationId,
          objectiveId: item.objective.id,
          assetRef: item.assetRef,
          ruleIndex: item.ruleIndex,
          diagnosticJson,
        },
        update: {
          objectiveId: item.objective.id,
          assetRef: item.assetRef,
          ruleIndex: item.ruleIndex,
          diagnosticJson,
        },
      });
    }

    const rows = await tx.augmentationServed.findMany({
      where: {
        userId,
        lessonId,
        augmentationId: {
          in: plannedIds,
        },
      },
      select: {
        augmentationId: true,
        completedAt: true,
      },
    });

    const completionMap = new Map(rows.map((row) => [row.augmentationId, row.completedAt]));

    return plannedAugmentations.map((item) => ({
      ...item,
      completedAt: completionMap.get(item.augmentationId) ?? null,
    }));
  });

  const pendingCount = persisted.filter((item) => !item.completedAt).length;

  if (pendingCount > 0) {
    await capturePosthogEvent({
      event: 'augmentation_start',
      distinctId: userId,
      properties: {
        lessonId,
        orgId,
        augmentationCount: pendingCount,
      },
    });

    lessonEvents.emit('augmentation_start', {
      userId,
      orgId,
      lessonId,
      deviceType: DEVICE_TYPE,
    });
  }

  return { items: persisted, trace: plan.trace };
};

export const markAugmentationComplete = async ({
  userId,
  lessonId,
  augmentationId,
}: MarkAugmentationCompleteInput): Promise<void> => {
  const orgId = await ensureUserOrgId(userId);

  const { remaining } = await prisma.$transaction(async (tx) => {
    const existing = await tx.augmentationServed.findUnique({
      where: {
        userId_lessonId_augmentationId: {
          userId,
          lessonId,
          augmentationId,
        },
      },
      select: { id: true, completedAt: true },
    });

    if (!existing) {
      throw new Error('Augmentation not found');
    }

    if (!existing.completedAt) {
      await tx.augmentationServed.update({
        where: {
          userId_lessonId_augmentationId: {
            userId,
            lessonId,
            augmentationId,
          },
        },
        data: {
          completedAt: new Date(),
        },
      });
    }

    const remaining = await tx.augmentationServed.count({
      where: {
        userId,
        lessonId,
        completedAt: null,
      },
    });

    return { remaining };
  });

  await capturePosthogEvent({
    event: 'augmentation_complete',
    distinctId: userId,
    properties: {
      lessonId,
      orgId,
      augmentationId,
    },
  });

  lessonEvents.emit('augmentation_complete', {
    userId,
    orgId,
    lessonId,
    deviceType: DEVICE_TYPE,
  });

  if (remaining === 0) {
    await syncLessonCompletion({ userId, lessonId });
  }
};
