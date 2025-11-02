import { createClient } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";

import { env } from "@/lib/env";
import { publicEnv } from "@/lib/env.client";

const SANITY_API_VERSION = "2024-08-01";

const isServerRuntime = typeof window === "undefined";

const projectId = isServerRuntime
  ? env.SANITY_PROJECT_ID
  : publicEnv.NEXT_PUBLIC_SANITY_PROJECT_ID;

const dataset = isServerRuntime
  ? env.SANITY_DATASET
  : publicEnv.NEXT_PUBLIC_SANITY_DATASET;

const token = isServerRuntime ? env.SANITY_READ_TOKEN || undefined : undefined;

const globalForSanityEnvLog = globalThis as typeof globalThis & {
  __SANITY_ENV_LOGGED__?: boolean;
};

if (
  isServerRuntime &&
  process.env.NODE_ENV !== "production" &&
  !globalForSanityEnvLog.__SANITY_ENV_LOGGED__
) {
  globalForSanityEnvLog.__SANITY_ENV_LOGGED__ = true;
  // eslint-disable-next-line no-console
  console.log("[sanity] server project=%s dataset=%s", projectId, dataset);
}

type SanityClient = ReturnType<typeof createClient>;

let cachedServerClient: SanityClient | null = null;
let cachedServerBuilder: ReturnType<typeof imageUrlBuilder> | null = null;

type SanityRuntimeConfig = {
  projectId: string;
  dataset: string;
  token: string | undefined;
  useCdn: boolean;
};

function getSanityServerConfig(): SanityRuntimeConfig {
  return {
    projectId: env.SANITY_PROJECT_ID,
    dataset: env.SANITY_DATASET,
    token: env.SANITY_READ_TOKEN || undefined,
    useCdn: false
  };
}

function getSanityRuntimeConfig(): SanityRuntimeConfig {
  return {
    projectId,
    dataset,
    token,
    useCdn: !isServerRuntime
  };
}

export type SanityLessonDocument = {
  _id?: string;
  _ref?: string;
  title?: string;
  module?: { _ref?: string } | SanityModuleDocument | null;
  published?: boolean;
  order?: number;
  streamId?: string;
  youtubeId?: string;
  videoUrl?: string;
  posterUrl?: string;
  provider?: string;
  durationS?: number;
  requiresFullWatch?: boolean;
};

export type SanityModuleDocument = {
  _id?: string;
  _ref?: string;
  title?: string;
  slug?: { current?: string } | null;
  order?: number;
  published?: boolean;
  course?: { _ref?: string } | SanityCourseDocument | null;
  lessons?: SanityLessonDocument[];
};

export type SanityCourseDocument = {
  _id?: string;
  _ref?: string;
  title?: string;
  description?: string;
  slug?: { current?: string } | null;
  order?: number;
  published?: boolean;
  modules?: SanityModuleDocument[];
};

export function getMissingSanityEnvVars(): string[] {
  const missing: string[] = [];
  const { projectId, dataset } = getSanityServerConfig();

  if (!projectId) {
    missing.push("SANITY_PROJECT_ID");
  }

  if (!dataset) {
    missing.push("SANITY_DATASET");
  }

  return missing;
}

function buildSanityClient(): SanityClient {
  const { projectId, dataset, token, useCdn } = getSanityRuntimeConfig();

  if (!projectId) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[sanity] projectId missing; check env (.env.local).");
    }
  }

  if (!projectId || !dataset) {
    const missing = getMissingSanityEnvVars();
    throw new Error(
      `Cannot create Sanity client. Missing env vars: ${missing.join(", ")}`
    );
  }

  return createClient({
    projectId,
    dataset,
    apiVersion: SANITY_API_VERSION,
    useCdn,
    token
  });
}

export function getSanityClient(): SanityClient {
  if (typeof window === "undefined") {
    if (!cachedServerClient) {
      cachedServerClient = buildSanityClient();
    }
    return cachedServerClient;
  }

  return buildSanityClient();
}

function getImageBuilder() {
  if (typeof window === "undefined") {
    if (!cachedServerBuilder) {
      cachedServerBuilder = imageUrlBuilder(getSanityClient());
    }
    return cachedServerBuilder;
  }

  return imageUrlBuilder(getSanityClient());
}

export function urlFor(source: string) {
  return getImageBuilder().image(source);
}

function resolveSanityStudioBaseUrl() {
  const explicit =
    env.SANITY_STUDIO_BASE_URL ??
    env.NEXT_PUBLIC_SANITY_STUDIO_URL ??
    env.SANITY_STUDIO_URL;
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  const { projectId } = getSanityServerConfig();
  if (!projectId) {
    return undefined;
  }

  return `https://${projectId}.sanity.studio`;
}

export function getSanityStudioDocumentUrl(
  docType: string,
  docId: string
): string | undefined {
  if (!docType || !docId) {
    return undefined;
  }

  const baseUrl = resolveSanityStudioBaseUrl();
  if (!baseUrl) {
    return undefined;
  }

  const sanitizedDocId = docId.replace(/^drafts\./, "");
  return `${baseUrl}/desk/${docType};${sanitizedDocId}`;
}

type FetchCoursesOptions = {
  limit?: number;
};

export async function fetchPublishedCourses(
  options: FetchCoursesOptions = {}
): Promise<SanityCourseDocument[]> {
  const client = getSanityClient();
  const sanitizedLimit =
    typeof options.limit === "number" && Number.isFinite(options.limit)
      ? Math.max(0, Math.floor(options.limit))
      : undefined;
  const rangeClause =
    sanitizedLimit !== undefined ? `[0...${sanitizedLimit}]` : "";
  const query = `*[_type == "course"]${rangeClause}{..., modules[]->{..., lessons[]->}}`;
  return client.fetch<SanityCourseDocument[]>(query);
}

type SanityModuleWithRelations = SanityModuleDocument & {
  course?: SanityCourseDocument | null;
  lessons?: (SanityLessonDocument & { module?: unknown })[] | null;
};

type SanityLessonWithRelations = SanityLessonDocument & {
  module?:
    | (SanityModuleDocument & { course?: SanityCourseDocument | null })
    | null;
};

export async function fetchChangedSince(
  sinceISO: string,
  limit?: number
): Promise<SanityCourseDocument[]> {
  const client = getSanityClient();
  const sanitizedLimit =
    typeof limit === "number" && Number.isFinite(limit)
      ? Math.max(0, Math.floor(limit))
      : undefined;
  const range = sanitizedLimit !== undefined ? `[0...${sanitizedLimit}]` : "";
  const query = `
      {
        "courses": *[_type=="course" && _updatedAt > $since]${range}{..., modules[]->{..., lessons[]->}},
        "modules": *[_type=="module" && _updatedAt > $since]${range}{..., course->, lessons[]->},
        "lessons": *[_type=="lesson" && _updatedAt > $since]${range}{..., module->{course->}}
      }
    `;
  const {
    courses = [],
    modules = [],
    lessons = []
  } = await client.fetch<{
    courses?: SanityCourseDocument[];
    modules?: SanityModuleWithRelations[];
    lessons?: SanityLessonWithRelations[];
  }>(query, { since: sinceISO });

  const byCourse = new Map<string, SanityCourseDocument>();
  const getId = (doc: { _id?: string; _ref?: string } | null | undefined) =>
    typeof doc?._id === "string"
      ? doc._id
      : typeof doc?._ref === "string"
        ? doc._ref
        : undefined;

  const dedupeById = <T extends { _id?: string; _ref?: string }>(
    arr: T[]
  ): T[] => {
    const seen = new Set<string>();
    const out: T[] = [];
    for (const item of arr) {
      const id = getId(item);
      if (!id || seen.has(id)) {
        continue;
      }
      seen.add(id);
      out.push(item);
    }
    return out;
  };

  const normalizeLessons = (
    lessonDocs?: (SanityLessonDocument & { module?: unknown })[] | null
  ): SanityLessonDocument[] => {
    if (!Array.isArray(lessonDocs)) {
      return [];
    }
    const sanitized = lessonDocs
      .map((lessonDoc) => {
        if (!lessonDoc) {
          return undefined;
        }
        const { module: _ignoredModule, ...restLesson } = lessonDoc;
        return { ...(restLesson as SanityLessonDocument) };
      })
      .filter((lesson): lesson is SanityLessonDocument => Boolean(lesson));
    return dedupeById(sanitized);
  };

  const sanitizeLesson = (
    lessonDoc: (SanityLessonDocument & { module?: unknown }) | null | undefined
  ): SanityLessonDocument | undefined => {
    const [first] = normalizeLessons(lessonDoc ? [lessonDoc] : []);
    return first;
  };

  const sanitizeModule = (
    moduleDoc: (SanityModuleDocument & { course?: unknown }) | null | undefined
  ): SanityModuleDocument | undefined => {
    if (!moduleDoc) {
      return undefined;
    }
    const {
      course: _ignoredCourse,
      lessons,
      ...restModule
    } = moduleDoc as SanityModuleWithRelations;
    const normalizedLessons = normalizeLessons(lessons ?? null);
    const sanitized: SanityModuleDocument = {
      ...(restModule as SanityModuleDocument)
    };
    if (normalizedLessons.length > 0) {
      sanitized.lessons = normalizedLessons;
    }
    return sanitized;
  };

  const addCourse = (course: SanityCourseDocument) => {
    const id = getId(course);
    if (!id) {
      return;
    }
    const existing = byCourse.get(id);
    const modulesFromCourse = Array.isArray(course.modules)
      ? dedupeById(
          course.modules
            .map((moduleDoc) => sanitizeModule(moduleDoc))
            .filter((moduleDoc): moduleDoc is SanityModuleDocument =>
              Boolean(moduleDoc)
            )
        )
      : [];
    if (existing) {
      const existingModules = Array.isArray(existing.modules)
        ? existing.modules
        : [];
      const mergedModules = dedupeById([
        ...existingModules,
        ...modulesFromCourse
      ]);
      byCourse.set(id, { ...existing, ...course, modules: mergedModules });
    } else {
      byCourse.set(id, { ...course, modules: modulesFromCourse });
    }
  };

  for (const course of courses) {
    addCourse(course);
  }

  for (const moduleDoc of modules) {
    const courseId = getId(moduleDoc?.course);
    if (!courseId) {
      continue;
    }
    const baseCourse = byCourse.get(courseId) ?? {
      _id: courseId,
      title: moduleDoc?.course?.title,
      modules: []
    };
    const sanitizedModule = sanitizeModule(moduleDoc);
    if (!sanitizedModule) {
      byCourse.set(courseId, baseCourse);
      continue;
    }
    const modulesForCourse = Array.isArray(baseCourse.modules)
      ? baseCourse.modules
      : [];
    const mergedModules = dedupeById([...modulesForCourse, sanitizedModule]);
    byCourse.set(courseId, { ...baseCourse, modules: mergedModules });
  }

  for (const lessonDoc of lessons) {
    const moduleRef = lessonDoc?.module;
    const courseRef = moduleRef?.course;
    const courseId = getId(courseRef);
    const moduleId = getId(moduleRef);
    const lessonId = getId(lessonDoc);
    if (!courseId || !moduleId || !lessonId) {
      continue;
    }

    const sanitizedLesson = sanitizeLesson(lessonDoc);
    if (!sanitizedLesson) {
      continue;
    }

    const baseCourse = byCourse.get(courseId) ?? {
      _id: courseId,
      title: courseRef?.title,
      modules: []
    };

    const modulesForCourse = Array.isArray(baseCourse.modules)
      ? baseCourse.modules
      : [];
    const moduleIndex = modulesForCourse.findIndex(
      (moduleEntry) => getId(moduleEntry) === moduleId
    );
    if (moduleIndex === -1) {
      const sanitizedModule = sanitizeModule(
        moduleRef as SanityModuleWithRelations
      ) ?? {
        _id: moduleId,
        lessons: []
      };
      sanitizedModule.lessons = Array.isArray(sanitizedModule.lessons)
        ? dedupeById([...sanitizedModule.lessons, sanitizedLesson])
        : [sanitizedLesson];
      modulesForCourse.push(sanitizedModule);
    } else {
      const moduleEntry = modulesForCourse[moduleIndex];
      const lessonsForModule = Array.isArray(moduleEntry.lessons)
        ? moduleEntry.lessons
        : [];
      const hasLesson = lessonsForModule.some(
        (existingLesson) => getId(existingLesson) === lessonId
      );
      if (!hasLesson) {
        moduleEntry.lessons = dedupeById([
          ...lessonsForModule,
          sanitizedLesson
        ]);
        modulesForCourse[moduleIndex] = moduleEntry;
      }
    }
    const mergedModules = dedupeById(modulesForCourse);
    byCourse.set(courseId, { ...baseCourse, modules: mergedModules });
  }

  return Array.from(byCourse.values());
}
