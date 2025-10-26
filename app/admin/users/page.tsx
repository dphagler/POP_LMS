import { Avatar, Badge, Button, Card, CardBody, CardHeader, Flex, Heading, Stack, Table, TableContainer, Tbody, Td, Text, Th, Thead, Tr } from '@chakra-ui/react';

import { requireRole } from '@/lib/authz';
import { listUsers } from '@/lib/admin/server-actions';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short'
});

const roleColorMap: Record<string, string> = {
  owner: 'purple',
  admin: 'primary',
  manager: 'teal',
  learner: 'gray'
};

const statusColorMap: Record<string, string> = {
  active: 'green',
  invited: 'blue',
  suspended: 'orange',
  deactivated: 'gray'
};

export default async function AdminUsersPage() {
  const session = await requireRole('ADMIN');
  const orgId = session.user.orgId;

  if (!orgId) {
    throw new Error('Organization not found for admin user');
  }

  const { props } = await listUsers({ orgId, page: 1, pageSize: 6 });
  const { users, pagination } = props;
  const totalPages = Math.max(1, Math.ceil(pagination.totalCount / pagination.pageSize));
  const rangeStart = users.length > 0 ? (pagination.page - 1) * pagination.pageSize + 1 : 0;
  const rangeEnd = users.length > 0 ? rangeStart + users.length - 1 : 0;

  return (
    <Stack spacing={8} px={{ base: 4, md: 8 }} py={{ base: 6, md: 8 }}>
      <Card borderRadius="xl">
        <CardHeader>
          <Flex direction={{ base: 'column', md: 'row' }} justify="space-between" align={{ base: 'stretch', md: 'center' }} gap={4}>
            <Stack spacing={1}>
              <Heading size="lg">Organization users</Heading>
              <Text fontSize="sm" color="fg.muted">
                Monitor roles, access status, and group memberships. Invitations and role changes will appear here.
              </Text>
            </Stack>
            <Button colorScheme="primary" isDisabled alignSelf={{ base: 'stretch', md: 'center' }}>
              Invite
            </Button>
          </Flex>
        </CardHeader>
        <CardBody>
          <TableContainer>
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>User</Th>
                  <Th>Role</Th>
                  <Th>Status</Th>
                  <Th>Groups</Th>
                  <Th>Last seen</Th>
                  <Th>Joined</Th>
                </Tr>
              </Thead>
              <Tbody>
                {users.map((user) => {
                  const membershipCount = user.groups.length;
                  const initials = user.name ? user.name.split(' ').map((part) => part[0]).join('').slice(0, 2) : user.email[0];

                  return (
                    <Tr key={user.id}>
                      <Td>
                        <Stack direction="row" spacing={3} align="center">
                          <Avatar name={user.name ?? user.email} size="sm">
                            {initials.toUpperCase()}
                          </Avatar>
                          <Stack spacing={0}>
                            <Text fontWeight="medium">{user.name ?? user.email}</Text>
                            <Text fontSize="xs" color="fg.muted">
                              {user.email}
                            </Text>
                          </Stack>
                        </Stack>
                      </Td>
                      <Td>
                        <Badge colorScheme={roleColorMap[user.role] ?? 'gray'} textTransform="capitalize">
                          {user.role}
                        </Badge>
                      </Td>
                      <Td>
                        <Badge colorScheme={statusColorMap[user.status] ?? 'gray'} textTransform="capitalize">
                          {user.status}
                        </Badge>
                      </Td>
                      <Td>
                        <Text fontWeight="medium">{membershipCount}</Text>
                        <Text fontSize="xs" color="fg.muted">
                          {membershipCount === 1 ? 'group' : 'groups'}
                        </Text>
                      </Td>
                      <Td>{user.lastSeenAt ? dateFormatter.format(new Date(user.lastSeenAt)) : '—'}</Td>
                      <Td>{dateFormatter.format(new Date(user.createdAt))}</Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </TableContainer>
          <Flex mt={4} justify="space-between" align="center" wrap="wrap" gap={3} fontSize="sm" color="fg.muted">
            <Text>
              Showing {users.length === 0 ? 0 : `${rangeStart}-${rangeEnd}`} of {pagination.totalCount}
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
