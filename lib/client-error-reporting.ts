// lib/client-error-reporting.ts
export function reportClientEvent(event: string, payload: Record<string, unknown> = {}) {
  if (typeof window === "undefined") {
    return;
  }

  const posthog = (window as typeof window & { posthog?: { capture?: (name: string, data?: Record<string, unknown>) => void } }).posthog;
  if (posthog?.capture) {
    posthog.capture(event, payload);
  }
}

export function reportClientError(event: string, error: unknown, payload: Record<string, unknown> = {}) {
  const basePayload: Record<string, unknown> = {
    ...payload,
    message: error instanceof Error ? error.message : String(error)
  };

  reportClientEvent(event, basePayload);
}
