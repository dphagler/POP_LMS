"use client";

import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type SyncItem = {
  id: string;
  title: string;
  docId?: string;
  url?: string;
  parentTitle?: string;
  reason?: string;
};

type SyncSummarySection = {
  created: SyncItem[];
  updated: SyncItem[];
  skipped: SyncItem[];
  deleted: SyncItem[];
};

type SyncSummary = {
  courses: SyncSummarySection;
  modules: SyncSummarySection;
  lessons: SyncSummarySection;
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

function getSectionCounts(section?: SyncSummarySection) {
  const target = section ?? { created: [], updated: [], deleted: [], skipped: [] };
  return {
    created: target.created.length,
    updated: target.updated.length,
    deleted: target.deleted.length,
    skipped: target.skipped.length
  };
}

function formatSummary(summary?: SyncSummary | null) {
  if (!summary) return undefined;

  const sections = [
    ["Courses", summary.courses],
    ["Modules", summary.modules],
    ["Lessons", summary.lessons]
  ] as const;

  const totalChanges = sections.reduce((acc, [, section]) => {
    const counts = getSectionCounts(section);
    return acc + counts.created + counts.updated + counts.deleted;
  }, 0);

  if (totalChanges === 0) {
    return "No changes detected.";
  }

  return sections
    .map(([label, section]) => {
      const counts = getSectionCounts(section);
      return `${label}: ${counts.created} created, ${counts.updated} updated, ${counts.deleted} deleted, ${counts.skipped} skipped`;
    })
    .join(" · ");
}

export default function ContentSyncControls({ disabled, disabledReason }: ContentSyncControlsProps) {
  const [dryRun, setDryRun] = useState(false);
  const [allowDeletes, setAllowDeletes] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [summary, setSummary] = useState<SyncSummary | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (dryRun && allowDeletes) {
      setAllowDeletes(false);
    }
  }, [dryRun, allowDeletes]);

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
        body: JSON.stringify({ dryRun, allowDeletes })
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
      setSummary(payload?.summary ?? null);
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

      <form
        onSubmit={handleSubmit}
        className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
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
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border border-gray-300"
              checked={allowDeletes}
              onChange={(event) => setAllowDeletes(event.target.checked)}
              disabled={isSubmitting || dryRun}
              title={dryRun ? "Disable dry run to enable deletes" : undefined}
            />
            Allow deletes (remove missing items)
          </label>
        </div>
        <Button
          type="submit"
          disabled={disabled || isSubmitting}
          aria-disabled={disabled || isSubmitting}
          title={disabled ? disabledReason : undefined}
        >
          {isSubmitting
            ? dryRun
              ? "Running dry run..."
              : "Syncing..."
            : dryRun
              ? "Preview changes"
              : "Sync from Sanity"}
        </Button>
      </form>

      {disabled && disabledReason ? (
        <p className="text-xs text-muted-foreground">{disabledReason}</p>
      ) : null}

      {summary ? <SyncReport summary={summary} /> : null}
    </div>
  );
}

const ACTION_DEFINITIONS = [
  { key: "created", label: "Created" },
  { key: "updated", label: "Updated" },
  { key: "deleted", label: "Deleted" },
  { key: "skipped", label: "Skipped" }
] as const satisfies ReadonlyArray<{ key: keyof SyncSummarySection; label: string }>;

function SyncReport({ summary }: { summary: SyncSummary }) {
  const sections = [
    { label: "Courses", data: summary.courses },
    { label: "Modules", data: summary.modules },
    { label: "Lessons", data: summary.lessons }
  ] as const;

  return (
    <div className="w-full self-stretch rounded-md border border-border/60 bg-background/60 p-4 text-left shadow-sm">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Sync report
      </h3>
      <div className="mt-3 grid gap-4">
        {sections.map((section) => (
          <SummarySection key={section.label} label={section.label} data={section.data} />
        ))}
      </div>
    </div>
  );
}

function SummarySection({ label, data }: { label: string; data: SyncSummarySection }) {
  const counts = getSectionCounts(data);
  const totalEntries = ACTION_DEFINITIONS.reduce((acc, action) => acc + data[action.key].length, 0);

  return (
    <section className="rounded-md border border-border/50 bg-card/60 p-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h4 className="font-semibold text-foreground">{label}</h4>
        <p className="text-xs text-muted-foreground">
          Created {counts.created} · Updated {counts.updated} · Deleted {counts.deleted} · Skipped {counts.skipped}
        </p>
      </div>

      {totalEntries === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">No changes detected for this section.</p>
      ) : (
        <div className="mt-3 space-y-3">
          {ACTION_DEFINITIONS.map((action) => {
            const items = data[action.key];
            if (items.length === 0) {
              return null;
            }

            return (
              <div key={`${label}-${action.key}`} className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {action.label}
                </p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {items.map((item, index) => (
                    <li key={`${action.key}-${item.id}-${item.docId ?? index}`}>
                      <SyncItemDetails item={item} />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function SyncItemDetails({ item }: { item: SyncItem }) {
  return (
    <span className="flex flex-wrap items-center gap-1 text-foreground">
      {item.url ? (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary hover:underline"
        >
          {item.title}
        </a>
      ) : (
        <span className="font-medium">{item.title}</span>
      )}
      {item.parentTitle ? (
        <span className="text-xs text-muted-foreground">({item.parentTitle})</span>
      ) : null}
      {item.reason ? <span className="text-xs text-muted-foreground">— {item.reason}</span> : null}
    </span>
  );
}
