import { z } from "zod";

const booleanFlag = z.enum(["true", "false"]);
const telemetryFlag = z.enum(["1", "true", "0", "false"]).default("0");
const videoProvider = z.enum(["youtube", "cloudflare"]).default("youtube");
const heartbeatFlag = z.enum(["1", "0"]).default("0");

export const serverEnvSchema = z.object({
  NODE_ENV: z.string().default("development"),
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z
    .string()
    .min(16)
    .default("development_secret_value_please_change"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  AUTH_EMAIL_ENABLED: booleanFlag.default("false"),
  RESEND_API_KEY: z.string().optional(),
  AUTH_EMAIL_FROM: z.string().email().optional(),
  AUTH_EMAIL_SUBJECT: z.string().default("Your POP LMS magic link"),
  AUTH_EMAIL_RATE_LIMIT_WINDOW: z.coerce.number().int().positive().default(10 * 60),
  AUTH_EMAIL_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  AUTH_EMAIL_TOKEN_MAX_AGE: z.coerce.number().int().positive().default(10 * 60),
  DATABASE_URL: z.string().url().default("postgres://localhost:5432/postgres"),
  SHADOW_DATABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SANITY_PROJECT_ID: z.string().min(1).default("sanity-demo"),
  NEXT_PUBLIC_SANITY_DATASET: z.string().min(1).default("production"),
  NEXT_PUBLIC_SANITY_API_VERSION: z.string().default("2025-10-21"),
  NEXT_PUBLIC_SANITY_STUDIO_URL: z.string().url().optional(),
  SANITY_PROJECT_ID: z.string().optional(),
  SANITY_DATASET: z.string().optional(),
  SANITY_READ_TOKEN: z.string().optional(),
  SANITY_STUDIO_BASE_URL: z.string().url().optional(),
  SANITY_STUDIO_URL: z.string().url().optional(),
  SANITY_STUDIO_PROJECT_ID: z.string().optional(),
  SANITY_STUDIO_DATASET: z.string().optional(),
  SANITY_STUDIO_API_VERSION: z.string().optional(),
  SANITY_DEPLOY_STUDIO_TOKEN: z.string().optional(),
  SANITY_MANAGEMENT_TOKEN: z.string().optional(),
  SANITY_MANAGE_TOKEN: z.string().optional(),
  SANITY_DEV_CORS_ORIGINS: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
  POSTHOG_SERVER_KEY: z.string().optional(),
  NEXT_PUBLIC_VIDEO_PROVIDER_DEFAULT: videoProvider,
  NEXT_PUBLIC_TELEMETRY_DEBUG: telemetryFlag,
  LESSON_COMPLETE_PCT: z.string().default("0.92"),
  STREAM_ENABLED: booleanFlag.default("false"),
  STREAM_WEBHOOK_SECRET: z.string().optional(),
  DEFAULT_ORG_NAME: z.string().default("POP Initiative"),
  LOG_HEARTBEAT: heartbeatFlag,
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  SERVICE_NAME: z.string().default("pop-lms"),
  FEATURE_CHAT_PROBE_MOCK_RUBRIC: z.string().optional(),
  LEAVE_ENROLLMENTS: z.string().optional(),
  APP_BASE_URL: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  VERCEL_URL: z.string().optional(),
  AUTH_URL: z.string().url().optional(),
});

export const clientEnvSchema = z.object({
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
  NEXT_PUBLIC_VIDEO_PROVIDER_DEFAULT: videoProvider,
  NEXT_PUBLIC_TELEMETRY_DEBUG: telemetryFlag,
  NEXT_PUBLIC_SANITY_PROJECT_ID: z.string().min(1).default("sanity-demo"),
  NEXT_PUBLIC_SANITY_DATASET: z.string().min(1).default("production"),
  NEXT_PUBLIC_SANITY_STUDIO_URL: z.string().url().optional(),
});

export function loadServerEnv(raw = process.env) {
  return serverEnvSchema.parse(raw);
}

export function loadClientEnv(raw = process.env) {
  return clientEnvSchema.parse({
    NEXT_PUBLIC_POSTHOG_KEY: raw.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: raw.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_VIDEO_PROVIDER_DEFAULT: raw.NEXT_PUBLIC_VIDEO_PROVIDER_DEFAULT,
    NEXT_PUBLIC_TELEMETRY_DEBUG: raw.NEXT_PUBLIC_TELEMETRY_DEBUG,
    NEXT_PUBLIC_SANITY_PROJECT_ID: raw.NEXT_PUBLIC_SANITY_PROJECT_ID,
    NEXT_PUBLIC_SANITY_DATASET: raw.NEXT_PUBLIC_SANITY_DATASET,
    NEXT_PUBLIC_SANITY_STUDIO_URL: raw.NEXT_PUBLIC_SANITY_STUDIO_URL,
  });
}

