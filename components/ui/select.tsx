import { forwardRef } from "react";
import { Select as ChakraSelect, type SelectProps as ChakraSelectProps } from "@chakra-ui/react";

export type SelectProps = ChakraSelectProps;

const Select = forwardRef<HTMLSelectElement, SelectProps>((props, ref) => {
  const {
    variant,
    size,
    borderRadius,
    borderColor,
    focusBorderColor,
    iconColor,
    _hover,
    _focusVisible,
    _disabled,
    ...rest
  } = props;

  return (
    <ChakraSelect
      ref={ref}
      variant={variant ?? "outline"}
      size={size ?? "md"}
      borderRadius={borderRadius ?? "lg"}
      borderColor={borderColor ?? "border.subtle"}
      focusBorderColor={focusBorderColor ?? "primary.400"}
      iconColor={iconColor ?? "fg.muted"}
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
Select.displayName = "Select";

export { Select };
