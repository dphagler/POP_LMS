const sanityProjectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ??
  process.env.SANITY_STUDIO_PROJECT_ID ??
  process.env.SANITY_PROJECT_ID;

const sanityDataset =
  process.env.NEXT_PUBLIC_SANITY_DATASET ??
  process.env.SANITY_STUDIO_DATASET ??
  process.env.SANITY_DATASET;

const isDevelopment = process.env.NODE_ENV !== "production";

let resolvedSanityProjectId = sanityProjectId;
let resolvedSanityDataset = sanityDataset;

if (!resolvedSanityProjectId || !resolvedSanityDataset) {
  const missingVars = [
    !resolvedSanityProjectId ? "NEXT_PUBLIC_SANITY_PROJECT_ID" : null,
    !resolvedSanityDataset ? "NEXT_PUBLIC_SANITY_DATASET" : null,
  ]
    .filter(Boolean)
    .join(" and ");

  console.warn(
    `[sanity] Missing required environment variable(s): ${missingVars}.`
  );

  if (isDevelopment) {
    resolvedSanityProjectId = resolvedSanityProjectId ?? "dkstzfb9";
    resolvedSanityDataset = resolvedSanityDataset ?? "production";
    console.warn(
      "[sanity] Falling back to development defaults for missing variables."
    );
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { domains: ["i.ytimg.com"] },
  env: {
    NEXT_PUBLIC_SANITY_API_VERSION:
      process.env.NEXT_PUBLIC_SANITY_API_VERSION ??
      process.env.SANITY_STUDIO_API_VERSION ??
      "2025-10-21",
    NEXT_PUBLIC_SANITY_DATASET: resolvedSanityDataset,
    NEXT_PUBLIC_SANITY_PROJECT_ID: resolvedSanityProjectId,
  },
};

export default nextConfig;
