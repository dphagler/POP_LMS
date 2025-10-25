"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import {
  Avatar,
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Stack,
  Text,
  useColorModeValue
} from "@chakra-ui/react";
import { Loader2 } from "lucide-react";

import { signOutAction } from "@/app/actions/sign-out";
import { SIGN_OUT_TOAST_STORAGE_KEY } from "@/lib/storage-keys";
import { captureError } from "@/lib/client-error-reporting";

import { ThemeModeToggle } from "./theme-toggle";
import { PageFadeIn } from "./page-fade-in";
import { PageShell } from "./page-shell";

export type SidebarLink = {
  href: string;
  label: string;
};

export type AppShellProps = {
  children: ReactNode;
  orgName: string;
  pageTitle?: string;
  sidebarLinks: SidebarLink[];
  userImage?: string | null;
  userName?: string | null;
};

export function AppShell({
  children,
  orgName,
  pageTitle,
  sidebarLinks,
  userImage,
  userName
}: AppShellProps) {
  const pathname = usePathname();
  const [activeHash, setActiveHash] = useState<string>("#today");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleHashChange = () => {
      const hash = window.location.hash || "#today";
      setActiveHash(hash);
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const navItems = useMemo(
    () =>
      sidebarLinks.map((link) => {
        const [pathPart, hashPart] = link.href.split("#");
        const linkPath = pathPart ?? "";
        const linkHash = hashPart ? `#${hashPart}` : "";
        const normalizedHash = activeHash || "#today";

        return {
          ...link,
          isActive: determineActiveState({
            pathname,
            linkPath,
            linkHash,
            normalizedHash
          })
        };
      }),
    [activeHash, pathname, sidebarLinks]
  );

  const sidebar = navItems.length
    ? (
        <SidebarNav navItems={navItems} />
      )
    : null;

  return (
    <PageShell
      header={
        <Header
          orgName={orgName}
          pageTitle={pageTitle}
          displayName={userName ?? "Learner"}
          userImage={userImage}
        />
      }
      sidebar={sidebar}
    >
      {navItems.length ? <MobileNav navItems={navItems} /> : null}
      <PageFadeIn>{children}</PageFadeIn>
    </PageShell>
  );
}

type HeaderProps = {
  displayName: string;
  orgName: string;
  pageTitle?: string;
  userImage?: string | null;
};

function Header({ displayName, orgName, pageTitle, userImage }: HeaderProps) {
  const mutedColor = useColorModeValue("fg.muted", "fg.muted");

  return (
    <Flex align="center" justify="space-between" gap={6}>
      <HStack spacing={5} align="center">
        <Link href="/app">
          <Text fontWeight="semibold" fontSize="lg">
            POP Initiative
          </Text>
        </Link>
        <Stack spacing={0} display={{ base: "none", sm: "flex" }}>
          <Text fontSize="xs" fontWeight="semibold" textTransform="uppercase" letterSpacing="0.24em" color={mutedColor}>
            Organization
          </Text>
          <Text fontSize="sm" fontWeight="medium">
            {orgName}
          </Text>
        </Stack>
        {pageTitle ? (
          <Text fontSize="sm" color={mutedColor} display={{ base: "none", md: "block" }}>
            / {pageTitle}
          </Text>
        ) : null}
      </HStack>
      <HStack spacing={3} align="center">
        <ThemeModeToggle />
        <Text fontSize="sm" fontWeight="semibold" display={{ base: "none", lg: "block" }}>
          {displayName}
        </Text>
        <UserMenu name={displayName} image={userImage} />
      </HStack>
    </Flex>
  );
}

type SidebarNavProps = {
  navItems: Array<SidebarLink & { isActive: boolean }>;
};

function SidebarNav({ navItems }: SidebarNavProps) {
  const borderColor = useColorModeValue("border.subtle", "border.emphasis");
  const activeBg = useColorModeValue("primary.50", "primary.900");

  return (
    <Stack as="nav" spacing={2} aria-label="App navigation" borderWidth="1px" borderColor={borderColor} borderRadius="xl" p={4}>
      {navItems.map((item) => (
        <Button
          key={item.href}
          as={Link}
          href={item.href}
          justifyContent="flex-start"
          variant={item.isActive ? "solid" : "ghost"}
          colorScheme={item.isActive ? "primary" : undefined}
          bg={item.isActive ? activeBg : undefined}
        >
          {item.label}
        </Button>
      ))}
    </Stack>
  );
}

type MobileNavProps = {
  navItems: Array<SidebarLink & { isActive: boolean }>;
};

function MobileNav({ navItems }: MobileNavProps) {
  const borderColor = useColorModeValue("border.subtle", "border.emphasis");

  if (navItems.length === 0) return null;

  return (
    <HStack
      display={{ base: "flex", lg: "none" }}
      spacing={2}
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="xl"
      p={2}
      mb={6}
      overflowX="auto"
    >
      {navItems.map((item) => (
        <Button
          key={item.href}
          as={Link}
          href={item.href}
          size="sm"
          colorScheme={item.isActive ? "primary" : undefined}
          variant={item.isActive ? "solid" : "ghost"}
          flexShrink={0}
        >
          {item.label}
        </Button>
      ))}
    </HStack>
  );
}

type UserMenuProps = {
  image?: string | null;
  name: string;
};

function UserMenu({ image, name }: UserMenuProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(async () => {
      try {
        await signOutAction();
        if (typeof window !== "undefined") {
          sessionStorage.setItem(SIGN_OUT_TOAST_STORAGE_KEY, "Signed out");
        }
        router.push("/");
        router.refresh();
      } catch (error) {
        captureError(error, { event: "sign_out_failed" });
      }
    });
  };

  return (
    <Menu placement="bottom-end">
      <MenuButton
        as={Button}
        variant="ghost"
        borderRadius="full"
        p={0}
        minW="auto"
        w="auto"
        h="auto"
      >
        <Avatar size="sm" name={name} src={image ?? undefined} />
      </MenuButton>
      <MenuList minW="14rem" py={3}>
        <Box px={4} pb={3}>
          <Text fontSize="xs" fontWeight="semibold" textTransform="uppercase" letterSpacing="0.2em" color="fg.muted">
            Signed in as
          </Text>
          <Text fontSize="sm" fontWeight="medium" mt={1} noOfLines={1}>
            {name}
          </Text>
        </Box>
        <MenuDivider />
        <MenuItem as={Link} href="/settings">
          Profile &amp; settings
        </MenuItem>
        <MenuItem onClick={handleSignOut} isDisabled={isPending}>
          <Flex align="center" w="full" justify="space-between">
            <Text>Sign out</Text>
            {isPending ? (
              <Icon as={Loader2} boxSize={4} aria-hidden style={{ animation: "spin 0.8s linear infinite" }} />
            ) : null}
          </Flex>
        </MenuItem>
      </MenuList>
    </Menu>
  );
}

type DetermineActiveOptions = {
  linkHash: string;
  linkPath: string;
  normalizedHash: string;
  pathname: string;
};

function determineActiveState({ pathname, linkPath, linkHash, normalizedHash }: DetermineActiveOptions) {
  const normalizedPath = linkPath ?? "";

  if (!normalizedPath && linkHash) {
    return normalizedHash === linkHash;
  }

  if (!normalizedPath) {
    return false;
  }

  if (normalizedPath === "/admin") {
    return pathname === normalizedPath || pathname.startsWith(`${normalizedPath}/`);
  }

  if (normalizedPath === "/app") {
    if (!linkHash) {
      return pathname === normalizedPath || pathname.startsWith(`${normalizedPath}/`);
    }

    if (pathname !== normalizedPath) {
      return linkHash === "#today" && pathname.startsWith(`${normalizedPath}/`);
    }

    return normalizedHash === linkHash;
  }

  return pathname === normalizedPath || pathname.startsWith(`${normalizedPath}/`);
}
