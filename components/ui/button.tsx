"use client";

import { forwardRef } from "react";
import { Slot } from "@radix-ui/react-slot";
import {
  Button as ChakraButton,
  type ButtonProps as ChakraButtonProps
} from "@chakra-ui/react";

export type ButtonVariant = "solid" | "outline" | "ghost" | "primary";

export interface ButtonProps extends Omit<ChakraButtonProps, "variant"> {
  variant?: ButtonVariant;
  asChild?: boolean;
  href?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "solid",
      colorScheme = "primary",
      borderRadius = "xl",
      fontWeight = "semibold",
      _focusVisible = {
        boxShadow: "0 0 0 2px var(--chakra-colors-primary-200)",
        _dark: { boxShadow: "0 0 0 2px var(--chakra-colors-primary-400)" }
      },
      _disabled = {
        opacity: 0.6,
        cursor: "not-allowed",
        boxShadow: "none"
      },
      asChild = false,
      ...props
    },
    ref
  ) => {
    const resolvedVariant: ChakraButtonProps["variant"] =
      variant === "primary" ? "solid" : variant;

    return (
      <ChakraButton
        as={asChild ? Slot : undefined}
        ref={ref}
        variant={resolvedVariant}
        colorScheme={colorScheme}
        borderRadius={borderRadius}
        fontWeight={fontWeight}
        _focusVisible={_focusVisible}
        _disabled={_disabled}
        transition="transform 0.2s ease, box-shadow 0.2s ease"
        _active={{ transform: "translateY(0)" }}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
