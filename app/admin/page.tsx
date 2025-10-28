import Link from "next/link";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Button,
  Card,
  CardBody,
  CardHeader,
  Flex,
  Heading,
  SimpleGrid,
  Stack,
  Text
} from "@chakra-ui/react";

import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdminAccess } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getMissingSanityEnvVars } from "@/lib/sanity";
import { loadOrgAnalyticsSnapshot } from "@/lib/admin-analytics";

import ContentSyncControls from "./content-sync-controls";

const numberFormatter = new Intl.NumberFormat("en-US");
const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1
});

export default async function AdminDashboard() {
  const { session } = await requireAdminAccess(["ADMIN", "MANAGER"]);
  const { orgId } = session.user;

  if (!orgId) {
    return (
      <AdminShell title="Dashboard" breadcrumb={[{ label: "Dashboard" }]}> 
        <Stack spacing={10} align="stretch">
          <Card>
            <CardHeader>
              <Heading size="md">Organization required</Heading>
            </CardHeader>
            <CardBody>
              <Stack spacing={4} fontSize="sm" color="fg.muted">
                <Alert status="error" borderRadius="lg">
                  <AlertIcon />
                  <AlertDescription>
                    Your account doesn&apos;t have an organization associated with it, so the admin dashboard can&apos;t load
                    any data yet.
                  </AlertDescription>
                </Alert>
                <Text>
                  Ask another administrator to assign you to an organization, then refresh this page. If you recently
                  received access, it may take a moment for your organization to sync—try signing out and back in if the
                  issue persists.
                </Text>
              </Stack>
            </CardBody>
          </Card>
        </Stack>
      </AdminShell>
    );
  }

  const missingSanityEnvVars = getMissingSanityEnvVars();
  const syncDisabledReason =
    missingSanityEnvVars.length > 0
      ? `Sanity sync is unavailable. Missing environment variables: ${missingSanityEnvVars.join(", ")}.`
      : undefined;

  const [groupCount, analyticsSnapshot] = await Promise.all([
    prisma.orgGroup.count({ where: { orgId } }),
    loadOrgAnalyticsSnapshot(orgId)
  ]);

  const overviewStats = [
    {
      id: "active-learners",
      title: "Active learners",
      formattedValue: numberFormatter.format(analyticsSnapshot.activeLearnerCount),
      description: "Learners currently enrolled in at least one assignment."
    },
    {
      id: "assignments",
      title: "Assignments",
      formattedValue: numberFormatter.format(analyticsSnapshot.assignmentCount),
      description: "Assignments issued across your organization."
    },
    {
      id: "completion-rate",
      title: "Completion rate",
      formattedValue: percentFormatter.format(analyticsSnapshot.completionRate || 0),
      description: "Completed lesson targets compared to assigned targets."
    },
    {
      id: "groups",
      title: "Groups",
      formattedValue: numberFormatter.format(groupCount),
      description: "Peer or cohort groups you&apos;ve created."
    }
  ] as const;

  return (
    <AdminShell title="Dashboard" breadcrumb={[{ label: "Dashboard" }]}
      actions={
        <Flex gap={2}>
          <Button as={Link} href="/admin/assign" variant="outline" size="sm">
            Assign learning
          </Button>
          <Button as={Link} href="/admin/groups" variant="outline" size="sm">
            Manage groups
          </Button>
        </Flex>
      }
    >
      <Stack spacing={10} align="stretch">
        <Card>
          <CardHeader>
            <Stack spacing={3} maxW="3xl">
              <Heading size="md">Organization overview</Heading>
              <Text fontSize="sm" color="fg.muted">
                Manage learners, assignments, and keep your Sanity content in sync with the LMS.
              </Text>
            </Stack>
          </CardHeader>
        </Card>

        <SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} spacing={4}>
          {overviewStats.map((stat) => (
            <Card key={stat.id} borderRadius="2xl">
              <CardBody>
                <Stack spacing={2}>
                  <Text fontSize="xs" fontWeight="semibold" textTransform="uppercase" letterSpacing="0.2em" color="fg.muted">
                    {stat.title}
                  </Text>
                  <Heading size="lg" color="primary.500">
                    {stat.formattedValue}
                  </Heading>
                  <Text fontSize="sm" color="fg.muted">
                    {stat.description}
                  </Text>
                </Stack>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>

        <Card>
          <CardHeader>
            <Stack spacing={2}>
              <Heading size="sm">Sync from Sanity</Heading>
              <Text fontSize="sm" color="fg.muted">
                Pull the latest courses, modules, and lessons from Sanity without leaving the admin dashboard.
              </Text>
            </Stack>
          </CardHeader>
          <CardBody>
            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={8} alignItems="start">
              <Stack spacing={3} fontSize="sm" color="fg.muted">
                <Text>
                  Ensure your database stays aligned with your headless CMS. Dry runs preview changes before committing them, and
                  you can optionally allow deletes when you&apos;re ready to mirror removals from Sanity.
                </Text>
                {syncDisabledReason ? (
                <Alert status="error" borderRadius="lg">
                  <AlertIcon />
                  <AlertDescription>{syncDisabledReason}</AlertDescription>
                </Alert>
              ) : (
                <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.2em" color="fg.muted">
                  Syncs run in the background—feel free to navigate away once submitted.
                </Text>
              )}
            </Stack>
            <ContentSyncControls disabled={Boolean(syncDisabledReason)} disabledReason={syncDisabledReason} />
          </SimpleGrid>
        </CardBody>
      </Card>

      <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={5}>
        <Card>
          <CardBody>
            <Stack spacing={3}>
              <Heading size="sm">Assignments</Heading>
              <Text fontSize="sm" color="fg.muted">
                Enroll learners into modules and courses with guided previews before you commit.
              </Text>
              <Button as={Link} href="/admin/assign" size="sm" colorScheme="primary" alignSelf="flex-start">
                Create assignment
              </Button>
            </Stack>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stack spacing={3}>
              <Heading size="sm">Analytics</Heading>
              <Text fontSize="sm" color="fg.muted">
                Track assignments, active learners, and completion rates across your organization.
              </Text>
              <Button as={Link} href="/admin/analytics" size="sm" variant="outline" alignSelf="flex-start">
                View analytics snapshot
              </Button>
            </Stack>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stack spacing={3}>
              <Heading size="sm">Groups</Heading>
              <Text fontSize="sm" color="fg.muted">
                Create cohorts, manage CSV roster uploads, and keep memberships in sync.
              </Text>
              <Button as={Link} href="/admin/groups" size="sm" colorScheme="primary" alignSelf="flex-start">
                Manage groups
              </Button>
            </Stack>
          </CardBody>
        </Card>
      </SimpleGrid>
    </Stack>
    </AdminShell>
  );
}
