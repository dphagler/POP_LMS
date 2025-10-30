import { notFound } from "next/navigation";

import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { INITIAL_STATE, canStartAssessment } from "@/lib/lesson/engine";

import { LessonPlayerClient } from "./LessonPlayerClient";
import { loadLesson, loadAugmentations } from "./actions";

type LessonPageParams = { id: string };

type LessonPageProps = {
  params?: Promise<LessonPageParams>;
};

const LESSON_ORDER = [
  { createdAt: "asc" as const },
  { id: "asc" as const },
];

export default async function LessonPage({ params }: LessonPageProps) {
  if (!params) {
    notFound();
  }

  const { id: lessonId } = await params;
  if (!lessonId) {
    notFound();
  }

  let lessonPayload;
  try {
    lessonPayload = await loadLesson(lessonId);
  } catch (error) {
    notFound();
  }

  const augmentations = await loadAugmentations(lessonId);
  const { runtime, progress, diagnostics } = lessonPayload ?? {};

  if (!runtime) {
    notFound();
  }

  const { id, title, durationSec, videoProvider, videoId, streamId } = runtime;

  const posterUrl =
    runtime.posterUrl ??
    (videoProvider === "youtube" && videoId
      ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      : streamId
        ? `https://image.mux.com/${streamId}/thumbnail.jpg?time=0`
        : undefined);

  const duration = Math.max(durationSec ?? 0, 1);
  const watchedSeconds = Math.max(
    Math.min(progress?.uniqueSeconds ?? 0, duration),
    0,
  );
  const progressPercent = Math.min(
    100,
    Math.round((watchedSeconds / duration) * 100),
  );
  const augmentationCount = augmentations.items.length;

  let badgeLabel: string | null = null;
  let previousLessonHref: string | null = null;
  let nextLessonHref: string | null = null;

  const session = await requireUser();
  const orgId = session.user.orgId;
  if (!orgId) {
    notFound();
  }

  if (id) {
    const lessonRecord = await prisma.lesson.findFirst({
      where: { id, module: { course: { orgId } } },
      select: { moduleId: true },
    });

    if (lessonRecord?.moduleId) {
      const siblingLessons = await prisma.lesson.findMany({
        where: { moduleId: lessonRecord.moduleId, module: { course: { orgId } } },
        orderBy: LESSON_ORDER,
        select: { id: true },
      });

      const currentIndex = siblingLessons.findIndex((lesson) => lesson.id === id);
      if (currentIndex >= 0) {
        const total = siblingLessons.length;
        badgeLabel = `${currentIndex + 1} of ${total}`;

        const previous = siblingLessons[currentIndex - 1]?.id;
        const next = siblingLessons[currentIndex + 1]?.id;

        if (previous) {
          previousLessonHref = `/app/lesson/${previous}`;
        }

        if (next) {
          nextLessonHref = `/app/lesson/${next}`;
        }
      }
    }
  }

  const engineContext = {
    runtime: {
      durationSec,
      augmentations: runtime.augmentations ?? [],
    },
    progress: {
      uniqueSeconds: progress?.uniqueSeconds ?? 0,
      thresholdPct: progress?.thresholdPct ?? 0,
    },
    diagnostics: diagnostics ?? [],
  } as const;

  const canStartAssessmentFlag = canStartAssessment(INITIAL_STATE, engineContext);

  return (
    <LessonPlayerClient
      lessonId={id}
      videoId={
        videoProvider === "youtube"
          ? (videoId ?? "")
          : (streamId ?? "")
      }
      videoDuration={durationSec}
      videoProvider={videoProvider}
      lessonTitle={title}
      posterUrl={posterUrl}
      progressPercent={progressPercent}
      initialUniqueSeconds={progress?.uniqueSeconds ?? 0}
      canStartAssessment={canStartAssessmentFlag}
      augmentationCount={augmentationCount}
      badgeLabel={badgeLabel}
      previousLessonHref={previousLessonHref}
      nextLessonHref={nextLessonHref}
      userId={session.user.id}
      userEmail={session.user.email ?? null}
      userOrgId={orgId}
      userRole={session.user.role ?? null}
    />
  );
}

