import type { ReactNode } from "react";
import { Card, CardBody, Heading, SimpleGrid, Stack, Text } from "@chakra-ui/react";

import { AdminNavLink } from "./AdminNavLink";

type QuickActionLinkItem = {
  id: string;
  label: string;
  description: string;
  href: string;
  icon?: ReactNode;
  isDisabled?: boolean;
  disabledReason?: string;
  ctaLabel?: string;
  testId?: string;
};

type QuickActionCustomItem = {
  id: string;
  content: ReactNode;
};

export type QuickActionItem = QuickActionLinkItem | QuickActionCustomItem;

export type QuickActionsProps = {
  title?: string;
  actions: ReadonlyArray<QuickActionItem>;
};

export function QuickActions({ title = "Quick actions", actions }: QuickActionsProps) {
  return (
    <Stack spacing={4}>
      <Heading size="md">{title}</Heading>
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={4}>
        {actions.map((action) => {
          if ("content" in action) {
            return (
              <Card key={action.id} borderRadius="xl" h="full">
                {action.content}
              </Card>
            );
          }

          return (
            <Card key={action.id} borderRadius="xl" h="full">
              <CardBody>
                <Stack spacing={4} h="full">
                  <Stack spacing={1}>
                    <Heading size="sm">{action.label}</Heading>
                    <Text fontSize="sm" color="fg.muted">
                      {action.description}
                    </Text>
                  </Stack>
                  <AdminNavLink
                    href={action.href}
                    colorScheme="primary"
                    variant={action.isDisabled ? "outline" : "solid"}
                    isDisabled={action.isDisabled}
                    testId={action.testId ?? `admin-quick-action-${action.id}`}
                  >
                    {action.isDisabled && action.disabledReason
                      ? action.disabledReason
                      : action.ctaLabel ?? action.label}
                  </AdminNavLink>
                </Stack>
              </CardBody>
            </Card>
          );
        })}
      </SimpleGrid>
    </Stack>
  );
}
