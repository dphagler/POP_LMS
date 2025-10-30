import { z } from "zod";

const telemetryFlag = z.enum(["1", "true", "0", "false"]).default("0");
const videoProvider = z.enum(["youtube", "cloudflare"]).default("youtube");

export const ClientEnvSchema = z.object({
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
  NEXT_PUBLIC_VIDEO_PROVIDER_DEFAULT: videoProvider,
  NEXT_PUBLIC_TELEMETRY_DEBUG: telemetryFlag,
  NEXT_PUBLIC_SANITY_PROJECT_ID: z.string().min(1).default("sanity-demo"),
  NEXT_PUBLIC_SANITY_DATASET: z.string().min(1).default("production"),
  NEXT_PUBLIC_SANITY_STUDIO_URL: z.string().url().optional(),
});

const rawEnv = ClientEnvSchema.parse({
  NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  NEXT_PUBLIC_VIDEO_PROVIDER_DEFAULT: process.env.NEXT_PUBLIC_VIDEO_PROVIDER_DEFAULT,
  NEXT_PUBLIC_TELEMETRY_DEBUG: process.env.NEXT_PUBLIC_TELEMETRY_DEBUG,
  NEXT_PUBLIC_SANITY_PROJECT_ID: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  NEXT_PUBLIC_SANITY_DATASET: process.env.NEXT_PUBLIC_SANITY_DATASET,
  NEXT_PUBLIC_SANITY_STUDIO_URL: process.env.NEXT_PUBLIC_SANITY_STUDIO_URL,
});

const isTruthyFlag = (value: string | undefined) => {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
};

export const publicEnv = {
  ...rawEnv,
  telemetryDebugEnabled: isTruthyFlag(rawEnv.NEXT_PUBLIC_TELEMETRY_DEBUG),
} as const;

export type ClientEnv = typeof publicEnv;
