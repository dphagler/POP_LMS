"use client";
import { useCallback, useMemo, useRef, useState } from "react";

export type ChatMsg = {
  role: "assistant" | "user";
  content: string;
  at: string;
};
type SendArgs = {
  lessonId: string;
  kind?: "probe" | "remediation" | "reflection";
  message?: string;
  transcriptSnippet?: string;
};

export function useAugment(initial?: { open?: boolean; seed?: ChatMsg[] }) {
  const [open, setOpen] = useState(!!initial?.open);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>(initial?.seed ?? []);
  const mockRef = useRef<boolean>(false);

  const send = useCallback(
    async ({
      lessonId,
      kind = "probe",
      message = "",
      transcriptSnippet
    }: SendArgs) => {
      setPending(true);
      setError(null);
      if (message.trim()) {
        setMessages((prev) => [
          ...prev,
          {
            role: "user",
            content: message.trim(),
            at: new Date().toISOString()
          }
        ]);
      }
      try {
        const res = await fetch("/api/augment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ lessonId, kind, message, transcriptSnippet })
        });
        const json = await res.json();
        mockRef.current = !!json?.__mock;
        if (!res.ok || !json?.content)
          throw new Error(json?.error || "Augment failed");
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: json.content,
            at: new Date().toISOString()
          }
        ]);
      } catch (e: any) {
        setError(e?.message || "Augment failed");
      } finally {
        setPending(false);
      }
    },
    []
  );

  const api = useMemo(
    () => ({
      open,
      setOpen,
      pending,
      error,
      messages,
      send,
      isMock: () => mockRef.current
    }),
    [open, pending, error, messages, send]
  );

  return api;
}
