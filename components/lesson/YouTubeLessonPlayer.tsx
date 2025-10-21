"use client";

import { useEffect, useRef } from "react";

type YouTubePlayerEvent = {
  data: number;
};

type YouTubePlayerInstance = {
  getCurrentTime: () => number;
  destroy: () => void;
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

  useEffect(() => {
    function loadScript() {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
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
              startHeartbeat();
            }
            if (event.data === window.YT?.PlayerState.PAUSED) {
              stopHeartbeat();
              void sendHeartbeat();
            }
            if (event.data === window.YT?.PlayerState.ENDED) {
              stopHeartbeat();
              void sendHeartbeat(true);
            }
          }
        }
      });
    }

    function startHeartbeat() {
      if (intervalRef.current) return;
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

    async function sendHeartbeat(final = false) {
      const player = playerRef.current;
      if (!player) return;
      const currentTime = player.getCurrentTime();
      const data = {
        lessonId,
        currentTime,
        duration,
        isVisible: document.visibilityState === "visible",
        final
      };
      await fetch("/api/progress/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
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

    return () => {
      stopHeartbeat();
      void sendHeartbeat(true);
      playerRef.current?.destroy();
    };
  }, [lessonId, youtubeId, duration]);

  return <div ref={containerRef} className="aspect-video w-full" />;
}
