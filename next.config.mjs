/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { domains: ["i.ytimg.com"] },
  env: {
    NEXT_PUBLIC_SANITY_API_VERSION:
      process.env.NEXT_PUBLIC_SANITY_API_VERSION ??
      process.env.SANITY_STUDIO_API_VERSION ??
      "2025-10-21",
    NEXT_PUBLIC_SANITY_DATASET:
      process.env.NEXT_PUBLIC_SANITY_DATASET ??
      process.env.SANITY_STUDIO_DATASET ??
      process.env.SANITY_DATASET ??
      "production",
    NEXT_PUBLIC_SANITY_PROJECT_ID:
      process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ??
      process.env.SANITY_STUDIO_PROJECT_ID ??
      process.env.SANITY_PROJECT_ID ??
      "",
  },
};

export default nextConfig;
