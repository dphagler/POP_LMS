"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

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
            console.error("Failed to parse quiz submission response", parseError);
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

        setMessage(data.passed ? "Nice work! You passed the quiz." : "Please review the questions below and try again.");
        setMessageType(data.passed ? "success" : "error");
        setError(null);
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
              console.error("Failed to parse quiz reset response", parseError);
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
        router.refresh();
      } catch (resetError) {
        setError(resetError instanceof Error ? resetError.message : "Unable to reset quiz");
      }
    });
  };

  if (questions.length === 0) {
    return <p className="text-sm text-muted-foreground">Quiz questions will appear here once configured.</p>;
  }

  return (
    <div className="space-y-4">
      {!watchRequirementMet && !hasResults && (
        <div className="rounded-md border border-dashed border-muted-foreground/40 bg-muted/30 p-4 text-sm text-muted-foreground">
          Keep watching the lesson video to unlock this quiz.
        </div>
      )}

      {message && messageType === "success" && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {message}
        </div>
      )}

      {message && messageType === "error" && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {questions.map((question) => {
          const state = responses.get(question.id);
          const isCorrect = state?.isCorrect === true;
          const isIncorrect = state?.isCorrect === false;
          const selectedKey = state?.selectedKey;

          return (
            <div
              key={question.id}
              className={`rounded-md border p-4 transition ${
                isCorrect
                  ? "border-emerald-300 bg-emerald-50"
                  : isIncorrect
                    ? "border-red-300 bg-red-50"
                    : "border-border bg-card"
              }`}
            >
              <p className="text-sm font-medium text-foreground">{question.prompt}</p>
              <div className="mt-3 space-y-2">
                {question.options.map((option) => {
                  const isSelected = selectedKey === option.key;
                  const disabled = hasResults || !watchRequirementMet || isPending;
                  return (
                    <label
                      key={option.key}
                      className={`flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm transition ${
                        disabled ? "cursor-not-allowed opacity-75" : "hover:border-foreground/50"
                      } ${isSelected ? "border-foreground" : "border-border"}`}
                    >
                      <input
                        type="radio"
                        name={question.id}
                        value={option.key}
                        checked={isSelected}
                        disabled={disabled}
                        onChange={() => handleSelect(question, option.key)}
                        className="h-4 w-4"
                      />
                      <span>{option.label}</span>
                    </label>
                  );
                })}
              </div>

              {isCorrect && (
                <p className="mt-3 text-sm font-medium text-emerald-700">Correct!</p>
              )}

              {isIncorrect && (
                <div className="mt-3 space-y-1 text-sm">
                  <p className="font-medium text-red-700">Not quite.</p>
                  {state?.correctLabel && (
                    <p className="text-muted-foreground">Correct answer: {state.correctLabel}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!watchRequirementMet || hasResults || !allAnswered || isPending}
        >
          Submit answers
        </Button>
        {hasResults && (
          <Button type="button" variant="outline" onClick={handleReset} disabled={isPending}>
            Retake quiz
          </Button>
        )}
      </div>
    </div>
  );
}
