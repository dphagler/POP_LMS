"use client";

import { forwardRef } from "react";
import { Progress as ChakraProgress, type ProgressProps as ChakraProgressProps } from "@chakra-ui/react";

export type ProgressProps = ChakraProgressProps;

export const Progress = forwardRef<HTMLDivElement, ProgressProps>((props, ref) => {
  const {
    value = 0,
    colorScheme = "primary",
    borderRadius = "full",
    height = 2,
    ...rest
  } = props;

  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? Number(value) : 0));

  return (
    <ChakraProgress
      ref={ref}
      value={clamped}
      colorScheme={colorScheme}
      borderRadius={borderRadius}
      height={height}
      {...rest}
    />
  );
});

Progress.displayName = "Progress";
