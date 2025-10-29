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

type HeartbeatEvent = "start" | "tick" | "flush";

type HeartbeatPayload = {
  lessonId: string;
  provider: VideoProviderName;
  videoId: string;
  t: number;
  currentTime: number;
  duration: number;
  recordedAt: number;
  isVisible: boolean;
  final: boolean;
  event: HeartbeatEvent;
};

const AUTH_COOKIE_PATTERN = /(?:^|;\s*)(?:__Secure-next-auth\.session-token|next-auth\.session-token)=/i;

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

function safeRead(source: () => number): number {
  try {
    const value = source();
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function hasSession(): boolean {
  if (!isClient()) {
    return false;
  }

  try {
    return AUTH_COOKIE_PATTERN.test(document.cookie);
  } catch {
    return false;
  }
}

async function post(url: string, body: HeartbeatPayload): Promise<void> {
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body),
    });
  } catch (error) {
    if (env.NEXT_PUBLIC_TELEMETRY_DEBUG) {
      console.warn("Telemetry POST failed", error);
    }
  }
}

function resolveVisibility(): boolean {
  if (!isClient()) {
    return true;
  }

  return document.visibilityState !== "hidden";
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

  if (!hasSession()) {
    if (env.NEXT_PUBLIC_TELEMETRY_DEBUG) {
      console.debug("Skipping telemetry sink; no session cookie detected");
    }
    return noopSink;
  }

  let interval: ReturnType<typeof setInterval> | null = null;
  let lastSecond: number | null = null;
  let started = false;

  const send = async (second: number, event: HeartbeatEvent, force = false, final = false) => {
    if (!Number.isFinite(second)) {
      second = 0;
    }

    if (!force && lastSecond === second) {
      return;
    }

    lastSecond = second;

    const payload: HeartbeatPayload = {
      lessonId,
      provider: "youtube",
      videoId,
      t: second,
      currentTime: second,
      duration: Math.max(0, Math.floor(safeRead(getDuration))),
      recordedAt: Date.now(),
      isVisible: resolveVisibility(),
      final,
      event,
    };

    if (env.NEXT_PUBLIC_TELEMETRY_DEBUG) {
      console.debug("Telemetry", payload);
    }

    await post("/api/progress/heartbeat", payload);
  };

  const currentSecond = () => Math.max(0, Math.floor(safeRead(getPlayerTime)));

  void send(currentSecond(), "start", true, false);

  const sendTick = (force = false) => {
    void send(currentSecond(), "tick", force, false);
  };

  const sendFlush = () => {
    void send(currentSecond(), "flush", true, true);
  };

  return {
    start() {
      if (!started) {
        started = true;
        sendTick(true);
      }

      if (interval !== null) {
        return;
      }

      interval = setInterval(() => {
        sendTick();
      }, 2000);
    },
    stop() {
      if (interval !== null) {
        clearInterval(interval);
        interval = null;
      }

      if (!started) {
        return;
      }

      sendFlush();
      started = false;
    },
  };
}

type CloudflareSinkOptions = Record<string, never>;

export function createCloudflareSink(_: CloudflareSinkOptions = {}): TelemetrySink {
  if (!env.STREAM_ENABLED) {
    return noopSink;
  }

  if (env.NEXT_PUBLIC_TELEMETRY_DEBUG) {
    console.warn("Cloudflare sink not implemented yet");
  }

  return noopSink;
}
