import { notFound } from "next/navigation";
import { requireUser, assertSameOrg } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { progressByUserAndLesson } from "@/lib/prisma-helpers";
import { YouTubeLessonPlayer } from "@/components/lesson/YouTubeLessonPlayer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface LessonPageProps {
  params: { id: string };
}

export default async function LessonPage({ params }: LessonPageProps) {
  const session = await requireUser();
  const { id: userId, orgId } = session.user;
  const lesson = await prisma.lesson.findUnique({
    where: { id: params.id },
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

  const progress = await prisma.progress.findUnique({
    where: progressByUserAndLesson(userId, lesson.id)
  });

  const watchedSeconds = progress?.watchedSeconds ?? 0;
  const percent = Math.min(100, Math.round((watchedSeconds / Math.max(lesson.durationS, 1)) * 100));

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
            <CardDescription>{lesson.quiz.questions.length} question quiz</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {lesson.quiz.questions.map((question) => (
              <div key={question.id} className="rounded-md border p-3">
                <p className="text-sm font-medium">{question.prompt}</p>
                <p className="text-xs text-muted-foreground">Answer in the admin portal.</p>
              </div>
            ))}
            {lesson.quiz.questions.length === 0 && (
              <p className="text-sm text-muted-foreground">Quiz questions will appear here once configured.</p>
            )}
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
