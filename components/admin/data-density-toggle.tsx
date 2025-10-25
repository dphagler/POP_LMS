"use client";

import { Box, ButtonGroup, useColorModeValue } from "@chakra-ui/react";

import { Button } from "@/components/ui/button";

export type DataDensity = "comfortable" | "compact";

type DataDensityToggleProps = {
  density: DataDensity;
  onDensityChange: (density: DataDensity) => void;
  className?: string;
};

const OPTIONS: Array<{ label: string; value: DataDensity }> = [
  { label: "Comfortable", value: "comfortable" },
  { label: "Compact", value: "compact" }
];

export function DataDensityToggle({ density, onDensityChange, className }: DataDensityToggleProps) {
  const background = useColorModeValue("gray.100", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  return (
    <Box className={className}>
      <ButtonGroup
        isAttached
        size="sm"
        borderRadius="full"
        bg={background}
        borderWidth="1px"
        borderColor={borderColor}
        p={1}
        gap={1}
      >
        {OPTIONS.map((option) => {
          const isActive = density === option.value;
          return (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={isActive ? "solid" : "ghost"}
              colorScheme={isActive ? "primary" : "gray"}
              borderRadius="full"
              fontSize="xs"
              fontWeight="semibold"
              px={3}
              minH="2rem"
              aria-pressed={isActive}
              onClick={() => {
                if (!isActive) {
                  onDensityChange(option.value);
                }
              }}
            >
              {option.label}
            </Button>
          );
        })}
      </ButtonGroup>
    </Box>
  );
}
