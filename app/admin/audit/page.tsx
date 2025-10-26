import { Badge, Card, CardBody, CardHeader, Flex, Heading, Stack, Table, TableContainer, Tbody, Td, Text, Th, Thead, Tr, Wrap, WrapItem } from '@chakra-ui/react';

import { requireRole } from '@/lib/authz';
import { listAuditLogs } from '@/lib/admin/server-actions';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short'
});

export default async function AdminAuditLogPage() {
  const session = await requireRole('ADMIN');
  const orgId = session.user.orgId;

  if (!orgId) {
    throw new Error('Organization not found for admin user');
  }

  const { props } = await listAuditLogs({ orgId, page: 1, pageSize: 6 });
  const { logs, filters, pagination } = props;
  const totalPages = Math.max(1, Math.ceil(pagination.totalCount / pagination.pageSize));
  const rangeStart = logs.length > 0 ? (pagination.page - 1) * pagination.pageSize + 1 : 0;
  const rangeEnd = logs.length > 0 ? rangeStart + logs.length - 1 : 0;

  return (
    <Stack spacing={8} px={{ base: 4, md: 8 }} py={{ base: 6, md: 8 }}>
      <Card borderRadius="xl">
        <CardHeader>
          <Stack spacing={2}>
            <Heading size="lg">Audit activity</Heading>
            <Text fontSize="sm" color="fg.muted">
              The audit trail captures key security changes across the organization. Use filters to narrow the log history.
            </Text>
          </Stack>
        </CardHeader>
        <CardBody>
          <Stack spacing={4}>
            <Stack spacing={2}>
              <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.2em" color="fg.muted">
                Filters
              </Text>
              <Wrap spacing={2}>
                {(filters.actors ?? []).map((actor) => (
                  <WrapItem key={actor}>
                    <Badge variant="subtle" colorScheme="primary">
                      Actor: {actor}
                    </Badge>
                  </WrapItem>
                ))}
                {(filters.actions ?? []).map((action) => (
                  <WrapItem key={action}>
                    <Badge variant="subtle" colorScheme="teal">
                      Action: {action}
                    </Badge>
                  </WrapItem>
                ))}
                {filters.dateRange ? (
                  <WrapItem>
                    <Badge variant="subtle" colorScheme="purple">
                      {dateFormatter.format(new Date(filters.dateRange.start ?? Date.now()))} – {dateFormatter.format(new Date(filters.dateRange.end ?? Date.now()))}
                    </Badge>
                  </WrapItem>
                ) : null}
                {!filters.actors?.length && !filters.actions?.length && !filters.dateRange ? (
                  <WrapItem>
                    <Badge variant="outline" colorScheme="gray">No filters applied</Badge>
                  </WrapItem>
                ) : null}
              </Wrap>
            </Stack>

            <TableContainer>
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>Action</Th>
                    <Th>Actor</Th>
                    <Th>Target</Th>
                    <Th>Details</Th>
                    <Th>Timestamp</Th>
                    <Th>IP</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {logs.map((entry) => (
                    <Tr key={entry.id}>
                      <Td>{entry.action}</Td>
                      <Td>
                        <Stack spacing={0}>
                          <Text fontWeight="medium">{entry.actor.name ?? entry.actor.email ?? entry.actor.id}</Text>
                          <Text fontSize="xs" color="fg.muted">{entry.actor.email ?? '—'}</Text>
                        </Stack>
                      </Td>
                      <Td>
                        <Stack spacing={0}>
                          <Text fontWeight="medium">{entry.target.name ?? entry.target.id}</Text>
                          <Text fontSize="xs" color="fg.muted">{entry.target.type}</Text>
                        </Stack>
                      </Td>
                      <Td maxW="260px">
                        {entry.changes ? (
                          <Stack spacing={1} fontSize="xs">
                            {Object.entries(entry.changes).map(([key, value]) => (
                              <Text key={key} color="fg.muted">
                                {key}: {typeof value === 'string' ? value : JSON.stringify(value)}
                              </Text>
                            ))}
                          </Stack>
                        ) : (
                          <Text fontSize="xs" color="fg.muted">
                            No additional details
                          </Text>
                        )}
                      </Td>
                      <Td>{dateFormatter.format(new Date(entry.createdAt))}</Td>
                      <Td>{entry.ipAddress ?? '—'}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>

            <Flex justify="space-between" align="center" wrap="wrap" gap={3} fontSize="sm" color="fg.muted">
              <Text>
                Showing {logs.length === 0 ? 0 : `${rangeStart}-${rangeEnd}`} of {pagination.totalCount}
              </Text>
              <Badge variant="subtle" colorScheme="primary">
                Page {pagination.page} of {totalPages}
              </Badge>
            </Flex>
          </Stack>
        </CardBody>
      </Card>
    </Stack>
  );
}
