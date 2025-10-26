'use server';

import { Decimal } from '@prisma/client/runtime/library';

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

const toNumber = (value: unknown, fallback: number): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  if (value instanceof Decimal) {
    const parsed = value.toNumber();
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  if (value && typeof value === 'object' && 'toNumber' in value) {
    try {
      const parsed = (value as { toNumber: () => number }).toNumber();
      return Number.isFinite(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  return fallback;
};

const roundSeconds = (value: number): number => {
  if (!Number.isFinite(value)) {
    return ZERO;
  }

  if (value <= ZERO) {
    return ZERO;
  }

  return Math.round(value);
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
        thresholdPct: true,
        isComplete: true,
      },
    });

    const previousSegments = normalizeSegments(existing?.segments ?? []);
    const mergedSegments = clampAndMergeSegments(
      [...previousSegments, ...normalizedIncoming],
      durationSec,
    );

    const uniqueSeconds = computeUniqueSeconds(mergedSegments, durationSec);
    const thresholdPct = toNumber(existing?.thresholdPct, DEFAULT_THRESHOLD);
    const ratio = getCompletionRatio({
      durationSec,
      uniqueSeconds,
      thresholdPct,
    });
    const reachedThreshold = ratio >= 1;

    const augmentationsPending = false;
    const shouldMarkComplete =
      reachedThreshold && (!requiresAssessment ? !augmentationsPending : false);
    const nextIsComplete = existing?.isComplete ? true : shouldMarkComplete;

    const data = {
      segments: mergedSegments,
      uniqueSeconds,
      watchedSeconds: roundSeconds(Math.min(uniqueSeconds, durationSec)),
      isComplete: nextIsComplete,
    };

    if (existing) {
      await tx.progress.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await tx.progress.create({
        data: {
          userId,
          lessonId: lesson.id,
          ...data,
        },
      });
    }

    return {
      uniqueSeconds,
      ratio,
      reachedThreshold,
      isNew: !existing,
      becameComplete: !existing?.isComplete && nextIsComplete,
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
