"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  ChakraProvider,
  Code,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
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
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
  Text,
  Textarea,
  chakra,
  extendTheme,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";

import {
  assertValidDomain,
  buildDomainVerificationToken,
  getDomainVerificationRecordName,
  normalizeDomain,
} from "@/lib/domain-utils";
import { removeDomain, updateBranding, verifyDomain } from "@/lib/server-actions/org";
import { PageHeader } from "@/components/admin/PageHeader";

const fallbackPrimary = "#4f46e5";
const fallbackAccent = "#f97316";

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

type BrandingState = {
  themePrimary: string;
  themeAccent: string;
  loginBlurb: string;
};

type DomainItem = {
  id: string;
  value: string;
  createdAt: string;
  verifiedAt: string | null;
};

type OrgSettingsClientProps = {
  orgId: string;
  initialBranding: {
    themePrimary: string | null;
    themeAccent: string | null;
    loginBlurb: string | null;
  };
  initialDomains: DomainItem[];
};

export function OrgSettingsClient({ orgId, initialBranding, initialDomains }: OrgSettingsClientProps) {
  const toast = useToast();
  const verificationDialog = useDisclosure();
  const [brandingValues, setBrandingValues] = useState<BrandingState>({
    themePrimary: initialBranding.themePrimary ?? "",
    themeAccent: initialBranding.themeAccent ?? "",
    loginBlurb: initialBranding.loginBlurb ?? "",
  });
  const [savedBranding, setSavedBranding] = useState<BrandingState>({
    themePrimary: initialBranding.themePrimary ?? "",
    themeAccent: initialBranding.themeAccent ?? "",
    loginBlurb: initialBranding.loginBlurb ?? "",
  });
  const [domains, setDomains] = useState<DomainItem[]>(() =>
    [...initialDomains].sort((a, b) => a.value.localeCompare(b.value))
  );
  const [domainInput, setDomainInput] = useState("");
  const [pendingDomain, setPendingDomain] = useState<string | null>(null);
  const [isBrandingPending, startBrandingTransition] = useTransition();
  const [isDomainPending, startDomainTransition] = useTransition();
  const [pendingRemovalId, setPendingRemovalId] = useState<string | null>(null);

  const isBrandingDirty =
    brandingValues.themePrimary !== savedBranding.themePrimary ||
    brandingValues.themeAccent !== savedBranding.themeAccent ||
    brandingValues.loginBlurb !== savedBranding.loginBlurb;

  const previewTheme = useMemo(
    () =>
      extendTheme({
        colors: {
          primary: { 500: brandingValues.themePrimary || fallbackPrimary },
          accent: { 500: brandingValues.themeAccent || fallbackAccent },
        },
      }),
    [brandingValues.themePrimary, brandingValues.themeAccent]
  );

  const handleBrandingSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startBrandingTransition(async () => {
      try {
        const result = await updateBranding({
          themePrimary: brandingValues.themePrimary,
          themeAccent: brandingValues.themeAccent,
          loginBlurb: brandingValues.loginBlurb,
        });

        setSavedBranding({
          themePrimary: result.branding.themePrimary ?? "",
          themeAccent: result.branding.themeAccent ?? "",
          loginBlurb: result.branding.loginBlurb ?? "",
        });
        setBrandingValues({
          themePrimary: result.branding.themePrimary ?? "",
          themeAccent: result.branding.themeAccent ?? "",
          loginBlurb: result.branding.loginBlurb ?? "",
        });

        toast({
          title: "Branding updated",
          description: "Sign-in preview now reflects your latest colors.",
          status: "success",
        });
      } catch (error) {
        const description = error instanceof Error ? error.message : "Unable to update branding.";
        toast({ title: "Branding update failed", description, status: "error" });
      }
    });
  };

  const openVerificationDialog = () => {
    try {
      const normalized = normalizeDomain(domainInput);
      assertValidDomain(normalized);
      setPendingDomain(normalized);
      verificationDialog.onOpen();
    } catch (error) {
      const description = error instanceof Error ? error.message : "Enter a valid domain.";
      toast({ title: "Invalid domain", description, status: "error" });
    }
  };

  const handleVerifyDomain = () => {
    if (!pendingDomain) return;
    startDomainTransition(async () => {
      try {
        const result = await verifyDomain({ domain: pendingDomain });
        setDomains((current) =>
          [...current.filter((item) => item.id !== result.domain.id), result.domain].sort((a, b) =>
            a.value.localeCompare(b.value)
          )
        );
        setDomainInput("");
        setPendingDomain(null);
        verificationDialog.onClose();
        toast({
          title: "Domain verified",
          description: `${result.domain.value} is ready for SSO sign-ins.`,
          status: "success",
        });
      } catch (error) {
        const description = error instanceof Error ? error.message : "Unable to verify domain.";
        toast({ title: "Verification failed", description, status: "error" });
      }
    });
  };

  const handleRemoveDomain = (domainId: string) => {
    setPendingRemovalId(domainId);
    startDomainTransition(async () => {
      try {
        await removeDomain({ domainId });
        setDomains((current) => current.filter((item) => item.id !== domainId));
        toast({ title: "Domain removed", status: "success" });
      } catch (error) {
        const description = error instanceof Error ? error.message : "Unable to remove domain.";
        toast({ title: "Removal failed", description, status: "error" });
      } finally {
        setPendingRemovalId(null);
      }
    });
  };

  const verificationToken = useMemo(() => {
    if (!pendingDomain) return null;
    const token = buildDomainVerificationToken(orgId, pendingDomain);
    const recordName = getDomainVerificationRecordName(pendingDomain);
    return { token, recordName };
  }, [orgId, pendingDomain]);

  return (
    <Stack spacing={8}>
      <PageHeader
        title="Organization settings"
        subtitle="Customize your sign-in experience and manage verified email domains."
        actions={
          <Button colorScheme="primary" onClick={verificationDialog.onOpen}>
            Add domain
          </Button>
        }
      />

      <Tabs colorScheme="primary" variant="enclosed">
        <TabList>
          <Tab>Branding</Tab>
          <Tab>Domains</Tab>
        </TabList>
        <TabPanels>
          <TabPanel px={0}>
            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={10} mt={6} alignItems="start">
              <chakra.form onSubmit={handleBrandingSubmit} w="full">
                <Card borderRadius="2xl">
                  <CardHeader>
                    <Stack spacing={2}>
                      <Heading size="md">Theme colors</Heading>
                      <Text fontSize="sm" color="fg.muted">
                        Adjust the colors and messaging displayed on your sign-in experience.
                      </Text>
                    </Stack>
                  </CardHeader>
                  <CardBody>
                    <Stack spacing={6}>
                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                        <FormControl>
                          <FormLabel>Primary color</FormLabel>
                          <Input
                            value={brandingValues.themePrimary}
                            onChange={(event) =>
                              setBrandingValues((current) => ({
                                ...current,
                                themePrimary: event.target.value,
                              }))
                            }
                            placeholder="#1F2937"
                          />
                        </FormControl>
                        <FormControl>
                          <FormLabel>Accent color</FormLabel>
                          <Input
                            value={brandingValues.themeAccent}
                            onChange={(event) =>
                              setBrandingValues((current) => ({
                                ...current,
                                themeAccent: event.target.value,
                              }))
                            }
                            placeholder="#F97316"
                          />
                        </FormControl>
                      </SimpleGrid>
                      <FormControl>
                        <FormLabel>Login blurb</FormLabel>
                        <Textarea
                          value={brandingValues.loginBlurb}
                          onChange={(event) =>
                            setBrandingValues((current) => ({
                              ...current,
                              loginBlurb: event.target.value,
                            }))
                          }
                          rows={4}
                          placeholder="Welcome your learners and share sign-in guidance."
                        />
                        <Text fontSize="xs" color="fg.muted" mt={2}>
                          Displayed beneath the sign-in buttons. 500 characters max.
                        </Text>
                      </FormControl>
                      <Flex justify="flex-end" gap={3}>
                        <Button
                          type="submit"
                          colorScheme="primary"
                          isDisabled={!isBrandingDirty}
                          isLoading={isBrandingPending}
                        >
                          Save changes
                        </Button>
                      </Flex>
                    </Stack>
                  </CardBody>
                </Card>
              </chakra.form>
              <Stack spacing={6}>
                <Card borderRadius="2xl" overflow="hidden">
                  <CardHeader>
                    <Heading size="sm">Sign-in preview</Heading>
                  </CardHeader>
                  <CardBody>
                    <ChakraProvider theme={previewTheme} resetCSS={false}>
                      <Stack spacing={6} align="center" p={4} borderRadius="xl" bg="gray.900">
                        <Box
                          w="full"
                          maxW="sm"
                          borderRadius="2xl"
                          bg="white"
                          p={8}
                          boxShadow="xl"
                        >
                          <Stack spacing={6} textAlign="center">
                            <Stack spacing={2}>
                              <Heading size="md" color="gray.800">
                                Welcome back
                              </Heading>
                              <Text fontSize="sm" color="gray.600">
                                {brandingValues.loginBlurb ||
                                  "Choose how you’d like to sign in to your POP Initiative account."}
                              </Text>
                            </Stack>
                            <Stack spacing={3}>
                              <Button colorScheme="primary">Continue with Google</Button>
                              <Button variant="outline" colorScheme="accent">
                                Send me a magic link
                              </Button>
                            </Stack>
                            <Box
                              borderWidth="1px"
                              borderStyle="dashed"
                              borderRadius="lg"
                              borderColor="gray.200"
                              p={4}
                            >
                              <Text fontSize="xs" color="gray.600">
                                Need access? Contact your program admin to request an invite.
                              </Text>
                            </Box>
                          </Stack>
                        </Box>
                      </Stack>
                    </ChakraProvider>
                  </CardBody>
                </Card>
              </Stack>
            </SimpleGrid>
          </TabPanel>
          <TabPanel px={0}>
            <Stack spacing={6} mt={6}>
              <Card borderRadius="2xl">
                <CardHeader>
                  <Stack spacing={2}>
                    <Heading size="md">Connect a domain</Heading>
                    <Text fontSize="sm" color="fg.muted">
                      Verified domains automatically assign new SSO users to this organization.
                    </Text>
                  </Stack>
                </CardHeader>
                <CardBody>
                  <Stack spacing={4}>
                    <FormControl>
                      <FormLabel>Domain</FormLabel>
                      <Input
                        value={domainInput}
                        onChange={(event) => setDomainInput(event.target.value)}
                        placeholder="example.org"
                      />
                    </FormControl>
                    <Flex justify="flex-end">
                      <Button
                        colorScheme="primary"
                        onClick={openVerificationDialog}
                        isDisabled={domainInput.trim().length === 0}
                      >
                        Verify domain
                      </Button>
                    </Flex>
                  </Stack>
                </CardBody>
              </Card>

              <Card borderRadius="2xl">
                <CardHeader>
                  <Heading size="sm">Verified domains</Heading>
                </CardHeader>
                <CardBody>
                  <Stack spacing={4}>
                    {domains.length === 0 ? (
                      <Text fontSize="sm" color="fg.muted">
                        No domains have been verified yet.
                      </Text>
                    ) : (
                      domains.map((domain) => (
                        <Box
                          key={domain.id}
                          borderWidth="1px"
                          borderRadius="xl"
                          p={4}
                          borderColor="gray.200"
                        >
                          <Flex align="center" gap={4} wrap="wrap">
                            <Stack spacing={1} flex="1">
                              <HStack spacing={3}>
                                <Heading size="sm">{domain.value}</Heading>
                                <Tag colorScheme="green">Verified</Tag>
                              </HStack>
                              <Text fontSize="xs" color="fg.muted">
                                Added {dateFormatter.format(new Date(domain.createdAt))}
                              </Text>
                            </Stack>
                            <Button
                              variant="ghost"
                              colorScheme="red"
                              onClick={() => handleRemoveDomain(domain.id)}
                              isLoading={pendingRemovalId === domain.id && isDomainPending}
                            >
                              Remove
                            </Button>
                          </Flex>
                        </Box>
                      ))
                    )}
                  </Stack>
                </CardBody>
              </Card>
            </Stack>
          </TabPanel>
        </TabPanels>
      </Tabs>

      <Modal isOpen={verificationDialog.isOpen} onClose={verificationDialog.onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Verify domain</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {verificationToken ? (
              <Stack spacing={4}>
                <Text>
                  Add the following TXT record to your DNS provider, then click <strong>Verify</strong>.
                </Text>
                <Stack spacing={2}>
                  <Text fontWeight="semibold">Host</Text>
                  <Code>{verificationToken.recordName}</Code>
                </Stack>
                <Stack spacing={2}>
                  <Text fontWeight="semibold">Value</Text>
                  <Code>{verificationToken.token}</Code>
                </Stack>
              </Stack>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={verificationDialog.onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="primary"
              onClick={handleVerifyDomain}
              isLoading={isDomainPending}
            >
              Verify
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Stack>
  );
}
