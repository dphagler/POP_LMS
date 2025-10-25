"use client";

import { forwardRef } from "react";
import { Switch as ChakraSwitch, type SwitchProps as ChakraSwitchProps } from "@chakra-ui/react";

export interface SwitchProps extends Omit<ChakraSwitchProps, "isChecked" | "onChange"> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>((props, ref) => {
  const {
    checked,
    onCheckedChange,
    colorScheme = "primary",
    size = "md",
    disabled,
    isDisabled,
    ...rest
  } = props;

  return (
    <ChakraSwitch
      ref={ref}
      isChecked={checked}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
      colorScheme={colorScheme}
      size={size}
      isDisabled={isDisabled ?? disabled}
      {...rest}
    />
  );
});

Switch.displayName = "Switch";
