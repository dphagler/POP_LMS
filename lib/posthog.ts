const PUBLIC_KEY = process.env.POSTHOG_API_KEY ?? process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "";
const HOST =
  process.env.POSTHOG_HOST ?? process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

export type PosthogEvent = {
  event: string;
  distinctId: string;
  properties?: Record<string, unknown>;
};

export async function capturePosthogEvent({ event, distinctId, properties }: PosthogEvent): Promise<void> {
  if (!PUBLIC_KEY || !event || !distinctId) {
    return;
  }

  try {
    await fetch(`${HOST}/capture/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        api_key: PUBLIC_KEY,
        event,
        distinct_id: distinctId,
        properties: {
          source: "server",
          ...properties
        }
      })
    });
  } catch {
    // Best-effort analytics capture; ignore network failures.
  }
}
