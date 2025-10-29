"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

type LessonAnalyticsOptions = {
  lessonId: string;
  isDone: boolean;
  deviceType?: string;
  userId?: string;
  orgId?: string;
};

type AssessmentEventPayload = {
  kind?: "quiz" | "chat";
  [key: string]: unknown;
};

type AssessmentResultEventPayload = AssessmentEventPayload & {
  score?: number;
  passed?: boolean;
  threshold?: number;
};

type AugmentationEventPayload = {
  augmentationId?: string;
  [key: string]: unknown;
};

type LessonAnalyticsHandlers = {
  trackAssessmentStart: (payload?: AssessmentEventPayload) => void;
  trackAssessmentSubmit: (payload?: AssessmentEventPayload) => void;
  trackAssessmentResult: (payload?: AssessmentResultEventPayload) => void;
  trackAugmentationStart: (payload?: AugmentationEventPayload) => void;
  trackAugmentationComplete: (payload?: AugmentationEventPayload) => void;
};

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

export function useLessonAnalytics({
  lessonId,
  isDone,
  deviceType = "web",
  userId,
  orgId,
}: LessonAnalyticsOptions): LessonAnalyticsHandlers {
  const hasEmittedCompletionRef = useRef(false);

  const baseProperties = useMemo(() => {
    const payload: Record<string, unknown> = { lessonId, deviceType };

    if (userId) {
      payload.userId = userId;
    }

    if (orgId) {
      payload.orgId = orgId;
    }

    return payload;
  }, [deviceType, lessonId, orgId, userId]);

  const emit = useCallback(
    (event: string, properties?: Record<string, unknown>) => {
      const payload = { ...baseProperties, ...properties };

      try {
        if (typeof window === "undefined") {
          return;
        }

        const client = window.posthog;

        if (POSTHOG_KEY && typeof client?.capture === "function") {
          client.capture(event, payload);
          return;
        }

        console.log(`[analytics] ${event}`, payload);
      } catch (error) {
        console.error(`[analytics] Failed to emit "${event}"`, error);
        try {
          console.log(`[analytics:fallback] ${event}`, payload);
        } catch {
          // Ignore secondary logging failures.
        }
      }
    },
    [baseProperties],
  );

  useEffect(() => {
    emit("lesson_view_start");
  }, [emit]);

  useEffect(() => {
    if (isDone && !hasEmittedCompletionRef.current) {
      hasEmittedCompletionRef.current = true;
      emit("lesson_view_complete");
      return;
    }

    if (!isDone) {
      hasEmittedCompletionRef.current = false;
    }
  }, [emit, isDone]);

  const trackAssessmentStart = useCallback(
    (payload?: AssessmentEventPayload) => {
      emit("assessment_start", payload);
    },
    [emit],
  );

  const trackAssessmentSubmit = useCallback(
    (payload?: AssessmentEventPayload) => {
      emit("assessment_submit", payload);
    },
    [emit],
  );

  const trackAssessmentResult = useCallback(
    (payload: AssessmentResultEventPayload = {}) => {
      emit("assessment_result", payload);
    },
    [emit],
  );

  const trackAugmentationStart = useCallback(
    (payload?: AugmentationEventPayload) => {
      emit("augmentation_start", payload);
    },
    [emit],
  );

  const trackAugmentationComplete = useCallback(
    (payload?: AugmentationEventPayload) => {
      emit("augmentation_complete", payload);
    },
    [emit],
  );

  return useMemo(
    () => ({
      trackAssessmentStart,
      trackAssessmentSubmit,
      trackAssessmentResult,
      trackAugmentationStart,
      trackAugmentationComplete,
    }),
    [
      trackAssessmentResult,
      trackAssessmentStart,
      trackAssessmentSubmit,
      trackAugmentationComplete,
      trackAugmentationStart,
    ],
  );
}
