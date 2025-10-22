"use client";

import { useEffect, useRef } from "react";
import { captureError } from "@/lib/client-error-reporting";

type YouTubePlayerEvent = {
  data: number;
};

type YouTubePlayerInstance = {
  getCurrentTime: () => number;
  destroy: () => void;
  pauseVideo?: () => void;
};

type HeartbeatPayload = {
  lessonId: string;
  currentTime: number;
  duration: number;
  isVisible: boolean;
  final: boolean;
  recordedAt: number;
};

interface YouTubeLessonPlayerProps {
  lessonId: string;
  youtubeId: string;
  duration: number;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement,
        options: {
          videoId: string;
          playerVars?: Record<string, unknown>;
          events?: {
            onStateChange?: (event: YouTubePlayerEvent) => void;
          };
        }
      ) => YouTubePlayerInstance;
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
        ENDED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export function YouTubeLessonPlayer({ lessonId, youtubeId, duration }: YouTubeLessonPlayerProps) {
  const playerRef = useRef<YouTubePlayerInstance | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatQueueRef = useRef<HeartbeatPayload[]>([]);
  const flushingRef = useRef(false);
  const isDocumentVisibleRef = useRef(
    typeof document === "undefined" ? true : document.visibilityState === "visible"
  );
  const hasWindowFocusRef = useRef(
    typeof document === "undefined" ? true : document.hasFocus()
  );
  const isPlayingRef = useRef(false);

  useEffect(() => {
    isDocumentVisibleRef.current = document.visibilityState === "visible";
    hasWindowFocusRef.current = document.hasFocus();

    function loadScript() {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
    }

    function computeVisibility() {
      return isDocumentVisibleRef.current && hasWindowFocusRef.current;
    }

    function shouldTrack() {
      return isPlayingRef.current && computeVisibility();
    }

    async function postHeartbeat(payload: HeartbeatPayload) {
      await fetch("/api/progress/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    }

    async function flushQueue() {
      if (flushingRef.current) return;
      if (typeof navigator !== "undefined" && !navigator.onLine) return;

      flushingRef.current = true;
      try {
        while (heartbeatQueueRef.current.length > 0) {
          const payload = heartbeatQueueRef.current[0];
          try {
            await postHeartbeat(payload);
            heartbeatQueueRef.current.shift();
          } catch (error) {
            if (typeof navigator !== "undefined" && !navigator.onLine) {
              break;
            }
            captureError(error, {
              event: "lesson.heartbeat_failed",
              properties: {
                lessonId,
                youtubeId
              }
            });
            break;
          }
        }
      } finally {
        flushingRef.current = false;
      }
    }

    async function sendHeartbeat({
      final = false,
      isVisible,
      force = false
    }: { final?: boolean; isVisible?: boolean; force?: boolean } = {}) {
      const player = playerRef.current;
      if (!player) return;

      const visibility = isVisible ?? computeVisibility();
      if (!force && !final && !visibility) {
        return;
      }

      const payload: HeartbeatPayload = {
        lessonId,
        currentTime: player.getCurrentTime(),
        duration,
        isVisible: visibility,
        final,
        recordedAt: Date.now()
      };

      heartbeatQueueRef.current.push(payload);
      await flushQueue();
    }

    function startHeartbeat() {
      if (intervalRef.current || !shouldTrack()) return;
      void sendHeartbeat({ force: true });
      intervalRef.current = setInterval(() => {
        void sendHeartbeat();
      }, 5000);
    }

    function stopHeartbeat() {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    function handleVisibilityChange() {
      const isVisible = document.visibilityState === "visible";
      isDocumentVisibleRef.current = isVisible;

      if (!isVisible) {
        stopHeartbeat();
        void sendHeartbeat({ isVisible: false, force: true });
        playerRef.current?.pauseVideo?.();
        return;
      }

      if (document.hasFocus()) {
        hasWindowFocusRef.current = true;
      }

      if (shouldTrack()) {
        startHeartbeat();
        void sendHeartbeat({ force: true });
      }
    }

    function handleFocus() {
      hasWindowFocusRef.current = true;
      if (shouldTrack()) {
        startHeartbeat();
        void sendHeartbeat({ force: true });
      }
    }

    function handleBlur() {
      hasWindowFocusRef.current = false;
      stopHeartbeat();
      void sendHeartbeat({ isVisible: false, force: true });
      playerRef.current?.pauseVideo?.();
    }

    function handleOnline() {
      void flushQueue();
    }

    function createPlayer() {
      if (!containerRef.current) return;
      playerRef.current = new window.YT!.Player(containerRef.current, {
        videoId: youtubeId,
        playerVars: {
          rel: 0,
          modestbranding: 1
        },
        events: {
          onStateChange: (event: YouTubePlayerEvent) => {
            if (event.data === window.YT?.PlayerState.PLAYING) {
              isPlayingRef.current = true;
              startHeartbeat();
              void sendHeartbeat({ force: true });
            }
            if (event.data === window.YT?.PlayerState.PAUSED) {
              isPlayingRef.current = false;
              stopHeartbeat();
              void sendHeartbeat({ force: true });
            }
            if (event.data === window.YT?.PlayerState.ENDED) {
              isPlayingRef.current = false;
              stopHeartbeat();
              void sendHeartbeat({ final: true, force: true });
            }
          }
        }
      });
    }

    window.onYouTubeIframeAPIReady = () => {
      createPlayer();
    };

    if (window.YT) {
      createPlayer();
    } else {
      loadScript();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("online", handleOnline);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("online", handleOnline);
      isPlayingRef.current = false;
      stopHeartbeat();
      void sendHeartbeat({ final: true, force: true });
      void flushQueue();
      playerRef.current?.destroy();
    };
  }, [lessonId, youtubeId, duration]);

  return <div ref={containerRef} className="aspect-video w-full" />;
}
