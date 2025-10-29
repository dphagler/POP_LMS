"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useRouter } from "next/navigation";
import {
  AspectRatio,
  Badge,
  Box,
  Button,
  Container,
  Flex,
  HStack,
  Icon,
  IconButton,
  Progress,
  Stack,
  Text,
} from "@chakra-ui/react";
import { ArrowLeft, Captions, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { env } from "@/lib/env";
import { createYouTubeSink, type VideoProviderName } from "@/lib/video/provider";

const formatPercent = (value: number): string => `${value}%`;

const YOUTUBE_IFRAME_API_SRC = "https://www.youtube.com/iframe_api";

type YouTubePlayerState = {
  UNSTARTED: number;
  ENDED: number;
  PLAYING: number;
  PAUSED: number;
  BUFFERING: number;
  CUED: number;
};

type YouTubePlayerEvent = {
  data: number;
};

type YouTubePlayerReadyEvent = {
  target: YouTubePlayer;
};

type YouTubePlayer = {
  playVideo?: () => void;
  pauseVideo?: () => void;
  stopVideo?: () => void;
  destroy: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  mute?: () => void;
  unMute?: () => void;
  isMuted?: () => boolean;
};

type YouTubePlayerOptions = {
  videoId: string;
  playerVars?: Record<string, unknown>;
  events?: {
    onReady?: (event: YouTubePlayerReadyEvent) => void;
    onStateChange?: (event: YouTubePlayerEvent) => void;
  };
};

type YouTubeNamespace = {
  Player: new (element: HTMLElement, options: YouTubePlayerOptions) => YouTubePlayer;
  PlayerState: YouTubePlayerState;
};

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<YouTubeNamespace> | null = null;

function loadYouTubeIframeAPI(): Promise<YouTubeNamespace> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouTube API unavailable"));
  }

  if (window.YT && typeof window.YT.Player === "function") {
    return Promise.resolve(window.YT);
  }

  if (!youtubeApiPromise) {
    youtubeApiPromise = new Promise((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady;

      window.onYouTubeIframeAPIReady = () => {
        previous?.();

        if (window.YT && typeof window.YT.Player === "function") {
          resolve(window.YT);
        } else {
          reject(new Error("YouTube API failed to load"));
        }
      };

      const script = document.createElement("script");
      script.src = YOUTUBE_IFRAME_API_SRC;
      script.async = true;
      script.onerror = () => {
        youtubeApiPromise = null;
        reject(new Error("Failed to load YouTube IFrame API"));
      };

      document.head.appendChild(script);
    });
  }

  return youtubeApiPromise;
}

type LessonPlayerClientProps = {
  lessonId: string;
  videoId: string;
  videoDuration: number;
  videoProvider?: VideoProviderName | null;
  lessonTitle: string;
  posterUrl?: string;
  progressPercent: number;
  canStartAssessment: boolean;
  augmentationCount: number;
  badgeLabel?: string | null;
  previousLessonHref?: string | null;
  nextLessonHref?: string | null;
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
  canStartAssessment,
  augmentationCount,
  badgeLabel,
  previousLessonHref,
  nextLessonHref,
}: LessonPlayerClientProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const primaryCtaRef = useRef<HTMLButtonElement | null>(null);
  const provider: VideoProviderName = (
    videoProvider ?? env.NEXT_PUBLIC_VIDEO_PROVIDER_DEFAULT ?? "youtube"
  ) as VideoProviderName;
  const isYouTube = provider === "youtube";
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const telemetryRef = useRef<ReturnType<typeof createYouTubeSink> | null>(null);
  const isPlayingRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const isMuted = false;
  const MuteIcon = isMuted ? VolumeX : Volume2;
  const muteLabel = isMuted ? "Unmute" : "Mute";
  const showPlayer = isYouTube && Boolean(videoId);

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

    const sink = createYouTubeSink({
      lessonId,
      videoId,
      getPlayerTime: () => {
        const player = playerRef.current;
        if (player) {
          try {
            return player.getCurrentTime();
          } catch {
            return 0;
          }
        }
        return 0;
      },
      getDuration: () => {
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
      },
    });

    telemetryRef.current = sink;

    return () => {
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

    const containerNode = playerContainerRef.current;
    if (!containerNode) {
      return;
    }

    let mounted = true;
    let localPlayer: YouTubePlayer | null = null;

    loadYouTubeIframeAPI()
      .then((YT) => {
        if (!mounted) {
          return;
        }

        containerNode.innerHTML = "";

        const player = new YT.Player(containerNode, {
          videoId,
          playerVars: {
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            controls: 1,
          },
          events: {
            onReady: () => {
              if (!mounted) {
                return;
              }
              isPlayingRef.current = false;
              setIsPlaying(false);
            },
            onStateChange: (event: YouTubePlayerEvent) => {
              if (!mounted) {
                return;
              }

              const state = event.data;

              if (state === YT.PlayerState.PLAYING) {
                isPlayingRef.current = true;
                setIsPlaying(true);
                telemetryRef.current?.start();
              } else if (state === YT.PlayerState.PAUSED) {
                isPlayingRef.current = false;
                setIsPlaying(false);
                telemetryRef.current?.stop();
              } else if (state === YT.PlayerState.ENDED) {
                isPlayingRef.current = false;
                setIsPlaying(false);
                telemetryRef.current?.stop();
              }
            },
          },
        });

        localPlayer = player;
        playerRef.current = player;
      })
      .catch((error) => {
        if (env.NEXT_PUBLIC_TELEMETRY_DEBUG) {
          console.warn("Failed to initialise YouTube player", error);
        }
      });

    return () => {
      mounted = false;
      telemetryRef.current?.stop();
      isPlayingRef.current = false;

      const player = localPlayer ?? playerRef.current;
      if (player) {
        player.stopVideo?.();
        player.destroy();
      }

      playerRef.current = null;

      containerNode.innerHTML = "";
    };
  }, [isYouTube, videoId, lessonId]);

  useEffect(() => {
    if (!isYouTube) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        telemetryRef.current?.stop();
      } else if (isPlayingRef.current) {
        telemetryRef.current?.start();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isYouTube]);

  useLessonPlayerKeyboardShortcuts({
    containerRef,
    onTogglePlayback: handleTogglePlayback,
    onGoToPrevious: previousLessonHref ? handleGoToPrevious : undefined,
    onGoToNext: nextLessonHref ? handleGoToNext : undefined,
    primaryCtaRef,
  });

  return (
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
            <AspectRatio ratio={9 / 16} w="full" maxW="full">
              <Box
                borderRadius="2xl"
                overflow="hidden"
                position="relative"
                bg={posterUrl ? undefined : "gray.800"}
                backgroundImage={posterUrl ? `url(${posterUrl})` : undefined}
                backgroundSize="cover"
                backgroundPosition="center"
                boxShadow="2xl"
              >
                <Box
                  ref={playerContainerRef}
                  position="absolute"
                  inset={0}
                  w="full"
                  h="full"
                  zIndex={1}
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
            </AspectRatio>
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
  );
}

