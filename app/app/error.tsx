"use client";

import { Button, Card, CardBody, CardHeader, Heading, Stack, Text } from "@chakra-ui/react";

type AppRouteErrorProps = {
  error: Error & { digest?: string };
  digest?: string;
  reset: () => void;
};

export default function AppRouteError({ error, reset, digest }: AppRouteErrorProps) {
  const errorDigest = digest ?? error?.digest;

  return (
    <Stack spacing={8} align="center" justify="center" w="full" py={16} textAlign="center">
      <Card maxW="lg" w="full">
        <CardHeader>
          <Heading size="md">We couldn&apos;t load this page</Heading>
        </CardHeader>
        <CardBody>
          <Stack spacing={4} align="center" textAlign="center">
            <Text color="fg.muted" fontSize="sm">
              Something went wrong while loading your dashboard. Please try again in a moment.
            </Text>
            <Button colorScheme="primary" onClick={reset} size="sm">
              Try again
            </Button>
            {errorDigest ? (
              <Text fontSize="xs" color="fg.muted">
                Error reference: {errorDigest}
              </Text>
            ) : null}
          </Stack>
        </CardBody>
      </Card>
    </Stack>
  );
}
