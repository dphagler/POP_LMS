"use client";

import { useMemo } from "react";
import { Check, Monitor, Moon, Palette, Sun } from "lucide-react";
import {
  Alert,
  Badge,
  Box,
  HStack,
  Icon,
  SimpleGrid,
  Stack,
  Text,
  useColorModeValue
} from "@chakra-ui/react";

import { useThemeMode, type ThemeMode } from "@/components/layout/theme-provider";

type ThemeOption = {
  icon: typeof Sun;
  label: string;
  description: string;
  value: ThemeMode;
};

type TokenSwatch = {
  name: string;
  token: string;
  bg: string;
  color: string;
  borderColor?: string;
};

const OPTIONS: ThemeOption[] = [
  {
    value: "light",
    label: "POP",
    description: "Bright, airy palette tailored to the POP visual language.",
    icon: Sun,
  },
  {
    value: "dark",
    label: "POP Dark",
    description: "Moody contrast for comfortable viewing after hours.",
    icon: Moon,
  },
  {
    value: "system",
    label: "System",
    description: "Match your device’s appearance settings.",
    icon: Monitor,
  },
];

const TOKEN_SWATCHES = [
  { name: "Primary", token: "primary.500", bg: "primary.500", color: "white" },
  { name: "Primary (muted)", token: "primary.100", bg: "primary.100", color: "gray.900" },
  { name: "Secondary", token: "secondary.500", bg: "secondary.500", color: "white" },
  { name: "Secondary (muted)", token: "secondary.100", bg: "secondary.100", color: "gray.900" },
  { name: "Surface", token: "bg.surface", bg: "bg.surface", color: "fg.default", borderColor: "border.subtle" },
  { name: "Muted surface", token: "bg.muted", bg: "bg.muted", color: "fg.default" },
  { name: "Canvas", token: "bg.canvas", bg: "bg.canvas", color: "fg.default", borderColor: "border.subtle" }
] satisfies readonly TokenSwatch[];

export function AppearanceSettings() {
  const { mode, resolvedMode, setMode } = useThemeMode();
  const activeBorderColor = useColorModeValue("primary.200", "primary.400");
  const activeBackground = useColorModeValue("primary.50", "primary.900");
  const hoverBorderColor = useColorModeValue("primary.300", "primary.500");

  const activeThemeName = useMemo(() => {
    if (mode === "system") {
      return resolvedMode === "dark" ? "pop-dark" : "pop";
    }
    return mode === "dark" ? "pop-dark" : "pop";
  }, [mode, resolvedMode]);

  const statusMessage = useMemo(() => {
    if (mode === "system") {
      return `Following your system preference. Currently ${resolvedMode} mode.`;
    }
    if (mode === "dark") {
      return "POP Dark is active across the app.";
    }
    return "POP (light) is active across the app.";
  }, [mode, resolvedMode]);

  return (
    <Stack spacing={6}>
      <Stack spacing={1}>
        <Text fontSize="lg" fontWeight="semibold">
          Theme
        </Text>
        <Text fontSize="sm" color="fg.muted">
          Choose how POP Initiative looks on this device. Your selection is saved in this browser.
        </Text>
      </Stack>

      <Stack spacing={4}>
        <Text fontSize="sm" fontWeight="semibold">
          Color mode
        </Text>
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
          {OPTIONS.map((option) => {
            const LucideIcon = option.icon;
            const isActive = option.value === mode;

            return (
              <Box
                key={option.value}
                as="label"
                htmlFor={`theme-${option.value}`}
                borderWidth="1px"
                borderRadius="2xl"
                borderColor={isActive ? activeBorderColor : "border.subtle"}
                boxShadow={isActive ? "md" : "sm"}
                bg={isActive ? activeBackground : "bg.surface"}
                transition="all 0.2s ease"
                cursor="pointer"
                _hover={{ borderColor: hoverBorderColor, boxShadow: "md", transform: "translateY(-2px)" }}
                position="relative"
                overflow="hidden"
              >
                <input
                  id={`theme-${option.value}`}
                  type="radio"
                  name="theme-mode"
                  value={option.value}
                  checked={isActive}
                  onChange={() => setMode(option.value)}
                  style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
                />
                <Stack spacing={3} p={5}>
                  <HStack justify="space-between" align="center">
                    <HStack spacing={2}>
                      <Icon as={LucideIcon} boxSize={5} aria-hidden />
                      <Text fontWeight="semibold">{option.label}</Text>
                    </HStack>
                    {isActive ? (
                      <Badge colorScheme="primary" borderRadius="full" px={2} py={1} fontSize="xs">
                        <HStack spacing={1}>
                          <Icon as={Check} boxSize={3} aria-hidden />
                          <Text as="span">Active</Text>
                        </HStack>
                      </Badge>
                    ) : null}
                  </HStack>
                  <Text fontSize="sm" color="fg.muted" lineHeight="tall">
                    {option.description}
                  </Text>
                </Stack>
              </Box>
            );
          })}
        </SimpleGrid>
      </Stack>

      <Alert status="info" borderRadius="lg" variant="subtle" role="status">
        <HStack align="flex-start" spacing={3}>
          <Icon as={Palette} boxSize={5} aria-hidden />
          <Stack spacing={1} fontSize="sm">
            <Text fontWeight="medium">{statusMessage}</Text>
            <Text color="fg.muted">
              Active theme: <Text as="span" fontFamily="mono">{activeThemeName}</Text>
            </Text>
          </Stack>
        </HStack>
      </Alert>

      <Stack spacing={3}>
        <HStack justify="space-between" align="center">
          <Text fontSize="xs" fontWeight="semibold" textTransform="uppercase" letterSpacing="0.2em" color="fg.muted">
            Theme tokens
          </Text>
          <Badge variant="subtle" borderRadius="full" colorScheme="primary" px={3} py={1} fontSize="xs">
            {activeThemeName}
          </Badge>
        </HStack>
        <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={3}>
          {TOKEN_SWATCHES.map((token) => (
            <Box
              key={token.name}
              borderRadius="2xl"
              p={4}
              minH="88px"
              bg={token.bg}
              color={token.color}
              borderWidth={token.borderColor ? "1px" : undefined}
              borderColor={token.borderColor}
              boxShadow="sm"
              display="flex"
              flexDirection="column"
              justifyContent="space-between"
            >
              <Text fontWeight="semibold">{token.name}</Text>
              <Text fontSize="xs" opacity={0.8} fontFamily="mono">
                {token.token}
              </Text>
            </Box>
          ))}
        </SimpleGrid>
      </Stack>
    </Stack>
  );
}
