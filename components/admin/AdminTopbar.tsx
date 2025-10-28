"use client";

import { useTransition } from "react";
import Link from "next/link";
import {
  Avatar,
  Button,
  Flex,
  HStack,
  Heading,
  IconButton,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Stack,
  Text,
  useColorModeValue
} from "@chakra-ui/react";
import { Menu as MenuIcon } from "lucide-react";

import { signOutAction } from "@/app/actions/sign-out";

import { useAdminShellContext } from "./AdminShell";

type AdminTopbarProps = {
  title?: string;
  onMenuClick: () => void;
  showMenuButton?: boolean;
  showAdminHome?: boolean;
};

export function AdminTopbar({ title, onMenuClick, showMenuButton = true, showAdminHome = false }: AdminTopbarProps) {
  const { user, org } = useAdminShellContext();
  const borderColor = useColorModeValue("border.subtle", "border.emphasis");
  const bg = useColorModeValue("white", "gray.900");

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
          <Button as={Link} href="/admin" variant="ghost" size="sm">
            Admin Home
          </Button>
        ) : null}
        <OrgMenu orgName={org.name} options={org.options} />
        <UserMenu name={user.name} email={user.email} image={user.image} />
      </HStack>
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
      <MenuButton as={Button} variant="ghost" size="sm">
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
