"use client";

import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import {
  Box,
  Drawer,
  DrawerContent,
  DrawerOverlay,
  Flex,
  useBreakpointValue,
  useDisclosure,
  chakra
} from "@chakra-ui/react";
import { usePathname } from "next/navigation";

import type { AdminNavItem } from "@/lib/admin/nav";
import type { AdminAccessRole } from "@/lib/authz";

import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";
import { AdminBreadcrumbs, type AdminBreadcrumbItem } from "./AdminBreadcrumbs";

type AdminShellContextValue = {
  navItems: AdminNavItem[];
  user: {
    name: string | null;
    email: string | null;
    image?: string | null;
  };
  org: {
    id: string | null;
    name: string;
    options: Array<{ id: string; name: string }>;
  };
  role: AdminAccessRole;
};

const AdminShellContext = createContext<AdminShellContextValue | null>(null);

type AdminShellProviderProps = {
  value: AdminShellContextValue;
  children: ReactNode;
};

export function AdminShellProvider({ value, children }: AdminShellProviderProps) {
  return <AdminShellContext.Provider value={value}>{children}</AdminShellContext.Provider>;
}

export function useAdminShellContext() {
  const context = useContext(AdminShellContext);
  if (!context) {
    throw new Error("AdminShell components must be used within an AdminShellProvider.");
  }
  return context;
}

type AdminShellProps = {
  title?: string;
  breadcrumb?: AdminBreadcrumbItem[];
  children: ReactNode;
};

export function AdminShell({ title, breadcrumb, children }: AdminShellProps) {
  const { navItems, role } = useAdminShellContext();
  const disclosure = useDisclosure();
  const { isOpen, onOpen, onClose } = disclosure;
  const pathname = usePathname();
  const isDesktop = useBreakpointValue({ base: false, lg: true }, { fallback: "base" });
  const showAdminHome = pathname !== "/admin";
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const firstNavLinkRef = useRef<HTMLAnchorElement | null>(null);
  const drawerNavigationId = "admin-mobile-navigation";

  const accessibleNavItems = useMemo(
    () => navItems.filter((item) => item.roles.includes(role)),
    [navItems, role]
  );

  useEffect(() => {
    if (isOpen) {
      onClose();
    }
  }, [pathname, isOpen, onClose]);

  const breadcrumbs = breadcrumb?.length
    ? breadcrumb
    : title
    ? [{ label: title }]
    : undefined;

  return (
    <Flex minH="100vh" bg="bg.canvas" position="relative">
      <chakra.a
        href="#admin-main-content"
        position="absolute"
        left="50%"
        top={2}
        transform="translate(-50%, -200%)"
        px={4}
        py={2}
        bg="primary.500"
        color="white"
        borderRadius="md"
        fontWeight="semibold"
        zIndex={20}
        _focusVisible={{ transform: "translate(-50%, 0)" }}
      >
        Skip to main content
      </chakra.a>
      <Box display={{ base: "none", lg: "block" }} borderRightWidth="1px" borderColor="border.subtle" maxW="18rem" w="full">
        <AdminSidebar navItems={accessibleNavItems} onNavigate={onClose} />
      </Box>

      <Drawer
        placement="left"
        onClose={onClose}
        isOpen={isOpen}
        size="xs"
        initialFocusRef={firstNavLinkRef}
        finalFocusRef={menuButtonRef}
      >
        <DrawerOverlay display={{ base: "block", lg: "none" }} />
        <DrawerContent display={{ base: "block", lg: "none" }}>
          <AdminSidebar
            navItems={accessibleNavItems}
            onNavigate={onClose}
            isInDrawer
            initialFocusRef={firstNavLinkRef}
            navigationId={drawerNavigationId}
          />
        </DrawerContent>
      </Drawer>

      <Flex flex="1" direction="column" minH="100vh">
        <AdminTopbar
          title={title}
          onMenuClick={onOpen}
          showMenuButton={!isDesktop}
          showAdminHome={showAdminHome}
          isMenuOpen={isOpen}
          menuButtonRef={menuButtonRef}
          menuButtonControls={drawerNavigationId}
        />
        <Box as="main" id="admin-main-content" flex="1" px={{ base: 4, md: 8 }} py={{ base: 4, md: 6 }}>
          {breadcrumbs ? (
            <Box mb={{ base: 4, md: 6 }}>
              <AdminBreadcrumbs items={breadcrumbs} />
            </Box>
          ) : null}
          <Box maxW="7xl" mx="auto" w="full">
            {children}
          </Box>
        </Box>
      </Flex>
    </Flex>
  );
}
