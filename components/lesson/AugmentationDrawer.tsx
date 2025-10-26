"use client";

import { useMemo, useState } from "react";
import {
  AspectRatio,
  Badge,
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  Icon,
  IconButton,
  Stack,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { Check, Play } from "lucide-react";

export type PlannedAugmentation = {
  augmentationId: string;
  type: "video" | string;
  title: string;
  description: string;
  posterUrl?: string | null;
  completedAt?: string | null;
};

export type AugmentationDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  augmentations: PlannedAugmentation[];
  onComplete: (augmentationId: string) => Promise<void> | void;
  isCompleting?: boolean;
};

type VideoPreviewProps = {
  title: string;
  posterUrl?: string | null;
};

const VideoPreview = ({ title, posterUrl }: VideoPreviewProps) => {
  const overlayColor = useColorModeValue("blackAlpha.400", "blackAlpha.600");
  const fallbackBackground = useColorModeValue("gray.100", "gray.700");

  return (
    <AspectRatio ratio={16 / 9} w="full">
      <Box
        borderRadius="lg"
        overflow="hidden"
        position="relative"
        bg={posterUrl ? undefined : fallbackBackground}
        backgroundImage={posterUrl ? `url(${posterUrl})` : undefined}
        backgroundSize="cover"
        backgroundPosition="center"
      >
        <Box position="absolute" inset={0} bg={overlayColor} />
        <Flex position="absolute" inset={0} align="center" justify="center">
          <IconButton
            aria-label={`Play ${title}`}
            icon={<Icon as={Play} boxSize={6} />}
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
  );
};

export function AugmentationDrawer({
  isOpen,
  onClose,
  augmentations,
  onComplete,
  isCompleting = false,
}: AugmentationDrawerProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  const allComplete = useMemo(
    () => augmentations.length > 0 && augmentations.every((item) => item.completedAt),
    [augmentations],
  );

  const confettiBg = useColorModeValue("green.50", "green.900");
  const confettiBorder = useColorModeValue("green.200", "green.700");
  const confettiText = useColorModeValue("green.700", "green.200");
  const descriptionColor = useColorModeValue("gray.600", "gray.300");
  const emptyStateColor = useColorModeValue("gray.500", "gray.400");

  const handleComplete = async (augmentationId: string) => {
    if (pendingId || isCompleting) {
      return;
    }

    setPendingId(augmentationId);
    try {
      await onComplete(augmentationId);
    } finally {
      setPendingId(null);
    }
  };

  return (
    <Drawer isOpen={isOpen} placement="right" size="md" onClose={onClose} returnFocusOnClose={false}>
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader borderBottomWidth="1px">Lesson augmentations</DrawerHeader>
        <DrawerBody px={{ base: 2, md: 6 }} py={6} display="flex" flexDirection="column" gap={6}>
          {allComplete && (
            <Box borderWidth="1px" borderRadius="xl" px={5} py={4} bg={confettiBg} borderColor={confettiBorder}>
              <Stack spacing={1}>
                <Text fontWeight="semibold">Lesson complete</Text>
                <Text fontSize="sm" color={confettiText}>
                  🎉 Confetti celebration coming soon.
                </Text>
              </Stack>
            </Box>
          )}

          <Stack spacing={4} flex="1" overflowY="auto" pr={1}>
            {augmentations.map((item) => {
              const isComplete = Boolean(item.completedAt);
              const isPending = pendingId === item.augmentationId;
              const disabled = isComplete || isPending || isCompleting;

              return (
                <Box key={item.augmentationId} borderWidth="1px" borderRadius="lg" p={4}>
                  <Stack spacing={3}>
                    {item.type === "video" && (
                      <VideoPreview title={item.title} posterUrl={item.posterUrl} />
                    )}
                    <Stack spacing={1}>
                      <Flex align="center" justify="space-between">
                        <Text fontWeight="semibold" fontSize="md">
                          {item.title}
                        </Text>
                        <Badge variant="subtle" colorScheme="purple" textTransform="capitalize">
                          {item.type}
                        </Badge>
                      </Flex>
                      <Text fontSize="sm" color={descriptionColor}>
                        {item.description}
                      </Text>
                    </Stack>
                    <Flex justify="flex-end">
                      <Button
                        size="sm"
                        onClick={() => handleComplete(item.augmentationId)}
                        isDisabled={disabled}
                        isLoading={isPending}
                        colorScheme={isComplete ? "green" : "primary"}
                        leftIcon={isComplete ? <Icon as={Check} boxSize={4} /> : undefined}
                      >
                        {isComplete ? "Completed" : "Mark complete"}
                      </Button>
                    </Flex>
                  </Stack>
                </Box>
              );
            })}

            {augmentations.length === 0 && (
              <Box
                borderWidth="1px"
                borderStyle="dashed"
                borderRadius="lg"
                px={4}
                py={12}
                textAlign="center"
                color={emptyStateColor}
              >
                No augmentations planned yet.
              </Box>
            )}
          </Stack>
        </DrawerBody>
        <DrawerFooter borderTopWidth="1px">
          <Button variant="ghost" mr={3} onClick={onClose}>
            Close
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
