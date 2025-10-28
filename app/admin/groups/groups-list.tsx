"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
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
  SimpleGrid,
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
} from "@chakra-ui/react";
import { Plus, Users } from "lucide-react";

import { AdminNavLink } from "@/components/admin/AdminNavLink";
import { PageHeader } from "@/components/admin/PageHeader";
import type { GroupListItem } from "@/lib/db/group";
import { createGroup } from "@/lib/server-actions/groups";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

type AdminGroupsClientProps = {
  initialGroups: GroupListItem[];
  autoOpenCreate?: boolean;
};

type CreateGroupForm = {
  name: string;
  description: string;
};

const initialFormState: CreateGroupForm = {
  name: "",
  description: "",
};

export function AdminGroupsClient({ initialGroups, autoOpenCreate = false }: AdminGroupsClientProps) {
  const [groups, setGroups] = useState<GroupListItem[]>(() => [...initialGroups]);
  const [form, setForm] = useState<CreateGroupForm>(initialFormState);
  const [isPending, startTransition] = useTransition();
  const dialog = useDisclosure();
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const basePath = "/admin/groups";

  const stats = useMemo(() => {
    const total = groups.length;
    const members = groups.reduce((sum, group) => sum + group.memberCount, 0);
    const average = total > 0 ? Math.round(members / total) : 0;
    return { total, members, average };
  }, [groups]);

  const updateModalParam = useCallback(
    (value: "new" | null) => {
      if (!router || !searchParams) {
        return;
      }

      const params = new URLSearchParams(searchParams.toString());

      if (value) {
        params.set("modal", value);
      } else {
        params.delete("modal");
      }

      const query = params.toString();
      const href = query ? `${basePath}?${query}` : basePath;
      router.replace(href, { scroll: false });
    },
    [router, searchParams]
  );

  const handleOpenModal = useCallback(() => {
    setForm(initialFormState);
    dialog.onOpen();
    updateModalParam("new");
  }, [dialog, updateModalParam]);

  const handleCloseModal = useCallback(() => {
    setForm(initialFormState);
    dialog.onClose();
    updateModalParam(null);
  }, [dialog, updateModalParam]);

  useEffect(() => {
    if (autoOpenCreate) {
      handleOpenModal();
    }
  }, [autoOpenCreate, handleOpenModal]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      try {
        const result = await createGroup({
          name: form.name,
          description: form.description ? form.description : undefined,
        });

        if (!result.ok) {
          toast({
            title: "Unable to create group",
            description: result.error,
            status: "error",
          });
          return;
        }

        setGroups((current) => {
          const filtered = current.filter((group) => group.id !== result.data.id);
          return [result.data, ...filtered];
        });
        toast({ title: "Group created", status: "success" });
        handleCloseModal();
      } catch (error) {
        const description = error instanceof Error ? error.message : "Unexpected error creating group";
        toast({ title: "Unable to create group", description, status: "error" });
      }
    });
  };

  return (
    <Stack spacing={8}>
      <PageHeader
        title="Groups"
        subtitle="Organize learners into cohorts to target assignments and manage memberships."
        actions={
          <Button colorScheme="primary" leftIcon={<Plus size={16} />} onClick={handleOpenModal}>
            New group
          </Button>
        }
      />

      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
        <Card borderRadius="xl">
          <CardBody>
            <Stack spacing={1}>
              <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.2em" color="fg.muted">
                Groups
              </Text>
              <Heading size="lg">{stats.total}</Heading>
              <Text fontSize="sm" color="fg.muted">
                Active cohorts available to target assignments.
              </Text>
            </Stack>
          </CardBody>
        </Card>
        <Card borderRadius="xl">
          <CardBody>
            <Stack spacing={1}>
              <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.2em" color="fg.muted">
                Members tracked
              </Text>
              <Heading size="lg">{stats.members}</Heading>
              <Text fontSize="sm" color="fg.muted">
                Learners represented across all groups.
              </Text>
            </Stack>
          </CardBody>
        </Card>
        <Card borderRadius="xl">
          <CardBody>
            <Stack spacing={1}>
              <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.2em" color="fg.muted">
                Average size
              </Text>
              <Heading size="lg">{stats.average}</Heading>
              <Text fontSize="sm" color="fg.muted">
                Member count average per group.
              </Text>
            </Stack>
          </CardBody>
        </Card>
      </SimpleGrid>

      <Card borderRadius="xl">
        <CardBody>
          {groups.length === 0 ? (
            <Stack align="center" spacing={4} py={10} textAlign="center">
              <Circle size="64px" bg="bg.subtle">
                <Icon as={Users} boxSize={6} color="fg.muted" />
              </Circle>
              <Stack spacing={1}>
                <Heading size="sm">No groups yet</Heading>
                <Text fontSize="sm" color="fg.muted">
                  Create your first cohort to organize learners.
                </Text>
              </Stack>
              <Button colorScheme="primary" onClick={handleOpenModal} leftIcon={<Plus size={16} />}>
                New group
              </Button>
            </Stack>
          ) : (
            <Stack spacing={6}>
              <Text fontSize="sm" color="fg.muted">
                Keep cohorts aligned with assignment targets. Import data to sync with HRIS systems.
              </Text>
              <TableContainer>
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th>Name</Th>
                      <Th>Description</Th>
                      <Th>Members</Th>
                      <Th>Updated</Th>
                      <Th></Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {groups.map((group) => (
                      <Tr key={group.id}>
                        <Td>
                          <Stack spacing={1}>
                            <Text fontWeight="medium">{group.name}</Text>
                            <Badge alignSelf="start" colorScheme={group.memberCount > 30 ? "primary" : "gray"}>
                              {group.memberCount > 30 ? "Large cohort" : "Standard cohort"}
                            </Badge>
                          </Stack>
                        </Td>
                        <Td maxW="320px">
                          <Text noOfLines={2} color="fg.muted">
                            {group.description ?? "—"}
                          </Text>
                        </Td>
                        <Td>
                          <Text fontWeight="semibold">{group.memberCount}</Text>
                        </Td>
                        <Td>{dateFormatter.format(new Date(group.updatedAt))}</Td>
                        <Td>
                          <AdminNavLink href={`/admin/groups/${group.id}`} size="sm" variant="outline">
                            Manage
                          </AdminNavLink>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            </Stack>
          )}
        </CardBody>
      </Card>

      <Modal isOpen={dialog.isOpen} onClose={handleCloseModal} isCentered size="lg">
        <ModalOverlay />
        <ModalContent as="form" onSubmit={handleSubmit}>
          <ModalHeader>Create a new group</ModalHeader>
          <ModalCloseButton disabled={isPending} />
          <ModalBody>
            <Stack spacing={4}>
              <FormControl isRequired>
                <FormLabel htmlFor="group-name">Group name</FormLabel>
                <Input
                  id="group-name"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Regional managers"
                  autoFocus
                />
              </FormControl>
              <FormControl>
                <FormLabel htmlFor="group-description">Description (optional)</FormLabel>
                <Input
                  id="group-description"
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="Quarterly onboarding cohort"
                />
              </FormControl>
            </Stack>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={handleCloseModal} isDisabled={isPending}>
              Cancel
            </Button>
            <Button colorScheme="primary" type="submit" isLoading={isPending}>
              Create group
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Stack>
  );
}
