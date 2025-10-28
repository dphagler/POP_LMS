import Link from 'next/link';

import { AdminShell } from '@/components/admin/AdminShell';
import { PageHeader } from '@/components/admin/PageHeader';
import { requireAdminAccess } from '@/lib/authz';
import { listAuditLogs, type AuditLogListItem } from '@/lib/db/audit';
import { Button as ChakraButton } from '@chakra-ui/react';
import { ScrollText } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button as UiButton } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type AuditPageSearchParams = {
  action?: string;
  actor?: string;
  start?: string;
  end?: string;
};

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function parseDate(value: string | undefined, options?: { endOfDay?: boolean }) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  if (options?.endOfDay) {
    parsed.setHours(23, 59, 59, 999);
  } else {
    parsed.setHours(0, 0, 0, 0);
  }

  return parsed;
}

function resolveTarget(log: AuditLogListItem) {
  const metadata = log.metadata;

  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    const record = metadata as Record<string, unknown>;
    const labelCandidate = record.targetLabel ?? record.targetName ?? record.name;
    const urlCandidate = record.targetUrl ?? record.url;

    const label = typeof labelCandidate === 'string' && labelCandidate.trim().length > 0
      ? labelCandidate
      : log.targetId;
    const url = typeof urlCandidate === 'string' && urlCandidate.trim().length > 0 ? urlCandidate : null;

    return { label: label ?? log.targetId ?? '—', url };
  }

  return { label: log.targetId ?? '—', url: null };
}

function renderMetadata(metadata: AuditLogListItem['metadata']) {
  if (metadata == null) {
    return '—';
  }

  if (typeof metadata === 'string') {
    return metadata;
  }

  if (typeof metadata === 'number' || typeof metadata === 'boolean') {
    return String(metadata);
  }

  try {
    return JSON.stringify(metadata, null, 2);
  } catch {
    return '[unavailable]';
  }
}

export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams?: Promise<AuditPageSearchParams>;
}) {
  const { session } = await requireAdminAccess(['ADMIN']);
  const orgId = session.user.orgId;

  if (!orgId) {
    throw new Error('Organization not found for admin user');
  }

  const resolvedSearchParams = (await searchParams) ?? {};

  const actionFilter = typeof resolvedSearchParams.action === 'string' && resolvedSearchParams.action.length > 0
    ? resolvedSearchParams.action
    : undefined;
  const actorFilter = typeof resolvedSearchParams.actor === 'string' && resolvedSearchParams.actor.length > 0
    ? resolvedSearchParams.actor
    : undefined;
  const startFilter = parseDate(resolvedSearchParams.start);
  const endFilter = parseDate(resolvedSearchParams.end, { endOfDay: true });

  const { items, actions, actors } = await listAuditLogs({
    orgId,
    limit: 100,
    filters: {
      action: actionFilter,
      actorId: actorFilter,
      startDate: startFilter,
      endDate: endFilter,
    },
  });

  const startValue = resolvedSearchParams.start ?? '';
  const endValue = resolvedSearchParams.end ?? '';

  return (
    <AdminShell title="Audit" breadcrumb={[{ label: 'Audit' }]}> 
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <PageHeader
          title="Audit trail"
          subtitle="Review recent security-sensitive actions across your organization. Filter by actor, action, or date."
          actions={
            <ChakraButton as={Link} href="#audit-filters" colorScheme="primary">
              Filter events
            </ChakraButton>
          }
        />

        <Card id="audit-filters">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Only the most recent 100 events are shown.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-5" method="get">
              <div className="flex flex-col gap-2">
                <Label htmlFor="action">Action</Label>
                <Select id="action" name="action" defaultValue={actionFilter ?? ''}>
                  <option value="">All actions</option>
                  {actions.map((action) => (
                    <option key={action} value={action}>
                      {action}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="actor">Actor</Label>
                <Select id="actor" name="actor" defaultValue={actorFilter ?? ''}>
                  <option value="">All actors</option>
                  {actors.map((actor) => {
                    const label = actor.name ?? actor.email ?? actor.id;
                    return (
                      <option key={actor.id} value={actor.id}>
                        {label}
                      </option>
                    );
                  })}
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="start">Start date</Label>
                <Input id="start" name="start" type="date" defaultValue={startValue} />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="end">End date</Label>
                <Input id="end" name="end" type="date" defaultValue={endValue} />
              </div>

              <div className="flex items-end gap-2">
                <UiButton type="submit">Apply filters</UiButton>
                <UiButton as={Link} href="/admin/audit" variant="outline">
                  Reset
                </UiButton>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent events</CardTitle>
            <CardDescription>Showing up to the last 100 records that match your filters.</CardDescription>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <ScrollText className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">No audit events found</p>
                  <p className="text-sm text-muted-foreground">
                    Adjust your filters or broaden the date range to see more activity.
                  </p>
                </div>
                <ChakraButton as={Link} href="#audit-filters" variant="outline" size="sm">
                  Update filters
                </ChakraButton>
              </div>
            ) : (
              <TableContainer>
                <Table size="sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((log) => {
                      const actor = log.actor;
                      const actorLabel = actor?.name ?? actor?.email ?? 'System';
                      const actorSubLabel = actor?.email ?? actor?.id ?? '—';
                      const target = resolveTarget(log);
                      const metadataText = renderMetadata(log.metadata);

                      return (
                        <TableRow key={log.id}>
                          <TableCell className="whitespace-nowrap align-top">
                            <span className="font-medium">{dateFormatter.format(new Date(log.createdAt))}</span>
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="flex flex-col">
                              <span className="font-medium">{actorLabel}</span>
                              <span className="text-xs text-muted-foreground">{actorSubLabel}</span>
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            <span className="font-medium">{log.action}</span>
                          </TableCell>
                          <TableCell className="align-top">
                            {target.url ? (
                              <Link href={target.url} className="text-primary-500 hover:underline" target="_blank">
                                {target.label}
                              </Link>
                            ) : (
                              <span>{target.label}</span>
                            )}
                          </TableCell>
                          <TableCell className="align-top">
                            {typeof metadataText === 'string' && metadataText.includes('\n') ? (
                              <pre className="max-h-32 overflow-auto rounded-md bg-muted p-3 text-xs">
                                {metadataText}
                              </pre>
                            ) : (
                              <span className="text-sm text-muted-foreground">{metadataText}</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
