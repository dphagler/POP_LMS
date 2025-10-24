"use client";

import type { ReactNode } from "react";
import { Box, Container, Flex, useColorModeValue } from "@chakra-ui/react";

type PageShellProps = {
  header: ReactNode;
  sidebar?: ReactNode;
  children: ReactNode;
};

export function PageShell({ header, sidebar, children }: PageShellProps) {
  const headerBg = useColorModeValue("whiteAlpha.900", "blackAlpha.700");
  const borderColor = useColorModeValue("border.subtle", "border.emphasis");

  return (
    <Flex minH="100vh" direction="column" bg="bg.canvas">
      <Box
        as="header"
        position="sticky"
        top={0}
        zIndex="sticky"
        bg={headerBg}
        borderBottomWidth="1px"
        borderColor={borderColor}
        backdropFilter="blur(12px)"
      >
        <Container maxW="1200px" px={{ base: 6, md: 8 }} py={{ base: 3, md: 4 }}>
          {header}
        </Container>
      </Box>
      <Container
        maxW="1200px"
        px={{ base: 6, md: 8 }}
        py={{ base: 6, md: 8 }}
        flex="1"
      >
        <Flex align="flex-start" gap={{ base: 6, lg: 8 }}>
          {sidebar ? (
            <Box
              as="aside"
              display={{ base: "none", lg: "block" }}
              w="260px"
              flexShrink={0}
              position="sticky"
              top="88px"
            >
              {sidebar}
            </Box>
          ) : null}
          <Box as="main" flex="1" minW={0}>
            {children}
          </Box>
        </Flex>
      </Container>
    </Flex>
  );
}
