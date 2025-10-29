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

function readBooleanEnv(key: string, fallback = false) {
  const value = process.env[key];
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) {
      return true;
    }
    if (["0", "false", "no", "off"].includes(normalized)) {
      return false;
    }
  }
  return fallback;
}

function readNumberEnv(key: string, fallback: number) {
  const value = process.env[key];
  if (typeof value === "string" && value.length > 0) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return fallback;
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
  },
  get AUTH_EMAIL_ENABLED() {
    return readBooleanEnv("AUTH_EMAIL_ENABLED", false);
  },
  get AUTH_EMAIL_FROM() {
    return readOptionalEnv("AUTH_EMAIL_FROM");
  },
  get AUTH_EMAIL_SUBJECT() {
    return readOptionalEnv("AUTH_EMAIL_SUBJECT", "Your POP LMS magic link");
  },
  get AUTH_EMAIL_RATE_LIMIT_WINDOW() {
    return readNumberEnv("AUTH_EMAIL_RATE_LIMIT_WINDOW", 10 * 60);
  },
  get AUTH_EMAIL_RATE_LIMIT_MAX() {
    return readNumberEnv("AUTH_EMAIL_RATE_LIMIT_MAX", 5);
  },
  get AUTH_EMAIL_TOKEN_MAX_AGE() {
    return readNumberEnv("AUTH_EMAIL_TOKEN_MAX_AGE", 10 * 60);
  },
  get authEmailEnabled(): boolean {
    return (
      this.AUTH_EMAIL_ENABLED &&
      Boolean(this.RESEND_API_KEY) &&
      Boolean(this.AUTH_EMAIL_FROM)
    );
  },
  get STREAM_WEBHOOK_SECRET() {
    return readOptionalEnv("STREAM_WEBHOOK_SECRET", "stream_webhook_secret_placeholder");
  },
  get NEXT_PUBLIC_TELEMETRY_DEBUG() {
    return readBooleanEnv("NEXT_PUBLIC_TELEMETRY_DEBUG", false);
  },
  get NEXT_PUBLIC_POSTHOG_KEY() {
    return readOptionalEnv("NEXT_PUBLIC_POSTHOG_KEY");
  },
  get NEXT_PUBLIC_POSTHOG_HOST() {
    return readOptionalEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://us.i.posthog.com");
  },
  get POSTHOG_SERVER_KEY() {
    return readOptionalEnv("POSTHOG_SERVER_KEY");
  },
  get NEXT_PUBLIC_VIDEO_PROVIDER_DEFAULT() {
    return readOptionalEnv("NEXT_PUBLIC_VIDEO_PROVIDER_DEFAULT", "youtube");
  },
  get STREAM_ENABLED() {
    return readBooleanEnv("STREAM_ENABLED", false);
  },
};
