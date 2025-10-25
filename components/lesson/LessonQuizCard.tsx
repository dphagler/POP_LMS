"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Radio,
  Stack,
  Text,
  useColorModeValue
} from "@chakra-ui/react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsPanels, TabsTrigger } from "@/components/ui/tabs";
import { captureError } from "@/lib/client-error-reporting";

type QuizOption = {
  key: string;
  label: string;
};

type QuizQuestion = {
  id: string;
  prompt: string;
  options: QuizOption[];
};

type StoredResponse = {
  questionId: string;
  selectedKey: string | null;
  selectedLabel: string | null;
  isCorrect: boolean | null;
  correctLabel: string | null;
};

type LessonQuizCardProps = {
  quizId: string;
  questions: QuizQuestion[];
  initialResponses: StoredResponse[];
  watchRequirementMet: boolean;
};

type SubmissionResult = {
  questionId: string;
  selectedKey: string;
  selectedLabel: string | null;
  isCorrect: boolean;
  correctLabel: string | null;
};

type SubmissionResponse = {
  ok: boolean;
  results: SubmissionResult[];
  passed: boolean;
  completion: {
    isComplete: boolean;
    watchRequirementMet: boolean;
    quizPassed: boolean;
  };
  requestId?: string;
};

function buildInitialState(
  questions: QuizQuestion[],
  initialResponses: StoredResponse[]
): Map<string, StoredResponse> {
  const responseMap = new Map<string, StoredResponse>();
  for (const question of questions) {
    const stored = initialResponses.find((response) => response.questionId === question.id);
    responseMap.set(question.id, {
      questionId: question.id,
      selectedKey: stored?.selectedKey ?? null,
      selectedLabel: stored?.selectedLabel ?? null,
      isCorrect: typeof stored?.isCorrect === "boolean" ? stored.isCorrect : null,
      correctLabel: stored?.correctLabel ?? null
    });
  }
  return responseMap;
}

function getSelectedLabel(question: QuizQuestion, key: string | null): string | null {
  if (!key) {
    return null;
  }
  const option = question.options.find((item) => item.key === key);
  return option ? option.label : null;
}

export function LessonQuizCard({
  quizId,
  questions,
  initialResponses,
  watchRequirementMet
}: LessonQuizCardProps) {
  const router = useRouter();
  const [responses, setResponses] = useState(() => buildInitialState(questions, initialResponses));
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [completionToastVisible, setCompletionToastVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("quiz");

  const hasResults = useMemo(() => {
    return questions.length > 0 && questions.every((question) => typeof responses.get(question.id)?.isCorrect === "boolean");
  }, [questions, responses]);

  const allAnswered = useMemo(() => {
    return questions.length > 0 && questions.every((question) => !!responses.get(question.id)?.selectedKey);
  }, [questions, responses]);

  useEffect(() => {
    setResponses(buildInitialState(questions, initialResponses));
  }, [questions, initialResponses]);

  useEffect(() => {
    if (!hasResults) {
      setMessage(null);
      setMessageType(null);
    }
  }, [hasResults]);

  useEffect(() => {
    if (completionToastVisible) {
      const timeout = setTimeout(() => setCompletionToastVisible(false), 8000);
      return () => clearTimeout(timeout);
    }
  }, [completionToastVisible]);

  useEffect(() => {
    setActiveTab("quiz");
  }, [questions]);

  const handleSelect = (question: QuizQuestion, key: string) => {
    if (hasResults) {
      return;
    }

    setResponses((prev) => {
      const next = new Map(prev);
      const existing = next.get(question.id);
      next.set(question.id, {
        questionId: question.id,
        selectedKey: key,
        selectedLabel: getSelectedLabel(question, key),
        isCorrect: existing?.isCorrect ?? null,
        correctLabel: existing?.correctLabel ?? null
      });
      return next;
    });
  };

  const handleSubmit = () => {
    if (!watchRequirementMet || hasResults || !allAnswered) {
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const answers = questions.map((question) => ({
          questionId: question.id,
          answer: responses.get(question.id)?.selectedKey ?? ""
        }));

        const response = await fetch(`/api/quiz/${quizId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers })
        });

        const payloadText = await response.text();
        let payload: unknown = null;
        if (payloadText) {
          try {
            payload = JSON.parse(payloadText);
          } catch (parseError) {
            captureError(parseError, {
              event: "quiz_submission_parse_error",
              properties: { quizId }
            });
            throw new Error("We couldn't understand the server response.");
          }
        }

        if (!response.ok) {
          const errorMessage =
            payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
              ? payload.error
              : null;
          throw new Error(errorMessage ?? "Unable to submit quiz");
        }

        if (!payload || typeof payload !== "object" || !("results" in payload)) {
          throw new Error("Unexpected response from quiz submission");
        }

        const data = payload as SubmissionResponse;
        const resultMap = new Map<string, SubmissionResult>();
        for (const result of data.results ?? []) {
          resultMap.set(result.questionId, result);
        }

        setResponses((prev) => {
          const next = new Map(prev);
          for (const question of questions) {
            const existing = next.get(question.id);
            const result = resultMap.get(question.id);
            if (!result) {
              continue;
            }
            next.set(question.id, {
              questionId: question.id,
              selectedKey: result.selectedKey,
              selectedLabel: result.selectedLabel ?? getSelectedLabel(question, result.selectedKey),
              isCorrect: result.isCorrect,
              correctLabel: result.correctLabel
            });
          }
          return next;
        });

        const passed = data.passed;
        setMessage(
          passed ? "Nice work! You passed the quiz." : "Please review the questions below and try again before resubmitting."
        );
        setMessageType(passed ? "success" : "error");
        setError(null);
        setCompletionToastVisible((prev) => prev || passed);
        router.refresh();
      } catch (submissionError) {
        setError(submissionError instanceof Error ? submissionError.message : "Unable to submit quiz");
      }
    });
  };

  const handleReset = () => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/quiz/${quizId}`, {
          method: "DELETE"
        });

        if (!response.ok) {
          const payloadText = await response.text();
          let payload: unknown = null;
          if (payloadText) {
            try {
              payload = JSON.parse(payloadText);
            } catch (parseError) {
              captureError(parseError, {
                event: "quiz_reset_parse_error",
                properties: { quizId }
              });
              throw new Error("We couldn't understand the server response.");
            }
          }

          const errorMessage =
            payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
              ? payload.error
              : null;
          throw new Error(errorMessage ?? "Unable to reset quiz");
        }

        const baseState = buildInitialState(questions, []);
        setResponses(baseState);
        setMessage(null);
        setMessageType(null);
        setError(null);
        setCompletionToastVisible(false);
        router.refresh();
      } catch (resetError) {
        setError(resetError instanceof Error ? resetError.message : "Unable to reset quiz");
      }
    });
  };

  const tabs = useMemo(() => [{ id: "quiz", label: "Quiz", questions }], [questions]);

  const neutralBorder = useColorModeValue("gray.200", "gray.700");
  const neutralBg = useColorModeValue("white", "gray.800");
  const successBorder = useColorModeValue("green.200", "green.600");
  const successBg = useColorModeValue("green.50", "green.900");
  const errorBorder = useColorModeValue("red.200", "red.600");
  const errorBg = useColorModeValue("red.50", "red.900");
  const warningBorder = useColorModeValue("yellow.200", "yellow.600");
  const warningBg = useColorModeValue("yellow.50", "yellow.900");
  const optionSelectedBg = useColorModeValue("primary.50", "primary.900");
  const optionHoverBorder = useColorModeValue("primary.200", "primary.500");

  if (questions.length === 0) {
    return (
      <Text fontSize="sm" color="fg.muted">
        Quiz questions will appear here once configured.
      </Text>
    );
  }

  return (
    <Box position="relative" display="flex" flexDirection="column" gap={6} p={6}>
      {completionToastVisible ? (
        <Box position="fixed" top={6} right={6} zIndex={1400}>
          <Alert
            status="success"
            variant="solid"
            borderRadius="xl"
            boxShadow="xl"
            alignItems="center"
            gap={4}
            minW="18rem"
          >
            <AlertIcon />
            <AlertDescription display="flex" alignItems="center" gap={3} flexWrap="wrap">
              <Text fontWeight="semibold">Lesson complete! Ready for what&apos;s next?</Text>
              <Button type="button" size="sm" onClick={() => router.push("/app")}>
                Continue
              </Button>
            </AlertDescription>
          </Alert>
        </Box>
      ) : null}

      {!watchRequirementMet && !hasResults ? (
        <Alert
          status="warning"
          variant="subtle"
          borderRadius="xl"
          borderWidth="1px"
          borderColor={warningBorder}
          background={warningBg}
        >
          <AlertIcon />
          <AlertDescription>Keep watching the lesson video to unlock this quiz.</AlertDescription>
        </Alert>
      ) : null}

      {message ? (
        <Alert
          status={messageType === "success" ? "success" : "error"}
          variant="subtle"
          borderRadius="xl"
          borderWidth="1px"
          borderColor={messageType === "success" ? successBorder : errorBorder}
          background={messageType === "success" ? successBg : errorBg}
        >
          <AlertIcon />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert
          status="error"
          variant="subtle"
          borderRadius="xl"
          borderWidth="1px"
          borderColor={errorBorder}
          background={errorBg}
        >
          <AlertIcon />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Tabs
        index={Math.max(0, tabs.findIndex((tab) => tab.id === activeTab))}
        onChange={(nextIndex: number) => {
          const nextTab = tabs[nextIndex];
          if (!nextTab) return;
          setActiveTab(nextTab.id);
        }}
        w="full"
      >
        {tabs.length > 1 ? (
          <TabsList>
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id}>{tab.label}</TabsTrigger>
            ))}
          </TabsList>
        ) : null}

        <TabsPanels>
          {tabs.map((tab) => (
            <TabsContent key={tab.id} display="flex" flexDirection="column" gap={4}>
              {tab.questions.map((question) => {
                const state = responses.get(question.id);
                const isCorrect = state?.isCorrect === true;
                const isIncorrect = state?.isCorrect === false;
                const selectedKey = state?.selectedKey;

                const cardBorder = isCorrect ? successBorder : isIncorrect ? errorBorder : neutralBorder;
                const cardBackground = isCorrect ? successBg : isIncorrect ? errorBg : neutralBg;

                return (
                  <Box
                    key={question.id}
                    borderWidth="1px"
                    borderRadius="2xl"
                    borderColor={cardBorder}
                    background={cardBackground}
                    boxShadow="sm"
                    p={4}
                    transition="all 0.2s ease"
                  >
                    <Text fontSize="sm" fontWeight="semibold" color="fg.default">
                      {question.prompt}
                    </Text>
                    <Stack mt={4} spacing={2}>
                      {question.options.map((option) => {
                        const isSelected = selectedKey === option.key;
                        const disabled = hasResults || !watchRequirementMet || isPending;
                        return (
                          <Radio
                            key={option.key}
                            name={question.id}
                            value={option.key}
                            isChecked={isSelected}
                            isDisabled={disabled}
                            onChange={() => handleSelect(question, option.key)}
                            colorScheme="primary"
                            borderWidth="1px"
                            borderRadius="xl"
                            borderColor={isSelected ? "primary.400" : neutralBorder}
                            background={isSelected ? optionSelectedBg : neutralBg}
                            px={3}
                            py={2}
                            width="full"
                            alignItems="center"
                            _hover={disabled ? undefined : { borderColor: optionHoverBorder }}
                            _focusVisible={{ boxShadow: "0 0 0 2px var(--chakra-colors-primary-200)" }}
                            _checked={{ borderColor: "primary.400", background: optionSelectedBg }}
                            _disabled={{ opacity: 0.6, cursor: "not-allowed" }}
                          >
                            <Text fontSize="sm">{option.label}</Text>
                          </Radio>
                        );
                      })}
                    </Stack>

                    {isCorrect ? (
                      <Text mt={4} fontSize="sm" fontWeight="medium" color="green.600">
                        Correct!
                      </Text>
                    ) : null}

                    {isIncorrect ? (
                      <Stack mt={4} spacing={1} fontSize="sm">
                        <Text fontWeight="medium" color="red.600">
                          Not quite.
                        </Text>
                        {state?.correctLabel ? (
                          <Text color="fg.muted">Correct answer: {state.correctLabel}</Text>
                        ) : null}
                      </Stack>
                    ) : null}
                  </Box>
                );
              })}
            </TabsContent>
          ))}
        </TabsPanels>
      </Tabs>

      <Stack direction={{ base: "column", sm: "row" }} spacing={2} align="center">
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!watchRequirementMet || hasResults || !allAnswered || isPending}
        >
          Submit
        </Button>
        {hasResults ? (
          <Button type="button" variant="ghost" onClick={handleReset} disabled={isPending}>
            Retake
          </Button>
        ) : null}
      </Stack>
    </Box>
  );
}
