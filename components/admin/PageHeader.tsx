import type { ReactNode } from "react";
import { Box, Flex, Heading, Stack, Text } from "@chakra-ui/react";

export type PageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
};

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <Box mb={{ base: 6, md: 8 }}>
      <Flex
        direction={{ base: "column", md: "row" }}
        align={{ base: "flex-start", md: "center" }}
        justify="space-between"
        gap={{ base: 4, md: 6 }}
      >
        <Stack spacing={2} maxW={{ base: "full", md: "3xl" }}>
          <Heading size="lg">{title}</Heading>
          {subtitle ? (
            <Text fontSize="sm" color="fg.muted">
              {subtitle}
            </Text>
          ) : null}
        </Stack>
        {actions ? <Box flexShrink={0}>{actions}</Box> : null}
      </Flex>
    </Box>
  );
}
