"use client";

import { forwardRef } from "react";
import {
  Card as ChakraCard,
  CardBody as ChakraCardBody,
  CardFooter as ChakraCardFooter,
  CardHeader as ChakraCardHeader,
  Heading,
  Text,
  type CardBodyProps as ChakraCardBodyProps,
  type CardFooterProps as ChakraCardFooterProps,
  type CardHeaderProps as ChakraCardHeaderProps,
  type CardProps as ChakraCardProps,
  type HeadingProps,
  type TextProps
} from "@chakra-ui/react";

const Card = forwardRef<HTMLDivElement, ChakraCardProps>((props, ref) => {
  const { background, borderRadius, borderWidth, borderColor, boxShadow, ...rest } = props;

  return (
    <ChakraCard
      ref={ref}
      background={background ?? "bg.surface"}
      borderRadius={borderRadius ?? "2xl"}
      borderWidth={borderWidth ?? "1px"}
      borderColor={borderColor ?? "border.subtle"}
      boxShadow={boxShadow ?? "sm"}
      overflow="hidden"
      {...rest}
    />
  );
});
Card.displayName = "Card";

const CardHeader = forwardRef<HTMLDivElement, ChakraCardHeaderProps>((props, ref) => {
  const { padding, pb, display, flexDirection, gap, ...rest } = props;

  return (
    <ChakraCardHeader
      ref={ref}
      padding={padding ?? 6}
      pb={pb ?? 0}
      display={display ?? "flex"}
      flexDirection={flexDirection ?? "column"}
      gap={gap ?? 3}
      {...rest}
    />
  );
});
CardHeader.displayName = "CardHeader";

const CardContent = forwardRef<HTMLDivElement, ChakraCardBodyProps>((props, ref) => {
  const { padding, pt, display, flexDirection, gap, ...rest } = props;

  return (
    <ChakraCardBody
      ref={ref}
      padding={padding ?? 6}
      pt={pt ?? 4}
      display={display ?? "flex"}
      flexDirection={flexDirection ?? "column"}
      gap={gap ?? 4}
      {...rest}
    />
  );
});
CardContent.displayName = "CardContent";

const CardFooter = forwardRef<HTMLDivElement, ChakraCardFooterProps>((props, ref) => {
  const { padding, pt, pb, display, alignItems, gap, ...rest } = props;

  return (
    <ChakraCardFooter
      ref={ref}
      padding={padding ?? 6}
      pt={pt ?? 4}
      pb={pb ?? 6}
      display={display ?? "flex"}
      alignItems={alignItems ?? "center"}
      gap={gap ?? 3}
      {...rest}
    />
  );
});
CardFooter.displayName = "CardFooter";

const CardTitle = forwardRef<HTMLHeadingElement, HeadingProps>((props, ref) => {
  const { fontSize, fontWeight, letterSpacing, ...rest } = props;

  return (
    <Heading
      ref={ref}
      as="h3"
      fontSize={fontSize ?? "lg"}
      fontWeight={fontWeight ?? "semibold"}
      letterSpacing={letterSpacing ?? "-0.01em"}
      {...rest}
    />
  );
});
CardTitle.displayName = "CardTitle";

const CardDescription = forwardRef<HTMLParagraphElement, TextProps>((props, ref) => {
  const { fontSize, color, ...rest } = props;

  return <Text ref={ref} fontSize={fontSize ?? "sm"} color={color ?? "fg.muted"} {...rest} />;
});
CardDescription.displayName = "CardDescription";

export { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription };
