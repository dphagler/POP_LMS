'use server';

import { Prisma, type QuizQuestion } from '@prisma/client';

import type { DiagnosticLevel, DiagnosticResult, LessonObjective } from '../lesson/contracts';
import { prisma } from '../prisma';
import { parseMcqOptions } from '../quiz';
import { lessonEvents } from '../analytics/lessonEvents';
import { getLessonRuntime } from './lesson.runtime';
import { syncLessonCompletion } from '../lesson-progress';

const DEVICE_TYPE = 'web';
const DEFAULT_PASS_THRESHOLD = 1;
const PARTIAL_THRESHOLD_FRACTION = 0.5;

export interface SubmitQuizInput {
  userId: string;
  lessonId: string;
  answers: Record<string, unknown>;
}

type NormalizedAnswerMap = Map<string, string>;

type PreparedQuizQuestion = {
  id: string;
  correctKey: string | null;
  options: ReturnType<typeof parseMcqOptions>;
};

type QuizEvaluationResult = {
  questionId: string;
  answer: string;
  isCorrect: boolean;
};

const clamp01 = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
};

const determineLevel = (score: number, passThreshold: number): DiagnosticLevel => {
  const normalizedThreshold = clamp01(passThreshold);
  if (score >= normalizedThreshold) {
    return 'MET';
  }
  const partialThreshold = clamp01(
    normalizedThreshold > 0 ? normalizedThreshold * PARTIAL_THRESHOLD_FRACTION : PARTIAL_THRESHOLD_FRACTION,
  );
  if (score >= partialThreshold) {
    return 'PARTIAL';
  }
  return 'NOT_MET';
};

const normalizeAnswers = (answers: Record<string, unknown>): NormalizedAnswerMap => {
  const entries = Object.entries(answers ?? {});
  const map: NormalizedAnswerMap = new Map();

  for (const [key, value] of entries) {
    if (typeof key !== 'string' || key.length === 0) {
      continue;
    }

    if (typeof value !== 'string' || value.length === 0) {
      throw new Error('Invalid answer format');
    }

    map.set(key, value);
  }

  return map;
};

const loadLessonObjectives = async (
  userId: string,
  lessonId: string,
): Promise<LessonObjective[]> => {
  try {
    const runtime = await getLessonRuntime({ userId, lessonId });
    return runtime.objectives ?? [];
  } catch {
    return [];
  }
};

const loadAssessmentThreshold = async (orgId: string, lessonId: string): Promise<number> => {
  try {
    const rows = await prisma.$queryRaw<Array<{ runtimeJson: unknown }>>`
      SELECT "runtimeJson"
      FROM "LessonRuntimeSnapshot"
      WHERE "orgId" = ${orgId} AND "lessonId" = ${lessonId}
      ORDER BY "version" DESC
      LIMIT 1
    `;

    const snapshot = rows[0]?.runtimeJson;
    if (!snapshot || typeof snapshot !== 'object') {
      return DEFAULT_PASS_THRESHOLD;
    }

    const record = snapshot as Record<string, unknown>;
    const assessment = record.assessment;

    const extractThreshold = (value: unknown): number | null => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return clamp01(value);
      }
      if (typeof value === 'string') {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? clamp01(parsed) : null;
      }
      return null;
    };

    if (assessment && typeof assessment === 'object') {
      const assessmentRecord = assessment as Record<string, unknown>;
      const fromAssessment =
        extractThreshold(assessmentRecord.threshold) ??
        extractThreshold(assessmentRecord.passThreshold) ??
        extractThreshold(assessmentRecord.requiredScore);
      if (fromAssessment !== null) {
        return fromAssessment;
      }
    }

    const fallback =
      extractThreshold(record.assessmentThreshold) ??
      extractThreshold(record.passThreshold) ??
      extractThreshold((record.settings as Record<string, unknown> | undefined)?.assessmentThreshold);

    return fallback ?? DEFAULT_PASS_THRESHOLD;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2021') {
        return DEFAULT_PASS_THRESHOLD;
      }
      if (error.code === 'P2010' || error.code === 'P2022') {
        return DEFAULT_PASS_THRESHOLD;
      }
    }

    if (error instanceof Error && /LessonRuntimeSnapshot/i.test(error.message)) {
      return DEFAULT_PASS_THRESHOLD;
    }

    throw error;
  }
};

const buildDiagnostic = (
  objectives: LessonObjective[],
  score: number,
  passThreshold: number,
): DiagnosticResult[] => {
  const level = determineLevel(score, passThreshold);
  if (objectives.length === 0) {
    return [
      {
        objectiveId: 'overall',
        level,
        score,
      },
    ];
  }

  return objectives.map((objective) => ({
    objectiveId: objective.id,
    level,
    score,
  }));
};

const prepareQuestions = (
  lessonId: string,
  questions: QuizQuestion[],
): PreparedQuizQuestion[] => {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('Quiz has no questions');
  }

  return questions.map((question) => {
    if (!question?.id || !question.prompt || !question.type) {
      throw new Error('Invalid quiz question');
    }

    if (question.type !== 'MCQ') {
      throw new Error(`Unsupported question type for lesson ${lessonId}`);
    }

    const options = parseMcqOptions(question);

    if (options.length === 0) {
      throw new Error('Question has no options');
    }

    return {
      id: question.id,
      correctKey: question.correctKey,
      options,
    } satisfies PreparedQuizQuestion;
  });
};

const evaluateResponses = (
  questions: PreparedQuizQuestion[],
  answers: NormalizedAnswerMap,
): QuizEvaluationResult[] => {
  return questions.map((question) => {
    const answer = answers.get(question.id);
    if (!answer) {
      throw new Error('Missing answer for question');
    }

    const isValidOption = question.options.some((option) => option.key === answer);
    if (!isValidOption) {
      throw new Error('Invalid answer choice');
    }

    const isCorrect = question.correctKey != null && answer === question.correctKey;

    return {
      questionId: question.id,
      answer,
      isCorrect,
    } satisfies QuizEvaluationResult;
  });
};

const toScore = (results: QuizEvaluationResult[]): number => {
  if (results.length === 0) {
    return 0;
  }

  const correct = results.filter((result) => result.isCorrect).length;
  return clamp01(correct / results.length);
};

const toPercentage = (value: number): number => Math.round(clamp01(value) * 100);

export const submitQuiz = async ({
  userId,
  lessonId,
  answers,
}: SubmitQuizInput): Promise<{ diagnostic: DiagnosticResult[]; score: number }> => {
  if (!userId) {
    throw new Error('User ID is required');
  }
  if (!lessonId) {
    throw new Error('Lesson ID is required');
  }

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
    include: {
      module: { include: { course: { select: { orgId: true } } } },
      quiz: { include: { questions: true } },
    },
  });

  if (!lesson || !lesson.quiz) {
    throw new Error('Lesson quiz not found');
  }

  const normalizedAnswers = normalizeAnswers(answers);
  if (normalizedAnswers.size === 0) {
    throw new Error('No answers submitted');
  }
  const preparedQuestions = prepareQuestions(lessonId, lesson.quiz.questions);

  const results = evaluateResponses(preparedQuestions, normalizedAnswers);
  const score = toScore(results);

  const [objectives, passThreshold] = await Promise.all([
    loadLessonObjectives(userId, lessonId),
    loadAssessmentThreshold(user.orgId, lessonId),
  ]);
  const normalizedThreshold = clamp01(
    Number.isFinite(passThreshold) ? (passThreshold as number) : DEFAULT_PASS_THRESHOLD,
  );
  const diagnostic = buildDiagnostic(objectives, score, normalizedThreshold);

  const scorePercent = toPercentage(score);
  const passed = score >= normalizedThreshold;

  const payload = {
    userId,
    orgId: user.orgId,
    lessonId,
    deviceType: DEVICE_TYPE,
  } as const;

  let emitStart = false;

  try {
    await prisma.$transaction(async (tx) => {
      const existingAssessment = await tx.assessment.findUnique({
        where: {
          userId_lessonId_type: {
            userId,
            lessonId,
            type: 'quiz',
          },
        },
        select: { id: true, completedAt: true },
      });

      if (existingAssessment) {
        throw new Error('Quiz already submitted');
      }

      const createdAssessment = await tx.assessment.create({
        data: {
          userId,
          lessonId,
          type: 'quiz',
        },
        select: { id: true },
      });

      emitStart = true;

      await tx.quizResponse.createMany({
        data: results.map((result) => ({
          userId,
          questionId: result.questionId,
          answer: result.answer,
          isCorrect: result.isCorrect,
        })),
      });

      await tx.assessment.update({
        where: { id: createdAssessment.id },
        data: {
          completedAt: new Date(),
          isPassed: passed,
          score: scorePercent,
          diagnosticJson: diagnostic,
          raw: {
            answers: results.map((result) => [result.questionId, result.answer]),
            threshold: normalizedThreshold,
          },
        },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new Error('Quiz already submitted');
    }
    throw error;
  }

  await syncLessonCompletion({ userId, lessonId });

  if (emitStart) {
    lessonEvents.emit('assessment_start', payload);
  }
  lessonEvents.emit('assessment_submit', payload);
  lessonEvents.emit('assessment_result', {
    ...payload,
    score: scorePercent,
    passed,
    threshold: normalizedThreshold,
  });

  return {
    diagnostic,
    score,
  };
};

