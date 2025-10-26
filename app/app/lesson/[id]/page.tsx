import Link from "next/link";
import { notFound } from "next/navigation";
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
import { ArrowLeft, Captions, Play, Volume2, VolumeX } from "lucide-react";

import { INITIAL_STATE, canStartAssessment } from "@/lib/lesson/engine";

import { loadLesson, loadAugmentations } from "./actions";

type LessonPageParams = { id: string };

type LessonPageProps = {
  params?: Promise<LessonPageParams>;
};

const formatPercent = (value: number): string => `${value}%`;

export default async function LessonPage({ params }: LessonPageProps) {
  if (!params) {
    notFound();
  }

  const { id } = await params;
  if (!id) {
    notFound();
  }

  let lessonPayload;
  try {
    lessonPayload = await loadLesson(id);
  } catch (error) {
    notFound();
  }

  const augmentations = await loadAugmentations(id);
  const { runtime, progress, diagnostics } = lessonPayload ?? {};

  if (!runtime) {
    notFound();
  }

  const duration = Math.max(runtime.durationSec ?? 0, 1);
  const watchedSeconds = Math.max(progress?.watchedSeconds ?? 0, 0);
  const progressPercent = Math.min(100, Math.round((watchedSeconds / duration) * 100));

  const engineContext = {
    runtime: {
      durationSec: runtime.durationSec,
      augmentations: runtime.augmentations,
    },
    progress: {
      uniqueSeconds: progress?.uniqueSeconds ?? 0,
      thresholdPct: progress?.thresholdPct ?? 0,
    },
    diagnostics: diagnostics ?? [],
  } as const;

  const canStartAssessmentFlag = canStartAssessment(INITIAL_STATE, engineContext);
  const isMuted = false;
  const MuteIcon = isMuted ? VolumeX : Volume2;
  const muteLabel = isMuted ? "Unmute" : "Mute";
  const posterUrl = runtime.streamId
    ? `https://image.mux.com/${runtime.streamId}/thumbnail.jpg?time=0`
    : undefined;
  const augmentationCount = augmentations.items.length;

  return (
    <Flex minH="100dvh" justify="center" bgGradient={{ base: "linear(to-b, gray.900, gray.950)", md: undefined }}>
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
              as={Link}
              href="/app"
              variant="ghost"
              leftIcon={<Icon as={ArrowLeft} boxSize={4} />}
              size="sm"
            >
              Back
            </Button>
            <Text fontWeight="semibold" fontSize="lg" flex="1" textAlign="center" noOfLines={2}>
              {runtime.title}
            </Text>
            <Badge
              colorScheme="primary"
              borderRadius="full"
              px={3}
              py={1}
              fontSize="xs"
              aria-label={`Lesson 2 of 8. ${augmentationCount} augmentation options available.`}
            >
              2 of 8
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
                    aria-label="Play lesson"
                    icon={<Icon as={Play} boxSize={7} />}
                    size="lg"
                    borderRadius="full"
                    colorScheme="whiteAlpha"
                    bg="whiteAlpha.300"
                    _hover={{ bg: "whiteAlpha.400" }}
                    isDisabled
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
              size="lg"
              colorScheme="primary"
              borderRadius="full"
              isDisabled={!canStartAssessmentFlag}
            >
              Start assessment
            </Button>
          </Stack>
        </Stack>
      </Container>
    </Flex>
  );
}
