import { notFound } from "next/navigation";
import { requireUser, assertSameOrg } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { YouTubeLessonPlayer } from "@/components/lesson/YouTubeLessonPlayer";
import { LessonQuizCard } from "@/components/lesson/LessonQuizCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { getOptionLabel, parseMcqOptions } from "@/lib/quiz";

type LessonPageParams = { id: string };

type LessonPageProps = {
  params?: Promise<LessonPageParams>;
};

export default async function LessonPage({ params }: LessonPageProps) {
  if (!params) {
    notFound();
  }

  const { id } = await params;
  const session = await requireUser();
  const { id: userId, orgId } = session.user;
  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: {
      module: { include: { course: true } },
      quiz: { include: { questions: true } },
      reflection: true
    }
  });

  if (!lesson) {
    notFound();
  }

  assertSameOrg(lesson.module.course.orgId, orgId);

  const progress = await prisma.progress.findFirst({
    where: { userId, lessonId: lesson.id }
  });

  const watchedSeconds = progress?.watchedSeconds ?? 0;
  const duration = Math.max(lesson.durationS, 1);
  const percent = Math.min(100, Math.round((watchedSeconds / duration) * 100));
  const watchRequirementMet = !lesson.requiresFullWatch || watchedSeconds >= Math.round(duration * 0.95);

  let quizQuestions: Array<{ id: string; prompt: string; options: { key: string; label: string }[] }> = [];
  let quizInitialResponses: Array<{
    questionId: string;
    selectedKey: string | null;
    selectedLabel: string | null;
    isCorrect: boolean | null;
    correctLabel: string | null;
  }> = [];

  if (lesson.quiz) {
    const questionDetails = lesson.quiz.questions.map((question) => {
      const options = parseMcqOptions(question);
      return {
        id: question.id,
        prompt: question.prompt,
        options,
        correctLabel: getOptionLabel(options, question.correctKey ?? undefined)
      };
    });

    quizQuestions = questionDetails.map(({ id, prompt, options }) => ({ id, prompt, options }));

    if (questionDetails.length > 0) {
      const questionIds = questionDetails.map((detail) => detail.id);
      const responses = await prisma.quizResponse.findMany({
        where: {
          userId,
          questionId: {
            in: questionIds
          }
        },
        select: {
          questionId: true,
          answer: true,
          isCorrect: true
        }
      });

      const responseMap = new Map(responses.map((response) => [response.questionId, response]));

      quizInitialResponses = questionDetails.map((detail) => {
        const response = responseMap.get(detail.id);
        const selectedKey = response?.answer ?? null;
        return {
          questionId: detail.id,
          selectedKey,
          selectedLabel: selectedKey ? getOptionLabel(detail.options, selectedKey) : null,
          isCorrect: typeof response?.isCorrect === "boolean" ? response.isCorrect : null,
          correctLabel: detail.correctLabel
        };
      });
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Badge variant="secondary">{lesson.module.course.title}</Badge>
          <Badge variant={progress?.isComplete ? "default" : "outline"}>
            {progress?.isComplete ? "Completed" : "In progress"}
          </Badge>
        </div>
        <h1 className="text-3xl font-semibold">{lesson.title}</h1>
        <p className="text-sm text-muted-foreground">Watch the lesson video to unlock the quiz and reflection.</p>
      </div>

      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <YouTubeLessonPlayer lessonId={lesson.id} youtubeId={lesson.youtubeId} duration={lesson.durationS} />
          <div>
            <p className="text-sm font-medium">Progress</p>
            <Progress value={percent} />
          </div>
        </CardContent>
      </Card>

      {lesson.quiz && (
        <Card>
          <CardHeader>
            <CardTitle>Quick check</CardTitle>
            <CardDescription>
              {lesson.quiz.questions.length} question quiz • Get every answer correct to complete this lesson
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LessonQuizCard
              quizId={lesson.quiz.id}
              questions={quizQuestions}
              initialResponses={quizInitialResponses}
              watchRequirementMet={watchRequirementMet}
            />
          </CardContent>
        </Card>
      )}

      {lesson.reflection && (
        <Card>
          <CardHeader>
            <CardTitle>Reflection prompt</CardTitle>
            <CardDescription>Share a quick reflection after watching the lesson.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p>{lesson.reflection.prompt}</p>
            <Button variant="outline" disabled>
              Reflection submissions coming soon
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
