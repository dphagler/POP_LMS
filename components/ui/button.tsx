"use client";

import { AnchorHTMLAttributes, forwardRef } from "react";
import {
  Button as ChakraButton,
  type ButtonProps as ChakraButtonProps
} from "@chakra-ui/react";

export type ButtonVariant = "solid" | "outline" | "ghost" | "primary";

type AnchorExtras = Pick<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "download" | "rel" | "target" | "referrerPolicy"
>;

export interface ButtonProps
  extends Omit<ChakraButtonProps, "variant">,
    AnchorExtras {
  variant?: ButtonVariant;
  href?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
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
      ...props
    },
    ref
  ) => {
    const resolvedVariant: ChakraButtonProps["variant"] =
      variant === "primary" ? "solid" : variant;

    return (
      <ChakraButton
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
      >
        {children}
      </ChakraButton>
    );
  }
);
Button.displayName = "Button";

export { Button };
