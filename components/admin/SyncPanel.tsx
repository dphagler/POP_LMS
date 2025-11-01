"use client";

import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  useToast
} from "@chakra-ui/react";
import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import type {
  SyncJobCounts,
  SyncJobOptions,
  SyncStatus
} from "@/lib/jobs/syncStatus";
import { getSyncStatus, runSanitySync } from "@/lib/server-actions/sync";

const DEFAULT_OPTIONS: SyncJobOptions = {
  dryRun: false,
  allowDeletes: false,
  removeMissing: false
};
const DEFAULT_COUNTS: SyncJobCounts = {
  created: 0,
  updated: 0,
  deleted: 0,
  skipped: 0
};

type SyncBooleanOptionKey = "dryRun" | "allowDeletes" | "removeMissing";

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short"
});

type StartSyncResult =
  | { ok: true; status: SyncStatus | null }
  | {
      ok: false;
      reason: "disabled" | "already_running" | "error" | "unknown";
      status?: SyncStatus | null;
    };

type SyncPanelContextValue = {
  status: SyncStatus | null;
  options: SyncJobOptions;
  updateOption: (key: SyncBooleanOptionKey, value: boolean) => void;
  startSync: () => Promise<StartSyncResult>;
  isSubmitting: boolean;
  isRunning: boolean;
  disabled: boolean;
  disabledReason?: string;
  scrollToPanel: () => void;
  registerPanel: (node: HTMLDivElement | null) => void;
};

const SyncPanelContext = createContext<SyncPanelContextValue | null>(null);

type SerializableStatus = SyncStatus & {
  startedAt: Date | string;
  updatedAt: Date | string;
  finishedAt: Date | string | null;
};

function coerceStatus(
  raw: SerializableStatus | SyncStatus | null | undefined
): SyncStatus | null {
  if (!raw) {
    return null;
  }

  const startedAt =
    raw.startedAt instanceof Date ? raw.startedAt : new Date(raw.startedAt);
  const updatedAt =
    raw.updatedAt instanceof Date ? raw.updatedAt : new Date(raw.updatedAt);
  const finishedAt = raw.finishedAt
    ? raw.finishedAt instanceof Date
      ? raw.finishedAt
      : new Date(raw.finishedAt)
    : null;

  return {
    ...raw,
    startedAt,
    updatedAt,
    finishedAt,
    counts: { ...raw.counts },
    logs: raw.logs ? [...raw.logs] : undefined,
    options: { ...raw.options }
  };
}

function isStatusActive(status: SyncStatus | null): boolean {
  if (!status) return false;
  return status.phase !== "done" && status.phase !== "error";
}

const phaseLabels: Record<SyncStatus["phase"], string> = {
  fetch: "Fetching content",
  upsert: "Applying updates",
  done: "Completed",
  error: "Error"
};

const phaseColors: Record<SyncStatus["phase"], string> = {
  fetch: "blue",
  upsert: "purple",
  done: "green",
  error: "red"
};

type SyncPanelProviderProps = {
  initialStatus: SyncStatus | null;
  disabled?: boolean;
  disabledReason?: string;
  children: ReactNode;
};

export function SyncPanelProvider({
  initialStatus,
  disabled = false,
  disabledReason,
  children
}: SyncPanelProviderProps) {
  const toast = useToast();
  const initial = useMemo(() => coerceStatus(initialStatus), [initialStatus]);
  const [status, setStatus] = useState<SyncStatus | null>(initial);
  const [options, setOptions] = useState<SyncJobOptions>(
    () => initial?.options ?? { ...DEFAULT_OPTIONS }
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchInFlight = useRef(false);
  const panelNodeRef = useRef<HTMLDivElement | null>(null);
  const previousPhaseRef = useRef<SyncStatus["phase"] | null>(
    initial?.phase ?? null
  );
  const initialJobIdRef = useRef<string | undefined>(initial?.id);

  const isRunning = isStatusActive(status);

  const scrollToPanel = useCallback(() => {
    const node = panelNodeRef.current;
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const registerPanel = useCallback((node: HTMLDivElement | null) => {
    panelNodeRef.current = node;
  }, []);

  const updateOption = useCallback(
    (key: SyncBooleanOptionKey, value: boolean) => {
      setOptions((prev) => {
        const next: SyncJobOptions = { ...prev, [key]: value };

        if (key === "dryRun" && value) {
          next.allowDeletes = false;
          next.removeMissing = false;
        }

        if ((key === "allowDeletes" && !value) || (key === "dryRun" && value)) {
          next.removeMissing = false;
        }

        return next;
      });
    },
    []
  );

  const fetchStatus = useCallback(async (jobId?: string | null) => {
    if (fetchInFlight.current) {
      return;
    }

    fetchInFlight.current = true;
    try {
      const next = await getSyncStatus(jobId ?? undefined);
      setStatus(coerceStatus(next));
    } catch (error) {
      console.error("Unable to load sync status", error);
    } finally {
      fetchInFlight.current = false;
    }
  }, []);

  const startSync = useCallback(async (): Promise<StartSyncResult> => {
    if (disabled) {
      if (disabledReason) {
        toast({
          title: "Sync unavailable",
          description: disabledReason,
          status: "info"
        });
      }
      return { ok: false, reason: "disabled", status };
    }

    if (isStatusActive(status)) {
      toast({
        title: "Sync already running",
        description: "Scroll to the Sync panel to view live progress.",
        status: "info"
      });
      return { ok: false, reason: "already_running", status };
    }

    setIsSubmitting(true);

    try {
      const result = await runSanitySync(options);

      if (!result.ok) {
        if (result.reason === "already_running") {
          const next = coerceStatus(result.status ?? status);
          setStatus(next);
          toast({
            title: "Sync already running",
            description: "Scroll to the Sync panel to view live progress.",
            status: "info"
          });
          return { ok: false, reason: "already_running", status: next };
        }

        toast({
          title: "Unable to start sync",
          description: result.message,
          status: "error"
        });
        return { ok: false, reason: "error", status };
      }

      const nextStatus = coerceStatus(result.status);
      setStatus(nextStatus);
      if (nextStatus?.options) {
        setOptions({ ...nextStatus.options });
      }

      toast({
        title: options.dryRun ? "Dry run started" : "Sync started",
        description: "We’ll keep this panel updated as progress is reported.",
        status: "info",
        duration: 4000
      });

      return { ok: true, status: nextStatus };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to start sync.";
      toast({
        title: "Unable to start sync",
        description: message,
        status: "error"
      });
      return { ok: false, reason: "unknown", status };
    } finally {
      setIsSubmitting(false);
    }
  }, [disabled, disabledReason, options, status, toast]);

  useEffect(() => {
    if (!status) {
      return;
    }

    if (isStatusActive(status)) {
      setOptions({ ...status.options });
    }
  }, [status]);

  useEffect(() => {
    const phase = status?.phase ?? null;
    const previous = previousPhaseRef.current;

    if (phase && phase !== previous) {
      if (phase === "done" && status) {
        const title = status.options.dryRun
          ? "Dry run complete"
          : "Sync complete";
        toast({
          title,
          description: formatCounts(status.counts),
          status: "success"
        });
      } else if (phase === "error" && status) {
        toast({
          title: "Sync failed",
          description:
            status.message ?? "An unexpected error occurred during sync.",
          status: "error"
        });
      }
    }

    previousPhaseRef.current = phase;
  }, [status, toast]);

  useEffect(() => {
    fetchStatus(initialJobIdRef.current);
  }, [fetchStatus]);

  useEffect(() => {
    if (!isStatusActive(status)) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    const jobId = status?.id;
    const tick = () => {
      fetchStatus(jobId);
    };

    tick();
    const intervalId = setInterval(tick, 1000);
    pollIntervalRef.current = intervalId;

    return () => {
      clearInterval(intervalId);
      pollIntervalRef.current = null;
    };
  }, [status, fetchStatus]);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  const contextValue = useMemo(
    () => ({
      status,
      options,
      updateOption,
      startSync,
      isSubmitting,
      isRunning,
      disabled,
      disabledReason,
      scrollToPanel,
      registerPanel
    }),
    [
      status,
      options,
      updateOption,
      startSync,
      isSubmitting,
      isRunning,
      disabled,
      disabledReason,
      scrollToPanel,
      registerPanel
    ]
  );

  return (
    <SyncPanelContext.Provider value={contextValue}>
      {children}
    </SyncPanelContext.Provider>
  );
}

export function useSyncPanel(): SyncPanelContextValue {
  const context = useContext(SyncPanelContext);
  if (!context) {
    throw new Error("useSyncPanel must be used within a SyncPanelProvider");
  }
  return context;
}

function ToggleRow({
  id,
  label,
  description,
  isChecked,
  onChange,
  isDisabled
}: {
  id: string;
  label: string;
  description: string;
  isChecked: boolean;
  onChange: (value: boolean) => void;
  isDisabled: boolean;
}) {
  return (
    <FormControl isDisabled={isDisabled} display="flex" alignItems="flex-start">
      <Flex align="center" justify="space-between" gap={4} w="full">
        <Box>
          <FormLabel htmlFor={id} mb={0} fontWeight="semibold">
            {label}
          </FormLabel>
          <FormHelperText lineHeight="short" color="fg.muted">
            {description}
          </FormHelperText>
        </Box>
        <Switch
          id={id}
          isChecked={isChecked}
          onChange={(event) => onChange(event.target.checked)}
          colorScheme="primary"
        />
      </Flex>
    </FormControl>
  );
}

function formatCounts(counts: SyncJobCounts): string {
  return `Created ${counts.created}, updated ${counts.updated}, deleted ${counts.deleted}, skipped ${counts.skipped}.`;
}

function formatCountsBadges(counts: SyncJobCounts) {
  const entries: Array<{ label: string; value: number; color: string }> = [
    { label: "Created", value: counts.created, color: "green" },
    { label: "Updated", value: counts.updated, color: "blue" },
    { label: "Deleted", value: counts.deleted, color: "red" },
    { label: "Skipped", value: counts.skipped, color: "gray" }
  ];

  return entries;
}

export function SyncPanelCard() {
  const {
    status,
    options,
    updateOption,
    startSync,
    isSubmitting,
    isRunning,
    disabled,
    disabledReason,
    registerPanel
  } = useSyncPanel();
  const toast = useToast();

  const counts = status?.counts ?? DEFAULT_COUNTS;
  const phase = status?.phase ?? "done";
  const phaseLabel = status ? phaseLabels[status.phase] : "Idle";
  const phaseColor = status ? phaseColors[status.phase] : "gray";
  const lastUpdated = status ? timeFormatter.format(status.updatedAt) : null;
  const message =
    status?.message ?? "Use the controls to start a sync when you’re ready.";

  const handleCopyLogs = useCallback(async () => {
    if (!status?.logs?.length) {
      return;
    }

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(status.logs.join("\n"));
        toast({ title: "Logs copied", status: "success", duration: 2000 });
      } else {
        toast({ title: "Clipboard unavailable", status: "warning" });
      }
    } catch (error) {
      const description =
        error instanceof Error ? error.message : "Unable to copy logs.";
      toast({ title: "Unable to copy logs", description, status: "error" });
    }
  }, [status, toast]);

  const allowDeletesDisabled = disabled || isRunning || options.dryRun;
  const removeMissingDisabled = allowDeletesDisabled || !options.allowDeletes;

  const primaryLabel = options.dryRun ? "Run dry run" : "Run sync";

  return (
    <Card id="sync-panel" ref={registerPanel} borderRadius="2xl">
      <CardHeader>
        <Stack spacing={2}>
          <Heading size="sm">Sync from Sanity</Heading>
          <Text fontSize="sm" color="fg.muted">
            Pull the latest courses, modules, and lessons from Sanity without
            leaving the admin dashboard.
          </Text>
        </Stack>
      </CardHeader>
      <CardBody>
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={8} alignItems="start">
          <Stack spacing={4} fontSize="sm" color="fg.muted">
            <Text>
              Ensure your database stays aligned with your headless CMS. Dry
              runs preview a subset of documents before committing changes, and
              you can optionally allow deletes when you’re ready to mirror
              removals from Sanity.
            </Text>
            {disabled ? (
              <Alert status="error" borderRadius="lg">
                <AlertIcon />
                <AlertDescription>
                  {disabledReason ?? "Sanity sync is currently unavailable."}
                </AlertDescription>
              </Alert>
            ) : (
              <Text
                fontSize="xs"
                textTransform="uppercase"
                letterSpacing="0.2em"
                color="fg.muted"
              >
                Syncs run in the background—feel free to navigate away once
                submitted.
              </Text>
            )}
            {status?.phase === "error" ? (
              <Alert status="error" borderRadius="lg" alignItems="flex-start">
                <AlertIcon />
                <Stack spacing={3} flex="1">
                  <Box>
                    <AlertTitle>Sync failed</AlertTitle>
                    {status.message ? (
                      <AlertDescription>{status.message}</AlertDescription>
                    ) : (
                      <AlertDescription>
                        An unexpected error occurred during the sync.
                      </AlertDescription>
                    )}
                  </Box>
                  {status.logs?.length ? (
                    <Button
                      size="sm"
                      alignSelf="flex-start"
                      onClick={handleCopyLogs}
                    >
                      Copy logs
                    </Button>
                  ) : null}
                </Stack>
              </Alert>
            ) : null}
          </Stack>
          <Stack spacing={5} maxW="lg">
            <ToggleRow
              id="dry-run-toggle"
              label="Dry run"
              description="Preview the first five documents without writing changes."
              isChecked={options.dryRun}
              onChange={(value) => updateOption("dryRun", value)}
              isDisabled={disabled || isRunning}
            />
            <ToggleRow
              id="allow-deletes-toggle"
              label="Allow deletes"
              description={
                options.dryRun
                  ? "Disable dry run to enable deletes."
                  : "Allow deletions flagged from Sanity."
              }
              isChecked={options.allowDeletes}
              onChange={(value) => updateOption("allowDeletes", value)}
              isDisabled={allowDeletesDisabled}
            />
            <ToggleRow
              id="remove-missing-toggle"
              label="Remove missing records"
              description={
                options.allowDeletes
                  ? "Remove courses, modules, and lessons no longer present in Sanity."
                  : "Enable deletes to remove missing records."
              }
              isChecked={options.removeMissing}
              onChange={(value) => updateOption("removeMissing", value)}
              isDisabled={removeMissingDisabled}
            />
            <Button
              colorScheme="primary"
              onClick={startSync}
              isDisabled={disabled || isRunning}
              isLoading={isSubmitting}
              alignSelf="flex-start"
            >
              {primaryLabel}
            </Button>
          </Stack>
        </SimpleGrid>
      </CardBody>
      <CardFooter bg="bg.subtle" borderTopWidth="1px">
        <Stack spacing={3} w="full">
          <Flex
            direction={{ base: "column", md: "row" }}
            align={{ base: "flex-start", md: "center" }}
            justify="space-between"
            gap={4}
          >
            <Stack spacing={1}>
              <HStack spacing={3} align="center">
                <Badge
                  colorScheme={phaseColor}
                  fontSize="xs"
                  textTransform="uppercase"
                >
                  {phaseLabel}
                </Badge>
                {lastUpdated ? (
                  <Text fontSize="xs" color="fg.subtle">
                    Last update {lastUpdated}
                  </Text>
                ) : null}
              </HStack>
              <Text fontSize="sm" color="fg.muted">
                {message}
              </Text>
            </Stack>
            <HStack spacing={2} flexWrap="wrap">
              {formatCountsBadges(counts).map((entry) => (
                <Badge
                  key={entry.label}
                  colorScheme={entry.color}
                  variant="subtle"
                  fontSize="xs"
                >
                  {entry.label}: {entry.value}
                </Badge>
              ))}
            </HStack>
          </Flex>
        </Stack>
      </CardFooter>
    </Card>
  );
}

export function SyncQuickActionTile() {
  const {
    status,
    options,
    startSync,
    isSubmitting,
    isRunning,
    disabled,
    disabledReason,
    scrollToPanel
  } = useSyncPanel();

  const counts = status?.counts ?? DEFAULT_COUNTS;
  const phase = status?.phase;
  const hasActiveJob = Boolean(status) && isRunning;

  const description = disabled
    ? (disabledReason ?? "Sync is currently unavailable.")
    : hasActiveJob && status
      ? `${phaseLabels[phase!]} · ${formatCounts(counts)}`
      : "Run a manual sync to pull the latest CMS content into the LMS.";

  const buttonLabel = hasActiveJob
    ? "View progress"
    : options.dryRun
      ? "Run dry run"
      : "Run sync";

  const handleClick = async () => {
    if (hasActiveJob) {
      scrollToPanel();
      return;
    }

    const result = await startSync();
    if (result.ok || result.reason === "already_running") {
      scrollToPanel();
    }
  };

  return (
    <CardBody>
      <Stack spacing={4} h="full">
        <Stack spacing={1}>
          <Heading size="sm">Sync from Sanity</Heading>
          <Text fontSize="sm" color="fg.muted">
            {description}
          </Text>
        </Stack>
        <Button
          colorScheme="primary"
          onClick={handleClick}
          isDisabled={disabled}
          isLoading={isSubmitting && !hasActiveJob}
          variant={hasActiveJob ? "outline" : "solid"}
        >
          {buttonLabel}
        </Button>
      </Stack>
    </CardBody>
  );
}

export default SyncPanelCard;
