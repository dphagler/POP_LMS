"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Collapse,
  Flex,
  Heading,
  Icon,
  IconButton,
  Stack,
  Text,
  useBreakpointValue,
  useColorModeValue,
  useDisclosure,
} from "@chakra-ui/react";
import { ChevronDown, ChevronRight } from "lucide-react";

export type UpNextLesson = {
  id: string;
  title: string;
  durationSec?: number | null;
  isComplete?: boolean;
};

export type UpNextRailProps = {
  lessons: UpNextLesson[];
  currentLessonId?: string;
  maxItems?: number;
};

const MIN_ITEMS = 3;
const DEFAULT_MAX_ITEMS = 5;

function formatDuration(durationSec?: number | null): string {
  if (!durationSec || durationSec <= 0) {
    return "Est. time unknown";
  }

  const totalMinutes = Math.max(Math.round(durationSec / 60), 1);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    if (minutes === 0) {
      return `${hours} hr${hours > 1 ? "s" : ""}`;
    }
    return `${hours} hr${hours > 1 ? "s" : ""} ${minutes} min`;
  }

  return `${totalMinutes} min`;
}

export function UpNextRail({
  lessons,
  currentLessonId,
  maxItems = DEFAULT_MAX_ITEMS,
}: UpNextRailProps) {
  const router = useRouter();
  const isMobile = useBreakpointValue({ base: true, md: false }) ?? false;
  const { isOpen, onToggle, onOpen, onClose } = useDisclosure({ defaultIsOpen: !isMobile });

  useEffect(() => {
    if (isMobile) {
      onClose();
    } else {
      onOpen();
    }
  }, [isMobile, onClose, onOpen]);

  const displayLessons = useMemo(() => {
    const filtered = lessons.filter((lesson) => lesson.id !== currentLessonId);
    const limit = Math.max(MIN_ITEMS, Math.min(maxItems, DEFAULT_MAX_ITEMS));
    return filtered.slice(0, limit);
  }, [lessons, currentLessonId, maxItems]);

  const bg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const mutedText = useColorModeValue("gray.600", "gray.300");
  const tileHover = useColorModeValue("gray.50", "gray.700");
  const completeColor = useColorModeValue("green.500", "green.300");
  const incompleteColor = useColorModeValue("gray.300", "gray.600");

  if (displayLessons.length === 0) {
    return null;
  }

  return (
    <Box
      as="aside"
      bg={bg}
      borderWidth={{ base: "1px", lg: "0" }}
      borderColor={{ base: borderColor, lg: "transparent" }}
      borderRadius={{ base: "xl", lg: "none" }}
      boxShadow={{ base: "sm", lg: "none" }}
      position={{ lg: "sticky" }}
      top={{ lg: 24 }}
      alignSelf={{ lg: "flex-start" }}
      width="full"
      maxW={{ lg: "320px" }}
    >
      <Flex
        align="center"
        justify="space-between"
        px={{ base: 4, lg: 0 }}
        py={{ base: 3, lg: 0 }}
        mb={{ base: 0, lg: 4 }}
      >
        <Heading as="h2" fontSize="lg">
          Up next
        </Heading>
        {isMobile && (
          <IconButton
            aria-label={isOpen ? "Collapse next lessons" : "Expand next lessons"}
            size="sm"
            variant="ghost"
            icon={<Icon as={ChevronDown} transform={isOpen ? "rotate(180deg)" : undefined} transition="transform 0.2s" />}
            onClick={onToggle}
          />
        )}
      </Flex>

      <Collapse in={isMobile ? isOpen : true} animateOpacity>
        <Stack spacing={3} px={{ base: 2, lg: 0 }} pb={{ base: 3, lg: 0 }}>
          {displayLessons.map((lesson) => {
            const durationLabel = formatDuration(lesson.durationSec);
            const isComplete = Boolean(lesson.isComplete);

            return (
              <Box
                key={lesson.id}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/lesson/${lesson.id}`)}
                onKeyPress={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    router.push(`/lesson/${lesson.id}`);
                  }
                }}
                borderWidth="1px"
                borderColor={borderColor}
                borderRadius="lg"
                px={4}
                py={3}
                transition="background-color 0.2s, border-color 0.2s"
                cursor="pointer"
                _hover={{ bg: tileHover, borderColor: tileHover }}
                _focus={{ boxShadow: "outline" }}
              >
                <Flex align="center" gap={3}>
                  <Box
                    width={2.5}
                    height={2.5}
                    borderRadius="full"
                    bg={isComplete ? completeColor : incompleteColor}
                    flexShrink={0}
                  />
                  <Stack spacing={0.5} flex="1">
                    <Text fontWeight="medium" noOfLines={2}>
                      {lesson.title}
                    </Text>
                    <Text fontSize="sm" color={mutedText}>
                      {durationLabel}
                    </Text>
                  </Stack>
                  <Icon as={ChevronRight} color={mutedText} />
                </Flex>
              </Box>
            );
          })}
        </Stack>
      </Collapse>
    </Box>
  );
}
