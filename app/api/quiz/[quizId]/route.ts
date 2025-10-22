import { NextResponse } from "next/server";
import { assertSameOrg, requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { syncLessonCompletion } from "@/lib/lesson-progress";
import { createRequestLogger, serializeError } from "@/lib/logger";
import { getOptionLabel, parseMcqOptions } from "@/lib/quiz";

type RouteParams = {
  params: Promise<{ quizId: string }>;
};

type SubmitAnswer = {
  questionId: string;
  answer: string;
};

type SubmitRequestBody = {
  answers: SubmitAnswer[];
};

export async function POST(request: Request, { params }: RouteParams) {
  const { logger, requestId } = createRequestLogger(request, { route: "quiz.submit" });

  try {
    const session = await requireUser();
    const { id: userId, orgId } = session.user;
    const { quizId } = await params;

    if (!quizId) {
      return NextResponse.json({ error: "Quiz ID is required", requestId }, { status: 400 });
    }

    const body = (await request.json()) as SubmitRequestBody | null;
    const answers = Array.isArray(body?.answers) ? body!.answers : null;

    if (!answers || answers.length === 0) {
      return NextResponse.json({ error: "No answers submitted", requestId }, { status: 400 });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        lesson: {
          include: {
            module: { include: { course: true } }
          }
        },
        questions: true
      }
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found", requestId }, { status: 404 });
    }

    assertSameOrg(quiz.lesson.module.course.orgId, orgId);

    if (quiz.questions.length === 0) {
      return NextResponse.json({ error: "Quiz has no questions", requestId }, { status: 400 });
    }

    const answerMap = new Map<string, string>();
    for (const answer of answers) {
      if (!answer || typeof answer.questionId !== "string" || typeof answer.answer !== "string") {
        return NextResponse.json({ error: "Invalid answer payload", requestId }, { status: 400 });
      }
      answerMap.set(answer.questionId, answer.answer);
    }

    const results = [] as {
      questionId: string;
      selectedKey: string;
      selectedLabel: string | null;
      isCorrect: boolean;
      correctKey: string | null;
      correctLabel: string | null;
    }[];

    for (const question of quiz.questions) {
      if (question.type !== "MCQ") {
        return NextResponse.json({ error: "Unsupported question type", requestId }, { status: 400 });
      }

      const options = parseMcqOptions(question);
      if (options.length === 0) {
        return NextResponse.json({ error: "Question has no options", requestId }, { status: 400 });
      }

      const selectedKey = answerMap.get(question.id);
      if (!selectedKey) {
        return NextResponse.json({ error: "Missing answer for question", requestId }, { status: 400 });
      }

      const isValidOption = options.some((option) => option.key === selectedKey);
      if (!isValidOption) {
        return NextResponse.json({ error: "Invalid answer choice", requestId }, { status: 400 });
      }

      const isCorrect = question.correctKey != null && selectedKey === question.correctKey;
      results.push({
        questionId: question.id,
        selectedKey,
        selectedLabel: getOptionLabel(options, selectedKey),
        isCorrect,
        correctKey: question.correctKey,
        correctLabel: getOptionLabel(options, question.correctKey)
      });
    }

    await prisma.$transaction(async (tx) => {
      for (const result of results) {
        await tx.quizResponse.deleteMany({
          where: {
            userId,
            questionId: result.questionId
          }
        });

        await tx.quizResponse.create({
          data: {
            userId,
            questionId: result.questionId,
            answer: result.selectedKey,
            isCorrect: result.isCorrect
          }
        });
      }
    });

    const status = await syncLessonCompletion({ userId, lessonId: quiz.lessonId });
    const passed = results.every((result) => result.isCorrect);

    logger.info({
      event: "quiz.submit.success",
      quizId,
      lessonId: quiz.lessonId,
      userId,
      passed
    });

    return NextResponse.json({
      ok: true,
      results,
      passed,
      completion: status,
      requestId
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON body", requestId }, { status: 400 });
    }

    if (error instanceof Error && error.message === "Cross-organization access denied") {
      return NextResponse.json({ error: "Forbidden", requestId }, { status: 403 });
    }

    const serialized = serializeError(error);
    logger.error({
      event: "quiz.submit.error",
      error: serialized
    });
    return NextResponse.json({ error: "Unable to submit quiz at this time", requestId }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { logger, requestId } = createRequestLogger(request, { route: "quiz.reset" });

  try {
    const session = await requireUser();
    const { id: userId, orgId } = session.user;
    const { quizId } = await params;

    if (!quizId) {
      return NextResponse.json({ error: "Quiz ID is required", requestId }, { status: 400 });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        lesson: {
          include: {
            module: { include: { course: true } }
          }
        },
        questions: true
      }
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found", requestId }, { status: 404 });
    }

    assertSameOrg(quiz.lesson.module.course.orgId, orgId);

    if (quiz.questions.length > 0) {
      const questionIds = quiz.questions.map((question) => question.id);
      await prisma.quizResponse.deleteMany({
        where: {
          userId,
          questionId: {
            in: questionIds
          }
        }
      });
    }

    const status = await syncLessonCompletion({ userId, lessonId: quiz.lessonId });

    logger.info({
      event: "quiz.reset.success",
      quizId,
      lessonId: quiz.lessonId,
      userId
    });

    return NextResponse.json({
      ok: true,
      completion: status,
      requestId
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Cross-organization access denied") {
      return NextResponse.json({ error: "Forbidden", requestId }, { status: 403 });
    }

    const serialized = serializeError(error);
    logger.error({
      event: "quiz.reset.error",
      error: serialized
    });
    return NextResponse.json({ error: "Unable to reset quiz at this time", requestId }, { status: 500 });
  }
}
