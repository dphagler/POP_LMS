import { loadClientEnv, clientEnvSchema } from "./env-config.mjs";

const rawEnv = loadClientEnv(process.env);

const isTruthyFlag = (value: string | undefined) => {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
};

export const publicEnv = {
  ...rawEnv,
  telemetryDebugEnabled: isTruthyFlag(rawEnv.NEXT_PUBLIC_TELEMETRY_DEBUG),
} as const;

export const ClientEnv = clientEnvSchema;
export type ClientEnv = typeof publicEnv;
