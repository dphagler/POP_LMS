"use client";

import {
  AnchorHTMLAttributes,
  ElementType,
  forwardRef,
  isValidElement
} from "react";
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
  asChild?: boolean;
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
      asChild = false,
      ...props
    },
    ref
  ) => {
    const resolvedVariant: ChakraButtonProps["variant"] =
      variant === "primary" ? "solid" : variant;

    const chakraButtonProps: ChakraButtonProps = {
      variant: resolvedVariant,
      colorScheme,
      borderRadius,
      fontWeight,
      _focusVisible,
      _disabled,
      transition: "transform 0.2s ease, box-shadow 0.2s ease",
      _active: { transform: "translateY(0)" },
      ...props
    };

    if (asChild && isValidElement(children)) {
      const { children: childContent, ...childProps } = children.props;
      const childType = children.type as ElementType;

      return (
        <ChakraButton ref={ref} as={childType} {...childProps} {...chakraButtonProps}>
          {childContent}
        </ChakraButton>
      );
    }

    if (asChild && process.env.NODE_ENV !== "production") {
      console.warn(
        "Button with \"asChild\" expects a single valid React element child. Falling back to a span wrapper."
      );
    }

    return (
      <ChakraButton ref={ref} {...chakraButtonProps}>
        {asChild ? <span>{children}</span> : children}
      </ChakraButton>
    );
  }
);
Button.displayName = "Button";

export { Button };
