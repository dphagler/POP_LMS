import { env } from "@/lib/env";

export type VideoProviderName = "youtube" | "cloudflare";

export interface TelemetrySink {
  start(): void;
  stop(): void;
}

type YouTubeSinkOptions = {
  lessonId: string;
  videoId: string;
  getPlayerTime: () => number;
  getDuration: () => number;
};

const DEBUG =
  process.env.NEXT_PUBLIC_TELEMETRY_DEBUG === "1" ||
  process.env.NEXT_PUBLIC_TELEMETRY_DEBUG === "true";

const noopSink: TelemetrySink = {
  start() {
    // noop
  },
  stop() {
    // noop
  },
};

function isClient(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

export function createYouTubeSink({
  lessonId,
  videoId,
  getPlayerTime,
  getDuration,
}: YouTubeSinkOptions): TelemetrySink {
  if (!isClient() || !lessonId || !videoId) {
    return noopSink;
  }

  let timer: ReturnType<typeof setInterval> | null = null;
  let lastSent = -1;

  const tick = async () => {
    const t = Math.floor(getPlayerTime?.() ?? 0);
    if (t <= 0 || t === lastSent) {
      return;
    }

    lastSent = t;
    const body = {
      lessonId,
      provider: "youtube" as const,
      t,
      videoId,
      duration: Math.floor(getDuration?.() ?? 0),
    };

    DEBUG && console.warn("[telemetry] heartbeat →", body);

    try {
      const res = await fetch("/api/progress/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "same-origin",
      });
      const json = await res.json();
      DEBUG && console.warn("[telemetry] heartbeat ←", json);
    } catch (error) {
      DEBUG && console.warn("[telemetry] heartbeat error", error);
    }
  };

  const start = () => {
    if (timer) {
      return;
    }

    timer = setInterval(tick, 2000);
    DEBUG && console.warn("[telemetry] sink start");
  };

  const stop = () => {
    if (!timer) {
      return;
    }

    clearInterval(timer);
    timer = null;
    DEBUG && console.warn("[telemetry] sink stop");
  };

  if (DEBUG) {
    (window as any).__telemetry ||= {};
    (window as any).__telemetry.forceTick = tick;
  }

  return { start, stop };
}

type CloudflareSinkOptions = Record<string, never>;

export function createCloudflareSink(_: CloudflareSinkOptions = {}): TelemetrySink {
  if (!env.STREAM_ENABLED) {
    return noopSink;
  }

  DEBUG && console.warn("Cloudflare sink not implemented yet");

  return noopSink;
}

const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function parseYouTubeVideoId(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (YOUTUBE_VIDEO_ID_PATTERN.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase();
    const segments = url.pathname.split("/").filter(Boolean);

    if (host === "youtu.be" || host.endsWith(".youtu.be")) {
      const candidate = segments[0] ?? "";
      return YOUTUBE_VIDEO_ID_PATTERN.test(candidate) ? candidate : null;
    }

    if (host.endsWith("youtube.com")) {
      const searchId = url.searchParams.get("v");
      if (searchId && YOUTUBE_VIDEO_ID_PATTERN.test(searchId)) {
        return searchId;
      }

      if (segments[0] === "embed" || segments[0] === "shorts" || segments[0] === "live") {
        const candidate = segments[1] ?? "";
        return YOUTUBE_VIDEO_ID_PATTERN.test(candidate) ? candidate : null;
      }
    }
  } catch {
    // ignore invalid URLs
  }

  return null;
}
