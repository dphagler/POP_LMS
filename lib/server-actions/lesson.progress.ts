'use server';

import { Prisma } from '@prisma/client';

import { computeUniqueSeconds, getCompletionRatio, mergeSegments, type Segment } from '../lesson/progress';
import { prisma } from '../prisma';
import { capturePosthogEvent } from '../posthog';

const ZERO = 0;
const DEFAULT_THRESHOLD = 0.95;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const normalizeSegments = (value: unknown): Segment[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!Array.isArray(item) || item.length < 2) {
        return null;
      }

      const [start, end] = item;
      if (!isFiniteNumber(start) || !isFiniteNumber(end)) {
        return null;
      }

      return [start, end] as Segment;
    })
    .filter((segment): segment is Segment => segment !== null);
};

const clampAndMergeSegments = (segments: Segment[], durationSec: number): Segment[] => {
  if (!Number.isFinite(durationSec) || durationSec <= ZERO) {
    return [];
  }

  const limit = Math.max(durationSec, ZERO);
  const sanitized: Segment[] = [];

  for (const [rawStart, rawEnd] of segments) {
    if (!isFiniteNumber(rawStart) || !isFiniteNumber(rawEnd)) {
      continue;
    }

    const lower = Math.min(rawStart, rawEnd);
    const upper = Math.max(rawStart, rawEnd);

    const start = clamp(lower, ZERO, limit);
    const end = clamp(upper, ZERO, limit);

    if (end <= start) {
      continue;
    }

    sanitized.push([start, end]);
  }

  return mergeSegments(sanitized);
};

interface RecordProgressInput {
  userId: string;
  lessonId: string;
  segments: Segment[];
}

interface RecordProgressResult {
  uniqueSeconds: number;
  ratio: number;
  reachedThreshold: boolean;
}

export async function recordProgress({
  userId,
  lessonId,
  segments,
}: RecordProgressInput): Promise<RecordProgressResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { orgId: true },
  });

  if (!user?.orgId) {
    throw new Error('User not found or missing organization context');
  }

  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      module: { course: { orgId: user.orgId } },
    },
    select: {
      id: true,
      durationS: true,
      requiresFullWatch: true,
      quiz: { select: { id: true } },
    },
  });

  if (!lesson) {
    throw new Error('Lesson not found or inaccessible');
  }

  const durationSec = Number.isFinite(lesson.durationS) ? Math.max(lesson.durationS, ZERO) : ZERO;
  const requiresAssessment = Boolean(lesson.quiz);

  const normalizedIncoming = normalizeSegments(segments);

  const {
    uniqueSeconds,
    ratio,
    reachedThreshold,
    isNew,
    becameComplete,
  } = await prisma.$transaction(async (tx) => {
    const existing = await tx.progress.findFirst({
      where: { userId, lessonId: lesson.id },
      select: {
        id: true,
        segments: true,
        completedAt: true,
      },
    });

    const previousSegments = normalizeSegments(existing?.segments ?? []);
    const mergedSegments = clampAndMergeSegments(
      [...previousSegments, ...normalizedIncoming],
      durationSec,
    );

    const uniqueSeconds = computeUniqueSeconds(mergedSegments, durationSec);
    const thresholdPct = lesson.requiresFullWatch ? DEFAULT_THRESHOLD : 0;
    const ratio = getCompletionRatio({
      durationSec,
      uniqueSeconds,
      thresholdPct,
    });
    const reachedThreshold = ratio >= 1;

    const augmentationsPending =
      (await tx.augmentationServed.count({
        where: {
          userId,
          lessonId: lesson.id,
          completedAt: null,
        },
      })) > 0;
    const shouldMarkComplete =
      reachedThreshold && (!requiresAssessment ? !augmentationsPending : false);
    const nextCompletedAt = existing?.completedAt
      ? existing.completedAt
      : shouldMarkComplete
        ? new Date()
        : null;

    const updateData: Prisma.ProgressUpdateInput = {
      segments: mergedSegments,
      uniqueSeconds,
      completedAt: nextCompletedAt ?? undefined,
    };

    if (existing) {
      await tx.progress.update({
        where: { id: existing.id },
        data: updateData,
      });
    } else {
      await tx.progress.create({
        data: {
          orgId: user.orgId,
          userId,
          lessonId: lesson.id,
          segments: mergedSegments,
          uniqueSeconds,
          completedAt: nextCompletedAt ?? undefined,
        },
      });
    }

    return {
      uniqueSeconds,
      ratio,
      reachedThreshold,
      isNew: !existing,
      becameComplete: !existing?.completedAt && Boolean(nextCompletedAt),
    };
  });

  if (isNew) {
    await capturePosthogEvent({
      event: 'lesson_view_start',
      distinctId: userId,
      properties: {
        lessonId: lesson.id,
        orgId: user.orgId,
      },
    });
  }

  if (becameComplete) {
    await capturePosthogEvent({
      event: 'lesson_view_complete',
      distinctId: userId,
      properties: {
        lessonId: lesson.id,
        orgId: user.orgId,
        uniqueSeconds,
        durationSec,
      },
    });
  }

  return {
    uniqueSeconds,
    ratio,
    reachedThreshold,
  };
}
