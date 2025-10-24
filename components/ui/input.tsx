"use client";

import { forwardRef } from "react";
import { Input as ChakraInput, type InputProps as ChakraInputProps } from "@chakra-ui/react";

export type InputProps = ChakraInputProps & { required?: boolean; disabled?: boolean };

const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  const {
    variant,
    size,
    borderRadius,
    borderColor,
    focusBorderColor,
    _hover,
    _focusVisible,
    _disabled,
    required,
    disabled,
    isRequired,
    isDisabled,
    ...rest
  } = props;

  return (
    <ChakraInput
      ref={ref}
      variant={variant ?? "outline"}
      size={size ?? "md"}
      borderRadius={borderRadius ?? "lg"}
      borderColor={borderColor ?? "border.subtle"}
      focusBorderColor={focusBorderColor ?? "primary.400"}
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
      isRequired={isRequired ?? required}
      isDisabled={isDisabled ?? disabled}
      transition="box-shadow 0.2s ease, border-color 0.2s ease"
      {...rest}
    />
  );
});
Input.displayName = "Input";

export { Input };
