"use client";

import { useMemo } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import {
  Flex,
  HStack,
  Icon,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text
} from "@chakra-ui/react";

import { type ThemeMode, useThemeMode } from "./theme-provider";

const OPTIONS: Array<{ icon: typeof Sun; label: string; value: ThemeMode }> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor }
];

export function ThemeModeToggle({ className }: { className?: string }) {
  const { mode, resolvedMode, setMode } = useThemeMode();

  const activeOption = useMemo(
    () => OPTIONS.find((option) => option.value === mode) ?? OPTIONS[2],
    [mode]
  );

  const ActiveIcon = activeOption.icon;
  const systemStatus = mode === "system" ? ` (currently ${resolvedMode} mode)` : "";

  return (
    <Menu placement="bottom-end">
      <MenuButton
        as={IconButton}
        icon={<Icon as={ActiveIcon} boxSize={5} aria-hidden />}
        aria-label={`Theme set to ${activeOption.label}${systemStatus}. Toggle theme menu.`}
        title={`Theme set to ${activeOption.label}${systemStatus}`}
        variant="ghost"
        borderRadius="full"
        className={className}
      />
      <MenuList minW="12rem" py={2}>
        {OPTIONS.map((option) => {
          const IconComponent = option.icon;
          const isActive = option.value === mode;
          return (
            <MenuItem
              key={option.value}
              onClick={() => setMode(option.value)}
              aria-checked={isActive}
              role="menuitemradio"
            >
              <Flex align="center" justify="space-between" w="full" gap={3}>
                <HStack spacing={3}>
                  <Icon as={IconComponent} boxSize={4} aria-hidden />
                  <Text>{option.label}</Text>
                </HStack>
                {isActive ? <Icon as={Check} boxSize={4} aria-hidden /> : null}
              </Flex>
            </MenuItem>
          );
        })}
      </MenuList>
    </Menu>
  );
}
