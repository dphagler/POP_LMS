'use server';

import type {
  AugmentationRule,
  DiagnosticResult,
  LessonObjective,
  LessonRuntime,
} from '../lesson/contracts';
import type { Augmentation } from '../lesson/diagnostics';
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
}: SubmitChatProbeInput): Promise<DiagnosticResult[]> => {
  void userId;
  void lessonId;
  void chatTranscript;

  return [
    {
      objectiveId: mockObjective.id,
      level: 'PARTIAL',
      score: 0.5,
    },
  ];
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
