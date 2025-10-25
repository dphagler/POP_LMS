"use client";

import { forwardRef } from "react";
import { FormLabel, type FormLabelProps } from "@chakra-ui/react";

export type LabelProps = FormLabelProps;

export const Label = forwardRef<HTMLLabelElement, LabelProps>((props, ref) => {
  const { fontWeight = "semibold", fontSize = "sm", letterSpacing = "tight", ...rest } = props;

  return (
    <FormLabel
      ref={ref}
      fontWeight={fontWeight}
      fontSize={fontSize}
      letterSpacing={letterSpacing}
      display="inline-flex"
      alignItems="center"
      gap={2}
      {...rest}
    />
  );
});

Label.displayName = "Label";
