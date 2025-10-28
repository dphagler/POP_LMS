'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  Circle,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Icon,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Stack,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { Users } from 'lucide-react';

import { PageHeader } from '@/components/admin/PageHeader';
import type { OrgUserListItem } from '@/lib/db/user';
import { inviteUser, sendResetLink, updateUserRole } from '@/lib/server-actions/users';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const statusColorMap: Record<OrgUserListItem['status'], string> = {
  active: 'green',
  invited: 'blue',
  suspended: 'orange',
  deactivated: 'gray',
};

type RoleOption = 'LEARNER' | 'MANAGER' | 'ADMIN';

type AdminUsersClientProps = {
  currentUserId: string;
  initialUsers: OrgUserListItem[];
  autoOpenInvite?: boolean;
};

type InviteFormState = {
  email: string;
  name: string;
  role: RoleOption;
};

const roleOptions: { label: string; value: RoleOption }[] = [
  { label: 'Learner', value: 'LEARNER' },
  { label: 'Manager', value: 'MANAGER' },
  { label: 'Admin', value: 'ADMIN' },
];

function toRoleOption(role: OrgUserListItem['role']): RoleOption {
  switch (role) {
    case 'admin':
      return 'ADMIN';
    case 'manager':
      return 'MANAGER';
    case 'learner':
    default:
      return 'LEARNER';
  }
}

const initialInviteState: InviteFormState = {
  email: '',
  name: '',
  role: 'LEARNER',
};

export function AdminUsersClient({ currentUserId, initialUsers, autoOpenInvite = false }: AdminUsersClientProps) {
  const [users, setUsers] = useState(initialUsers);
  const [inviteState, setInviteState] = useState<InviteFormState>(initialInviteState);
  const [rolePendingId, setRolePendingId] = useState<string | null>(null);
  const [resetPendingId, setResetPendingId] = useState<string | null>(null);
  const [isInvitePending, startInviteTransition] = useTransition();
  const [isRolePending, startRoleTransition] = useTransition();
  const [isResetPending, startResetTransition] = useTransition();
  const usersSnapshot = useRef(initialUsers);
  const toast = useToast();
  const inviteDialog = useDisclosure();
  const router = useRouter();
  const searchParams = useSearchParams();
  const basePath = '/admin/users';

  const updateModalParam = useCallback(
    (value: 'invite' | null) => {
      if (!router || !searchParams) {
        return;
      }

      const params = new URLSearchParams(searchParams.toString());

      if (value) {
        params.set('modal', value);
      } else {
        params.delete('modal');
      }

      const query = params.toString();
      const href = query ? `${basePath}?${query}` : basePath;
      router.replace(href, { scroll: false });
    },
    [router, searchParams]
  );

  useEffect(() => {
    usersSnapshot.current = users;
  }, [users]);

  const openInviteModal = useCallback(() => {
    setInviteState(initialInviteState);
    inviteDialog.onOpen();
    updateModalParam('invite');
  }, [inviteDialog, updateModalParam]);

  const closeInviteModal = useCallback(() => {
    setInviteState(initialInviteState);
    inviteDialog.onClose();
    updateModalParam(null);
  }, [inviteDialog, updateModalParam]);

  useEffect(() => {
    if (autoOpenInvite) {
      openInviteModal();
    }
  }, [autoOpenInvite, openInviteModal]);

  const handleInviteSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startInviteTransition(async () => {
      try {
        const result = await inviteUser({
          email: inviteState.email,
          name: inviteState.name || undefined,
          role: inviteState.role,
        });

        if (!result.ok || !('user' in result)) {
          const description = !result.ok ? result.error : 'Unable to invite user.';
          toast({
            title: 'Invitation failed',
            description,
            status: 'error',
          });
          return;
        }

        setUsers((current) => {
          const filtered = current.filter((user) => user.id !== result.user.id);
          return [result.user, ...filtered];
        });

        toast({
          title: 'Invitation sent',
          description: `Magic link sent to ${result.user.email}.`,
          status: 'success',
        });

        closeInviteModal();
      } catch (error) {
        const description = error instanceof Error ? error.message : 'Unable to invite user.';
        toast({ title: 'Invitation failed', description, status: 'error' });
      }
    });
  };

  const handleRoleChange = (userId: string, nextRole: RoleOption) => {
    const snapshot = usersSnapshot.current.map((user) => ({
      ...user,
      groups: user.groups.map((group) => ({ ...group })),
    }));

    setUsers((current) =>
      current.map((user) =>
        user.id === userId ? { ...user, role: nextRole.toLowerCase() as OrgUserListItem['role'] } : user
      )
    );

    setRolePendingId(userId);
    startRoleTransition(async () => {
      try {
        const result = await updateUserRole({ userId, role: nextRole });

        if (!result.ok || !('user' in result)) {
          const message = !result.ok ? result.error : 'Unable to update role.';
          throw new Error(message);
        }

        setUsers((current) =>
          current.map((user) => (user.id === result.user.id ? result.user : user))
        );

        toast({ title: 'Role updated', status: 'success' });
      } catch (error) {
        setUsers(snapshot);
        const description = error instanceof Error ? error.message : 'Unable to update role.';
        toast({ title: 'Role update failed', description, status: 'error' });
      } finally {
        setRolePendingId(null);
      }
    });
  };

  const handleResetLink = (userId: string) => {
    setResetPendingId(userId);
    startResetTransition(async () => {
      try {
        const result = await sendResetLink({ userId });

        if (!result.ok) {
          throw new Error(result.error);
        }

        toast({ title: 'Reset link sent', status: 'success' });
      } catch (error) {
        const description = error instanceof Error ? error.message : 'Unable to send reset link.';
        toast({ title: 'Reset failed', description, status: 'error' });
      } finally {
        setResetPendingId(null);
      }
    });
  };

  const handleModalClose = () => {
    closeInviteModal();
  };

  const range = useMemo(() => {
    if (users.length === 0) {
      return { start: 0, end: 0 };
    }

    return { start: 1, end: users.length };
  }, [users.length]);

  return (
    <Stack spacing={8}>
      <PageHeader
        title="Users"
        subtitle="Monitor roles, access status, and group memberships across your organization."
        actions={
          <Button colorScheme="primary" onClick={openInviteModal}>
            Invite user
          </Button>
        }
      />

      <Card borderRadius="xl">
        <CardBody>
          {users.length === 0 ? (
            <Stack align="center" spacing={4} py={10} textAlign="center">
              <Circle size="64px" bg="bg.subtle">
                <Icon as={Users} boxSize={6} color="fg.muted" />
              </Circle>
              <Stack spacing={1}>
                <Heading size="sm">No users yet</Heading>
                <Text fontSize="sm" color="fg.muted">
                  Invite your first teammate.
                </Text>
              </Stack>
              <Button colorScheme="primary" onClick={openInviteModal}>
                Invite user
              </Button>
            </Stack>
          ) : (
            <Stack spacing={6}>
              <Text fontSize="sm" color="fg.muted">
                Keep track of member access, roles, and sign-in status. Updates appear immediately after changes are made.
              </Text>
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
                      <Th>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {users.map((user) => {
                      const membershipCount = user.groups.length;
                      const initials = user.name
                        ? user.name
                            .split(' ')
                            .map((part) => part[0])
                            .join('')
                            .slice(0, 2)
                        : user.email[0];

                      const selectValue = toRoleOption(user.role);
                      const isSelfAdmin = user.id === currentUserId && user.role === 'admin';
                      const disableRoleSelect =
                        isSelfAdmin || (isRolePending && rolePendingId !== null && rolePendingId !== user.id);
                      const disableResetButton =
                        user.id === currentUserId || (isResetPending && resetPendingId !== null && resetPendingId !== user.id);

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
                            <Select
                              aria-label={`Change role for ${user.name ?? user.email}`}
                              size="sm"
                              value={selectValue}
                              onChange={(event) => handleRoleChange(user.id, event.target.value as RoleOption)}
                              isDisabled={disableRoleSelect}
                            >
                              {roleOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </Select>
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
                          <Td>
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => handleResetLink(user.id)}
                              isDisabled={disableResetButton}
                              isLoading={isResetPending && resetPendingId === user.id}
                            >
                              Send reset link
                            </Button>
                          </Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </TableContainer>
              <Flex mt={2} justify="space-between" align="center" wrap="wrap" gap={3} fontSize="sm" color="fg.muted">
                <Text>Showing {range.start === 0 ? 0 : `${range.start}-${range.end}`} of {users.length}</Text>
                <Stack direction="row" spacing={2} align="center">
                  <Button size="sm" variant="outline" isDisabled>
                    Previous
                  </Button>
                  <Button size="sm" variant="outline" isDisabled>
                    Next
                  </Button>
                  <Text fontSize="xs" color="fg.muted">
                    Page 1 of 1
                  </Text>
                </Stack>
              </Flex>
            </Stack>
          )}
        </CardBody>
      </Card>

      <Modal isOpen={inviteDialog.isOpen} onClose={handleModalClose} size="md">
        <ModalOverlay />
        <ModalContent as="form" onSubmit={handleInviteSubmit}>
          <ModalHeader>Invite a user</ModalHeader>
          <ModalCloseButton isDisabled={isInvitePending} />
          <ModalBody pb={4}>
            <Stack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Email address</FormLabel>
                <Input
                  type="email"
                  autoFocus
                  value={inviteState.email}
                  onChange={(event) =>
                    setInviteState((prev) => ({ ...prev, email: event.target.value.trim() }))
                  }
                />
              </FormControl>
              <FormControl>
                <FormLabel>Name</FormLabel>
                <Input
                  value={inviteState.name}
                  onChange={(event) =>
                    setInviteState((prev) => ({ ...prev, name: event.target.value }))
                  }
                />
              </FormControl>
              <FormControl>
                <FormLabel>Role</FormLabel>
                <Select
                  value={inviteState.role}
                  onChange={(event) =>
                    setInviteState((prev) => ({ ...prev, role: event.target.value as RoleOption }))
                  }
                >
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="outline" onClick={handleModalClose} isDisabled={isInvitePending}>
              Cancel
            </Button>
            <Button colorScheme="primary" type="submit" isLoading={isInvitePending}>
              Send invite
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Stack>
  );
}
