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
  const threshold = Math.round(duration * 0.95);
  return progress.watchedSeconds >= threshold;
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
  const nextIsComplete = watchRequirementMet && quizPassed;

  if (progress.isComplete !== nextIsComplete) {
    await prisma.progress.update({
      where: { id: progress.id },
      data: { isComplete: nextIsComplete }
    });

    if (nextIsComplete) {
      await computeStreak(userId);
    }
  }

  return {
    isComplete: nextIsComplete,
    watchRequirementMet,
    quizPassed
  };
}
