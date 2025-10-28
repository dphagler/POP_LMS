"use client";

import type { ReactNode } from "react";
import { Box, Flex, Heading, Stack, Text } from "@chakra-ui/react";

export type PageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
};

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <Flex
      direction={{ base: "column", md: "row" }}
      align={{ base: "flex-start", md: "center" }}
      justify="space-between"
      gap={{ base: 4, md: 6 }}
      w="full"
    >
      <Stack spacing={subtitle ? 2 : 1} maxW="3xl">
        <Heading size="lg">{title}</Heading>
        {subtitle ? (
          <Text fontSize="sm" color="fg.muted">
            {subtitle}
          </Text>
        ) : null}
      </Stack>
      {actions ? (
        <Box minW={{ md: "max-content" }}>
          <Flex gap={2} flexWrap="wrap" justify={{ base: "flex-start", md: "flex-end" }}>
            {actions}
          </Flex>
        </Box>
      ) : null}
    </Flex>
  );
}
