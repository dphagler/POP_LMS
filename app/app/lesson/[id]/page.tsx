import { notFound } from "next/navigation";
import { requireUser, assertSameOrg } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { YouTubeLessonPlayer } from "@/components/lesson/YouTubeLessonPlayer";
import { LessonQuizCard } from "@/components/lesson/LessonQuizCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle } from "lucide-react";
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

  const durationLabel = formatLessonDuration(lesson.durationS);
  const statusLabel = progress?.isComplete ? "Completed" : progress ? "In progress" : "Not started";
  const watchingComplete = watchRequirementMet || progress?.isComplete === true;
  const quizComplete = progress?.isComplete === true;

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
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="space-y-6 lg:col-span-8">
          <Card className="overflow-hidden">
            <CardHeader className="space-y-4 border-b border-base-300 bg-base-100/80">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Badge variant="secondary">{lesson.module.course.title}</Badge>
                <Badge variant="outline">{lesson.module.title}</Badge>
              </div>
              <CardTitle className="text-balance text-2xl sm:text-3xl lg:text-4xl">{lesson.title}</CardTitle>
              <CardDescription className="text-sm">
                Watch the lesson video to unlock the practice quiz and reflection activities.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-4 sm:p-6">
              <YouTubeLessonPlayer lessonId={lesson.id} streamId={lesson.streamId} duration={lesson.durationS} />
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-base-content">Watching progress</span>
                  <span className="text-muted-foreground">{percent}%</span>
                </div>
                <Progress value={percent} />
              </div>
            </CardContent>
          </Card>

          {lesson.quiz && (
            <Card className="overflow-hidden">
              <CardHeader className="space-y-2 border-b border-base-300 bg-base-100/80">
                <CardTitle className="text-xl">Lesson quiz</CardTitle>
                <CardDescription>
                  {lesson.quiz.questions.length} question quiz • Get every answer correct to complete this lesson.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
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
            <Card className="overflow-hidden">
              <CardHeader className="space-y-2 border-b border-base-300 bg-base-100/80">
                <CardTitle className="text-xl">Reflection prompt</CardTitle>
                <CardDescription>Share a quick reflection after watching the lesson.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <p className="text-base leading-relaxed text-base-content/90">{lesson.reflection.prompt}</p>
                <Button variant="outline" disabled>
                  Reflection submissions coming soon
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-4">
          <Card className="lg:sticky lg:top-6">
            <CardHeader className="space-y-3">
              <CardTitle className="text-lg">Lesson details</CardTitle>
              <CardDescription>Key information and quick status updates.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-base-content">Status</span>
                <Badge variant={progress?.isComplete ? "default" : "outline"}>{statusLabel}</Badge>
              </div>

              <dl className="space-y-3 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted-foreground">Course</dt>
                  <dd className="text-right font-medium text-base-content">{lesson.module.course.title}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted-foreground">Module</dt>
                  <dd className="text-right font-medium text-base-content">{lesson.module.title}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted-foreground">Duration</dt>
                  <dd className="text-right font-medium text-base-content">{durationLabel}</dd>
                </div>
              </dl>

              <div>
                <p className="text-sm font-medium text-base-content">Checklist</p>
                <ul className="mt-3 space-y-3 text-sm">
                  <li className="flex items-start gap-3">
                    {watchingComplete ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" aria-hidden />
                    ) : (
                      <Circle className="mt-0.5 h-5 w-5 text-base-300" aria-hidden />
                    )}
                    <div>
                      <p className="font-medium text-base-content">Watch the lesson</p>
                      <p className="text-xs text-muted-foreground">
                        {watchingComplete ? "Watch requirement met" : `Currently ${percent}% complete`}
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    {quizComplete ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" aria-hidden />
                    ) : (
                      <Circle className="mt-0.5 h-5 w-5 text-base-300" aria-hidden />
                    )}
                    <div>
                      <p className="font-medium text-base-content">Pass the quiz</p>
                      <p className="text-xs text-muted-foreground">
                        {quizComplete
                          ? "Great job! You can revisit the quiz anytime."
                          : watchingComplete
                            ? "Quiz unlocked — submit correct answers to complete the lesson."
                            : "Finish watching to unlock the quiz."}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function formatLessonDuration(durationS: number) {
  if (!durationS) {
    return "Under a minute";
  }

  if (durationS < 60) {
    return `${durationS} sec`;
  }

  const minutes = Math.round(durationS / 60);
  return `${minutes} min${minutes === 1 ? "" : "s"}`;
}
