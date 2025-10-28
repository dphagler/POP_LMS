"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { Box, Drawer, DrawerContent, DrawerOverlay, Flex, useBreakpointValue, useDisclosure } from "@chakra-ui/react";
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
  actions?: ReactNode;
  children: ReactNode;
};

export function AdminShell({ title, breadcrumb, actions, children }: AdminShellProps) {
  const { navItems } = useAdminShellContext();
  const disclosure = useDisclosure();
  const pathname = usePathname();
  const isDesktop = useBreakpointValue({ base: false, lg: true }, { fallback: "base" });
  const showAdminHome = pathname !== "/admin";

  const breadcrumbs = breadcrumb?.length
    ? breadcrumb
    : title
    ? [{ label: title }]
    : undefined;

  return (
    <Flex minH="100vh" bg="bg.canvas">
      <Box display={{ base: "none", lg: "block" }} borderRightWidth="1px" borderColor="border.subtle" maxW="18rem" w="full">
        <AdminSidebar navItems={navItems} onNavigate={disclosure.onClose} />
      </Box>

      <Drawer placement="left" onClose={disclosure.onClose} isOpen={disclosure.isOpen} size="xs">
        <DrawerOverlay display={{ base: "block", lg: "none" }} />
        <DrawerContent display={{ base: "block", lg: "none" }}>
          <AdminSidebar navItems={navItems} onNavigate={disclosure.onClose} isInDrawer />
        </DrawerContent>
      </Drawer>

      <Flex flex="1" direction="column" minH="100vh">
        <AdminTopbar
          title={title}
          actions={actions}
          onMenuClick={disclosure.onOpen}
          showMenuButton={!isDesktop}
          showAdminHome={showAdminHome}
        />
        <Box as="main" flex="1" px={{ base: 4, md: 8 }} py={{ base: 4, md: 6 }}>
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
