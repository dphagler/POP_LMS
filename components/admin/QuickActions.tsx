import Link from "next/link";
import type { ReactNode } from "react";
import { Box, Button, Card, CardBody, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { ArrowUpRight } from "lucide-react";

export type QuickActionItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon?: ReactNode;
  isDisabled?: boolean;
  disabledReason?: string;
};

export type QuickActionsProps = {
  actions: QuickActionItem[];
  columns?: { base?: number; md?: number; xl?: number };
};

export function QuickActions({ actions, columns }: QuickActionsProps) {
  return (
    <SimpleGrid columns={columns ?? { base: 1, md: 2, xl: 4 }} spacing={4} w="full">
      {actions.map((action) => (
        <Card key={action.id} borderRadius="2xl" variant="outline" borderColor="border.muted">
          <CardBody>
            <Stack spacing={3} align="flex-start">
              <Stack spacing={1} w="full">
                <Stack direction="row" spacing={2} align="center">
                  {action.icon ? (
                    <Box color="primary.500" display="flex" alignItems="center">
                      {action.icon}
                    </Box>
                  ) : null}
                  <Text fontWeight="semibold">{action.title}</Text>
                </Stack>
                <Text fontSize="sm" color="fg.muted">
                  {action.disabledReason && action.isDisabled ? action.disabledReason : action.description}
                </Text>
              </Stack>
              <Button
                as={Link}
                href={action.href}
                size="sm"
                colorScheme="primary"
                rightIcon={<ArrowUpRight size={16} />}
                isDisabled={action.isDisabled}
                width="auto"
              >
                {action.isDisabled ? "Unavailable" : "Open"}
              </Button>
            </Stack>
          </CardBody>
        </Card>
      ))}
    </SimpleGrid>
  );
}
