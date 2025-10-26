"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Box, useToast } from "@chakra-ui/react";

import { captureError } from "@/lib/client-error-reporting";
import { useLessonAnalytics } from "@/lib/analytics/useLessonAnalytics";
import type {
  DiagnosticResult,
  LessonObjective,
  LessonRuntime,
} from "@/lib/lesson/contracts";
import {
  INITIAL_STATE,
  canAugment,
  canDiagnose,
  canStartAssessment,
  isDone,
  transition,
  type LessonEngineState,
} from "@/lib/lesson/engine";
import type { Segment } from "@/lib/lesson/progress";
import { getCompletionRatio } from "@/lib/lesson/progress";

import { Skeleton } from "@/components/ui/skeleton";

import {
  completeAugmentation,
  saveProgress,
  submitAssessment,
} from "@/app/app/lesson/[id]/actions";
import type { SubmitQuizInput } from "@/lib/server-actions/lesson.assessment";

export type LessonAugmentationItem = {
  augmentationId: string;
  assetRef: string;
  ruleIndex: number;
  objective: LessonObjective;
  diagnostic: DiagnosticResult | null;
  completedAt: string | null;
};

export type LessonEngineProgressSnapshot = {
  uniqueSeconds: number;
  durationSec: number;
  thresholdPct: number;
};

export type LessonEngineClientProps = {
  lessonRuntime: LessonRuntime;
  initialProgress: LessonEngineProgressSnapshot;
  initialAugmentations: LessonAugmentationItem[];
  initialDiagnostics?: DiagnosticResult[];
  children: ReactNode;
};

export type LessonEngineSelectors = {
  canStartAssessment: boolean;
  canDiagnose: boolean;
  canAugment: boolean;
  isDone: boolean;
  completionRatio: number;
};

export type LessonEngineStatus = {
  isSavingProgress: boolean;
  isSubmittingAssessment: boolean;
  isCompletingAugmentation: boolean;
};

export type LessonEngineActions = {
  onVideoProgress: (segments: Segment[]) => void;
  onAssessmentStart: () => void;
  onQuizSubmit: (answers: SubmitQuizInput["answers"]) => Promise<void>;
  onChatSubmit: (transcript: string[]) => Promise<void>;
  onAugmentationComplete: (augmentationId: string) => Promise<void>;
};

export type LessonEngineContextValue = {
  state: LessonEngineState;
  selectors: LessonEngineSelectors;
  diagnostics: DiagnosticResult[];
  augmentations: LessonAugmentationItem[];
  progress: LessonEngineProgressSnapshot;
  actions: LessonEngineActions;
  status: LessonEngineStatus;
};

const LessonEngineContext = createContext<LessonEngineContextValue | undefined>(
  undefined,
);

const TOAST_DURATION_MS = 6000;
const PROGRESS_DEBOUNCE_MS = 800;

export function LessonEngineClient({
  lessonRuntime,
  initialProgress,
  initialAugmentations,
  initialDiagnostics = [],
  children,
}: LessonEngineClientProps) {
  const toast = useToast();

  const durationSec = useMemo(() => {
    if (Number.isFinite(lessonRuntime.durationSec)) {
      return Math.max(lessonRuntime.durationSec ?? 0, 0);
    }
    return Math.max(initialProgress.durationSec ?? 0, 0);
  }, [initialProgress.durationSec, lessonRuntime.durationSec]);

  const [state, setState] = useState<LessonEngineState>(() => INITIAL_STATE);
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>(
    () => [...initialDiagnostics],
  );
  const [augmentations, setAugmentations] = useState<LessonAugmentationItem[]>(
    () => [...initialAugmentations],
  );
  const [progress, setProgress] = useState(() => ({
    uniqueSeconds: initialProgress.uniqueSeconds,
    thresholdPct: initialProgress.thresholdPct,
  }));
  const [completionRatio, setCompletionRatio] = useState(() =>
    getCompletionRatio({
      durationSec,
      uniqueSeconds: initialProgress.uniqueSeconds,
      thresholdPct: initialProgress.thresholdPct,
    }),
  );
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [isSubmittingAssessment, setIsSubmittingAssessment] = useState(false);
  const [isCompletingAugmentation, setIsCompletingAugmentation] =
    useState(false);

  const lessonIsDone = isDone(state);

  const {
    trackAssessmentStart,
    trackAssessmentSubmit,
    trackAssessmentResult,
    trackAugmentationStart,
    trackAugmentationComplete,
  } = useLessonAnalytics({
    lessonId: lessonRuntime.id,
    isDone: lessonIsDone,
  });

  const pendingAugmentationCount = useMemo(
    () => augmentations.filter((item) => !item.completedAt).length,
    [augmentations],
  );

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSegmentsRef = useRef<Segment[] | null>(null);
  const augmentationStartTrackedRef = useRef(false);

  const showErrorToast = useCallback(
    (description: string) => {
      toast({
        status: "error",
        title: "Something went wrong",
        description,
        duration: TOAST_DURATION_MS,
        isClosable: true,
        position: "top-right",
      });
    },
    [toast],
  );

  const computeContext = useCallback(
    (diagnosticOverride?: DiagnosticResult[]): Parameters<typeof transition>[2] => ({
      runtime: {
        durationSec,
        augmentations: lessonRuntime.augmentations ?? [],
      },
      progress: {
        uniqueSeconds: progress.uniqueSeconds,
        thresholdPct: progress.thresholdPct,
      },
      diagnostics: diagnosticOverride ?? diagnostics,
    }),
    [diagnostics, durationSec, lessonRuntime.augmentations, progress.thresholdPct, progress.uniqueSeconds],
  );

  const flushProgressSave = useCallback(async () => {
    const segments = latestSegmentsRef.current;
    if (!segments || segments.length === 0) {
      return;
    }
    latestSegmentsRef.current = null;

    setIsSavingProgress(true);
    try {
      const result = await saveProgress(lessonRuntime.id, segments);
      const nextProgress = {
        uniqueSeconds: result.progress.uniqueSeconds,
        thresholdPct: result.progress.thresholdPct,
      };
      setProgress(nextProgress);
      setCompletionRatio(
        getCompletionRatio({
          durationSec,
          uniqueSeconds: nextProgress.uniqueSeconds,
          thresholdPct: nextProgress.thresholdPct,
        }),
      );
    } catch (error) {
      captureError(error, {
        event: "lesson_save_progress_error",
        properties: {
          lessonId: lessonRuntime.id,
        },
      });
      showErrorToast(
        "We couldn’t save your viewing progress. Please try again shortly.",
      );
    } finally {
      setIsSavingProgress(false);
    }
  }, [durationSec, lessonRuntime.id, showErrorToast]);

  const onVideoProgress = useCallback(
    (segments: Segment[]) => {
      latestSegmentsRef.current = segments;

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        void flushProgressSave();
      }, PROGRESS_DEBOUNCE_MS);
    },
    [flushProgressSave],
  );

  useEffect(() => () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
  }, []);

  useEffect(() => {
    const hasPending = pendingAugmentationCount > 0;

    if (hasPending && !augmentationStartTrackedRef.current) {
      augmentationStartTrackedRef.current = true;
      trackAugmentationStart({ count: pendingAugmentationCount });
      return;
    }

    if (!hasPending) {
      augmentationStartTrackedRef.current = false;
    }
  }, [pendingAugmentationCount, trackAugmentationStart]);

  const onAssessmentStart = useCallback(() => {
    trackAssessmentStart({ type: lessonRuntime.assessmentType });
    setState((previous) => (previous === "VIEWING" ? "ASSESSING" : previous));
  }, [lessonRuntime.assessmentType, trackAssessmentStart]);

  const handleAssessmentResult = useCallback(
    (
      resultDiagnostics: DiagnosticResult[],
      event: "DIAGNOSTIC_READY" | "CHAT_SCORED",
    ) => {
      setDiagnostics(resultDiagnostics);
      setAugmentations((items) =>
        items.map((item) => ({
          ...item,
          diagnostic:
            resultDiagnostics.find(
              (diagnostic) => diagnostic.objectiveId === item.objective.id,
            ) ?? item.diagnostic,
        })),
      );
      setState((previous) => {
        const contextWithDiagnostics = computeContext(resultDiagnostics);
        const diagnosing = transition(previous, "QUIZ_SUBMITTED", contextWithDiagnostics);
        return transition(diagnosing, event, contextWithDiagnostics);
      });
    },
    [computeContext],
  );

  const onQuizSubmit = useCallback<LessonEngineActions["onQuizSubmit"]>(
    async (answers) => {
      trackAssessmentSubmit({ kind: "quiz" });
      setIsSubmittingAssessment(true);
      try {
        const result = await submitAssessment(lessonRuntime.id, {
          kind: "quiz",
          answers,
        });

        if (result.kind === "quiz") {
          const scorePercent = Math.round(result.score * 100);
          trackAssessmentResult({
            kind: "quiz",
            score: scorePercent,
            scoreRaw: result.score,
          });
          handleAssessmentResult(result.diagnostic, "DIAGNOSTIC_READY");
        }
      } catch (error) {
        captureError(error, {
          event: "lesson_quiz_submit_error",
          properties: { lessonId: lessonRuntime.id },
        });
        showErrorToast(
          "We couldn’t submit your quiz right now. Please review your answers and try again.",
        );
      } finally {
        setIsSubmittingAssessment(false);
      }
    },
    [
      handleAssessmentResult,
      lessonRuntime.id,
      showErrorToast,
      trackAssessmentResult,
      trackAssessmentSubmit,
    ],
  );

  const onChatSubmit = useCallback<LessonEngineActions["onChatSubmit"]>(
    async (transcript) => {
      trackAssessmentSubmit({ kind: "chat", messageCount: transcript.length });
      setIsSubmittingAssessment(true);
      try {
        const result = await submitAssessment(lessonRuntime.id, {
          kind: "chat",
          transcript,
        });

        if (result.kind === "chat") {
          handleAssessmentResult(result.diagnostic, "CHAT_SCORED");
        }
      } catch (error) {
        captureError(error, {
          event: "lesson_chat_submit_error",
          properties: { lessonId: lessonRuntime.id },
        });
        showErrorToast(
          "We couldn’t submit your reflection. Please try again shortly.",
        );
      } finally {
        setIsSubmittingAssessment(false);
      }
    },
    [
      handleAssessmentResult,
      lessonRuntime.id,
      showErrorToast,
      trackAssessmentSubmit,
    ],
  );

  const onAugmentationComplete = useCallback<
    LessonEngineActions["onAugmentationComplete"]
  >(async (augmentationId) => {
    setIsCompletingAugmentation(true);
    try {
      await completeAugmentation(lessonRuntime.id, augmentationId);
      trackAugmentationComplete({ augmentationId });
      setAugmentations((items) =>
        items.map((item) =>
          item.augmentationId === augmentationId
            ? { ...item, completedAt: new Date().toISOString() }
            : item,
        ),
      );
      setState((previous) =>
        transition(previous, "AUGMENT_DONE", computeContext()),
      );
    } catch (error) {
      captureError(error, {
        event: "lesson_augmentation_complete_error",
        properties: { lessonId: lessonRuntime.id, augmentationId },
      });
      showErrorToast(
        "We couldn’t record that augmentation as complete. Please try again.",
      );
    } finally {
      setIsCompletingAugmentation(false);
    }
  }, [
    computeContext,
    lessonRuntime.id,
    showErrorToast,
    trackAugmentationComplete,
  ]);

  const machineContext = useMemo(() => computeContext(), [computeContext]);

  const selectors = useMemo<LessonEngineSelectors>(
    () => ({
      canStartAssessment: canStartAssessment(state, machineContext),
      canDiagnose: canDiagnose(state),
      canAugment: canAugment(state, machineContext),
      isDone: lessonIsDone,
      completionRatio,
    }),
    [completionRatio, lessonIsDone, machineContext, state],
  );

  const status = useMemo<LessonEngineStatus>(
    () => ({
      isSavingProgress,
      isSubmittingAssessment,
      isCompletingAugmentation,
    }),
    [
      isCompletingAugmentation,
      isSavingProgress,
      isSubmittingAssessment,
    ],
  );

  const actions = useMemo<LessonEngineActions>(
    () => ({
      onVideoProgress,
      onAssessmentStart,
      onQuizSubmit,
      onChatSubmit,
      onAugmentationComplete,
    }),
    [
      onAssessmentStart,
      onAugmentationComplete,
      onChatSubmit,
      onQuizSubmit,
      onVideoProgress,
    ],
  );

  const contextValue = useMemo<LessonEngineContextValue>(
    () => ({
      state,
      selectors,
      diagnostics,
      augmentations,
      progress: {
        uniqueSeconds: progress.uniqueSeconds,
        durationSec,
        thresholdPct: progress.thresholdPct,
      },
      actions,
      status,
    }),
    [
      actions,
      augmentations,
      diagnostics,
      durationSec,
      progress.thresholdPct,
      progress.uniqueSeconds,
      selectors,
      state,
      status,
    ],
  );

  const isPending =
    status.isSavingProgress ||
    status.isSubmittingAssessment ||
    status.isCompletingAugmentation;

  return (
    <LessonEngineContext.Provider value={contextValue}>
      <Box position="relative" aria-busy={isPending} w="full">
        <Box pointerEvents={isPending ? "none" : undefined}>{children}</Box>
        {isPending ? (
          <Box position="absolute" inset={0} zIndex={1} pointerEvents="none">
            <Skeleton h="100%" w="100%" borderRadius="inherit" />
          </Box>
        ) : null}
      </Box>
    </LessonEngineContext.Provider>
  );
}

export function useLessonEngine(): LessonEngineContextValue {
  const context = useContext(LessonEngineContext);
  if (!context) {
    throw new Error("useLessonEngine must be used within LessonEngineClient");
  }
  return context;
}
