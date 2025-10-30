"use client";

import { publicEnv } from "@/lib/env.client";

const HOST = publicEnv.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
const KEY = publicEnv.NEXT_PUBLIC_POSTHOG_KEY ?? "";
const STORAGE_KEY = "pop-posthog-anonymous-id";

function getAnonymousId(): string {
  if (typeof window === "undefined") {
    return "anonymous";
  }

  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) {
      return existing;
    }

    const nextId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36);
    window.localStorage.setItem(STORAGE_KEY, nextId);
    return nextId;
  } catch {
    return "anonymous";
  }
}

export async function dispatchPosthogCapture(event: string, properties: Record<string, unknown>): Promise<void> {
  if (!KEY || !event) {
    return;
  }

  try {
    await fetch(`${HOST}/capture/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        api_key: KEY,
        event,
        distinct_id: getAnonymousId(),
        properties: {
          source: "client.error",
          ...properties
        }
      })
    });
  } catch {
    // Swallow network failures; telemetry is best-effort only.
  }
}
