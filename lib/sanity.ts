import { createClient } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";

const SANITY_API_VERSION = "2024-08-01";

type SanityClient = ReturnType<typeof createClient>;

let cachedClient: SanityClient | null = null;
let cachedBuilder: ReturnType<typeof imageUrlBuilder> | null = null;

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

type FetchCoursesOptions = {
  limit?: number;
};

export async function fetchPublishedCourses(options: FetchCoursesOptions = {}) {
  const client = getSanityClient();
  const sanitizedLimit =
    typeof options.limit === "number" && Number.isFinite(options.limit)
      ? Math.max(0, Math.floor(options.limit))
      : undefined;
  const rangeClause = sanitizedLimit !== undefined ? `[0...${sanitizedLimit}]` : "";
  const query = `*[_type == "course"]${rangeClause}{..., modules[]->{..., lessons[]->}}`;
  return client.fetch(query);
}
