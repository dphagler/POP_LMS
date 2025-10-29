import { createClient } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";

const SANITY_API_VERSION = "2024-08-01";

type SanityClient = ReturnType<typeof createClient>;

let cachedClient: SanityClient | null = null;
let cachedBuilder: ReturnType<typeof imageUrlBuilder> | null = null;

export type SanityLessonDocument = {
  _id?: string;
  _ref?: string;
  title?: string;
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
  order?: number;
  lessons?: SanityLessonDocument[];
};

export type SanityCourseDocument = {
  _id?: string;
  _ref?: string;
  title?: string;
  description?: string;
  modules?: SanityModuleDocument[];
};

function getSanityConfig() {
  return {
    projectId: process.env.SANITY_PROJECT_ID,
    dataset: process.env.SANITY_DATASET,
    token: process.env.SANITY_READ_TOKEN
  };
}

export function getMissingSanityEnvVars(): string[] {
  const missing: string[] = [];
  const { projectId, dataset } = getSanityConfig();

  if (!projectId) {
    missing.push("SANITY_PROJECT_ID");
  }

  if (!dataset) {
    missing.push("SANITY_DATASET");
  }

  return missing;
}

function buildSanityClient(): SanityClient {
  const { projectId, dataset, token } = getSanityConfig();
  if (!projectId || !dataset) {
    const missing = getMissingSanityEnvVars();
    throw new Error(`Cannot create Sanity client. Missing env vars: ${missing.join(", ")}`);
  }

  return createClient({
    projectId,
    dataset,
    apiVersion: SANITY_API_VERSION,
    useCdn: false,
    token
  });
}

export function getSanityClient(): SanityClient {
  if (!cachedClient) {
    cachedClient = buildSanityClient();
  }
  return cachedClient;
}

function getImageBuilder() {
  if (!cachedBuilder) {
    cachedBuilder = imageUrlBuilder(getSanityClient());
  }
  return cachedBuilder;
}

export function urlFor(source: string) {
  return getImageBuilder().image(source);
}

function resolveSanityStudioBaseUrl() {
  const explicit =
    process.env.SANITY_STUDIO_BASE_URL ??
    process.env.NEXT_PUBLIC_SANITY_STUDIO_URL ??
    process.env.SANITY_STUDIO_URL;
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  const { projectId } = getSanityConfig();
  if (!projectId) {
    return undefined;
  }

  return `https://${projectId}.sanity.studio`;
}

export function getSanityStudioDocumentUrl(docType: string, docId: string): string | undefined {
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
  const rangeClause = sanitizedLimit !== undefined ? `[0...${sanitizedLimit}]` : "";
  const query = `*[_type == "course"]${rangeClause}{..., modules[]->{..., lessons[]->}}`;
  return client.fetch<SanityCourseDocument[]>(query);
}
