"use server";

import { Prisma } from "@prisma/client";

import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import type { DiagnosticResult, LessonRuntime, ProgressState } from "@/lib/lesson/contracts";
import type { Segment } from "@/lib/lesson/progress";
import { submitChatProbe } from "@/lib/server-actions/lesson";
import {
  submitQuiz,
  type SubmitQuizInput
} from "@/lib/server-actions/lesson.assessment";
import {
  planAugmentations,
  markAugmentationComplete
} from "@/lib/server-actions/lesson.augment";
import { getLessonRuntime } from "@/lib/server-actions/lesson.runtime";
import { recordProgress } from "@/lib/server-actions/lesson.progress";

const DEFAULT_THRESHOLD = 0.95;

const VALID_LEVELS: ReadonlyArray<DiagnosticResult["level"]> = [
  "MET",
  "PARTIAL",
  "NOT_MET"
];

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

type EngineProgress = ProgressState & { segments: Segment[] };

type ProgressRow = {
  watchedSeconds: number;
  uniqueSeconds: number;
  isComplete: boolean;
  thresholdPct: unknown;
  segments: unknown;
};

type LessonEnginePayload = {
  runtime: LessonRuntime;
  progress: EngineProgress;
  diagnostics: DiagnosticResult[];
};

export type SubmitAssessmentPayload =
  | {
      kind: "quiz";
      answers: SubmitQuizInput["answers"];
    }
  | {
      kind: "chat";
      transcript: string[];
    };

export type SubmitAssessmentResult =
  | {
      kind: "quiz";
      diagnostic: DiagnosticResult[];
      score: number;
    }
  | {
      kind: "chat";
      diagnostic: DiagnosticResult[];
      rationaleShort: string;
    };

type SaveProgressResult = {
  uniqueSeconds: number;
  ratio: number;
  reachedThreshold: boolean;
  progress: EngineProgress;
};

type LoadAugmentationsResult = {
  items: Array<{
    augmentationId: string;
    assetRef: string;
    ruleIndex: number;
    objective: Awaited<ReturnType<typeof planAugmentations>>["items"][number]["objective"];
    diagnostic: DiagnosticResult | null;
    completedAt: string | null;
  }>;
  trace: string[];
};

const parseThresholdPct = (value: unknown): number => {
  if (isFiniteNumber(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  if (value && typeof value === "object") {
    const candidate = value as { toNumber?: () => number };
    if (typeof candidate.toNumber === "function") {
      const parsed = candidate.toNumber();
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return DEFAULT_THRESHOLD;
};

const parseSegments = (value: unknown): Segment[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const segments: Segment[] = [];

  for (const entry of value) {
    if (!Array.isArray(entry) || entry.length < 2) {
      continue;
    }

    const [start, end] = entry;
    if (!isFiniteNumber(start) || !isFiniteNumber(end)) {
      continue;
    }

    segments.push([start, end]);
  }

  return segments;
};

const parseDiagnosticEntry = (value: unknown): DiagnosticResult | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const objectiveId = typeof record.objectiveId === "string" ? record.objectiveId : undefined;
  const rawLevel = typeof record.level === "string" ? record.level.toUpperCase() : undefined;

  if (!objectiveId || !rawLevel || !VALID_LEVELS.includes(rawLevel as DiagnosticResult["level"])) {
    return null;
  }

  const scoreValue = record.score;
  let score: number | undefined;

  if (isFiniteNumber(scoreValue)) {
    score = scoreValue;
  } else if (typeof scoreValue === "string") {
    const parsed = Number.parseFloat(scoreValue);
    if (Number.isFinite(parsed)) {
      score = parsed;
    }
  }

  return {
    objectiveId,
    level: rawLevel as DiagnosticResult["level"],
    score,
  };
};

const parseDiagnostics = (value: unknown): DiagnosticResult[] => {
  if (Array.isArray(value)) {
    return value
      .map(parseDiagnosticEntry)
      .filter((entry): entry is DiagnosticResult => entry !== null);
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.results)) {
      return parseDiagnostics(record.results);
    }
  }

  return [];
};

const toEngineProgress = (lessonId: string, row: ProgressRow | null): EngineProgress => ({
  lessonId,
  watchedSeconds: row?.watchedSeconds ?? 0,
  uniqueSeconds: row?.uniqueSeconds ?? 0,
  isComplete: row?.isComplete ?? false,
  thresholdPct: parseThresholdPct(row?.thresholdPct),
  segments: parseSegments(row?.segments),
});

const loadProgress = async (userId: string, lessonId: string): Promise<EngineProgress> => {
  const row = (await prisma.progress.findFirst({
    where: { userId, lessonId },
    select: {
      watchedSeconds: true,
      uniqueSeconds: true,
      isComplete: true,
      thresholdPct: true,
      segments: true,
    },
  })) as ProgressRow | null;

  return toEngineProgress(lessonId, row);
};

const loadDiagnostics = async (
  userId: string,
  lessonId: string,
): Promise<DiagnosticResult[]> => {
  const assessment = await prisma.assessment.findFirst({
    where: {
      userId,
      lessonId,
      diagnosticJson: { not: Prisma.JsonNull },
    },
    orderBy: [
      { completedAt: "desc" },
      { updatedAt: "desc" },
      { startedAt: "desc" },
    ],
    select: { diagnosticJson: true },
  });

  return parseDiagnostics(assessment?.diagnosticJson ?? null);
};

export const loadLesson = async (lessonId: string): Promise<LessonEnginePayload> => {
  const session = await requireUser();
  const userId = session.user.id;

  const [runtime, progress, diagnostics] = await Promise.all([
    getLessonRuntime({ userId, lessonId }),
    loadProgress(userId, lessonId),
    loadDiagnostics(userId, lessonId),
  ]);

  return { runtime, progress, diagnostics };
};

export const saveProgress = async (
  lessonId: string,
  segments: Segment[],
): Promise<SaveProgressResult> => {
  const session = await requireUser();
  const userId = session.user.id;

  const result = await recordProgress({ userId, lessonId, segments });
  const progress = await loadProgress(userId, lessonId);

  return {
    uniqueSeconds: result.uniqueSeconds,
    ratio: result.ratio,
    reachedThreshold: result.reachedThreshold,
    progress,
  };
};

export const submitAssessment = async (
  lessonId: string,
  payload: SubmitAssessmentPayload,
): Promise<SubmitAssessmentResult> => {
  const session = await requireUser();
  const userId = session.user.id;

  if (payload.kind === "quiz") {
    const result = await submitQuiz({ userId, lessonId, answers: payload.answers });
    return {
      kind: "quiz",
      diagnostic: result.diagnostic,
      score: result.score,
    };
  }

  const result = await submitChatProbe({
    userId,
    lessonId,
    chatTranscript: payload.transcript,
  });

  return {
    kind: "chat",
    diagnostic: result.diagnostic,
    rationaleShort: result.rationaleShort,
  };
};

export const loadAugmentations = async (
  lessonId: string,
): Promise<LoadAugmentationsResult> => {
  const session = await requireUser();
  const userId = session.user.id;

  const plan = await planAugmentations({ userId, lessonId });

  return {
    items: plan.items.map((item) => ({
      augmentationId: item.augmentationId,
      assetRef: item.assetRef,
      ruleIndex: item.ruleIndex,
      objective: item.objective,
      diagnostic: item.diagnostic ?? null,
      completedAt: item.completedAt ? item.completedAt.toISOString() : null,
    })),
    trace: plan.trace,
  };
};

export const completeAugmentation = async (
  lessonId: string,
  augmentationId: string,
): Promise<void> => {
  const session = await requireUser();
  const userId = session.user.id;

  await markAugmentationComplete({ userId, lessonId, augmentationId });
};
