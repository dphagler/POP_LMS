"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, isValidElement, type ReactNode } from "react";
import { Button, type ButtonProps, useColorModeValue } from "@chakra-ui/react";

import { isActive } from "@/lib/admin/nav-active";

export { isActive };

export type AdminNavLinkProps = Omit<ButtonProps, "as" | "href" | "leftIcon" | "children"> & {
  href: string;
  exact?: boolean;
  children: ReactNode;
  leftIcon?: ReactNode;
  testId?: string;
};

export function AdminNavLink({
  href,
  exact,
  children,
  leftIcon,
  testId,
  ...rest
}: AdminNavLinkProps) {
  const pathname = usePathname();
  const active = isActive(href, exact, pathname);

  const {
    variant = "ghost",
    justifyContent = "flex-start",
    fontWeight = "medium",
    borderRadius = "md",
    colorScheme,
    bg,
    color,
    ...otherProps
  } = rest;

  const activeBg = useColorModeValue("primary.50", "primary.900");
  const activeColor = useColorModeValue("primary.600", "primary.100");

  const resolvedColorScheme = active ? "primary" : colorScheme;
  const resolvedVariant = active ? "solid" : variant;
  const resolvedBg = active ? activeBg : bg;
  const resolvedColor = active ? activeColor : color;

  const resolvedLeftIcon =
    leftIcon == null
      ? undefined
      : isValidElement(leftIcon)
        ? leftIcon
        : <Fragment>{leftIcon}</Fragment>;

  return (
    <Button
      as={NextLink}
      href={href}
      leftIcon={resolvedLeftIcon}
      variant={resolvedVariant}
      colorScheme={resolvedColorScheme}
      justifyContent={justifyContent}
      fontWeight={fontWeight}
      borderRadius={borderRadius}
      bg={resolvedBg}
      color={resolvedColor}
      data-testid={testId}
      aria-current={active ? "page" : undefined}
      {...otherProps}
    >
      {children}
    </Button>
  );
}
