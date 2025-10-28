import Link from "next/link";
import type { ReactNode } from "react";
import { Button, Card, CardBody, Heading, SimpleGrid, Stack, Text } from "@chakra-ui/react";

export type QuickActionItem = {
  id: string;
  label: string;
  description: string;
  href: string;
  icon?: ReactNode;
  isDisabled?: boolean;
  disabledReason?: string;
  ctaLabel?: string;
};

export type QuickActionsProps = {
  title?: string;
  actions: QuickActionItem[];
};

export function QuickActions({ title = "Quick actions", actions }: QuickActionsProps) {
  return (
    <Stack spacing={4}>
      <Heading size="md">{title}</Heading>
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={4}>
        {actions.map((action) => (
          <Card key={action.id} borderRadius="xl" h="full">
            <CardBody>
              <Stack spacing={4} h="full">
                <Stack spacing={1}>
                  <Heading size="sm">{action.label}</Heading>
                  <Text fontSize="sm" color="fg.muted">
                    {action.description}
                  </Text>
                </Stack>
                <Button
                  as={Link}
                  href={action.href}
                  colorScheme="primary"
                  variant={action.isDisabled ? "outline" : "solid"}
                  isDisabled={action.isDisabled}
                >
                  {action.isDisabled && action.disabledReason
                    ? action.disabledReason
                    : action.ctaLabel ?? action.label}
                </Button>
              </Stack>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>
    </Stack>
  );
}
