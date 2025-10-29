import {
  Alert,
  AlertDescription,
  AlertIcon,
  Card,
  CardBody,
  CardHeader,
  Circle,
  Flex,
  Heading,
  Icon,
  SimpleGrid,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr
} from "@chakra-ui/react";
import { Activity } from "lucide-react";

import { AdminShell } from "@/components/admin/AdminShell";
import { PageHeader } from "@/components/admin/PageHeader";
import { QuickActions } from "@/components/admin/QuickActions";
import { AdminNavLink } from "@/components/admin/AdminNavLink";
import { SyncPanelProvider, SyncPanelCard, SyncQuickActionTile } from "@/components/admin/SyncPanel";
import { requireAdminAccess } from "@/lib/authz";
import { listAuditLogs, type AuditLogListItem } from "@/lib/db/audit";
import { prisma } from "@/lib/prisma";
import { getLatestSyncStatusForOrg } from "@/lib/jobs/syncStatus";
import { getMissingSanityEnvVars } from "@/lib/sanity";
import { loadOrgAnalyticsSnapshot } from "@/lib/admin-analytics";

const numberFormatter = new Intl.NumberFormat("en-US");
const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1
});
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short"
});

function resolveAuditTarget(log: AuditLogListItem) {
  const metadata = log.metadata;

  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    const record = metadata as Record<string, unknown>;
    const labelCandidate = record.targetLabel ?? record.targetName ?? record.name;
    const urlCandidate = record.targetUrl ?? record.url;

    const label = typeof labelCandidate === "string" && labelCandidate.trim().length > 0
      ? labelCandidate
      : log.targetId;
    const url = typeof urlCandidate === "string" && urlCandidate.trim().length > 0 ? urlCandidate : null;

    return { label: label ?? log.targetId ?? "—", url };
  }

  return { label: log.targetId ?? "—", url: null };
}

export default async function AdminDashboard() {
  const { session } = await requireAdminAccess(["ADMIN", "MANAGER"]);
  const { orgId } = session.user;

  if (!orgId) {
    return (
      <AdminShell title="Dashboard" breadcrumb={[{ label: "Dashboard" }]}>
        <PageHeader title="Admin dashboard" subtitle="Connect your account to an organization to see admin insights." />
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

  const [groupCount, analyticsSnapshot, recentActivity] = await Promise.all([
    prisma.orgGroup.count({ where: { orgId } }),
    loadOrgAnalyticsSnapshot(orgId),
    listAuditLogs({ orgId, limit: 5 }).then((result) => result.items)
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

  const quickActions = [
    {
      id: "invite-user",
      label: "Invite user",
      description: "Add teammates to your organization and manage their roles.",
      href: "/admin/users?modal=invite",
      ctaLabel: "Invite user"
    },
    {
      id: "create-group",
      label: "Create group",
      description: "Organize learners into cohorts for targeted assignments.",
      href: "/admin/groups?modal=new",
      ctaLabel: "Create group"
    },
    {
      id: "assign-module",
      label: "Assign module",
      description: "Plan coursework and enroll groups into new learning.",
      href: "/admin/assign",
      ctaLabel: "Assign module"
    }
  ] as const;

  const initialSyncStatus = getLatestSyncStatusForOrg(orgId);

  return (
    <AdminShell title="Dashboard" breadcrumb={[{ label: "Dashboard" }]}> 
      <PageHeader
        title="Admin dashboard"
        subtitle="Stay on top of assignments, learner activity, and content syncs for your organization."
        actions={
          <AdminNavLink href="/admin/assign" colorScheme="primary" testId="admin-dashboard-create-assignment">
            Create assignment
          </AdminNavLink>
        }
      />

      <SyncPanelProvider
        initialStatus={initialSyncStatus}
        disabled={Boolean(syncDisabledReason)}
        disabledReason={syncDisabledReason}
      >
        <Stack spacing={10} align="stretch">
          <QuickActions
            actions={[
              ...quickActions,
              {
                id: "sync-sanity",
                content: <SyncQuickActionTile />
              }
            ]}
          />

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
              <Flex align={{ base: "flex-start", md: "center" }} direction={{ base: "column", md: "row" }} justify="space-between" gap={4}>
                <Stack spacing={1}>
                  <Heading size="sm">Recently active</Heading>
                  <Text fontSize="sm" color="fg.muted">
                    The five most recent audit events across your organization.
                  </Text>
                </Stack>
                <AdminNavLink href="/admin/audit" variant="outline" size="sm">
                  View audit trail
                </AdminNavLink>
              </Flex>
            </CardHeader>
            <CardBody>
            {recentActivity.length > 0 ? (
              <Table size="sm" variant="simple">
                <Thead>
                  <Tr>
                    <Th>Actor</Th>
                    <Th>Action</Th>
                    <Th>Target</Th>
                    <Th>When</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {recentActivity.map((log) => {
                    const actorLabel = log.actor?.name ?? log.actor?.email ?? "System";
                    const target = resolveAuditTarget(log);
                    const timestamp = dateFormatter.format(new Date(log.createdAt));

                    return (
                      <Tr key={log.id}>
                        <Td>{actorLabel}</Td>
                        <Td>{log.action}</Td>
                        <Td>
                          {target.url ? (
                            <AdminNavLink
                              href={target.url}
                              variant="link"
                              size="sm"
                              colorScheme="primary"
                              testId={`recent-activity-link-${log.id}`}
                            >
                              {target.label}
                            </AdminNavLink>
                          ) : (
                            target.label
                          )}
                        </Td>
                        <Td>{timestamp}</Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            ) : (
              <Stack align="center" spacing={4} py={10} textAlign="center">
                <Circle size="64px" bg="bg.subtle">
                  <Icon as={Activity} boxSize={6} color="fg.muted" />
                </Circle>
                <Stack spacing={1}>
                  <Heading size="sm">No recent activity</Heading>
                  <Text fontSize="sm" color="fg.muted">
                    Activity from assignments, user management, and syncs will appear here.
                  </Text>
                </Stack>
                <AdminNavLink href="/admin/audit" colorScheme="primary" variant="outline">
                  View audit trail
                </AdminNavLink>
              </Stack>
            )}
          </CardBody>
        </Card>

        <SyncPanelCard />

        <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={5}>
          <Card>
            <CardBody>
              <Stack spacing={3}>
                <Heading size="sm">Assignments</Heading>
                <Text fontSize="sm" color="fg.muted">
                  Enroll learners into modules and courses with guided previews before you commit.
                </Text>
                <AdminNavLink href="/admin/assign" size="sm" colorScheme="primary" alignSelf="flex-start">
                  Create assignment
                </AdminNavLink>
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
                <AdminNavLink href="/admin/analytics" size="sm" variant="outline" alignSelf="flex-start">
                  View analytics snapshot
                </AdminNavLink>
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
                <AdminNavLink href="/admin/groups" size="sm" colorScheme="primary" alignSelf="flex-start">
                  Manage groups
                </AdminNavLink>
              </Stack>
            </CardBody>
          </Card>
        </SimpleGrid>
      </Stack>
      </SyncPanelProvider>
    </AdminShell>
  );
}
