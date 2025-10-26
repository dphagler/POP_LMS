'use server';

import { Prisma } from '@prisma/client';
import type {
  AugmentationRule,
  DiagnosticResult,
  LessonObjective,
  LessonRuntime,
} from '../lesson/contracts';
import type { Augmentation } from '../lesson/diagnostics';
import { prisma } from '../prisma';
import { lessonEvents } from '../analytics/lessonEvents';
import { getLessonRuntime } from './lesson.runtime';
import { syncLessonCompletion } from '../lesson-progress';
export type { SubmitQuizInput } from './lesson.assessment';
export { submitQuiz } from './lesson.assessment';

interface GetNextLessonInput {
  userId: string;
  assignmentId: string;
}

interface SubmitChatProbeInput {
  userId: string;
  lessonId: string;
  chatTranscript: string[];
}

const DEVICE_TYPE = 'web';

const USE_CHAT_PROBE_MOCK_RUBRIC =
  (process.env.FEATURE_CHAT_PROBE_MOCK_RUBRIC ?? '').toLowerCase() === 'true';

interface GetAugmentationsInput {
  userId: string;
  lessonId: string;
}

const mockObjective: LessonObjective = {
  id: 'objective-mock',
  summary: 'Demonstrate the ability to recall core lesson concepts.',
};

const mockAugmentationRule: AugmentationRule = {
  targets: [mockObjective.id],
  whenExpr: "level !== 'MET'",
  assetRef: 'asset:mock-reference',
};

export const getNextLesson = async ({
  userId,
  assignmentId,
}: GetNextLessonInput): Promise<LessonRuntime> => {
  void userId;
  void assignmentId;

  return {
    id: 'lesson-mock',
    title: 'Mock Lesson Runtime',
    objectives: [mockObjective],
    streamId: 'stream-mock',
    durationSec: 1800,
    assessmentType: 'QUIZ',
    augmentations: [mockAugmentationRule],
  };
};

export const submitChatProbe = async ({
  userId,
  lessonId,
  chatTranscript,
}: SubmitChatProbeInput): Promise<{
  diagnostic: DiagnosticResult[];
  rationaleShort: string;
}> => {
  if (!USE_CHAT_PROBE_MOCK_RUBRIC) {
    throw new Error('Chat probe scoring is not enabled');
  }

  const transcript = Array.isArray(chatTranscript)
    ? chatTranscript
        .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
        .filter((entry) => entry.length > 0)
    : [];

  if (transcript.length === 0) {
    throw new Error('Chat transcript is required');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { orgId: true },
  });

  if (!user?.orgId) {
    throw new Error('User not found or missing organization context');
  }

  const runtime = await getLessonRuntime({ userId, lessonId });
  const objectives = runtime.objectives ?? [];

  const diagnostic: DiagnosticResult[] =
    objectives.length > 0
      ? objectives.map((objective) => ({
          objectiveId: objective.id,
          level: 'PARTIAL',
          score: 0.5,
        }))
      : [
          {
            objectiveId: mockObjective.id,
            level: 'PARTIAL',
            score: 0.5,
          },
        ];

  const rationaleShort = 'Mock rubric evaluation pending Phase 5 scorer integration.';

  const payload = {
    userId,
    orgId: user.orgId,
    lessonId,
    deviceType: DEVICE_TYPE,
  } as const;

  let emitStart = false;

  const diagnosticJsonResults = diagnostic.map((result) => ({
    objectiveId: result.objectiveId,
    level: result.level,
    score: result.score ?? null,
  })) satisfies Prisma.JsonArray;

  const diagnosticJson: Prisma.JsonObject = {
    results: diagnosticJsonResults,
    rationaleShort,
    usingMockRubric: true,
  };

  const rawPayload: Prisma.JsonObject = {
    transcript,
    featureFlag: 'FEATURE_CHAT_PROBE_MOCK_RUBRIC',
  };

  try {
    await prisma.$transaction(async (tx) => {
      const existingAssessment = await tx.assessment.findUnique({
        where: {
          userId_lessonId_type: {
            userId,
            lessonId,
            type: 'chat',
          },
        },
        select: { id: true },
      });

      if (existingAssessment) {
        throw new Error('Chat probe already submitted; reset required before retrying');
      }

      const assessment = await tx.assessment.create({
        data: {
          userId,
          lessonId,
          type: 'chat',
          completedAt: new Date(),
          diagnosticJson,
          raw: rawPayload,
        },
        select: { id: true },
      });

      if (!assessment) {
        throw new Error('Failed to create chat assessment');
      }

      emitStart = true;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new Error('Chat probe already submitted; reset required before retrying');
    }
    throw error;
  }

  await syncLessonCompletion({ userId, lessonId });

  if (emitStart) {
    lessonEvents.emit('assessment_start', payload);
  }
  lessonEvents.emit('assessment_submit', payload);

  return {
    diagnostic,
    rationaleShort,
  };
};

export const getAugmentations = async ({
  userId,
  lessonId,
}: GetAugmentationsInput): Promise<Augmentation[]> => {
  void userId;
  void lessonId;

  return [
    {
      objective: mockObjective,
      assetRef: 'asset:mock-followup',
      ruleIndex: 0,
      diagnostic: {
        objectiveId: mockObjective.id,
        level: 'PARTIAL',
        score: 0.5,
      },
    },
  ];
};
