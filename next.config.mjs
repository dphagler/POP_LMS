if (process.env.VERCEL_ENV === "production" && process.env.SKIP_ENV_VALIDATION !== "1") {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require("./scripts/validate-env");
}

const resolvedSanityProjectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ??
  process.env.SANITY_STUDIO_PROJECT_ID ??
  process.env.SANITY_PROJECT_ID ??
  "sanity-demo";

const resolvedSanityDataset =
  process.env.NEXT_PUBLIC_SANITY_DATASET ??
  process.env.SANITY_STUDIO_DATASET ??
  process.env.SANITY_DATASET ??
  "production";

const resolvedSanityApiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION ??
  process.env.SANITY_STUDIO_API_VERSION ??
  "2025-10-21";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { domains: ["i.ytimg.com"] },
  env: {
    NEXT_PUBLIC_SANITY_API_VERSION: resolvedSanityApiVersion,
    NEXT_PUBLIC_SANITY_DATASET: resolvedSanityDataset,
    NEXT_PUBLIC_SANITY_PROJECT_ID: resolvedSanityProjectId,
  },
};

export default nextConfig;
