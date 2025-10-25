"use client";

import { forwardRef } from "react";
import { Badge as ChakraBadge, type BadgeProps as ChakraBadgeProps } from "@chakra-ui/react";

type BadgeVariant = "default" | "secondary" | "accent" | "destructive" | "outline";

export type BadgeProps = ChakraBadgeProps & {
  tone?: BadgeVariant;
};

const variantMap: Record<BadgeVariant, { colorScheme: string; variant: ChakraBadgeProps["variant"] }> = {
  default: { colorScheme: "primary", variant: "subtle" },
  secondary: { colorScheme: "secondary", variant: "subtle" },
  accent: { colorScheme: "accent", variant: "subtle" },
  destructive: { colorScheme: "red", variant: "subtle" },
  outline: { colorScheme: "gray", variant: "outline" }
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>((props, ref) => {
  const {
    tone = "default",
    borderRadius = "full",
    fontWeight = "semibold",
    textTransform = "uppercase",
    letterSpacing = "0.08em",
    variant,
    colorScheme,
    ...rest
  } = props;
  const fallback = variantMap[tone];

  return (
    <ChakraBadge
      ref={ref}
      colorScheme={colorScheme ?? fallback.colorScheme}
      variant={variant ?? fallback.variant}
      borderRadius={borderRadius}
      fontWeight={fontWeight}
      textTransform={textTransform}
      letterSpacing={letterSpacing}
      {...rest}
    />
  );
});

Badge.displayName = "Badge";

export type { BadgeVariant };
