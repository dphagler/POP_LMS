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

  const { id } = await params;
  if (!id) {
    notFound();
  }

  let lessonPayload;
  try {
    lessonPayload = await loadLesson(id);
  } catch (error) {
    notFound();
  }

  const augmentations = await loadAugmentations(id);
  const { runtime, progress, diagnostics } = lessonPayload ?? {};

  if (!runtime) {
    notFound();
  }

  const duration = Math.max(runtime.durationSec ?? 0, 1);
  const watchedSeconds = Math.max(progress?.watchedSeconds ?? 0, 0);
  const progressPercent = Math.min(
    100,
    Math.round((watchedSeconds / duration) * 100),
  );

  const posterUrl = runtime.streamId
    ? `https://image.mux.com/${runtime.streamId}/thumbnail.jpg?time=0`
    : undefined;
  const augmentationCount = augmentations.items.length;

  let badgeLabel: string | null = null;
  let previousLessonHref: string | null = null;
  let nextLessonHref: string | null = null;

  const session = await requireUser();
  const orgId = session.user.orgId;
  if (!orgId) {
    notFound();
  }

  if (runtime.id) {
    const lessonRecord = await prisma.lesson.findFirst({
      where: { id: runtime.id, module: { course: { orgId } } },
      select: { moduleId: true },
    });

    if (lessonRecord?.moduleId) {
      const siblingLessons = await prisma.lesson.findMany({
        where: { moduleId: lessonRecord.moduleId, module: { course: { orgId } } },
        orderBy: LESSON_ORDER,
        select: { id: true },
      });

      const currentIndex = siblingLessons.findIndex((lesson) => lesson.id === runtime.id);
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
      durationSec: runtime.durationSec,
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
      lessonTitle={runtime.title}
      posterUrl={posterUrl}
      progressPercent={progressPercent}
      canStartAssessment={canStartAssessmentFlag}
      augmentationCount={augmentationCount}
      badgeLabel={badgeLabel}
      previousLessonHref={previousLessonHref}
      nextLessonHref={nextLessonHref}
    />
  );
}

