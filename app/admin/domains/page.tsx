import { Badge, Box, Button, Card, CardBody, CardHeader, Flex, Heading, Stack, Table, TableContainer, Tbody, Td, Text, Th, Thead, Tr } from '@chakra-ui/react';

import { requireRole } from '@/lib/authz';
import { listDomains } from '@/lib/admin/server-actions';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short'
});

const statusColorMap: Record<string, string> = {
  active: 'green',
  verifying: 'blue',
  pending: 'yellow',
  failed: 'red',
  removed: 'gray'
};

export default async function AdminDomainsPage() {
  const session = await requireRole('ADMIN');
  const orgId = session.user.orgId;

  if (!orgId) {
    throw new Error('Organization not found for admin user');
  }

  const { props, pagination } = await listDomains({ orgId, page: 1, pageSize: 5 });
  const { domains } = props;
  const totalPages = Math.max(1, Math.ceil(pagination.totalCount / pagination.pageSize));
  const rangeStart = domains.length > 0 ? (pagination.page - 1) * pagination.pageSize + 1 : 0;
  const rangeEnd = domains.length > 0 ? rangeStart + domains.length - 1 : 0;

  return (
    <Stack spacing={8} px={{ base: 4, md: 8 }} py={{ base: 6, md: 8 }}>
      <Card borderRadius="xl">
        <CardHeader>
          <Flex direction={{ base: 'column', md: 'row' }} justify="space-between" align={{ base: 'stretch', md: 'center' }} gap={4}>
            <Stack spacing={1}>
              <Heading size="lg">Connected domains</Heading>
              <Text fontSize="sm" color="fg.muted">
                Manage vanity URLs and track their verification status. Records update as DNS checks complete.
              </Text>
            </Stack>
            <Button colorScheme="primary" isDisabled alignSelf={{ base: 'stretch', md: 'center' }}>
              Add domain
            </Button>
          </Flex>
        </CardHeader>
        <CardBody>
          <TableContainer>
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Domain</Th>
                  <Th>Status</Th>
                  <Th>Connection</Th>
                  <Th>Last checked</Th>
                  <Th>Verification records</Th>
                  <Th textAlign="right">Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {domains.map((domain) => (
                  <Tr key={domain.id}>
                    <Td>
                      <Stack spacing={0}>
                        <Text fontWeight="medium">{domain.domain}</Text>
                        <Text fontSize="xs" color="fg.muted">
                          {domain.connectionType === 'apex' ? 'Root domain' : 'Subdomain'}
                        </Text>
                      </Stack>
                    </Td>
                    <Td>
                      <Badge colorScheme={statusColorMap[domain.status] ?? 'gray'} textTransform="capitalize">
                        {domain.status}
                      </Badge>
                    </Td>
                    <Td textTransform="capitalize">{domain.connectionType}</Td>
                    <Td>{domain.lastCheckedAt ? dateFormatter.format(new Date(domain.lastCheckedAt)) : '—'}</Td>
                    <Td>
                      <Stack spacing={1} fontSize="xs">
                        {domain.verificationRecords.map((record, index) => (
                          <Box key={`${domain.id}-${record.type}-${index}`}>
                            <Text fontWeight="semibold">{record.type}</Text>
                            <Text color="fg.muted">{record.host} → {record.value}</Text>
                          </Box>
                        ))}
                      </Stack>
                    </Td>
                    <Td textAlign="right">
                      <Button size="sm" variant="outline" isDisabled>
                        Remove
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
          <Flex mt={4} justify="space-between" align="center" wrap="wrap" gap={3} fontSize="sm" color="fg.muted">
            <Text>
              Showing {domains.length === 0 ? 0 : `${rangeStart}-${rangeEnd}`} of {pagination.totalCount}
            </Text>
            <Stack direction="row" spacing={2}>
              <Button size="sm" variant="outline" isDisabled>
                Previous
              </Button>
              <Button size="sm" variant="outline" isDisabled>
                Next
              </Button>
              <Text fontSize="xs" alignSelf="center" color="fg.muted">
                Page {pagination.page} of {totalPages}
              </Text>
            </Stack>
          </Flex>
        </CardBody>
      </Card>
    </Stack>
  );
}
