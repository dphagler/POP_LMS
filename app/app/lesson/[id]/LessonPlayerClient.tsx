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

const formatPercent = (value: number): string => `${value}%`;

type LessonPlayerClientProps = {
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
  const [isPlaying, setIsPlaying] = useState(false);
  const isMuted = false;
  const MuteIcon = isMuted ? VolumeX : Volume2;
  const muteLabel = isMuted ? "Unmute" : "Mute";

  const handleTogglePlayback = useCallback(() => {
    setIsPlaying((previous) => !previous);
  }, []);

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
                <Box position="absolute" inset={0} bg="blackAlpha.500" />
                <Flex position="absolute" inset={0} align="center" justify="center">
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

