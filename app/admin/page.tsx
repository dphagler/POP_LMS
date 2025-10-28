import Link from "next/link";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Flex,
  Heading,
  SimpleGrid,
  Stack,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Text
} from "@chakra-ui/react";
import { Clock, Users, UserPlus, Layers } from "lucide-react";

import { AdminShell } from "@/components/admin/AdminShell";
import { PageHeader } from "@/components/admin/PageHeader";
import { QuickActions } from "@/components/admin/QuickActions";
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

type RecentAuditRow = {
  id: string;
  action: string;
  createdAt: string;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  actor: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
};

function resolveAuditTarget(row: RecentAuditRow) {
  const metadata = row.metadata;

  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    const record = metadata as Record<string, unknown>;
    const labelCandidate = record.targetLabel ?? record.targetName ?? record.name;
    const urlCandidate = record.targetUrl ?? record.url;

    const label = typeof labelCandidate === "string" && labelCandidate.trim().length > 0
      ? labelCandidate
      : row.targetId;
    const url = typeof urlCandidate === "string" && urlCandidate.trim().length > 0 ? urlCandidate : null;

    return { label: label ?? row.targetId ?? "—", url };
  }

  return { label: row.targetId ?? "—", url: null };
}

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

  const [groupCount, analyticsSnapshot, auditLogs] = await Promise.all([
    prisma.orgGroup.count({ where: { orgId } }),
    loadOrgAnalyticsSnapshot(orgId),
    prisma.auditLog.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })
  ]);

  const recentAuditLogs: RecentAuditRow[] = auditLogs.map((log) => ({
    id: log.id,
    action: log.action,
    createdAt: log.createdAt.toISOString(),
    targetId: log.targetId,
    metadata: (log.metadata && typeof log.metadata === "object" && !Array.isArray(log.metadata)
      ? (log.metadata as Record<string, unknown>)
      : null),
    actor: log.actor
      ? {
          id: log.actor.id,
          name: log.actor.name,
          email: log.actor.email
        }
      : null
  }));

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
      title: "Invite user",
      description: "Send teammates an invitation email with one-time access.",
      href: "/admin/users?modal=invite",
      icon: <UserPlus size={18} />
    },
    {
      id: "create-group",
      title: "Create group",
      description: "Organize learners into cohorts for easier assignments.",
      href: "/admin/groups?modal=new",
      icon: <Users size={18} />
    },
    {
      id: "assign-module",
      title: "Assign module",
      description: "Choose a course or module to assign in just a few steps.",
      href: "/admin/assign",
      icon: <Layers size={18} />
    },
    {
      id: "sync-sanity",
      title: "Sync from Sanity",
      description: "Run a manual sync to pull the latest content.",
      href: "/admin?runSync=1",
      icon: <Clock size={18} />,
      isDisabled: Boolean(syncDisabledReason),
      disabledReason: syncDisabledReason
    }
  ];

  return (
    <AdminShell title="Dashboard" breadcrumb={[{ label: "Dashboard" }]}> 
      <Stack spacing={10} align="stretch">
        <PageHeader
          title="Admin dashboard"
          subtitle="Manage learners, assignments, and keep your Sanity content in sync with the LMS."
          actions={
            <Button as={Link} href="/admin/assign" colorScheme="primary">
              New assignment
            </Button>
          }
        />

        <Stack spacing={4}>
          <Heading size="sm">Quick actions</Heading>
          <QuickActions actions={quickActions} />
        </Stack>

        <Stack spacing={4}>
          <Heading size="sm">Organization overview</Heading>
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
        </Stack>

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

        <Card>
          <CardHeader>
            <Stack spacing={2}>
              <Heading size="sm">Recently active</Heading>
              <Text fontSize="sm" color="fg.muted">
                Track the latest changes across your organization. View the full trail in the audit log.
              </Text>
            </Stack>
          </CardHeader>
          <CardBody>
            {recentAuditLogs.length === 0 ? (
              <Stack spacing={4} align="center" py={8}>
                <Box
                  borderRadius="full"
                  bg="bg.subtle"
                  color="fg.muted"
                  w={16}
                  h={16}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Clock size={28} />
                </Box>
                <Stack spacing={1} align="center">
                  <Text fontWeight="medium">No recent audit activity</Text>
                  <Text fontSize="sm" color="fg.muted" textAlign="center">
                    Actions taken by admins will appear here. Visit the audit log for historical records.
                  </Text>
                </Stack>
                <Button as={Link} href="/admin/audit" variant="outline" size="sm">
                  View audit log
                </Button>
              </Stack>
            ) : (
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>Time</Th>
                    <Th>Actor</Th>
                    <Th>Action</Th>
                    <Th>Target</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {recentAuditLogs.map((log) => {
                    const actor = log.actor;
                    const actorLabel = actor?.name ?? actor?.email ?? "System";
                    const actorSubLabel = actor?.email ?? actor?.id ?? null;
                    const target = resolveAuditTarget(log);

                    return (
                      <Tr key={log.id}>
                        <Td>
                          <Stack spacing={0}>
                            <Text fontWeight="medium">{new Date(log.createdAt).toLocaleString()}</Text>
                          </Stack>
                        </Td>
                        <Td>
                          <Stack spacing={0}>
                            <Text fontWeight="medium">{actorLabel}</Text>
                            {actorSubLabel ? (
                              <Text fontSize="xs" color="fg.muted">
                                {actorSubLabel}
                              </Text>
                            ) : null}
                          </Stack>
                        </Td>
                        <Td>
                          <Badge colorScheme="primary" variant="subtle">
                            {log.action}
                          </Badge>
                        </Td>
                        <Td>
                          {target.url ? (
                            <Button as={Link} href={target.url} variant="link" size="sm" target="_blank">
                              {target.label}
                            </Button>
                          ) : (
                            <Text>{target.label}</Text>
                          )}
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            )}
          </CardBody>
          <CardFooter justify="flex-end">
            <Button as={Link} href="/admin/audit" variant="ghost" size="sm" rightIcon={<Clock size={16} />}>
              View audit trail
            </Button>
          </CardFooter>
        </Card>
      </Stack>
    </AdminShell>
  );
}
