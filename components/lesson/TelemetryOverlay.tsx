"use client";

import { Badge, Box, Button, Divider, HStack, Stack, Text } from "@chakra-ui/react";

const DEBUG =
  process.env.NEXT_PUBLIC_TELEMETRY_DEBUG === "1" ||
  process.env.NEXT_PUBLIC_TELEMETRY_DEBUG === "true";

const formatSeconds = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) {
    return "0";
  }

  if (value >= 100) {
    return Math.round(value).toString();
  }

  return value.toFixed(1);
};

const formatPercent = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) {
    return "0%";
  }

  return `${Math.min(100, Math.max(0, Math.round(value)))}%`;
};

type TelemetryOverlayProps = {
  lessonId: string;
  provider: string;
  videoId: string | null;
  currentTime: number;
  duration: number;
  lastPostStatus: string;
  uniqueSeconds: number;
  percent: number;
  segmentCount: number;
  onForceTick: () => void;
  isForceTickPending?: boolean;
};

export function TelemetryOverlay({
  lessonId,
  provider,
  videoId,
  currentTime,
  duration,
  lastPostStatus,
  uniqueSeconds,
  percent,
  segmentCount,
  onForceTick,
  isForceTickPending = false,
}: TelemetryOverlayProps) {
  if (!DEBUG) {
    return null;
  }

  return (
    <Box
      position="fixed"
      bottom={{ base: 4, md: 6 }}
      right={{ base: 4, md: 6 }}
      w="280px"
      bg="blackAlpha.800"
      color="white"
      borderRadius="lg"
      boxShadow="xl"
      p={4}
      zIndex="tooltip"
      pointerEvents="auto"
    >
      <Stack spacing={3} fontSize="xs">
        <HStack justify="space-between">
          <Text fontSize="sm" fontWeight="bold">
            Telemetry
          </Text>
          <Badge colorScheme="purple">Debug</Badge>
        </HStack>

        <Stack spacing={1}>
          <HStack justify="space-between">
            <Text opacity={0.7}>Lesson</Text>
            <Text fontWeight="semibold">{lessonId}</Text>
          </HStack>
          <HStack justify="space-between">
            <Text opacity={0.7}>Provider</Text>
            <Text fontWeight="semibold">{provider}</Text>
          </HStack>
          <HStack justify="space-between" align="flex-start">
            <Text opacity={0.7}>Video ID</Text>
            <Text fontWeight="semibold" textAlign="right">
              {videoId || "-"}
            </Text>
          </HStack>
          <HStack justify="space-between">
            <Text opacity={0.7}>Current time</Text>
            <Text fontWeight="semibold">{formatSeconds(currentTime)}s</Text>
          </HStack>
          <HStack justify="space-between">
            <Text opacity={0.7}>Duration</Text>
            <Text fontWeight="semibold">{formatSeconds(duration)}s</Text>
          </HStack>
          <HStack justify="space-between" align="flex-start">
            <Text opacity={0.7}>Last POST</Text>
            <Text textAlign="right" fontWeight="semibold">
              {lastPostStatus || "-"}
            </Text>
          </HStack>
          <HStack justify="space-between">
            <Text opacity={0.7}>Unique seconds</Text>
            <Text fontWeight="semibold">{Math.max(0, Math.round(uniqueSeconds))}</Text>
          </HStack>
          <HStack justify="space-between">
            <Text opacity={0.7}>Computed percent</Text>
            <Text fontWeight="semibold">{formatPercent(percent)}</Text>
          </HStack>
          <HStack justify="space-between">
            <Text opacity={0.7}>Segments</Text>
            <Text fontWeight="semibold">{segmentCount}</Text>
          </HStack>
        </Stack>

        <Divider borderColor="whiteAlpha.300" />

        {DEBUG ? (
          <Button
            size="xs"
            colorScheme="purple"
            onClick={onForceTick}
            isLoading={isForceTickPending}
            loadingText="Posting"
          >
            Force tick
          </Button>
        ) : null}
      </Stack>
    </Box>
  );
}
