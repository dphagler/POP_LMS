import type { QuizQuestion } from "@prisma/client";

export type McqOption = {
  key: string;
  label: string;
};

export function parseMcqOptions(question: QuizQuestion): McqOption[] {
  const raw = question.options;

  if (!raw) {
    return [];
  }

  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (typeof item !== "object" || item === null) {
          return null;
        }

        const keyValue = "key" in item ? item.key : undefined;
        const labelValue = "label" in item ? item.label : undefined;

        if (typeof keyValue !== "string" || typeof labelValue !== "string") {
          return null;
        }

        return { key: keyValue, label: labelValue } satisfies McqOption;
      })
      .filter(Boolean) as McqOption[];
  }

  if (typeof raw === "object" && raw !== null) {
    return Object.entries(raw).map(([key, value]) => ({
      key,
      label:
        typeof value === "string"
          ? value
          : typeof value === "object" && value !== null && "label" in value && typeof value.label === "string"
            ? value.label
            : String(value)
    }));
  }

  return [];
}

export function getOptionLabel(options: McqOption[], key: string | null | undefined): string | null {
  if (!key) {
    return null;
  }

  const option = options.find((item) => item.key === key);
  return option ? option.label : null;
}
