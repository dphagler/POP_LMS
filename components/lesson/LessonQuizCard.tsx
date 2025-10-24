"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsPanels, TabsTrigger } from "@/components/ui/tabs";
import { captureError } from "@/lib/client-error-reporting";
import { cn } from "@/lib/utils";

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

  if (questions.length === 0) {
    return <p className="text-sm text-muted-foreground">Quiz questions will appear here once configured.</p>;
  }

  return (
    <div className="relative space-y-6 p-6">
      {completionToastVisible && (
        <div className="toast toast-top toast-end">
          <div className="alert alert-success shadow-lg">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <span className="text-sm font-semibold">Lesson complete! Ready for what&apos;s next?</span>
              <Button type="button" size="sm" onClick={() => router.push("/app")}>
                Continue
              </Button>
            </div>
          </div>
        </div>
      )}

      {!watchRequirementMet && !hasResults && (
        <div className="rounded-box border border-dashed border-warning/60 bg-warning/10 p-4 text-sm text-warning">
          Keep watching the lesson video to unlock this quiz.
        </div>
      )}

      {message && (
        <div
          className={cn(
            "rounded-box border p-4 text-sm",
            messageType === "success"
              ? "border-success/60 bg-success/10 text-success"
              : "border-error/60 bg-error/10 text-error"
          )}
        >
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-box border border-error/60 bg-error/10 p-4 text-sm text-error">{error}</div>
      )}

      <Tabs
        index={Math.max(0, tabs.findIndex((tab) => tab.id === activeTab))}
        onChange={(nextIndex: number) => {
          const nextTab = tabs[nextIndex];
          if (!nextTab) return;
          setActiveTab(nextTab.id);
        }}
        w="full"
      >
        {tabs.length > 1 && (
          <TabsList>
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id}>{tab.label}</TabsTrigger>
            ))}
          </TabsList>
        )}

        <TabsPanels>
          {tabs.map((tab) => (
            <TabsContent key={tab.id} className="space-y-4">
              {tab.questions.map((question) => {
                const state = responses.get(question.id);
                const isCorrect = state?.isCorrect === true;
                const isIncorrect = state?.isCorrect === false;
                const selectedKey = state?.selectedKey;

                return (
                  <div
                    key={question.id}
                    className={cn(
                      "rounded-box border border-base-300 bg-base-100/95 p-4 shadow-sm transition",
                      isCorrect && "border-success/60 bg-success/10",
                      isIncorrect && "border-error/60 bg-error/10"
                    )}
                  >
                    <p className="text-sm font-semibold text-base-content">{question.prompt}</p>
                    <div className="mt-4 space-y-2">
                      {question.options.map((option) => {
                        const isSelected = selectedKey === option.key;
                        const disabled = hasResults || !watchRequirementMet || isPending;
                        return (
                          <label
                            key={option.key}
                            className={cn(
                              "flex cursor-pointer items-center gap-3 rounded-box border border-base-300 bg-base-100 px-3 py-2 text-sm transition",
                              disabled ? "cursor-not-allowed opacity-60" : "hover:border-primary/50",
                              isSelected && "border-primary bg-primary/10 text-primary"
                            )}
                          >
                            <input
                              type="radio"
                              name={question.id}
                              value={option.key}
                              checked={isSelected}
                              disabled={disabled}
                              onChange={() => handleSelect(question, option.key)}
                              className="radio radio-primary"
                            />
                            <span>{option.label}</span>
                          </label>
                        );
                      })}
                    </div>

                    {isCorrect && <p className="mt-4 text-sm font-medium text-success">Correct!</p>}

                    {isIncorrect && (
                      <div className="mt-4 space-y-1 text-sm">
                        <p className="font-medium text-error">Not quite.</p>
                        {state?.correctLabel && (
                          <p className="text-muted-foreground">Correct answer: {state.correctLabel}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </TabsContent>
          ))}
        </TabsPanels>
      </Tabs>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!watchRequirementMet || hasResults || !allAnswered || isPending}
        >
          Submit
        </Button>
        {hasResults && (
          <Button type="button" variant="ghost" onClick={handleReset} disabled={isPending}>
            Retake
          </Button>
        )}
      </div>
    </div>
  );
}
