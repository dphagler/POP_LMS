"use client";

import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useMemo, useState, useTransition } from "react";

import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  IconButton,
  Input,
  Stack,
  Switch,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useToast,
} from "@chakra-ui/react";
import { Trash2 } from "lucide-react";

import type { GroupMemberItem } from "@/lib/db/group";
import { parseCsv } from "@/lib/csv";
import {
  addGroupMember,
  deleteGroup,
  importGroupCsv,
  removeGroupMember,
  toggleGroupManager,
  updateGroup,
} from "@/lib/server-actions/groups";

type MemberState = GroupMemberItem & { isPending?: boolean };

type GroupDetailClientProps = {
  groupId: string;
  initialName: string;
  initialDescription: string | null;
  initialMembers: GroupMemberItem[];
  currentUserId: string;
};

type ImportPreviewRow = {
  email: string;
  name: string;
  rowNumber: number;
};

type ImportOutcome = {
  added: number;
  createdUsers: number;
  errors: { rowNumber: number; email: string; message: string }[];
};

function sortMembers(members: MemberState[]): MemberState[] {
  return [...members].sort((left, right) => {
    const leftName = left.name?.toLowerCase() ?? left.email.toLowerCase();
    const rightName = right.name?.toLowerCase() ?? right.email.toLowerCase();
    return leftName.localeCompare(rightName, undefined, { sensitivity: "base" });
  });
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function GroupDetailClient({
  groupId,
  initialName,
  initialDescription,
  initialMembers,
  currentUserId,
}: GroupDetailClientProps) {
  const [members, setMembers] = useState<MemberState[]>(() => sortMembers(initialMembers));
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [addEmail, setAddEmail] = useState("");
  const [addManager, setAddManager] = useState(false);
  const [isMembersPending, startMembersTransition] = useTransition();
  const [isSettingsPending, startSettingsTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  const [importRows, setImportRows] = useState<ImportPreviewRow[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<ImportOutcome | null>(null);
  const [isImporting, startImportTransition] = useTransition();

  const totalMembers = members.length;
  const managerCount = members.filter((member) => member.groupManager).length;

  const handleAddMember = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const emailValue = normalizeEmail(addEmail);
    if (!emailValue) {
      toast({ title: "Email is required", status: "error" });
      return;
    }

    const optimisticMember: MemberState = {
      membershipId: `pending-${Date.now()}`,
      userId: "pending",
      email: emailValue,
      name: null,
      groupManager: addManager,
      isPending: true,
    };

    const previousMembers = members;
    setMembers(sortMembers([optimisticMember, ...previousMembers]));
    setAddEmail("");
    setAddManager(false);

    startMembersTransition(async () => {
      const result = await addGroupMember({
        groupId,
        email: emailValue,
        groupManager: optimisticMember.groupManager,
      });

      if (!result.ok) {
        setMembers(previousMembers);
        toast({ title: "Unable to add member", description: result.error, status: "error" });
        return;
      }

      setMembers((current) => {
        const withoutOptimistic = current.filter((member) => member.membershipId !== optimisticMember.membershipId);
        return sortMembers([result.data.member, ...withoutOptimistic]);
      });

      toast({
        title: "Member added",
        description: result.data.createdUser
          ? "New learner created and added to the group."
          : "Learner added to the group.",
        status: "success",
      });
    });
  };

  const handleRemoveMember = (membershipId: string) => {
    const target = members.find((member) => member.membershipId === membershipId);
    if (!target) return;
    if (target.userId === currentUserId) {
      toast({ title: "You cannot remove yourself", status: "error" });
      return;
    }

    const previousMembers = members;
    setMembers((current) => current.filter((member) => member.membershipId !== membershipId));

    startMembersTransition(async () => {
      const result = await removeGroupMember({ groupId, membershipId });
      if (!result.ok) {
        setMembers(previousMembers);
        toast({ title: "Unable to remove member", description: result.error, status: "error" });
      } else {
        toast({ title: "Member removed", status: "success" });
      }
    });
  };

  const handleToggleManager = (membershipId: string, nextValue: boolean) => {
    setMembers((current) =>
      current.map((member) =>
        member.membershipId === membershipId ? { ...member, groupManager: nextValue, isPending: true } : member
      )
    );

    startMembersTransition(async () => {
      const result = await toggleGroupManager({ groupId, membershipId, groupManager: nextValue });
      if (!result.ok) {
        setMembers((current) =>
          current.map((member) =>
            member.membershipId === membershipId ? { ...member, groupManager: !nextValue, isPending: false } : member
          )
        );
        toast({ title: "Unable to update role", description: result.error, status: "error" });
        return;
      }

      setMembers((current) =>
        sortMembers(
          current.map((member) =>
            member.membershipId === membershipId ? { ...result.data, isPending: false } : member
          )
        )
      );
      toast({ title: nextValue ? "Promoted to manager" : "Manager access removed", status: "success" });
    });
  };

  const handleCsvChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setImportSummary(null);

    if (!file) {
      setImportRows([]);
      setImportError(null);
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      const headers = parsed.headers.map((header) => header.toLowerCase());

      if (!headers.includes("email")) {
        throw new Error('CSV must include an "email" column');
      }

      const preview: ImportPreviewRow[] = parsed.rows.map((row, index) => ({
        email: (row.email ?? "").trim(),
        name: (row.name ?? "").trim(),
        rowNumber: index + 2,
      }));

      setImportRows(preview);
      setImportError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to read CSV";
      setImportRows([]);
      setImportError(message);
    }
  };

  const handleImportMembers = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (importRows.length === 0) {
      toast({ title: "No rows to import", status: "error" });
      return;
    }

    const payload = importRows.map((row) => ({
      email: row.email,
      name: row.name,
      rowNumber: row.rowNumber,
    }));

    const form = event.currentTarget;

    startImportTransition(async () => {
      const result = await importGroupCsv({ groupId, rows: payload });

      if (!result.ok) {
        toast({ title: "Import failed", description: result.error, status: "error" });
        return;
      }

      setImportSummary({
        added: result.data.summary.added,
        createdUsers: result.data.summary.createdUsers,
        errors: result.data.summary.errors,
      });

      if (result.data.members.length > 0) {
        setMembers((current) =>
          sortMembers([
            ...current,
            ...result.data.members.filter(
              (member) => !current.some((existing) => existing.membershipId === member.membershipId)
            ),
          ])
        );
      }

      toast({ title: "Import complete", status: "success" });
      setImportRows([]);
      setImportError(null);
      form.reset();
    });
  };

  const handleUpdateSettings = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startSettingsTransition(async () => {
      const result = await updateGroup({ groupId, name, description: description || undefined });

      if (!result.ok) {
        toast({ title: "Unable to update group", description: result.error, status: "error" });
        return;
      }

      setName(result.data.name);
      setDescription(result.data.description ?? "");
      setMembers(sortMembers(result.data.members));
      setConfirmation("");
      toast({ title: "Group updated", status: "success" });
    });
  };

  const [confirmation, setConfirmation] = useState("");
  const [isDeleting, startDeleteTransition] = useTransition();

  const handleDeleteGroup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startDeleteTransition(async () => {
      const result = await deleteGroup({ groupId });
      if (!result.ok) {
        toast({ title: "Unable to delete group", description: result.error, status: "error" });
        return;
      }

      toast({ title: "Group deleted", status: "success" });
      router.replace("/admin/groups");
      router.refresh();
    });
  };

  const importPreview = useMemo(() => importRows.slice(0, 10), [importRows]);

  return (
    <Stack spacing={6}>
      <Card>
        <CardHeader>
          <Stack spacing={1}>
            <Heading size="lg">{name}</Heading>
            <Text fontSize="sm" color="fg.muted">
              Manage members, imports, and settings for this cohort.
            </Text>
          </Stack>
        </CardHeader>
        <CardBody>
          <SimpleSummary totalMembers={totalMembers} managerCount={managerCount} />
        </CardBody>
      </Card>

      <Tabs colorScheme="primary">
        <TabList>
          <Tab>Members</Tab>
          <Tab>Import</Tab>
          <Tab>Settings</Tab>
        </TabList>
        <TabPanels>
          <TabPanel px={0}>
            <Stack spacing={6}>
              <Card>
                <CardHeader>
                  <Heading size="md">Add a member</Heading>
                </CardHeader>
                <CardBody>
                  <Stack as="form" spacing={4} onSubmit={handleAddMember} direction="column">
                    <FormControl isRequired>
                      <FormLabel htmlFor="member-email">Email address</FormLabel>
                      <Input
                        id="member-email"
                        type="email"
                        value={addEmail}
                        onChange={(event) => setAddEmail(event.target.value)}
                        placeholder="learner@example.com"
                      />
                    </FormControl>
                    <FormControl display="flex" alignItems="center" gap={3}>
                      <Switch
                        id="member-manager"
                        isChecked={addManager}
                        onChange={(event) => setAddManager(event.target.checked)}
                      />
                      <FormLabel htmlFor="member-manager" mb={0}>
                        Add as group manager
                      </FormLabel>
                    </FormControl>
                    <Button type="submit" colorScheme="primary" isLoading={isMembersPending} alignSelf="start">
                      Add member
                    </Button>
                  </Stack>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <Heading size="md">Current members</Heading>
                </CardHeader>
                <CardBody>
                  {members.length === 0 ? (
                    <Text fontSize="sm" color="fg.muted">
                      No members yet. Add learners to populate this cohort.
                    </Text>
                  ) : (
                    <TableContainer>
                      <Table size="sm" variant="simple">
                        <Thead>
                          <Tr>
                            <Th>Name</Th>
                            <Th>Email</Th>
                            <Th>Manager</Th>
                            <Th></Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {members.map((member) => (
                            <Tr key={member.membershipId} opacity={member.isPending ? 0.6 : 1}>
                              <Td>{member.name ?? "—"}</Td>
                              <Td>{member.email}</Td>
                              <Td>
                                <Switch
                                  isChecked={member.groupManager}
                                  onChange={(event) => handleToggleManager(member.membershipId, event.target.checked)}
                                  isDisabled={member.isPending || member.userId === currentUserId || isMembersPending}
                                />
                              </Td>
                              <Td textAlign="right">
                                <IconButton
                                  aria-label={`Remove ${member.email}`}
                                  icon={<Trash2 size={16} />}
                                  variant="ghost"
                                  colorScheme="red"
                                  size="sm"
                                  isDisabled={member.userId === currentUserId || member.isPending || isMembersPending}
                                  onClick={() => handleRemoveMember(member.membershipId)}
                                />
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </TableContainer>
                  )}
                </CardBody>
              </Card>
            </Stack>
          </TabPanel>

          <TabPanel px={0}>
            <Stack spacing={6}>
              <Card as="form" onSubmit={handleImportMembers}>
                <CardHeader>
                  <Heading size="md">Import members from CSV</Heading>
                </CardHeader>
                <CardBody>
                  <Stack spacing={4}>
                    <FormControl>
                      <FormLabel htmlFor="csv-upload">Upload CSV</FormLabel>
                      <Input id="csv-upload" type="file" accept=".csv" onChange={handleCsvChange} />
                      <FormHelperText>Include at least an email column. Name is optional.</FormHelperText>
                    </FormControl>
                    {importError ? (
                      <Alert status="error">
                        <AlertIcon />
                        <AlertDescription>{importError}</AlertDescription>
                      </Alert>
                    ) : null}
                    {importPreview.length > 0 ? (
                      <Box>
                        <Text fontSize="sm" fontWeight="semibold" mb={2}>
                          Previewing first {importPreview.length} of {importRows.length} rows
                        </Text>
                        <TableContainer>
                          <Table size="sm" variant="simple">
                            <Thead>
                              <Tr>
                                <Th>Row</Th>
                                <Th>Email</Th>
                                <Th>Name</Th>
                              </Tr>
                            </Thead>
                            <Tbody>
                              {importPreview.map((row) => (
                                <Tr key={row.rowNumber}>
                                  <Td>{row.rowNumber}</Td>
                                  <Td>{row.email}</Td>
                                  <Td>{row.name || "—"}</Td>
                                </Tr>
                              ))}
                            </Tbody>
                          </Table>
                        </TableContainer>
                      </Box>
                    ) : null}
                    <Button
                      type="submit"
                      colorScheme="primary"
                      isLoading={isImporting}
                      isDisabled={importRows.length === 0}
                      alignSelf="start"
                    >
                      Import members
                    </Button>
                  </Stack>
                </CardBody>
              </Card>

              {importSummary ? (
                <Alert status={importSummary.errors.length > 0 ? "warning" : "success"}>
                  <AlertIcon />
                  <Stack spacing={1}>
                    <AlertTitle>Import summary</AlertTitle>
                    <AlertDescription>
                      Added {importSummary.added} memberships and created {importSummary.createdUsers} new learners.
                    </AlertDescription>
                    {importSummary.errors.length > 0 ? (
                      <Box>
                        <Text fontWeight="semibold" fontSize="sm">
                          Issues
                        </Text>
                        <Stack spacing={1} mt={1}>
                          {importSummary.errors.map((error) => (
                            <Text key={`${error.rowNumber}-${error.email}`} fontSize="sm">
                              Row {error.rowNumber}: {error.email || "(missing email)"} — {error.message}
                            </Text>
                          ))}
                        </Stack>
                      </Box>
                    ) : null}
                  </Stack>
                </Alert>
              ) : null}
            </Stack>
          </TabPanel>

          <TabPanel px={0}>
            <Stack spacing={6}>
              <Card as="form" onSubmit={handleUpdateSettings}>
                <CardHeader>
                  <Heading size="md">Group details</Heading>
                </CardHeader>
                <CardBody>
                  <Stack spacing={4}>
                    <FormControl isRequired>
                      <FormLabel htmlFor="group-name-settings">Group name</FormLabel>
                      <Input
                        id="group-name-settings"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel htmlFor="group-description-settings">Description</FormLabel>
                      <Input
                        id="group-description-settings"
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="Optional context for this group"
                      />
                    </FormControl>
                    <Button type="submit" colorScheme="primary" isLoading={isSettingsPending} alignSelf="start">
                      Save changes
                    </Button>
                  </Stack>
                </CardBody>
              </Card>

              <Card as="form" onSubmit={handleDeleteGroup} borderColor="red.200">
                <CardHeader>
                  <Heading size="md" color="red.500">
                    Danger zone
                  </Heading>
                </CardHeader>
                <CardBody>
                  <Stack spacing={4}>
                    <Text fontSize="sm">
                      Deleting this group will remove all memberships. This action cannot be undone.
                    </Text>
                    <FormControl>
                      <FormLabel htmlFor="delete-confirmation">
                        Type <Text as="span" fontWeight="semibold">{name}</Text> to confirm
                      </FormLabel>
                      <Input
                        id="delete-confirmation"
                        value={confirmation}
                        onChange={(event) => setConfirmation(event.target.value)}
                      />
                    </FormControl>
                    <Button
                      type="submit"
                      colorScheme="red"
                      isDisabled={confirmation !== name}
                      isLoading={isDeleting}
                      alignSelf="start"
                    >
                      Delete group
                    </Button>
                  </Stack>
                </CardBody>
              </Card>
            </Stack>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Stack>
  );
}

type SummaryProps = {
  totalMembers: number;
  managerCount: number;
};

function SimpleSummary({ totalMembers, managerCount }: SummaryProps) {
  return (
    <Stack direction={{ base: 'column', md: 'row' }} spacing={8} shouldWrapChildren>
      <Stack>
        <Text fontSize="xs" textTransform="uppercase" color="fg.muted">
          Members
        </Text>
        <Heading size="md">{totalMembers}</Heading>
      </Stack>
      <Stack>
        <Text fontSize="xs" textTransform="uppercase" color="fg.muted">
          Managers
        </Text>
        <Heading size="md">{managerCount}</Heading>
      </Stack>
    </Stack>
  );
}
