import { z } from "zod";

const booleanFlag = z.enum(["true", "false"]);
const telemetryFlag = z.enum(["1", "true", "0", "false"]).default("0");
const videoProvider = z.enum(["youtube", "cloudflare"]).default("youtube");
const heartbeatFlag = z.enum(["1", "0"]).default("0");

export const ServerEnv = z.object({
  NODE_ENV: z.string().default("development"),
  DATABASE_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(16).optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  AUTH_EMAIL_ENABLED: booleanFlag.default("false"),
  RESEND_API_KEY: z.string().optional(),
  AUTH_EMAIL_FROM: z.string().email().optional(),
  AUTH_EMAIL_SUBJECT: z.string().default("Your POP LMS magic link"),
  AUTH_EMAIL_RATE_LIMIT_WINDOW: z.coerce
    .number()
    .int()
    .positive()
    .default(10 * 60),
  AUTH_EMAIL_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  AUTH_EMAIL_TOKEN_MAX_AGE: z.coerce
    .number()
    .int()
    .positive()
    .default(10 * 60),
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
  NEXT_PUBLIC_AUGMENT_ENABLE: telemetryFlag,
  LESSON_COMPLETE_PCT: z.string().default("0.92"),
  STREAM_ENABLED: booleanFlag.default("false"),
  STREAM_WEBHOOK_SECRET: z.string().optional(),
  DEFAULT_ORG_NAME: z.string().default("POP Initiative"),
  LOG_HEARTBEAT: heartbeatFlag,
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  SERVICE_NAME: z.string().default("pop-lms"),
  AUGMENT_ENABLE: booleanFlag.default("false"),
  MODEL_API_KEY: z.string().optional(),
  AUGMENT_MAX_PER_HOUR: z.string().default("3"),
  FEATURE_CHAT_PROBE_MOCK_RUBRIC: z.string().optional(),
  LEAVE_ENROLLMENTS: z.string().optional(),
  APP_BASE_URL: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  VERCEL_URL: z.string().optional(),
  AUTH_URL: z.string().url().optional(),
  ALLOW_EMAIL_IN_PROMPTS: telemetryFlag
});

const rawEnv = ServerEnv.parse(process.env);

const isTruthyFlag = (value: string | undefined) => {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return (
    normalized === "1" ||
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "on"
  );
};

const parsedLessonCompletionPct = (() => {
  const parsed = Number.parseFloat(rawEnv.LESSON_COMPLETE_PCT);
  if (!Number.isFinite(parsed)) {
    return 0.92;
  }
  return Math.min(Math.max(parsed, 0), 1);
})();

const resolvedDatabaseUrl =
  rawEnv.DATABASE_URL ??
  (rawEnv.NODE_ENV === "production"
    ? undefined
    : "postgres://localhost:5432/postgres");

const resolvedNextAuthSecret =
  rawEnv.NEXTAUTH_SECRET ??
  (rawEnv.NODE_ENV === "production"
    ? undefined
    : "development_secret_value_please_change");

export const env = {
  ...rawEnv,
  DATABASE_URL: resolvedDatabaseUrl,
  NEXTAUTH_SECRET: resolvedNextAuthSecret,
  authEmailEnabled: rawEnv.AUTH_EMAIL_ENABLED === "true",
  streamEnabled: rawEnv.STREAM_ENABLED === "true",
  telemetryDebugEnabled: isTruthyFlag(rawEnv.NEXT_PUBLIC_TELEMETRY_DEBUG),
  logHeartbeatEnabled: rawEnv.LOG_HEARTBEAT === "1",
  lessonCompletionRatio: parsedLessonCompletionPct,
  allowEmailInPrompts: isTruthyFlag(rawEnv.ALLOW_EMAIL_IN_PROMPTS)
} as const;

export type ServerEnv = typeof env;
