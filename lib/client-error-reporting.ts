"use client";

import { publicEnv } from "@/lib/env.client";

type ClientErrorContext = {
  event?: string;
  properties?: Record<string, unknown>;
};

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const BEARER_REGEX = /bearer\s+[A-Z0-9._~+\/-]+/gi;
const ABSOLUTE_URL_REGEX = /https?:\/\/[^\s)]+/gi;
const RELATIVE_URL_WITH_QUERY_REGEX = /\b\/?[^\s?]+\?[^\s)]+/gi;

let dispatcherPromise: Promise<typeof import("./posthog-dispatcher") | null> | null = null;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function scrubUrl(url: string): string {
  try {
    const parsed = new URL(url, typeof window !== "undefined" ? window.location.origin : undefined);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return url.split("?")[0] ?? url;
  }
}

function scrubString(value: string): string {
  let result = value.replace(EMAIL_REGEX, "[email]");
  result = result.replace(BEARER_REGEX, "Bearer [redacted]");
  result = result.replace(ABSOLUTE_URL_REGEX, (match) => scrubUrl(match));
  result = result.replace(RELATIVE_URL_WITH_QUERY_REGEX, (match) => scrubUrl(match));
  return result;
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    return scrubString(value);
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (isPlainObject(value)) {
    return sanitizeProperties(value);
  }
  return value;
}

function sanitizeProperties(value: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === "undefined") continue;
    result[key] = sanitizeValue(raw);
  }
  return result;
}

function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  const message = typeof error === "string" ? error : JSON.stringify(error);
  return new Error(message);
}

function shouldSample(): boolean {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }
  return Math.random() < 0.25;
}

async function loadDispatcher() {
  if (!dispatcherPromise) {
    dispatcherPromise = import("./posthog-dispatcher").catch(() => null);
  }
  return dispatcherPromise;
}

export function captureError(error: unknown, context: ClientErrorContext = {}): void {
  if (typeof window === "undefined") {
    return;
  }

  if (!publicEnv.NEXT_PUBLIC_POSTHOG_KEY) {
    return;
  }

  if (!shouldSample()) {
    return;
  }

  const normalized = normalizeError(error);
  const event = context.event ?? "client.error";
  const baseProperties: Record<string, unknown> = {
    name: normalized.name,
    message: scrubString(normalized.message ?? "Unknown error"),
    stack: normalized.stack ? scrubString(normalized.stack) : undefined,
    url: typeof window !== "undefined" ? scrubUrl(window.location.href) : undefined,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined
  };

  const userProperties = context.properties ? sanitizeProperties(context.properties) : {};
  const properties = sanitizeProperties({ ...userProperties, ...baseProperties });

  void loadDispatcher().then((mod) => {
    if (!mod?.dispatchPosthogCapture) return;
    void mod.dispatchPosthogCapture(event, properties);
  });
}
