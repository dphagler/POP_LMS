"use client";

import { useEffect, useMemo, useState, type RefObject } from "react";
import {
  Alert,
  AlertIcon,
  AlertTitle,
  Checkbox,
  CheckboxGroup,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Radio,
  RadioGroup,
  Stack,
  Text
} from "@chakra-ui/react";

import { Button } from "@/components/ui/button";

type QuizOption = {
  id: string;
  label: string;
};

type QuizQuestion = {
  id: string;
  prompt: string;
  type: "single" | "multi";
  options: QuizOption[];
};

type QuizAnswers = Record<string, string[]>;

type QuizModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  questions: QuizQuestion[];
  onSubmit: (answers: QuizAnswers) => void | Promise<void>;
  finalFocusRef?: RefObject<HTMLElement>;
};

function buildInitialAnswers(questions: QuizQuestion[]): QuizAnswers {
  return questions.reduce<QuizAnswers>((acc, question) => {
    acc[question.id] = [];
    return acc;
  }, {});
}

export function QuizModal({
  isOpen,
  onClose,
  title,
  questions,
  onSubmit,
  finalFocusRef,
}: QuizModalProps) {
  const [answers, setAnswers] = useState<QuizAnswers>(() => buildInitialAnswers(questions));
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    setAnswers(buildInitialAnswers(questions));
    setIsSubmitted(false);
  }, [questions]);

  const allAnswered = useMemo(() => {
    if (questions.length === 0) {
      return false;
    }

    return questions.every((question) => (answers[question.id] ?? []).length > 0);
  }, [questions, answers]);

  const handleSingleSelect = (questionId: string, value: string) => {
    if (isSubmitted) {
      return;
    }

    setAnswers((prev) => ({
      ...prev,
      [questionId]: value ? [value] : []
    }));
  };

  const handleMultiSelect = (questionId: string, value: string[]) => {
    if (isSubmitted) {
      return;
    }

    setAnswers((prev) => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleSubmit = async () => {
    if (isSubmitted || !allAnswered) {
      return;
    }

    await onSubmit(answers);
    setIsSubmitted(true);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      isCentered
      trapFocus
      finalFocusRef={finalFocusRef}
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{title ?? "Quiz"}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {isSubmitted ? (
            <Alert status="info" borderRadius="md" mb={4}>
              <AlertIcon />
              <AlertTitle fontSize="sm">One attempt submitted</AlertTitle>
            </Alert>
          ) : null}

          <Stack spacing={6}>
            {questions.map((question) => {
              const selectedValues = answers[question.id] ?? [];

              return (
                <Stack key={question.id} spacing={3}>
                  <Text fontWeight="semibold">{question.prompt}</Text>

                  {question.type === "single" ? (
                    <RadioGroup
                      value={selectedValues[0] ?? ""}
                      onChange={(value) => handleSingleSelect(question.id, value)}
                    >
                      <Stack spacing={2}>
                        {question.options.map((option) => (
                          <Radio key={option.id} value={option.id} isDisabled={isSubmitted}>
                            {option.label}
                          </Radio>
                        ))}
                      </Stack>
                    </RadioGroup>
                  ) : (
                    <CheckboxGroup
                      value={selectedValues}
                      onChange={(value) => handleMultiSelect(question.id, value as string[])}
                    >
                      <Stack spacing={2}>
                        {question.options.map((option) => (
                          <Checkbox
                            key={option.id}
                            value={option.id}
                            isDisabled={isSubmitted}
                          >
                            {option.label}
                          </Checkbox>
                        ))}
                      </Stack>
                    </CheckboxGroup>
                  )}
                </Stack>
              );
            })}
          </Stack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Close
          </Button>
          <Button
            colorScheme="primary"
            onClick={handleSubmit}
            isDisabled={isSubmitted || !allAnswered}
          >
            Submit
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
