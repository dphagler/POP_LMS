"use client";

import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type SummaryCounts = {
  created: number;
  updated: number;
  skipped: number;
};

type SyncSummary = {
  courses: SummaryCounts;
  modules: SummaryCounts;
  lessons: SummaryCounts;
};

type ToastState = {
  variant: "success" | "error";
  title: string;
  description?: string;
  requestId?: string;
};

interface ContentSyncControlsProps {
  disabled: boolean;
  disabledReason?: string;
}

function formatSummary(summary?: SyncSummary | null) {
  if (!summary) return undefined;

  const totalChanges = [summary.courses, summary.modules, summary.lessons].reduce(
    (acc, counts) => acc + counts.created + counts.updated,
    0
  );

  if (totalChanges === 0) {
    return "No changes detected.";
  }

  const sections = [
    [`Courses`, summary.courses],
    [`Modules`, summary.modules],
    [`Lessons`, summary.lessons]
  ] as const;

  return sections
    .map(([label, counts]) =>
      `${label}: ${counts.created} created, ${counts.updated} updated, ${counts.skipped} skipped`
    )
    .join(" · ");
}

export default function ContentSyncControls({ disabled, disabledReason }: ContentSyncControlsProps) {
  const [dryRun, setDryRun] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timeout);
  }, [toast]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || isSubmitting) return;

    setIsSubmitting(true);
    setToast(null);

    try {
      const response = await fetch("/api/admin/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ dryRun })
      });

      const payload = await response.json();
      const requestId = typeof payload?.requestId === "string" ? payload.requestId : undefined;

      if (!response.ok) {
        const message =
          typeof payload?.error === "string"
            ? payload.error
            : `Sync request failed with status ${response.status}`;
        setToast({
          variant: "error",
          title: "Sync failed",
          description: message,
          requestId
        });
        return;
      }

      const summaryDescription =
        formatSummary(payload?.summary) ?? (dryRun ? "Dry run completed." : "Sync completed successfully.");
      setToast({
        variant: "success",
        title: dryRun ? "Dry run complete" : "Sync complete",
        description: summaryDescription,
        requestId
      });
    } catch (error) {
      setToast({
        variant: "error",
        title: "Sync failed",
        description:
          error instanceof Error ? error.message : "An unexpected error occurred while syncing."
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-3 sm:items-end sm:text-right">
      {toast ? (
        <div
          role="status"
          className={`fixed right-4 top-4 z-50 w-full max-w-sm rounded-md border p-4 shadow-lg ${
            toast.variant === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          <p className="font-semibold">{toast.title}</p>
          {toast.description ? (
            <p className="mt-1 text-sm leading-relaxed">{toast.description}</p>
          ) : null}
          {toast.requestId ? (
            <p className="mt-2 text-xs opacity-75">Request ID: {toast.requestId}</p>
          ) : null}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border border-gray-300"
            checked={dryRun}
            onChange={(event) => setDryRun(event.target.checked)}
            disabled={isSubmitting}
          />
          Dry run first 5 documents
        </label>
        <Button
          type="submit"
          disabled={disabled || isSubmitting}
          aria-disabled={disabled || isSubmitting}
          title={disabled ? disabledReason : undefined}
        >
          {isSubmitting ? (dryRun ? "Running dry run..." : "Syncing...") : dryRun ? "Preview changes" : "Sync from Sanity"}
        </Button>
      </form>

      {disabled && disabledReason ? (
        <p className="text-xs text-muted-foreground">{disabledReason}</p>
      ) : null}
    </div>
  );
}
