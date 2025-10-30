import { ZodError } from 'zod';

import { loadServerEnv } from './lib/env-config.mjs';

function formatEnvError(error) {
  if (error instanceof ZodError) {
    return error.issues
      .map((issue) => {
        const path = issue.path.join('.') || '<root>';
        return `${path}: ${issue.message}`;
      })
      .join('; ');
  }

  return error instanceof Error ? error.message : String(error);
}

let serverEnv;
try {
  serverEnv = loadServerEnv(process.env);
} catch (error) {
  const details = formatEnvError(error);
  throw new Error(`Environment validation failed: ${details}`);
}

const isProductionBuild =
  serverEnv.NODE_ENV === 'production' && process.argv.some((arg) => arg.includes('build'));

if (isProductionBuild) {
  const requiredInProduction = ['DATABASE_URL', 'NEXTAUTH_SECRET'];
  const missing = requiredInProduction.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Environment validation failed: set ${missing.join(', ')} before building in production`,
    );
  }
}

const resolvedSanityProjectId =
  serverEnv.NEXT_PUBLIC_SANITY_PROJECT_ID ??
  serverEnv.SANITY_STUDIO_PROJECT_ID ??
  serverEnv.SANITY_PROJECT_ID;

const resolvedSanityDataset =
  serverEnv.NEXT_PUBLIC_SANITY_DATASET ??
  serverEnv.SANITY_STUDIO_DATASET ??
  serverEnv.SANITY_DATASET;

const resolvedSanityApiVersion =
  serverEnv.NEXT_PUBLIC_SANITY_API_VERSION ??
  serverEnv.SANITY_STUDIO_API_VERSION ??
  '2025-10-21';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { domains: ['i.ytimg.com'] },
  env: {
    NEXT_PUBLIC_SANITY_API_VERSION: resolvedSanityApiVersion,
    NEXT_PUBLIC_SANITY_DATASET: resolvedSanityDataset,
    NEXT_PUBLIC_SANITY_PROJECT_ID: resolvedSanityProjectId,
  },
};

export default nextConfig;
