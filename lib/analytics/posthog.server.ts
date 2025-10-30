import crypto from "node:crypto";

import { env } from "@/lib/env";

export type ServerCaptureIdentity = {
  userId: string;
  email?: string | null;
  orgId?: string | null;
  role?: string | null;
};

const DEFAULT_HOST = "https://us.i.posthog.com";

function resolveHost(): string {
  return env.NEXT_PUBLIC_POSTHOG_HOST ?? DEFAULT_HOST;
}

function computeEmailHash(email: string): string {
  return crypto.createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

export async function serverCapture(
  event: string,
  properties: Record<string, unknown> | undefined,
  identity?: ServerCaptureIdentity,
): Promise<void> {
  const apiKey = env.POSTHOG_SERVER_KEY ?? env.NEXT_PUBLIC_POSTHOG_KEY;

  if (!apiKey || !event) {
    return;
  }

  const distinctId = identity?.userId;

  if (!distinctId) {
    return;
  }

  const eventProperties: Record<string, unknown> = {
    ...(properties ?? {}),
    userId: distinctId,
  };

  const personProps: Record<string, unknown> = {};

  if (identity?.orgId) {
    eventProperties.orgId = identity.orgId;
    personProps.orgId = identity.orgId;
  }

  if (identity?.role) {
    eventProperties.role = identity.role;
    personProps.role = identity.role;
  }

  if (identity?.email) {
    const normalizedEmail = identity.email.trim();

    if (normalizedEmail) {
      const hash = computeEmailHash(normalizedEmail);
      eventProperties.email = normalizedEmail;
      eventProperties.emailHash = hash;
      personProps.email = normalizedEmail;
      personProps.emailHash = hash;
    }
  }

  const payload: Record<string, unknown> = {
    api_key: apiKey,
    event,
    distinct_id: distinctId,
    properties: eventProperties,
  };

  if (Object.keys(personProps).length > 0) {
    payload.$set = personProps;
  }

  try {
    await fetch(`${resolveHost()}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch (error) {
    if (env.telemetryDebugEnabled) {
      console.warn("Failed to capture PostHog event", { event, error });
    }
  }
}
