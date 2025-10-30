import { loadServerEnv, serverEnvSchema } from "./env-config.mjs";

const rawEnv = loadServerEnv(process.env);

const isTruthyFlag = (value: string | undefined) => {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
};

const isStreamEnabled = rawEnv.STREAM_ENABLED === "true";
const telemetryDebugEnabled = isTruthyFlag(rawEnv.NEXT_PUBLIC_TELEMETRY_DEBUG);
const authEmailEnabled = rawEnv.AUTH_EMAIL_ENABLED === "true";
const logHeartbeatEnabled = rawEnv.LOG_HEARTBEAT === "1";

const parsedLessonCompletionPct = (() => {
  const parsed = Number.parseFloat(rawEnv.LESSON_COMPLETE_PCT);
  if (!Number.isFinite(parsed)) {
    return 0.92;
  }
  return Math.min(Math.max(parsed, 0), 1);
})();

export const env = {
  ...rawEnv,
  authEmailEnabled,
  streamEnabled: isStreamEnabled,
  telemetryDebugEnabled,
  logHeartbeatEnabled,
  lessonCompletionRatio: parsedLessonCompletionPct,
} as const;

export const ServerEnv = serverEnvSchema;
export type ServerEnv = typeof env;
