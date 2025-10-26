import { Badge, Card, CardBody, CardHeader, Flex, Heading, SimpleGrid, Stack, Table, TableContainer, Tbody, Td, Text, Th, Thead, Tr } from '@chakra-ui/react';

import { requireRole } from '@/lib/authz';
import { listImports } from '@/lib/admin/server-actions';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short'
});

const statusColorMap: Record<string, string> = {
  queued: 'gray',
  running: 'blue',
  succeeded: 'green',
  failed: 'red',
  cancelled: 'orange'
};

const sourceLabels: Record<string, string> = {
  csv: 'CSV',
  scorm: 'SCORM',
  xapi: 'xAPI',
  lrs: 'LRS'
};

export default async function AdminImportsPage() {
  const session = await requireRole('ADMIN');
  const orgId = session.user.orgId;

  if (!orgId) {
    throw new Error('Organization not found for admin user');
  }

  const { props } = await listImports({ orgId, page: 1, pageSize: 6 });
  const { imports, pagination } = props;
  const totalPages = Math.max(1, Math.ceil(pagination.totalCount / pagination.pageSize));
  const rangeStart = imports.length > 0 ? (pagination.page - 1) * pagination.pageSize + 1 : 0;
  const rangeEnd = imports.length > 0 ? rangeStart + imports.length - 1 : 0;

  const totals = imports.reduce(
    (acc, job) => {
      acc.processed += job.processedCount;
      acc.succeeded += job.successCount;
      acc.failed += job.errorCount;
      return acc;
    },
    { processed: 0, succeeded: 0, failed: 0 }
  );

  return (
    <Stack spacing={8} px={{ base: 4, md: 8 }} py={{ base: 6, md: 8 }}>
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
        <Card borderRadius="xl">
          <CardBody>
            <Stack spacing={1}>
              <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.2em" color="fg.muted">
                Imports reviewed
              </Text>
              <Heading size="lg">{pagination.totalCount}</Heading>
              <Text fontSize="sm" color="fg.muted">
                Completed CSV jobs available for audit.
              </Text>
            </Stack>
          </CardBody>
        </Card>
        <Card borderRadius="xl">
          <CardBody>
            <Stack spacing={1}>
              <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.2em" color="fg.muted">
                Rows processed
              </Text>
              <Heading size="lg">{totals.processed}</Heading>
              <Text fontSize="sm" color="fg.muted">
                Total rows handled by visible imports.
              </Text>
            </Stack>
          </CardBody>
        </Card>
        <Card borderRadius="xl">
          <CardBody>
            <Stack spacing={1}>
              <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.2em" color="fg.muted">
                Success rate
              </Text>
              <Heading size="lg">
                {totals.processed > 0 ? Math.round((totals.succeeded / totals.processed) * 100) : 0}%
              </Heading>
              <Text fontSize="sm" color="fg.muted">
                Successful rows across completed jobs.
              </Text>
            </Stack>
          </CardBody>
        </Card>
      </SimpleGrid>

      <Card borderRadius="xl">
        <CardHeader>
          <Stack spacing={1}>
            <Heading size="lg">CSV imports</Heading>
            <Text fontSize="sm" color="fg.muted">
              Review the latest enrollment and membership uploads. Status updates every minute during processing.
            </Text>
          </Stack>
        </CardHeader>
        <CardBody>
          <TableContainer>
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>File</Th>
                  <Th>Source</Th>
                  <Th>Status</Th>
                  <Th isNumeric>Processed</Th>
                  <Th isNumeric>Success</Th>
                  <Th isNumeric>Errors</Th>
                  <Th>Created</Th>
                  <Th>Completed</Th>
                </Tr>
              </Thead>
              <Tbody>
                {imports.map((job) => (
                  <Tr key={job.id}>
                    <Td>{job.fileName}</Td>
                    <Td>{sourceLabels[job.source] ?? job.source}</Td>
                    <Td>
                      <Badge colorScheme={statusColorMap[job.status] ?? 'gray'} textTransform="capitalize">
                        {job.status}
                      </Badge>
                    </Td>
                    <Td isNumeric>{job.processedCount}</Td>
                    <Td isNumeric>{job.successCount}</Td>
                    <Td isNumeric>{job.errorCount}</Td>
                    <Td>{dateFormatter.format(new Date(job.createdAt))}</Td>
                    <Td>{job.completedAt ? dateFormatter.format(new Date(job.completedAt)) : '—'}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
          <Flex mt={4} justify="space-between" align="center" wrap="wrap" gap={3} fontSize="sm" color="fg.muted">
            <Text>
              Showing {imports.length === 0 ? 0 : `${rangeStart}-${rangeEnd}`} of {pagination.totalCount}
            </Text>
            <Stack direction="row" spacing={2}>
              <Badge variant="subtle" colorScheme="primary">
                Page {pagination.page} of {totalPages}
              </Badge>
            </Stack>
          </Flex>
        </CardBody>
      </Card>
    </Stack>
  );
}
