const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

export const redactEmails = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  return value.replace(EMAIL_PATTERN, "[redacted]");
};

type LessonInfo = {
  title: string;
  objectives?: unknown;
};

type ProgressInfo = {
  uniqueSeconds?: number;
  durationS?: number;
  segments?: unknown;
};

type BuildPromptInput = {
  lesson: LessonInfo;
  progress: ProgressInfo;
  transcriptSnippet?: string;
  lastUserMsg?: string;
  sanitizeEmails?: boolean;
};

type BuildPromptResult = {
  system: string;
  user: string;
};

const stringifyObjective = (input: unknown): string | null => {
  if (!input) return null;

  if (typeof input === "string") {
    const trimmed = input.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof input === "object") {
    if (Array.isArray(input)) {
      const normalized = input
        .map((item) => stringifyObjective(item))
        .filter((item): item is string => Boolean(item));
      if (normalized.length === 0) {
        return null;
      }
      return normalized.join("; ");
    }

    const record = input as Record<string, unknown>;
    const summary = record.summary ?? record.description ?? record.title;
    if (typeof summary === "string") {
      const trimmed = summary.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }

  try {
    const serialized = JSON.stringify(input);
    if (typeof serialized === "string" && serialized.length > 0) {
      return serialized;
    }
  } catch {
    return null;
  }

  return null;
};

const summarizeObjectives = (input: unknown): string => {
  const summary = stringifyObjective(input);
  return summary ?? "Not provided";
};

const summarizeProgress = ({
  uniqueSeconds,
  durationS,
  segments
}: ProgressInfo): {
  text: string;
  ratio: number | null;
} => {
  const duration = Number.isFinite(durationS ?? NaN)
    ? Math.max(Number(durationS), 0)
    : null;
  const watched = Number.isFinite(uniqueSeconds ?? NaN)
    ? Math.max(Number(uniqueSeconds), 0)
    : null;

  let ratio: number | null = null;
  if (duration && duration > 0 && watched !== null) {
    ratio = Math.min(1, watched / duration);
  }

  const segmentsInfo =
    Array.isArray(segments) && segments.length > 0
      ? `${segments.length} segment(s)`
      : "no segment data";
  const watchedText =
    watched !== null ? `${watched} sec watched` : "watch time unknown";
  const durationText =
    duration !== null ? `${duration} sec total` : "duration unknown";
  const ratioText =
    ratio !== null
      ? `${Math.round(ratio * 100)}% complete`
      : "completion unknown";

  return {
    text: `${watchedText} of ${durationText} (${ratioText}); segments: ${segmentsInfo}`,
    ratio
  };
};

const detectConfusion = (
  ratio: number | null,
  snippet?: string,
  lastMessage?: string
): string | null => {
  const cues: string[] = [];

  if (ratio !== null && ratio < 0.35) {
    cues.push("low progress");
  }

  const checkText = (value?: string) => {
    if (!value) return;
    const lower = value.toLowerCase();
    if (/[?]/.test(value)) {
      cues.push("question asked");
    }
    if (/(confus|lost|stuck|don't understand|help)/i.test(lower)) {
      cues.push("explicit confusion");
    }
  };

  checkText(snippet);
  checkText(lastMessage);

  if (cues.length === 0) {
    return null;
  }

  return cues.join(", ");
};

export function buildAugmentPrompt({
  lesson,
  progress,
  transcriptSnippet,
  lastUserMsg,
  sanitizeEmails = true
}: BuildPromptInput): BuildPromptResult {
  const objectivesSummary = summarizeObjectives(lesson.objectives);
  const progressSummary = summarizeProgress(progress);
  const maybeRedact: (value?: string) => string | undefined = sanitizeEmails
    ? (value) => redactEmails(value)
    : (value) => value;
  const safeSnippet = maybeRedact(transcriptSnippet)?.trim();
  const safeLastMessage = maybeRedact(lastUserMsg)?.trim();
  const confusionSignals = detectConfusion(
    progressSummary.ratio,
    safeSnippet,
    safeLastMessage
  );

  const system = [
    "You are a concise, encouraging learning coach.",
    "Reply in under 120 words using plain language.",
    "Ask exactly one probing question tied to the listed lesson objectives.",
    "If confusion cues are provided, add one short nudge that helps the learner re-engage.",
    "Avoid numbered lists unless necessary and never expose private data."
  ].join("\n");

  const userSections: string[] = [
    `Lesson: ${lesson.title}`,
    `Objectives: ${objectivesSummary}`,
    `Progress: ${progressSummary.text}`
  ];

  if (safeSnippet) {
    userSections.push(`Recent transcript snippet: "${safeSnippet}"`);
  }

  if (safeLastMessage) {
    userSections.push(`Latest learner message: "${safeLastMessage}"`);
  }

  if (confusionSignals) {
    userSections.push(
      `Confusion cues: ${confusionSignals}. Provide a gentle nudge addressing these.`
    );
  } else {
    userSections.push(
      "Confusion cues: none detected. Offer a motivating nudge only if your question might challenge them."
    );
  }

  userSections.push(
    "Craft a response that first acknowledges progress, then asks the probing question, and finally delivers the brief nudge if warranted."
  );

  return {
    system,
    user: userSections.join("\n\n")
  };
}
