"use client";

import { useMemo, useTransition, type RefObject } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Avatar,
  Button,
  Flex,
  HStack,
  Heading,
  IconButton,
  Kbd,
  List,
  ListItem,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text,
  useDisclosure,
  useColorModeValue
} from "@chakra-ui/react";
import { Menu as MenuIcon } from "lucide-react";

import { signOutAction } from "@/app/actions/sign-out";
import { useShortcutSequences, type ShortcutDefinition } from "@/lib/shortcuts";

import { useAdminShellContext } from "./AdminShell";
import { AdminNavLink } from "./AdminNavLink";

type AdminTopbarProps = {
  title?: string;
  onMenuClick: () => void;
  showMenuButton?: boolean;
  showAdminHome?: boolean;
  isMenuOpen?: boolean;
  menuButtonRef?: RefObject<HTMLButtonElement | null>;
  menuButtonControls?: string;
};

export function AdminTopbar({
  title,
  onMenuClick,
  showMenuButton = true,
  showAdminHome = false,
  isMenuOpen = false,
  menuButtonRef,
  menuButtonControls
}: AdminTopbarProps) {
  const router = useRouter();
  const { user, org, navItems, role } = useAdminShellContext();
  const borderColor = useColorModeValue("border.subtle", "border.emphasis");
  const bg = useColorModeValue("white", "gray.900");
  const shortcutsModal = useDisclosure();

  const accessibleNavItems = useMemo(
    () => navItems.filter((item) => item.roles.includes(role)),
    [navItems, role]
  );

  const availableShortcuts = useMemo<ShortcutDefinition[]>(() => {
    const definitions: ShortcutDefinition[] = [
      { id: "dashboard", label: "Dashboard", keys: ["g", "d"], href: "/admin" },
      { id: "users", label: "Users", keys: ["g", "u"], href: "/admin/users" },
      { id: "groups", label: "Groups", keys: ["g", "g"], href: "/admin/groups" },
      { id: "assign", label: "Assignments", keys: ["g", "a"], href: "/admin/assign" },
      { id: "org", label: "Org settings", keys: ["g", "o"], href: "/admin/org" },
      { id: "analytics", label: "Analytics", keys: ["g", "l"], href: "/admin/analytics" }
    ];

    return definitions.filter((definition) =>
      accessibleNavItems.some((item) => item.href === definition.href)
    );
  }, [accessibleNavItems]);

  const shortcutRegistrations = useMemo(
    () =>
      availableShortcuts.map((shortcut) => ({
        id: shortcut.id,
        keys: shortcut.keys,
        onMatch: () => {
          router.push(shortcut.href);
        }
      })),
    [availableShortcuts, router]
  );

  useShortcutSequences(shortcutRegistrations, { enabled: availableShortcuts.length > 0 });

  return (
    <Flex
      as="header"
      align="center"
      justify="space-between"
      gap={4}
      px={{ base: 4, md: 8 }}
      py={{ base: 3, md: 4 }}
      borderBottomWidth="1px"
      borderColor={borderColor}
      bg={bg}
      position="sticky"
      top={0}
      zIndex={10}
    >
      <HStack spacing={4} align="center">
        {showMenuButton ? (
          <IconButton
            aria-label="Open navigation"
            variant="ghost"
            icon={<MenuIcon size={18} />}
            onClick={onMenuClick}
            data-testid="admin-topbar-menu-button"
            aria-controls={menuButtonControls}
            aria-expanded={isMenuOpen}
            ref={menuButtonRef}
          />
        ) : null}
        <Stack spacing={0}>
          <Text fontSize="xs" fontWeight="semibold" textTransform="uppercase" letterSpacing="0.24em" color="fg.muted">
            Admin
          </Text>
          <Heading size="md">{title ?? "Dashboard"}</Heading>
        </Stack>
      </HStack>

      <HStack spacing={3} align="center">
        {showAdminHome ? (
          <AdminNavLink href="/admin" variant="ghost" size="sm" testId="admin-topbar-home-link">
            Admin Home
          </AdminNavLink>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          onClick={shortcutsModal.onOpen}
          aria-label="Show keyboard shortcuts"
          data-testid="admin-topbar-shortcuts-button"
        >
          ?
        </Button>
        <OrgMenu orgName={org.name} options={org.options} />
        <UserMenu name={user.name} email={user.email} image={user.image} />
      </HStack>

      <ShortcutCheatSheet isOpen={shortcutsModal.isOpen} onClose={shortcutsModal.onClose} shortcuts={availableShortcuts} />
    </Flex>
  );
}

type OrgMenuProps = {
  orgName: string;
  options: Array<{ id: string; name: string }>;
};

function OrgMenu({ orgName, options }: OrgMenuProps) {
  const isMultiOrg = options.length > 1;
  const menuLabel = isMultiOrg ? "Switch organization" : "Current organization";

  return (
    <Menu isLazy placement="bottom-end">
      <MenuButton as={Button} variant="ghost" size="sm" data-testid="admin-topbar-org-menu">
        {orgName}
      </MenuButton>
      <MenuList>
        <MenuItem isDisabled>{menuLabel}</MenuItem>
        <MenuDivider />
        {options.map((option) => (
          <MenuItem key={option.id} isDisabled={!isMultiOrg || option.name === orgName}>
            {option.name}
          </MenuItem>
        ))}
      </MenuList>
    </Menu>
  );
}

type UserMenuProps = {
  name: string | null;
  email: string | null;
  image?: string | null;
};

function UserMenu({ name, email, image }: UserMenuProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <Menu placement="bottom-end">
      <MenuButton
        as={Button}
        variant="ghost"
        size="sm"
        leftIcon={<Avatar size="xs" name={name ?? undefined} src={image ?? undefined} />}
        isLoading={isPending}
        data-testid="admin-topbar-user-menu"
      >
        {name ?? email ?? "Account"}
      </MenuButton>
      <MenuList>
        <MenuItem as={Link} href="/settings">
          Profile & Settings
        </MenuItem>
        <MenuDivider />
        <MenuItem
          onClick={() => {
            startTransition(async () => {
              await signOutAction();
            });
          }}
        >
          Sign out
        </MenuItem>
      </MenuList>
    </Menu>
  );
}

type ShortcutCheatSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: ShortcutDefinition[];
};

function ShortcutCheatSheet({ isOpen, onClose, shortcuts }: ShortcutCheatSheetProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Keyboard shortcuts</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          {shortcuts.length === 0 ? (
            <Text fontSize="sm" color="fg.muted">
              Keyboard shortcuts are unavailable for your current access level.
            </Text>
          ) : (
            <List spacing={3}>
              {shortcuts.map((shortcut) => (
                <ListItem key={shortcut.id} display="flex" justifyContent="space-between" alignItems="center">
                  <Text fontSize="sm" fontWeight="medium">
                    {shortcut.label}
                  </Text>
                  <HStack spacing={1}>
                    {shortcut.keys.map((key) => (
                      <Kbd key={key}>{key.toUpperCase()}</Kbd>
                    ))}
                  </HStack>
                </ListItem>
              ))}
            </List>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
