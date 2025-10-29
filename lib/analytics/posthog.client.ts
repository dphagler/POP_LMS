import { env } from "@/lib/env";

type PosthogClientHandle = {
  capture: (event: string, properties?: Record<string, unknown>) => void;
  identify: (distinctId: string, properties?: Record<string, unknown>) => void;
  register?: (properties: Record<string, unknown>) => void;
};

export type { PosthogClientHandle };

type PosthogIdentity = {
  userId: string;
  email?: string | null;
  orgId?: string | null;
  role?: string | null;
};

export type { PosthogIdentity };

type PosthogInitResult = {
  client: PosthogClientHandle;
  emailHash?: string | null;
};

export type { PosthogInitResult };

declare global {
  interface Window {
    posthog?: PosthogClientHandle & {
      __loaded?: boolean;
    };
  }
}

const emailHashCache = new Map<string, string>();
let loadPromise: Promise<PosthogClientHandle | null> | null = null;
let lastIdentitySnapshot: string | null = null;

function logDebug(message: string, ...args: unknown[]) {
  if (env.NEXT_PUBLIC_TELEMETRY_DEBUG) {
    console.debug(`[posthog] ${message}`, ...args);
  }
}

function resolveClient(): PosthogClientHandle | null {
  if (typeof window === "undefined") {
    return null;
  }

  const client = window.posthog;
  if (client && typeof client.capture === "function" && typeof client.identify === "function") {
    return client;
  }

  return null;
}

async function waitForClient(): Promise<PosthogClientHandle | null> {
  if (loadPromise) {
    return loadPromise;
  }

  if (!env.NEXT_PUBLIC_POSTHOG_KEY) {
    return null;
  }

  loadPromise = new Promise((resolve) => {
    const maxAttempts = 50;
    let attempts = 0;

    const check = () => {
      const client = resolveClient();
      if (client) {
        resolve(client);
        return;
      }

      if (attempts >= maxAttempts) {
        resolve(null);
        return;
      }

      attempts += 1;
      setTimeout(check, 100);
    };

    check();
  });

  const result = await loadPromise;

  if (!result) {
    loadPromise = null;
    logDebug("PostHog client failed to load");
  }

  return result;
}

async function hashEmail(email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  const cached = emailHashCache.get(normalized);
  if (cached) {
    return cached;
  }

  if (typeof window === "undefined" || !window.crypto?.subtle) {
    return null;
  }

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(normalized);
    const digest = await window.crypto.subtle.digest("SHA-256", data);
    const hash = Array.from(new Uint8Array(digest))
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");

    emailHashCache.set(normalized, hash);
    return hash;
  } catch (error) {
    logDebug("Failed to hash email", error);
    return null;
  }
}

export async function initPosthogClient(identity?: PosthogIdentity): Promise<PosthogInitResult | null> {
  if (!env.NEXT_PUBLIC_POSTHOG_KEY) {
    return null;
  }

  const client = resolveClient() ?? (await waitForClient());

  if (!client) {
    return null;
  }

  if (!identity?.userId) {
    return { client };
  }

  const registerProps: Record<string, unknown> = {};
  const identifyProps: Record<string, unknown> = {};

  if (identity.orgId) {
    identifyProps.orgId = identity.orgId;
    registerProps.orgId = identity.orgId;
  }

  if (identity.role) {
    identifyProps.role = identity.role;
    registerProps.role = identity.role;
  }

  let emailHash: string | null = null;

  if (identity.email) {
    const normalizedEmail = identity.email.trim();
    emailHash = await hashEmail(identity.email);
    if (emailHash && normalizedEmail) {
      identifyProps.email = normalizedEmail;
      identifyProps.emailHash = emailHash;
    }
  }

  const identitySnapshot = JSON.stringify({ userId: identity.userId, ...identifyProps });

  if (identitySnapshot !== lastIdentitySnapshot) {
    try {
      client.identify(identity.userId, identifyProps);
      lastIdentitySnapshot = identitySnapshot;
    } catch (error) {
      logDebug("Failed to identify user", error);
    }
  }

  if (Object.keys(registerProps).length > 0 && typeof client.register === "function") {
    try {
      client.register(registerProps);
    } catch (error) {
      logDebug("Failed to register properties", error);
    }
  }

  return { client, emailHash };
}

export async function getPosthogClient(): Promise<PosthogClientHandle | null> {
  if (!env.NEXT_PUBLIC_POSTHOG_KEY) {
    return null;
  }

  const client = resolveClient();
  if (client) {
    return client;
  }

  return waitForClient();
}
