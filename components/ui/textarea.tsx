"use client";

import { forwardRef } from "react";
import { Textarea as ChakraTextarea, type TextareaProps as ChakraTextareaProps } from "@chakra-ui/react";

export type TextareaProps = ChakraTextareaProps;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>((props, ref) => {
  const {
    minH = "8rem",
    borderRadius = "xl",
    borderColor = "border.subtle",
    focusBorderColor = "primary.400",
    _hover,
    _focusVisible,
    _disabled,
    ...rest
  } = props;

  return (
    <ChakraTextarea
      ref={ref}
      minH={minH}
      borderRadius={borderRadius}
      borderColor={borderColor}
      focusBorderColor={focusBorderColor}
      _hover={_hover ?? { borderColor: "border.emphasis" }}
      _focusVisible=
        {_focusVisible ?? {
          borderColor: "primary.400",
          boxShadow: "0 0 0 1px var(--chakra-colors-primary-300)",
          _dark: { boxShadow: "0 0 0 1px var(--chakra-colors-primary-400)" }
        }}
      _disabled=
        {_disabled ?? {
          opacity: 0.6,
          cursor: "not-allowed",
          backgroundColor: "bg.muted"
        }}
      transition="box-shadow 0.2s ease, border-color 0.2s ease"
      {...rest}
    />
  );
});

Textarea.displayName = "Textarea";
