import { createHash } from "node:crypto";

import type {
  SanityCourseDocument,
  SanityLessonDocument,
  SanityModuleDocument
} from "../sanity";

type Provider = "youtube" | "cloudflare";
type SkipResult = { skip: true; reason: string };

type CoursePayload = {
  title: string;
  description: string | null;
};

type ModulePayload = {
  title: string;
  order: number;
  courseId: string;
};

type LessonPayload = {
  title: string;
  moduleId: string;
  provider: Provider;
  videoUrl: string | null;
  streamId: string | null;
  posterUrl: string | null;
  durationS: number;
  requiresFullWatch: boolean;
};

type MappingResult<T> = T | SkipResult;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function sanitizeTitle(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  const stringified = String(value).trim();
  return stringified.length > 0 ? stringified : undefined;
}

function toNumber(value: unknown, fallback = 0): number {
  const coerced = Number(value);
  return Number.isFinite(coerced) ? coerced : fallback;
}

function sanitizeOptionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  const stringified = String(value).trim();
  return stringified.length > 0 ? stringified : undefined;
}

function pruneForDiff(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => pruneForDiff(entry));
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .map(([key, v]) => [key, pruneForDiff(v)] as const)
    .sort(([a], [b]) => a.localeCompare(b));

  const result: Record<string, unknown> = {};
  for (const [key, v] of entries) {
    result[key] = v;
  }
  return result;
}

export function normalizeProvider(value: any): Provider | null {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (["youtube", "yt", "you_tube"].includes(normalized)) {
    return "youtube";
  }

  if (
    ["cloudflare", "cloudflare-stream", "cloudflare_stream", "stream"].includes(
      normalized
    )
  ) {
    return "cloudflare";
  }

  return null;
}

export function mapCourse(
  doc: SanityCourseDocument | null | undefined
): MappingResult<CoursePayload> {
  const title = sanitizeTitle(doc?.title);
  if (!title) {
    return { skip: true, reason: "missing_title" };
  }

  const payload: CoursePayload = {
    title,
    description: sanitizeOptionalString(doc?.description) ?? null
  };

  return payload;
}

export function mapModule(
  doc: SanityModuleDocument | null | undefined,
  courseId: string | null | undefined
): MappingResult<ModulePayload> {
  if (!isNonEmptyString(courseId)) {
    return { skip: true, reason: "missing_courseId" };
  }

  const title = sanitizeTitle(doc?.title);
  if (!title) {
    return { skip: true, reason: "missing_title" };
  }

  const payload: ModulePayload = {
    title,
    order: toNumber(doc?.order ?? 0, 0),
    courseId
  };

  return payload;
}

export function mapLesson(
  doc: SanityLessonDocument | null | undefined,
  moduleId: string | null | undefined
): MappingResult<LessonPayload> {
  if (!isNonEmptyString(moduleId)) {
    return { skip: true, reason: "missing_moduleId" };
  }

  const title = sanitizeTitle(doc?.title);
  if (!title) {
    return { skip: true, reason: "missing_title" };
  }

  const explicitProvider = normalizeProvider(doc?.provider);
  const inferredProvider = explicitProvider
    ? explicitProvider
    : sanitizeOptionalString(doc?.videoUrl) ||
        sanitizeOptionalString(doc?.youtubeId)
      ? "youtube"
      : sanitizeOptionalString(doc?.streamId)
        ? "cloudflare"
        : null;
  const provider = explicitProvider ?? inferredProvider;

  if (!provider) {
    return { skip: true, reason: "missing_provider" };
  }

  const rawVideoUrl = isNonEmptyString(doc?.videoUrl)
    ? doc?.videoUrl.trim()
    : undefined;
  const youtubeId = sanitizeOptionalString(doc?.youtubeId);
  const rawStreamId = isNonEmptyString(doc?.streamId)
    ? doc?.streamId.trim()
    : undefined;
  const rawPosterUrl = sanitizeOptionalString(doc?.posterUrl);

  if (provider === "youtube" && !rawVideoUrl) {
    if (!youtubeId) {
      return { skip: true, reason: "youtube_without_url" };
    }
  }

  if (provider === "cloudflare" && !rawStreamId) {
    return { skip: true, reason: "cloudflare_without_streamId" };
  }

  const payload: LessonPayload = {
    title,
    moduleId,
    provider,
    videoUrl:
      provider === "youtube"
        ? (rawVideoUrl ??
          (youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : null))
        : (rawVideoUrl ?? null),
    streamId:
      provider === "cloudflare" ? (rawStreamId ?? null) : (rawStreamId ?? null),
    posterUrl: rawPosterUrl ?? null,
    durationS: toNumber(doc?.durationS ?? 0, 0),
    requiresFullWatch: Boolean(doc?.requiresFullWatch ?? true)
  };

  return payload;
}

export function hashContentForDiff(input: object): string {
  const pruned = pruneForDiff(input ?? {});
  const serialized = JSON.stringify(pruned);
  return createHash("sha1").update(serialized).digest("hex");
}
