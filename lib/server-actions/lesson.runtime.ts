'use server';

import { Prisma } from '@prisma/client';

import type {
  AugmentationRule,
  LessonObjective,
  LessonRuntime,
} from '../lesson/contracts';
import { prisma } from '../prisma';

interface GetNextLessonInput {
  userId: string;
  assignmentId: string;
}

interface GetLessonRuntimeInput {
  userId: string;
  lessonId: string;
}

type LessonAssignment = {
  moduleId: string | null;
  courseId: string | null;
};

type LessonRuntimeSnapshotRow = {
  runtimeJson: unknown;
};

const DEFAULT_ASSESSMENT_TYPE = 'QUIZ';
const NO_ASSESSMENT_TYPE = 'NONE';

const LESSON_ORDER = [
  { createdAt: 'asc' as const },
  { id: 'asc' as const },
];

const MODULE_ORDER = [
  { order: 'asc' as const },
  { id: 'asc' as const },
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const normalizeObjectives = (value: unknown): LessonObjective[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }

      const id = typeof item.id === 'string' ? item.id : undefined;
      const summary = typeof item.summary === 'string' ? item.summary : undefined;

      if (!id || !summary) {
        return null;
      }

      return { id, summary } satisfies LessonObjective;
    })
    .filter((objective): objective is LessonObjective => objective !== null);
};

const normalizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

type VideoProvider = LessonRuntime['videoProvider'];

const normalizeProvider = (value: unknown): VideoProvider | null => {
  if (value === 'youtube' || value === 'cloudflare') {
    return value;
  }

  if (typeof value === 'string') {
    const lower = value.trim().toLowerCase();
    if (lower === 'youtube' || lower === 'cloudflare') {
      return lower as VideoProvider;
    }
  }

  return null;
};

function parseYouTubeId(raw?: string | null): string | null {
  const value = normalizeOptionalString(raw);
  if (!value) {
    return null;
  }

  const ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

  if (ID_PATTERN.test(value)) {
    return value;
  }

  const toUrl = (input: string): URL | null => {
    try {
      return new URL(input);
    } catch {
      try {
        return new URL(`https://${input}`);
      } catch {
        return null;
      }
    }
  };

  const url = toUrl(value);
  if (!url) {
    return null;
  }

  const host = url.hostname.toLowerCase();

  const pickCandidate = (candidate: string | null | undefined): string | null => {
    if (!candidate) {
      return null;
    }

    const trimmed = candidate.trim();
    return ID_PATTERN.test(trimmed) ? trimmed : null;
  };

  if (host === 'youtu.be' || host.endsWith('.youtu.be')) {
    const [firstSegment] = url.pathname.replace(/^\/+/, '').split('/');
    return pickCandidate(firstSegment);
  }

  if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
    const fromQuery = pickCandidate(url.searchParams.get('v'));
    if (fromQuery) {
      return fromQuery;
    }

    const segments = url.pathname
      .split('/')
      .map((segment) => segment.trim())
      .filter((segment) => segment.length > 0);

    const extractFromSegments = (): string | null => {
      if (segments.length === 0) {
        return null;
      }

      const markers = new Set(['embed', 'shorts', 'v']);
      for (let index = 0; index < segments.length - 1; index += 1) {
        if (markers.has(segments[index])) {
          return segments[index + 1] ?? null;
        }
      }

      return segments[segments.length - 1] ?? null;
    };

    return pickCandidate(extractFromSegments());
  }

  return null;
}

const resolveVideoSource = ({
  lessonId,
  provider,
  streamId,
  videoUrl,
}: {
  lessonId: string;
  provider: VideoProvider | null;
  streamId: string | null;
  videoUrl: string | null;
}): Pick<LessonRuntime, 'videoProvider' | 'videoId' | 'streamId'> => {
  const normalizedStreamId = normalizeOptionalString(streamId);
  const normalizedVideoUrl = normalizeOptionalString(videoUrl);

  let resolvedProvider: VideoProvider | null = provider;
  if (!resolvedProvider) {
    resolvedProvider = normalizedVideoUrl ? 'youtube' : 'cloudflare';
  }

  if (resolvedProvider === 'youtube') {
    const videoId = parseYouTubeId(normalizedVideoUrl);
    if (videoId) {
      return { videoProvider: 'youtube', videoId, streamId: null };
    }

    if (normalizedStreamId) {
      if (process.env.NODE_ENV !== 'production') {
        throw new Error(
          `Lesson ${lessonId} is configured for YouTube but the video URL is missing or invalid.`,
        );
      }

      return { videoProvider: 'cloudflare', videoId: null, streamId: normalizedStreamId };
    }

    throw new Error(
      `Lesson ${lessonId} is configured for YouTube but the video URL is missing or invalid.`,
    );
  }

  if (normalizedStreamId) {
    return { videoProvider: 'cloudflare', videoId: null, streamId: normalizedStreamId };
  }

  if (normalizedVideoUrl) {
    const videoId = parseYouTubeId(normalizedVideoUrl);
    if (videoId) {
      return { videoProvider: 'youtube', videoId, streamId: null };
    }
  }

  throw new Error(
    `Lesson ${lessonId} is missing both a Cloudflare stream ID and a valid YouTube video URL.`,
  );
};

const normalizeAugmentations = (value: unknown): AugmentationRule[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }

      const rawTargets = item.targets;
      const targets = Array.isArray(rawTargets)
        ? rawTargets.filter((target): target is string => typeof target === 'string' && target.length > 0)
        : [];
      const whenExpr = typeof item.whenExpr === 'string' ? item.whenExpr : '';
      const assetRef = typeof item.assetRef === 'string' ? item.assetRef : '';

      if (targets.length === 0 || !assetRef) {
        return null;
      }

      return { targets, whenExpr, assetRef } satisfies AugmentationRule;
    })
    .filter((rule): rule is AugmentationRule => rule !== null);
};

async function ensureUserOrgId(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { orgId: true },
  });

  if (!user?.orgId) {
    throw new Error('User not found or missing organization context');
  }

  return user.orgId;
}

async function fetchAssignment(orgId: string, assignmentId: string): Promise<LessonAssignment | null> {
  const assignment = await prisma.assignment.findFirst({
    where: {
      id: assignmentId,
      orgId,
      deletedAt: null,
    },
    select: {
      moduleId: true,
      courseId: true,
    },
  });

  if (!assignment) {
    return null;
  }

  return assignment;
}

async function fetchAssignmentLessonIds(orgId: string, assignment: LessonAssignment): Promise<string[]> {
  if (assignment.moduleId) {
    const moduleRecord = await prisma.module.findFirst({
      where: {
        id: assignment.moduleId,
        course: { orgId },
      },
      select: {
        lessons: {
          orderBy: LESSON_ORDER,
          select: { id: true },
        },
      },
    });

    return moduleRecord?.lessons.map((lesson) => lesson.id) ?? [];
  }

  if (assignment.courseId) {
    const modules = await prisma.module.findMany({
      where: {
        courseId: assignment.courseId,
        course: { orgId },
      },
      orderBy: MODULE_ORDER,
      select: {
        lessons: {
          orderBy: LESSON_ORDER,
          select: { id: true },
        },
      },
    });

    return modules.flatMap((module) => module.lessons.map((lesson) => lesson.id));
  }

  return [];
}

async function loadLessonRuntimeSnapshot(orgId: string, lessonId: string): Promise<LessonRuntime | null> {
  try {
    const rows = await prisma.$queryRaw<LessonRuntimeSnapshotRow[]>`
      SELECT "runtimeJson"
      FROM "LessonRuntimeSnapshot"
      WHERE "orgId" = ${orgId} AND "lessonId" = ${lessonId}
      ORDER BY "version" DESC
      LIMIT 1
    `;

    const snapshot = rows[0]?.runtimeJson;
    if (!isRecord(snapshot)) {
      return null;
    }

    const objectives = normalizeObjectives(snapshot.objectives);
    const augmentations = normalizeAugmentations(snapshot.augmentations);
    const id = typeof snapshot.id === 'string' ? snapshot.id : lessonId;
    const title = typeof snapshot.title === 'string' ? snapshot.title : '';
    const streamId = normalizeOptionalString(snapshot.streamId);
    const videoUrl = normalizeOptionalString(
      (snapshot.videoUrl ?? snapshot.youtubeUrl ?? snapshot.videoURL ?? null) as unknown,
    );
    const posterUrl = normalizeOptionalString(snapshot.posterUrl);
    const provider = normalizeProvider(
      (snapshot.provider ?? snapshot.videoProvider ?? snapshot.providerName ?? null) as unknown,
    );
    const durationSec = typeof snapshot.durationSec === 'number' ? snapshot.durationSec : 0;
    const assessmentType = typeof snapshot.assessmentType === 'string'
      ? snapshot.assessmentType
      : DEFAULT_ASSESSMENT_TYPE;
    const requiresFullWatch =
      typeof snapshot.requiresFullWatch === 'boolean'
        ? snapshot.requiresFullWatch
        : true;

    if (!title || (!streamId && !videoUrl)) {
      return null;
    }

    const { videoProvider, videoId, streamId: resolvedStreamId } = resolveVideoSource({
      lessonId,
      provider,
      streamId,
      videoUrl,
    });

    return {
      id,
      title,
      objectives,
      streamId: resolvedStreamId,
      videoId,
      videoProvider,
      posterUrl,
      durationSec,
      assessmentType,
      augmentations,
      requiresFullWatch,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
      return null;
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === 'P2010' || error.code === 'P2022') &&
      /LessonRuntimeSnapshot/i.test(error.message)
    ) {
      return null;
    }

    if (error instanceof Error && /LessonRuntimeSnapshot/i.test(error.message)) {
      return null;
    }

    throw error;
  }
}

export const getLessonRuntime = async ({
  userId,
  lessonId,
}: GetLessonRuntimeInput): Promise<LessonRuntime> => {
  const orgId = await ensureUserOrgId(userId);

  const snapshotRuntime = await loadLessonRuntimeSnapshot(orgId, lessonId);
  let runtime: LessonRuntime;

  if (snapshotRuntime) {
    runtime = snapshotRuntime;
  } else {
    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        module: { course: { orgId } },
      },
      select: {
        id: true,
        title: true,
        streamId: true,
        provider: true,
        videoUrl: true,
        posterUrl: true,
        durationS: true,
        requiresFullWatch: true,
        quiz: { select: { id: true } },
      },
    });

    if (!lesson) {
      throw new Error('Lesson not found');
    }

    const streamId = normalizeOptionalString(lesson.streamId);
    const videoUrl = normalizeOptionalString(lesson.videoUrl);
    const posterUrl = normalizeOptionalString(lesson.posterUrl);
    const provider = normalizeProvider(lesson.provider);

    const { videoProvider, videoId, streamId: resolvedStreamId } = resolveVideoSource({
      lessonId: lesson.id,
      provider,
      streamId,
      videoUrl,
    });

    runtime = {
      id: lesson.id,
      title: lesson.title,
      objectives: [],
      streamId: resolvedStreamId,
      videoId,
      videoProvider,
      posterUrl,
      durationSec: lesson.durationS,
      assessmentType: lesson.quiz ? 'QUIZ' : NO_ASSESSMENT_TYPE,
      augmentations: [],
      requiresFullWatch: lesson.requiresFullWatch,
    };
  }

  if (process.env.NODE_ENV !== 'production') {
    const { videoProvider, videoId, streamId, durationSec } = runtime;
    console.log('[runtime] lesson', {
      id: runtime.id,
      provider: videoProvider,
      videoId,
      streamId,
      duration: durationSec,
    });
  }

  return runtime;
};

export const getNextLesson = async ({
  userId,
  assignmentId,
}: GetNextLessonInput): Promise<LessonRuntime | null> => {
  const orgId = await ensureUserOrgId(userId);

  const enrollment = await prisma.enrollment.findFirst({
    where: {
      userId,
      assignmentId,
      deletedAt: null,
      assignment: { orgId },
    },
    select: { id: true },
  });

  if (!enrollment) {
    return null;
  }

  const assignment = await fetchAssignment(orgId, assignmentId);
  if (!assignment) {
    return null;
  }

  const lessonIds = await fetchAssignmentLessonIds(orgId, assignment);
  if (lessonIds.length === 0) {
    return null;
  }

  const progresses = await prisma.progress.findMany({
    where: {
      userId,
      lessonId: { in: lessonIds },
    },
    select: {
      lessonId: true,
      completedAt: true,
    },
  });

  const completionByLesson = new Map(
    progresses.map((progress) => [progress.lessonId, Boolean(progress.completedAt)]),
  );
  const nextLessonId = lessonIds.find((lessonId) => completionByLesson.get(lessonId) !== true);

  if (!nextLessonId) {
    return null;
  }

  return getLessonRuntime({ userId, lessonId: nextLessonId });
};
