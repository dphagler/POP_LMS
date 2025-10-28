"use client";

import { useMemo, type RefObject } from "react";
import { usePathname } from "next/navigation";
import { Box, Flex, Stack, Text, useColorModeValue } from "@chakra-ui/react";

import type { AdminNavItem } from "@/lib/admin/nav";

import { useAdminShellContext } from "./AdminShell";
import { AdminNavLink, isActive } from "./AdminNavLink";

type AdminSidebarProps = {
  navItems: AdminNavItem[];
  onNavigate?: () => void;
  isInDrawer?: boolean;
  initialFocusRef?: RefObject<HTMLAnchorElement | null>;
  navigationId?: string;
};

export function AdminSidebar({ navItems, onNavigate, isInDrawer, initialFocusRef, navigationId }: AdminSidebarProps) {
  const pathname = usePathname();
  const { role } = useAdminShellContext();
  const borderColor = useColorModeValue("border.subtle", "border.emphasis");
  const activeBg = useColorModeValue("primary.50", "primary.900");
  const activeColor = useColorModeValue("primary.600", "primary.100");
  const sidebarBg = useColorModeValue("white", "gray.900");

  const accessibleItems = useMemo(
    () => navItems.filter((item) => item.roles.includes(role)),
    [navItems, role]
  );

  const handleNavigate = () => {
    if (onNavigate) {
      onNavigate();
    }
  };

  return (
    <Flex
      direction="column"
      h="100%"
      bg={sidebarBg}
      borderColor={isInDrawer ? undefined : borderColor}
      borderRightWidth={isInDrawer ? 0 : "1px"}
      w="full"
      maxW="18rem"
    >
      <Box px={6} pt={6} pb={4} borderBottomWidth="1px" borderColor={borderColor}>
        <Text fontWeight="bold" fontSize="lg">
          Admin
        </Text>
        <Text fontSize="sm" color="fg.muted">
          Manage your organization
        </Text>
      </Box>
      <Box flex="1" overflowY="auto">
        <Stack as="nav" spacing={1} px={2} py={4} aria-label="Admin navigation" id={navigationId}>
          {accessibleItems.map((item, index) => {
            const active = isActive(item.href, item.exact, pathname);
            const leftIcon =
              item.icon === null || item.icon === undefined ? undefined : <>{item.icon}</>;
            const slug = item.href.replace(/^\/+/, "").replace(/\//g, "-") || "root";
            const ref = index === 0 ? initialFocusRef : undefined;
            return (
              <AdminNavLink
                key={item.href}
                href={item.href}
                exact={item.exact}
                leftIcon={leftIcon}
                bg={active ? activeBg : undefined}
                color={active ? activeColor : undefined}
                onClick={handleNavigate}
                testId={`admin-sidebar-link-${slug}`}
                ref={ref}
              >
                {item.label}
              </AdminNavLink>
            );
          })}
        </Stack>
      </Box>
      <Box px={4} py={6} borderTopWidth="1px" borderColor={borderColor}>
        <AdminNavLink
          href="/app"
          variant="ghost"
          w="full"
          justifyContent="flex-start"
          onClick={handleNavigate}
          testId="admin-sidebar-link-app"
        >
          ← Back to POP LMS
        </AdminNavLink>
      </Box>
    </Flex>
  );
}
