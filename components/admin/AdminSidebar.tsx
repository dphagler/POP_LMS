"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Box, Button, Flex, Stack, Text, useColorModeValue } from "@chakra-ui/react";

import type { AdminNavItem } from "@/lib/admin/nav";

function isItemActive(item: AdminNavItem, pathname: string) {
  if (item.exact) {
    return pathname === item.href;
  }

  if (pathname === item.href) {
    return true;
  }

  const normalized = item.href.endsWith("/") ? item.href.slice(0, -1) : item.href;
  return pathname.startsWith(`${normalized}/`);
}

type AdminSidebarProps = {
  navItems: AdminNavItem[];
  onNavigate?: () => void;
  isInDrawer?: boolean;
};

export function AdminSidebar({ navItems, onNavigate, isInDrawer }: AdminSidebarProps) {
  const pathname = usePathname();
  const borderColor = useColorModeValue("border.subtle", "border.emphasis");
  const activeBg = useColorModeValue("primary.50", "primary.900");
  const activeColor = useColorModeValue("primary.600", "primary.100");
  const sidebarBg = useColorModeValue("white", "gray.900");

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
        <Stack as="nav" spacing={1} px={2} py={4} aria-label="Admin navigation">
          {navItems.map((item) => {
            const isActive = isItemActive(item, pathname);
            const leftIcon =
              item.icon === null || item.icon === undefined ? undefined : <>{item.icon}</>;
            return (
              <Button
                key={item.href}
                as={Link}
                href={item.href}
                variant={isActive ? "solid" : "ghost"}
                colorScheme={isActive ? "primary" : undefined}
                justifyContent="flex-start"
                fontWeight="medium"
                borderRadius="md"
                bg={isActive ? activeBg : undefined}
                color={isActive ? activeColor : undefined}
                leftIcon={leftIcon}
                onClick={handleNavigate}
                aria-current={isActive ? "page" : undefined}
              >
                {item.label}
              </Button>
            );
          })}
        </Stack>
      </Box>
      <Box px={4} py={6} borderTopWidth="1px" borderColor={borderColor}>
        <Button as={Link} href="/app" variant="ghost" w="full" justifyContent="flex-start" onClick={handleNavigate}>
          ← Back to POP LMS
        </Button>
      </Box>
    </Flex>
  );
}
