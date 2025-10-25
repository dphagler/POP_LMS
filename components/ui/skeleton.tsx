"use client";

import { forwardRef } from "react";
import { Skeleton as ChakraSkeleton, type SkeletonProps as ChakraSkeletonProps } from "@chakra-ui/react";

export type SkeletonProps = ChakraSkeletonProps;

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>((props, ref) => {
  const { borderRadius = "xl", startColor = "gray.100", endColor = "gray.200", ...rest } = props;

  return (
    <ChakraSkeleton
      ref={ref}
      borderRadius={borderRadius}
      startColor={startColor}
      endColor={endColor}
      {...rest}
    />
  );
});

Skeleton.displayName = "Skeleton";
