const isProduction = process.env.NODE_ENV === "production";

function readOptionalEnv(key: string, fallback?: string) {
  const value = process.env[key];
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  return fallback;
}

function readRequiredEnv(key: string) {
  const value = process.env[key];
  if (value) {
    return value;
  }
  throw new Error(`Missing required environment variable ${key}`);
}

export const env = {
  get NEXTAUTH_SECRET() {
    return isProduction
      ? readRequiredEnv("NEXTAUTH_SECRET")
      : readOptionalEnv("NEXTAUTH_SECRET", "development_secret");
  },
  get GOOGLE_CLIENT_ID() {
    return isProduction ? readRequiredEnv("GOOGLE_CLIENT_ID") : readOptionalEnv("GOOGLE_CLIENT_ID", "");
  },
  get GOOGLE_CLIENT_SECRET() {
    return isProduction
      ? readRequiredEnv("GOOGLE_CLIENT_SECRET")
      : readOptionalEnv("GOOGLE_CLIENT_SECRET", "");
  },
  get NEXTAUTH_URL() {
    return readOptionalEnv("NEXTAUTH_URL");
  },
  get DATABASE_URL() {
    return isProduction ? readRequiredEnv("DATABASE_URL") : readOptionalEnv("DATABASE_URL");
  },
  get SANITY_PROJECT_ID() {
    return readOptionalEnv("SANITY_PROJECT_ID");
  },
  get SANITY_DATASET() {
    return readOptionalEnv("SANITY_DATASET", "production");
  },
  get SANITY_READ_TOKEN() {
    return readOptionalEnv("SANITY_READ_TOKEN");
  },
  get UPSTASH_REDIS_REST_URL() {
    return readOptionalEnv("UPSTASH_REDIS_REST_URL");
  },
  get UPSTASH_REDIS_REST_TOKEN() {
    return readOptionalEnv("UPSTASH_REDIS_REST_TOKEN");
  },
  get RESEND_API_KEY() {
    return readOptionalEnv("RESEND_API_KEY");
  }
};
