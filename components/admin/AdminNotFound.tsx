"use client";

import { Card, CardBody, Heading, SimpleGrid, Stack, Text } from "@chakra-ui/react";

import type { AdminNavItem } from "@/lib/admin/nav";

import { AdminShell } from "./AdminShell";
import { AdminNavLink } from "./AdminNavLink";

type AdminNotFoundProps = {
  navItems: AdminNavItem[];
};

export function AdminNotFound({ navItems }: AdminNotFoundProps) {
  const primaryNavItems = navItems.filter((item) => item.href.startsWith("/admin"));

  return (
    <AdminShell title="Page not found" breadcrumb={[{ label: "Not found" }]}>
      <Stack spacing={10} align="stretch">
        <Stack spacing={3} maxW="3xl">
          <Heading size="lg">We couldn&apos;t find that admin page</Heading>
          <Text fontSize="sm" color="fg.muted">
            Double-check the URL or jump directly to one of the core admin destinations below. Keyboard shortcuts are also
            available from the top bar to speed up navigation.
          </Text>
          <AdminNavLink href="/admin" colorScheme="primary" size="sm" testId="admin-not-found-dashboard-link">
            ← Back to admin dashboard
          </AdminNavLink>
        </Stack>

        {primaryNavItems.length ? (
          <Stack spacing={4}>
            <Heading size="sm">Quick links</Heading>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
              {primaryNavItems.map((item) => (
                <Card key={item.href} borderRadius="xl">
                  <CardBody>
                    <Stack spacing={2}>
                      <Text fontWeight="medium">{item.label}</Text>
                      <AdminNavLink href={item.href} exact={item.exact} size="sm" variant="outline">
                        Open {item.label}
                      </AdminNavLink>
                    </Stack>
                  </CardBody>
                </Card>
              ))}
            </SimpleGrid>
          </Stack>
        ) : null}
      </Stack>
    </AdminShell>
  );
}
