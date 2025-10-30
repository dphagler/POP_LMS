"use server";

import { Prisma } from "@prisma/client";

import { requireUser } from "@/lib/authz";
import { env } from "@/lib/env";
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
  uniqueSeconds: number | null;
  completedAt: Date | null;
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

const toEngineProgress = (
  lessonId: string,
  runtime: LessonRuntime,
  row: ProgressRow | null,
): EngineProgress => {
  const duration = Math.max(runtime.durationSec ?? 0, 0);
  const uniqueSeconds = Number.isFinite(row?.uniqueSeconds ?? NaN)
    ? Math.max(0, Math.round(row?.uniqueSeconds ?? 0))
    : 0;
  const watchedSeconds = Math.max(0, Math.min(uniqueSeconds, duration));
  const thresholdPct = runtime.requiresFullWatch ? DEFAULT_THRESHOLD : 0;

  return {
    lessonId,
    watchedSeconds,
    uniqueSeconds,
    isComplete: Boolean(row?.completedAt),
    thresholdPct,
    segments: parseSegments(row?.segments),
  };
};

const loadProgress = async (
  userId: string,
  lessonId: string,
  runtime: LessonRuntime,
): Promise<EngineProgress> => {
  const row = (await prisma.progress.findFirst({
    where: { userId, lessonId },
    select: {
      uniqueSeconds: true,
      completedAt: true,
      segments: true,
    },
  })) as ProgressRow | null;

  return toEngineProgress(lessonId, runtime, row);
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

  const runtime = await getLessonRuntime({ userId, lessonId });
  const [progress, diagnostics] = await Promise.all([
    loadProgress(userId, lessonId, runtime),
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

  const [result, runtime] = await Promise.all([
    recordProgress({ userId, lessonId, segments }),
    getLessonRuntime({ userId, lessonId }),
  ]);
  const progress = await loadProgress(userId, lessonId, runtime);

  return {
    uniqueSeconds: result.uniqueSeconds,
    ratio: result.ratio,
    reachedThreshold: result.reachedThreshold,
    progress,
  };
};

type GetProgressInput = {
  lessonId: string;
};

type GetProgressResult = {
  uniqueSeconds: number;
  segmentCount: number;
};

export const getProgress = async ({ lessonId }: GetProgressInput): Promise<GetProgressResult> => {
  if (!env.telemetryDebugEnabled) {
    return { uniqueSeconds: 0, segmentCount: 0 };
  }

  const session = await requireUser();
  const userId = session.user.id;

  const record = await prisma.progress.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
    select: {
      uniqueSeconds: true,
      segments: true,
    },
  });

  const uniqueSeconds =
    typeof record?.uniqueSeconds === "number" && Number.isFinite(record.uniqueSeconds)
      ? Math.max(0, Math.round(record.uniqueSeconds))
      : 0;
  const segments = parseSegments(record?.segments ?? null);

  return {
    uniqueSeconds,
    segmentCount: segments.length,
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
