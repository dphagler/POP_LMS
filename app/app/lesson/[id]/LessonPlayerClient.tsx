"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useRouter } from "next/navigation";
import { Badge, Box, Button, Container, Flex, HStack, Icon, IconButton, Progress, Stack, Text } from "@chakra-ui/react";
import { ArrowLeft, Captions, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { PostHogClient } from "@/analytics/posthog-client";
import { TelemetryOverlay } from "@/components/lesson/TelemetryOverlay";
import { initPosthogClient, type PosthogClientHandle } from "@/lib/analytics/posthog.client";
import { publicEnv } from "@/lib/env.client";
import { createYouTubeSink, type VideoProviderName } from "@/lib/video/provider";
import {
  type YouTubeNamespace,
  type YouTubePlayer,
  type YouTubePlayerEvent,
} from "@/types/youtube";
import { getProgress } from "./actions";

const formatPercent = (value: number): string => `${value}%`;

const TELEMETRY_DEBUG = publicEnv.telemetryDebugEnabled;

const YOUTUBE_IFRAME_API_SRC = "https://www.youtube.com/iframe_api";

type LessonPlayerClientProps = {
  lessonId: string;
  videoId: string | null;
  videoDuration: number;
  videoProvider?: "youtube" | "cloudflare";
  lessonTitle: string;
  posterUrl?: string;
  progressPercent: number;
  initialUniqueSeconds: number;
  canStartAssessment: boolean;
  augmentationCount: number;
  badgeLabel?: string | null;
  previousLessonHref?: string | null;
  nextLessonHref?: string | null;
  userId: string;
  userEmail?: string | null;
  userOrgId: string;
  userRole?: string | null;
};

type ShortcutsConfig = {
  containerRef: RefObject<HTMLElement | null>;
  onTogglePlayback?: () => void;
  onGoToPrevious?: () => void;
  onGoToNext?: () => void;
  primaryCtaRef: RefObject<HTMLButtonElement | null>;
};

const INTERACTIVE_SELECTOR = [
  "input",
  "textarea",
  "select",
  "button",
  'a[href]',
  '[role="button"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[role="menuitemradio"]',
  '[role="menuitemcheckbox"]',
  '[role="textbox"]',
  '[contenteditable="true"]',
  '[data-lesson-shortcuts="ignore"]',
].join(",");

const COMPLETION_THRESHOLD_RATIO = 0.92;

function useLessonPlayerKeyboardShortcuts({
  containerRef,
  onTogglePlayback,
  onGoToPrevious,
  onGoToNext,
  primaryCtaRef,
}: ShortcutsConfig) {
  useEffect(() => {
    const container = containerRef.current;

    function isEventWithinContainer(target: EventTarget | null): boolean {
      if (!target || !(target instanceof HTMLElement)) {
        return target === document.body;
      }

      if (!container) {
        return target === document.body;
      }

      return target === document.body || container.contains(target);
    }

    function isInteractiveElement(target: HTMLElement | null): boolean {
      if (!target) {
        return false;
      }

      if (target.isContentEditable) {
        return true;
      }

      return Boolean(target.closest(INTERACTIVE_SELECTOR));
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const target = event.target instanceof HTMLElement ? event.target : null;

      if (!isEventWithinContainer(event.target)) {
        return;
      }

      if (isInteractiveElement(target)) {
        return;
      }

      const key = event.key;
      const normalized = key.length === 1 ? key.toLowerCase() : key;

      if (
        (key === " " || key === "Spacebar" || event.code === "Space") &&
        onTogglePlayback
      ) {
        event.preventDefault();
        onTogglePlayback();
        return;
      }

      if ((normalized === "j" || key === "ArrowDown") && onGoToNext) {
        event.preventDefault();
        onGoToNext();
        return;
      }

      if ((normalized === "k" || key === "ArrowUp") && onGoToPrevious) {
        event.preventDefault();
        onGoToPrevious();
        return;
      }

      if (key === "Enter" && primaryCtaRef.current && !primaryCtaRef.current.disabled) {
        event.preventDefault();
        primaryCtaRef.current.focus();
        primaryCtaRef.current.click();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [containerRef, onGoToNext, onGoToPrevious, onTogglePlayback, primaryCtaRef]);
}

export function LessonPlayerClient({
  lessonId,
  videoId,
  videoDuration,
  videoProvider,
  lessonTitle,
  posterUrl,
  progressPercent,
  initialUniqueSeconds,
  canStartAssessment,
  augmentationCount,
  badgeLabel,
  previousLessonHref,
  nextLessonHref,
  userId,
  userEmail,
  userOrgId,
  userRole,
}: LessonPlayerClientProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const primaryCtaRef = useRef<HTMLButtonElement | null>(null);
  const provider: VideoProviderName = (
    videoProvider ?? publicEnv.NEXT_PUBLIC_VIDEO_PROVIDER_DEFAULT ?? "youtube"
  ) as VideoProviderName;
  const isYouTube = provider === "youtube";
  const playerRef = useRef<YouTubePlayer | null>(null);
  const telemetryRef = useRef<ReturnType<typeof createYouTubeSink> | null>(null);
  const isPlayingRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const isMuted = false;
  const MuteIcon = isMuted ? VolumeX : Volume2;
  const muteLabel = isMuted ? "Unmute" : "Mute";
  const showPlayer = isYouTube && Boolean(videoId);
  const durationSeconds =
    typeof videoDuration === "number" && Number.isFinite(videoDuration)
      ? Math.max(0, Math.round(videoDuration))
      : 0;
  const initialUniqueSecondsValue =
    typeof initialUniqueSeconds === "number" && Number.isFinite(initialUniqueSeconds)
      ? Math.max(0, Math.round(initialUniqueSeconds))
      : 0;
  const telemetryDebugEnabled = TELEMETRY_DEBUG;
  const [telemetryState, setTelemetryState] = useState(() => ({
    currentTime: 0,
    lastPostStatus: "idle",
    uniqueSeconds: initialUniqueSecondsValue,
    segmentCount: 0,
  }));
  const [isForceTickPending, setIsForceTickPending] = useState(false);
  const posthogClientRef = useRef<PosthogClientHandle | null>(null);
  const [posthogReady, setPosthogReady] = useState(false);
  const lastProgressSecondRef = useRef<number | null>(null);
  const completionEmittedRef = useRef(false);

  useEffect(() => {
    if (!telemetryDebugEnabled) {
      return;
    }

    const DEBUG = telemetryDebugEnabled;

    DEBUG &&
      console.warn("[telemetry] mount", {
        provider: videoProvider,
        videoId,
        duration: videoDuration,
        path: window.location.pathname,
      });
  }, [telemetryDebugEnabled, videoDuration, videoId, videoProvider]);

  useEffect(() => {
    if (durationSeconds <= 0) {
      completionEmittedRef.current = false;
      return;
    }

    completionEmittedRef.current =
      initialUniqueSecondsValue / durationSeconds >= COMPLETION_THRESHOLD_RATIO;
  }, [durationSeconds, initialUniqueSecondsValue, lessonId]);

  useEffect(() => {
    if (!telemetryDebugEnabled || !isYouTube) {
      return;
    }

    let cancelled = false;

    const updateTime = () => {
      const player = playerRef.current;
      let nextTime = 0;

      if (player) {
        try {
          const value = player.getCurrentTime?.();
          if (typeof value === "number" && Number.isFinite(value)) {
            nextTime = value;
          }
        } catch {
          nextTime = 0;
        }
      }

      if (cancelled) {
        return;
      }

      const normalized = Number.isFinite(nextTime) ? Math.max(0, nextTime) : 0;

      setTelemetryState((previous) => {
        if (Math.abs(previous.currentTime - normalized) < 0.05) {
          return previous;
        }

        return {
          ...previous,
          currentTime: normalized,
        };
      });
    };

    updateTime();

    const interval = setInterval(updateTime, 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isYouTube, telemetryDebugEnabled]);

  useEffect(() => {
    let cancelled = false;

    posthogClientRef.current = null;
    setPosthogReady(false);
    lastProgressSecondRef.current = null;

    if (!userId) {
      return () => {
        cancelled = true;
      };
    }

    void initPosthogClient({
      userId,
      email: userEmail ?? null,
      orgId: userOrgId ?? null,
      role: userRole ?? null,
    }).then((result) => {
      if (cancelled) {
        return;
      }

      if (!result?.client) {
        setPosthogReady(false);
        return;
      }

      posthogClientRef.current = result.client;
      setPosthogReady(true);

      result.client.capture("lesson_view_start", {
        lessonId,
        title: lessonTitle,
        provider,
        durationS: durationSeconds,
      });
    });

    return () => {
      cancelled = true;
      posthogClientRef.current = null;
      setPosthogReady(false);
      lastProgressSecondRef.current = null;
    };
  }, [
    durationSeconds,
    lessonId,
    lessonTitle,
    provider,
    userEmail,
    userId,
    userOrgId,
    userRole,
  ]);

  useEffect(() => {
    if (!telemetryDebugEnabled) {
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const result = await getProgress({ lessonId });
        if (cancelled) {
          return;
        }

        const uniqueSecondsValue = Math.max(0, Math.round(result.uniqueSeconds ?? 0));
        const segmentCountValue = Math.max(0, result.segmentCount ?? 0);
        const statusLabel = `poll ok @ ${new Date().toLocaleTimeString()}`;

        setTelemetryState((previous) => ({
          ...previous,
          lastPostStatus: statusLabel,
          uniqueSeconds: uniqueSecondsValue,
          segmentCount: segmentCountValue,
        }));
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message = error instanceof Error ? error.message : "unknown";
        setTelemetryState((previous) => ({
          ...previous,
          lastPostStatus: `poll error: ${message}`,
        }));
      }
    };

    void poll();
    const interval = setInterval(() => {
      void poll();
    }, 4000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [lessonId, telemetryDebugEnabled]);

  const emitProgressTick = useCallback(
    (force = false) => {
      if (!posthogReady) {
        return;
      }

      const client = posthogClientRef.current;
      if (!client) {
        return;
      }

      const player = playerRef.current;
      let currentTime = 0;

      if (player) {
        try {
          currentTime = player.getCurrentTime?.() ?? 0;
        } catch {
          currentTime = 0;
        }
      }

      const currentSecond = Math.max(0, Math.floor(currentTime));

      if (!force && lastProgressSecondRef.current === currentSecond) {
        return;
      }

      lastProgressSecondRef.current = currentSecond;

      const percent =
        durationSeconds > 0
          ? Math.min(100, Math.round((currentSecond / durationSeconds) * 100))
          : 0;

      client.capture("lesson_progress_tick", {
        lessonId,
        t: currentSecond,
        percent,
      });
    },
    [durationSeconds, lessonId, posthogReady],
  );

  useEffect(() => {
    if (!posthogReady || !isYouTube) {
      return;
    }

    emitProgressTick(true);
  }, [emitProgressTick, isYouTube, posthogReady]);

  useEffect(() => {
    if (!posthogReady || !isYouTube || !isPlaying) {
      return;
    }

    let cancelled = false;

    const tick = (force = false) => {
      if (cancelled) {
        return;
      }

      emitProgressTick(force);
    };

    tick(true);

    const interval = setInterval(() => tick(false), 2000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [emitProgressTick, isPlaying, isYouTube, posthogReady]);

  const fetchProgressSnapshot = useCallback(
    async (timeOverride?: number) => {
      if (!posthogReady) {
        return null;
      }

      try {
        const response = await fetch("/api/progress/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lessonId,
            provider,
            t:
              typeof timeOverride === "number" && Number.isFinite(timeOverride)
                ? Math.max(0, Math.round(timeOverride))
                : 0,
          }),
        });

        if (!response.ok) {
          return null;
        }

        const data = (await response.json()) as {
          uniqueSeconds?: number;
          completed?: boolean;
        };

        return {
          uniqueSeconds:
            typeof data.uniqueSeconds === "number" ? data.uniqueSeconds : 0,
          completed: Boolean(data.completed),
        };
      } catch (error) {
        if (telemetryDebugEnabled) {
          const DEBUG = telemetryDebugEnabled;
          DEBUG && console.warn("Failed to fetch progress snapshot", error);
        }

        return null;
      }
    },
    [lessonId, posthogReady, provider, telemetryDebugEnabled],
  );

  const emitCompletionEvent = useCallback(
    async (reason: "ended" | "cleanup" = "cleanup") => {
      if (!posthogReady || completionEmittedRef.current) {
        return;
      }

      const client = posthogClientRef.current;
      if (!client) {
        return;
      }

      const player = playerRef.current;
      let currentTime = 0;

      if (player) {
        try {
          currentTime = player.getCurrentTime?.() ?? 0;
        } catch {
          currentTime = 0;
        }
      }

      if (reason === "ended") {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      const snapshot = await fetchProgressSnapshot(currentTime);

      if (!snapshot?.completed) {
        return;
      }

      const uniqueSecondsValue = Math.max(
        0,
        Math.round(snapshot.uniqueSeconds ?? 0),
      );

      client.capture("lesson_view_complete", {
        lessonId,
        uniqueSeconds: uniqueSecondsValue,
        durationS: durationSeconds,
      });

      completionEmittedRef.current = true;
    },
    [durationSeconds, fetchProgressSnapshot, lessonId, posthogReady],
  );

  const handleForceTelemetryTick = useCallback(async () => {
    if (!telemetryDebugEnabled) {
      return;
    }

    const forceTick = (window as any).__telemetry?.forceTick;

    if (typeof forceTick !== "function") {
      setTelemetryState((previous) => ({
        ...previous,
        lastPostStatus: "force tick unavailable",
      }));
      return;
    }

    setIsForceTickPending(true);

    try {
      await forceTick();
      const statusLabel = `force tick ok @ ${new Date().toLocaleTimeString()}`;
      setTelemetryState((previous) => ({
        ...previous,
        lastPostStatus: statusLabel,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      setTelemetryState((previous) => ({
        ...previous,
        lastPostStatus: `force tick error: ${message}`,
      }));
    } finally {
      setIsForceTickPending(false);
    }
  }, [telemetryDebugEnabled]);

  useEffect(() => {
    return () => {
      void emitCompletionEvent("cleanup");
    };
  }, [emitCompletionEvent]);

  const handleTogglePlayback = useCallback(() => {
    if (isYouTube) {
      const player = playerRef.current;
      if (!player) {
        return;
      }

      if (isPlayingRef.current) {
        player.pauseVideo?.();
      } else {
        player.playVideo?.();
      }

      return;
    }

    setIsPlaying((previous) => !previous);
  }, [isYouTube]);

  const handleGoToPrevious = useCallback(() => {
    if (!previousLessonHref) {
      return;
    }

    router.push(previousLessonHref);
  }, [previousLessonHref, router]);

  const handleGoToNext = useCallback(() => {
    if (!nextLessonHref) {
      return;
    }

    router.push(nextLessonHref);
  }, [nextLessonHref, router]);

  useEffect(() => {
    if (!isYouTube || !lessonId || !videoId) {
      telemetryRef.current = null;
      return;
    }

    const getPlayerTime = () => {
      const player = playerRef.current;
      if (player) {
        try {
          return player.getCurrentTime();
        } catch {
          return 0;
        }
      }

      return 0;
    };

    const getDuration = () => {
      const player = playerRef.current;
      if (player) {
        try {
          const playerDuration = player.getDuration();
          if (typeof playerDuration === "number" && Number.isFinite(playerDuration)) {
            return playerDuration;
          }
        } catch {
          // ignore
        }
      }

      return Number.isFinite(videoDuration) ? videoDuration : 0;
    };

    const sink = createYouTubeSink({
      lessonId,
      videoId,
      getPlayerTime,
      getDuration,
    });

    telemetryRef.current = sink;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        sink.stop();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      sink.stop();
      if (telemetryRef.current === sink) {
        telemetryRef.current = null;
      }
    };
  }, [isYouTube, lessonId, videoDuration, videoId]);

  useEffect(() => {
    if (!isYouTube || !videoId) {
      return;
    }

    let cancelled = false;
    let localPlayer: YouTubePlayer | null = null;
    const previousOnReady = (window as any).onYouTubeIframeAPIReady;
    let readyHandler: (() => void) | null = null;

    const createPlayer = () => {
      if (cancelled) {
        return;
      }

      const container = document.getElementById("yt-player");
      const YT = (window as any).YT as YouTubeNamespace | undefined;

      if (!container || !YT || typeof YT.Player !== "function") {
        return;
      }

      const playerState = YT.PlayerState;

      container.innerHTML = "";

      const player = new YT.Player(container, {
        videoId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          controls: 1,
        },
        events: {
          onReady: () => {
            if (cancelled) {
              return;
            }

            if (telemetryDebugEnabled) {
              const DEBUG = telemetryDebugEnabled;
              DEBUG && console.warn("[telemetry] yt ready");
            }
            isPlayingRef.current = false;
            setIsPlaying(false);
          },
          onStateChange: (event: YouTubePlayerEvent) => {
            if (cancelled || !playerState) {
              return;
            }

            const state = event.data;

            if (state === playerState.PLAYING) {
              isPlayingRef.current = true;
              setIsPlaying(true);
              telemetryRef.current?.start();
              emitProgressTick(true);
            } else if (state === playerState.PAUSED) {
              isPlayingRef.current = false;
              setIsPlaying(false);
              telemetryRef.current?.stop();
              emitProgressTick(true);
            } else if (state === playerState.ENDED) {
              isPlayingRef.current = false;
              setIsPlaying(false);
              telemetryRef.current?.stop();
              emitProgressTick(true);
              void emitCompletionEvent("ended");
            }
          },
        },
      });

      localPlayer = player;
      playerRef.current = player;
    };

    const ensureYouTubeScript = () => {
      const existingScript = document.querySelector(
        `script[src="${YOUTUBE_IFRAME_API_SRC}"]`,
      );

      if (!existingScript) {
        const script = document.createElement("script");
        script.src = YOUTUBE_IFRAME_API_SRC;
        script.async = true;
        script.onerror = () => {
          if (telemetryDebugEnabled) {
            const DEBUG = telemetryDebugEnabled;
            DEBUG && console.warn("Failed to load YouTube IFrame API");
          }
        };
        document.body.appendChild(script);
      }
    };

    const setupPlayer = () => {
      const YT = (window as any).YT as YouTubeNamespace | undefined;

      if (YT && typeof YT.Player === "function") {
        createPlayer();
        return;
      }

      readyHandler = () => {
        previousOnReady?.();
        createPlayer();
      };

      (window as any).onYouTubeIframeAPIReady = readyHandler;
    };

    ensureYouTubeScript();
    setupPlayer();

    return () => {
      cancelled = true;

      if (readyHandler && (window as any).onYouTubeIframeAPIReady === readyHandler) {
        (window as any).onYouTubeIframeAPIReady = previousOnReady;
      }

      telemetryRef.current?.stop();
      isPlayingRef.current = false;
      emitProgressTick(true);
      void emitCompletionEvent("cleanup");

      const player = localPlayer ?? playerRef.current;
      if (player) {
        player.stopVideo?.();
        player.destroy();
      }

      playerRef.current = null;
    };
  }, [
    emitCompletionEvent,
    emitProgressTick,
    isYouTube,
    telemetryDebugEnabled,
    videoId,
  ]);

  useLessonPlayerKeyboardShortcuts({
    containerRef,
    onTogglePlayback: handleTogglePlayback,
    onGoToPrevious: previousLessonHref ? handleGoToPrevious : undefined,
    onGoToNext: nextLessonHref ? handleGoToNext : undefined,
    primaryCtaRef,
  });

  const telemetryPercent =
    durationSeconds > 0
      ? Math.min(100, Math.round((telemetryState.uniqueSeconds / durationSeconds) * 100))
      : 0;

  return (
    <>
      <PostHogClient />
      <Flex
        ref={containerRef}
        minH="100dvh"
        justify="center"
        bgGradient={{ base: "linear(to-b, gray.900, gray.950)", md: undefined }}
        data-lesson-shortcuts-root
      >
        <Container
          maxW={{ base: "full", md: "540px" }}
          px={{ base: 4, md: 0 }}
          py={{ base: 6, md: 12 }}
          display="flex"
          flexDirection="column"
          flex="1"
        >
          <Stack spacing={6} flex="1">
            <HStack spacing={3} justify="space-between" align="center">
              <Button
                onClick={() => router.push("/app")}
                variant="ghost"
                leftIcon={<Icon as={ArrowLeft} boxSize={4} />}
                size="sm"
              >
                Back
              </Button>
              <Text fontWeight="semibold" fontSize="lg" flex="1" textAlign="center" noOfLines={2}>
                {lessonTitle}
              </Text>
              <Badge
                colorScheme="primary"
                borderRadius="full"
                px={3}
                py={1}
                fontSize="xs"
                aria-label={
                  badgeLabel
                    ? `Lesson ${badgeLabel}. ${augmentationCount} augmentation options available.`
                    : `${augmentationCount} augmentation options available.`
                }
              >
                {badgeLabel ?? `${augmentationCount} available`}
              </Badge>
            </HStack>

            <Flex flex="1" align="center" justify="center">
              <Box
                borderRadius="2xl"
                overflow="hidden"
                position="relative"
                w="full"
                maxW="full"
                bg={posterUrl ? undefined : "gray.800"}
                backgroundImage={posterUrl ? `url(${posterUrl})` : undefined}
                backgroundSize="cover"
                backgroundPosition="center"
                boxShadow="2xl"
              >
                <div
                  id="yt-player"
                  style={{ aspectRatio: "16/9", width: "100%" }}
                  data-video-provider={provider}
                  aria-hidden={!showPlayer}
                />
                <Box
                  position="absolute"
                  inset={0}
                  bg="blackAlpha.500"
                  opacity={isPlaying ? 0 : 1}
                  transition="opacity 0.3s ease"
                  pointerEvents="none"
                  zIndex={2}
                />
                <Flex
                  position="absolute"
                  inset={0}
                  align="center"
                  justify="center"
                  pointerEvents="none"
                  zIndex={3}
                >
                  <IconButton
                    aria-label={isPlaying ? "Pause lesson" : "Play lesson"}
                    icon={<Icon as={isPlaying ? Pause : Play} boxSize={7} />}
                    size="lg"
                    borderRadius="full"
                    colorScheme="whiteAlpha"
                    bg="whiteAlpha.300"
                    _hover={{ bg: "whiteAlpha.400" }}
                    aria-pressed={isPlaying}
                    onClick={handleTogglePlayback}
                    pointerEvents={showPlayer && isPlaying ? "none" : "auto"}
                    opacity={showPlayer ? (isPlaying ? 0 : 1) : 1}
                    transition="opacity 0.2s ease"
                    isDisabled={!showPlayer}
                  />
                </Flex>
              </Box>
            </Flex>

            <Stack spacing={4} pb={{ base: 8, md: 0 }}>
              <HStack justify="space-between">
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Icon as={MuteIcon} boxSize={4} />}
                  isDisabled
                >
                  {muteLabel}
                </Button>
                <Badge
                  display="flex"
                  alignItems="center"
                  gap={2}
                  borderRadius="full"
                  px={3}
                  py={1}
                  colorScheme="gray"
                >
                  <Icon as={Captions} boxSize={3} />
                  Captions
                </Badge>
              </HStack>
              <Stack spacing={1}>
                <Flex justify="space-between" fontSize="sm">
                  <Text color="fg.muted">Progress</Text>
                  <Text fontWeight="medium">{formatPercent(progressPercent)}</Text>
                </Flex>
                <Progress value={progressPercent} borderRadius="full" />
              </Stack>
              <Button
                ref={primaryCtaRef}
                size="lg"
                colorScheme="primary"
                borderRadius="full"
                isDisabled={!canStartAssessment}
              >
                Start assessment
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Flex>
      {telemetryDebugEnabled ? (
        <TelemetryOverlay
          lessonId={lessonId}
          provider={provider}
          videoId={videoId}
          currentTime={telemetryState.currentTime}
          duration={durationSeconds}
          lastPostStatus={telemetryState.lastPostStatus}
          uniqueSeconds={telemetryState.uniqueSeconds}
          percent={telemetryPercent}
          segmentCount={telemetryState.segmentCount}
          onForceTick={handleForceTelemetryTick}
          isForceTickPending={isForceTickPending}
        />
      ) : null}
    </>
  );
}

