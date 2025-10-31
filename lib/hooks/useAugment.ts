"use client";

import { useCallback, useState } from "react";

export const AUGMENT_QUOTA_NOTE =
  "We limit to 3 prompts/hour for this lesson to keep things snappy.";

type AugmentKind = "probe" | "remediation" | "reflection";

export type AugmentMessage = {
  role: "assistant" | "user";
  content: string;
  at: Date;
};

export type AugmentSendArgs = {
  kind: AugmentKind;
  message?: string;
  transcriptSnippet?: string;
};

export type AugmentSendResult =
  | { ok: true; mock: boolean; content: string }
  | { ok: false; reason: "quota_exceeded" | "error"; message?: string };

type UseAugmentOptions = {
  lessonId: string;
  initialOpen?: boolean;
};

type AugmentResponse = {
  ok?: boolean;
  content?: string;
  __mock?: boolean;
  error?: string;
};

export function useAugment({
  lessonId,
  initialOpen = false
}: UseAugmentOptions) {
  const [messages, setMessages] = useState<AugmentMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(initialOpen);
  const [isMock, setIsMock] = useState(false);

  const send = useCallback(
    async ({
      kind,
      message,
      transcriptSnippet
    }: AugmentSendArgs): Promise<AugmentSendResult> => {
      const trimmedMessage = message?.trim();
      const userMessage: AugmentMessage | null = trimmedMessage
        ? { role: "user", content: trimmedMessage, at: new Date() }
        : null;

      if (userMessage) {
        setMessages((previous) => [...previous, userMessage]);
      }

      setPending(true);
      setError(null);

      try {
        const response = await fetch("/api/augment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lessonId,
            kind,
            message: trimmedMessage,
            transcriptSnippet
          })
        });

        const data = (await response
          .json()
          .catch(() => null)) as AugmentResponse | null;

        if (response.status === 429) {
          const messageText =
            typeof data?.error === "string" && data.error.length > 0
              ? data.error
              : "quota_exceeded";

          const normalizedMessage =
            messageText === "quota_exceeded" ? AUGMENT_QUOTA_NOTE : messageText;

          setError(normalizedMessage);
          return {
            ok: false,
            reason: "quota_exceeded",
            message: normalizedMessage
          };
        }

        if (!response.ok || !data) {
          const messageText =
            typeof data?.error === "string" && data.error.length > 0
              ? data.error
              : "Unable to reach POP Bot";
          setError(messageText);
          return { ok: false, reason: "error", message: messageText };
        }

        if (!data.content) {
          const messageText = "POP Bot sent an empty response";
          setError(messageText);
          return { ok: false, reason: "error", message: messageText };
        }

        setMessages((previous) => [
          ...previous,
          { role: "assistant", content: data.content as string, at: new Date() }
        ]);

        const usedMock = Boolean(data.__mock);
        setIsMock(usedMock);

        return { ok: true, mock: usedMock, content: data.content };
      } catch (caught) {
        const messageText =
          caught instanceof Error ? caught.message : "Something went wrong";
        setError(messageText);
        return { ok: false, reason: "error", message: messageText };
      } finally {
        setPending(false);
      }
    },
    [lessonId]
  );

  return { pending, error, send, messages, open, setOpen, isMock } as const;
}
