import { prisma } from "@/lib/prisma";
import { computeStreak } from "@/lib/streak";
import type { Lesson, Progress, Quiz, QuizQuestion } from "@prisma/client";

type LessonWithQuiz = Lesson & {
  quiz: (Quiz & { questions: QuizQuestion[] }) | null;
};

type ProgressState = {
  progress: Progress | null;
  lesson: LessonWithQuiz | null;
};

const COMPLETION_THRESHOLD = 0.95;

async function loadLessonAndProgress(userId: string, lessonId: string): Promise<ProgressState> {
  const [lesson, progress] = await Promise.all([
    prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        quiz: {
          include: { questions: true }
        }
      }
    }),
    prisma.progress.findFirst({
      where: { userId, lessonId }
    })
  ]);

  return { lesson, progress };
}

function computeWatchRequirementMet(lesson: LessonWithQuiz, progress: Progress): boolean {
  if (!lesson.requiresFullWatch) {
    return true;
  }

  const duration = Math.max(lesson.durationS, 1);
  const threshold = Math.round(duration * COMPLETION_THRESHOLD);
  const uniqueSeconds = Number.isFinite(progress.uniqueSeconds ?? NaN)
    ? Math.max(0, progress.uniqueSeconds ?? 0)
    : 0;
  const watched = Math.min(uniqueSeconds, duration);
  return watched >= threshold;
}

async function computeQuizPassed(userId: string, lesson: LessonWithQuiz): Promise<boolean> {
  if (!lesson.quiz || lesson.quiz.questions.length === 0) {
    return true;
  }

  const questionIds = lesson.quiz.questions.map((question) => question.id);
  const responses = await prisma.quizResponse.findMany({
    where: {
      userId,
      questionId: {
        in: questionIds
      }
    },
    select: {
      questionId: true,
      isCorrect: true
    }
  });

  if (responses.length !== questionIds.length) {
    return false;
  }

  const responseMap = new Map(responses.map((response) => [response.questionId, response.isCorrect]));
  return questionIds.every((questionId) => responseMap.get(questionId) === true);
}

export type LessonCompletionStatus = {
  isComplete: boolean;
  watchRequirementMet: boolean;
  quizPassed: boolean;
};

export async function syncLessonCompletion({
  userId,
  lessonId
}: {
  userId: string;
  lessonId: string;
}): Promise<LessonCompletionStatus> {
  const { lesson, progress } = await loadLessonAndProgress(userId, lessonId);

  if (!lesson || !progress) {
    return {
      isComplete: false,
      watchRequirementMet: false,
      quizPassed: !lesson?.quiz || lesson.quiz.questions.length === 0
    };
  }

  const watchRequirementMet = computeWatchRequirementMet(lesson, progress);
  const quizPassed = await computeQuizPassed(userId, lesson);
  const augmentationsPending = await prisma.augmentationServed.count({
    where: {
      userId,
      lessonId,
      completedAt: null
    }
  });
  const nextIsComplete = watchRequirementMet && quizPassed && augmentationsPending === 0;
  const alreadyComplete = Boolean(progress.completedAt);

  if (nextIsComplete && !alreadyComplete) {
    await prisma.progress.update({
      where: { id: progress.id },
      data: { completedAt: new Date() }
    });

    await computeStreak(userId);
  } else if (!nextIsComplete && alreadyComplete) {
    await prisma.progress.update({
      where: { id: progress.id },
      data: { completedAt: null }
    });
  }

  return {
    isComplete: nextIsComplete,
    watchRequirementMet,
    quizPassed
  };
}
