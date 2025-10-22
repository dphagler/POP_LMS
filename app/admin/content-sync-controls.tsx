"use client";

import { type Dispatch, type FormEvent, type SetStateAction, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

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
  const [logs, setLogs] = useState<string[]>([]);

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
    setSummary(null);

    appendLog(setLogs, `▶ Starting ${dryRun ? "dry run" : "sync"}${allowDeletes ? " (deletes enabled)" : ""}.`);

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
        appendLog(setLogs, `✖ Sync failed${requestId ? ` (request ${requestId})` : ""}: ${message}`);
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
      appendLog(setLogs, `✔ ${dryRun ? "Dry run" : "Sync"} completed${requestId ? ` (request ${requestId})` : ""}.`);
      formatSummaryLines(payload?.summary).forEach((line) => appendLog(setLogs, line));
    } catch (error) {
      setToast({
        variant: "error",
        title: "Sync failed",
        description:
          error instanceof Error ? error.message : "An unexpected error occurred while syncing."
      });
      appendLog(
        setLogs,
        `✖ Sync failed: ${error instanceof Error ? error.message : "An unexpected error occurred while syncing."}`
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const allowDeletesHint = dryRun ? "Disable dry run to enable deletes." : undefined;

  return (
    <div className="flex w-full flex-col gap-5">
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

      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
        <div className="grid gap-3 sm:max-w-md">
          <ToggleRow
            id="dry-run"
            label="Dry run"
            description="Preview the first five documents without writing changes."
            checked={dryRun}
            onCheckedChange={setDryRun}
            disabled={isSubmitting}
          />
          <ToggleRow
            id="allow-deletes"
            label="Allow deletes"
            description="Remove content that was deleted in Sanity from the database."
            checked={allowDeletes}
            onCheckedChange={setAllowDeletes}
            disabled={isSubmitting || dryRun}
            hint={allowDeletesHint}
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {disabled && disabledReason ? (
            <p className="text-xs text-destructive">{disabledReason}</p>
          ) : null}
          <Button
            type="submit"
            disabled={disabled || isSubmitting}
            aria-disabled={disabled || isSubmitting}
            title={disabled ? disabledReason : undefined}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                {dryRun ? "Running dry run" : "Syncing"}
              </span>
            ) : dryRun ? (
              "Preview changes"
            ) : (
              "Sync from Sanity"
            )}
          </Button>
        </div>
      </form>

      <LogPanel logs={logs} isSubmitting={isSubmitting} />

      {isSubmitting ? (
        <Skeleton className="h-36 w-full rounded-xl bg-muted/60" aria-hidden />
      ) : summary ? (
        <SyncReport summary={summary} />
      ) : null}
    </div>
  );
}

function appendLog(setter: Dispatch<SetStateAction<string[]>>, message: string) {
  const timestamp = new Date().toLocaleTimeString();
  setter((previous) => {
    const next = [...previous, `[${timestamp}] ${message}`];
    if (next.length > 50) {
      return next.slice(next.length - 50);
    }
    return next;
  });
}

const ACTION_DEFINITIONS = [
  { key: "created", label: "Created" },
  { key: "updated", label: "Updated" },
  { key: "deleted", label: "Deleted" },
  { key: "skipped", label: "Skipped" }
] as const satisfies ReadonlyArray<{ key: keyof SyncSummarySection; label: string }>;

const ACTION_STYLES: Record<keyof SyncSummarySection, string> = {
  created: "border-emerald-200 bg-emerald-50 text-emerald-900",
  updated: "border-sky-200 bg-sky-50 text-sky-900",
  deleted: "border-rose-200 bg-rose-50 text-rose-900",
  skipped: "border-amber-200 bg-amber-50 text-amber-900"
};

function SyncReport({ summary }: { summary: SyncSummary }) {
  const totals = ACTION_DEFINITIONS.reduce(
    (acc, action) => {
      acc[action.key] =
        summary.courses[action.key].length +
        summary.modules[action.key].length +
        summary.lessons[action.key].length;
      return acc;
    },
    { created: 0, updated: 0, deleted: 0, skipped: 0 } as Record<keyof SyncSummarySection, number>
  );

  const sections = [
    { label: "Courses", data: summary.courses },
    { label: "Modules", data: summary.modules },
    { label: "Lessons", data: summary.lessons }
  ] as const;

  return (
    <div className="w-full self-stretch rounded-lg border border-border/60 bg-card/60 p-4 text-left shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Sync report
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <StatusBadge action="created" count={totals.created} />
          <StatusBadge action="updated" count={totals.updated} />
          <StatusBadge action="deleted" count={totals.deleted} />
          <StatusBadge action="skipped" count={totals.skipped} />
        </div>
      </div>
      <div className="mt-4 grid gap-4">
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
    <section className="rounded-md border border-border/50 bg-background/70 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h4 className="font-semibold text-foreground">{label}</h4>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <StatusBadge action="created" count={counts.created} />
          <StatusBadge action="updated" count={counts.updated} />
          <StatusBadge action="deleted" count={counts.deleted} />
          <StatusBadge action="skipped" count={counts.skipped} />
        </div>
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

function formatSummaryLines(summary?: SyncSummary | null) {
  if (!summary) return [] as string[];

  const sections = [
    ["Courses", summary.courses],
    ["Modules", summary.modules],
    ["Lessons", summary.lessons],
  ] as const;

  return sections.map(([label, section]) => {
    const counts = getSectionCounts(section);
    return `${label}: ${counts.created} created • ${counts.updated} updated • ${counts.deleted} deleted • ${counts.skipped} skipped`;
  });
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

type ToggleRowProps = {
  id: string;
  label: string;
  description?: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
};

function ToggleRow({ id, label, description, hint, checked, onCheckedChange, disabled }: ToggleRowProps) {
  const descriptionId = description ? `${id}-description` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  const describedBy = [descriptionId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/40 p-3 shadow-sm">
      <div className="flex min-w-0 flex-col gap-1 text-left">
        <p id={`${id}-label`} className="text-sm font-medium text-foreground">
          {label}
        </p>
        {description ? (
          <p id={descriptionId} className="text-xs text-muted-foreground">
            {description}
          </p>
        ) : null}
        {hint ? (
          <p id={hintId} className="text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>
      <Switch
        aria-labelledby={`${id}-label`}
        aria-describedby={describedBy}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}

type StatusBadgeProps = {
  action: keyof SyncSummarySection;
  count: number;
};

function StatusBadge({ action, count }: StatusBadgeProps) {
  return (
    <Badge className={`${ACTION_STYLES[action]} ${count === 0 ? "opacity-60" : ""}`}>
      {ACTION_DEFINITIONS.find((definition) => definition.key === action)?.label}: {count}
    </Badge>
  );
}

function LogPanel({ logs, isSubmitting }: { logs: string[]; isSubmitting: boolean }) {
  return (
    <div
      className="rounded-xl border border-slate-900/50 bg-slate-950/50 p-4 font-mono text-xs text-slate-200 shadow-inner"
      aria-live="polite"
    >
      <div className="flex max-h-48 flex-col gap-2 overflow-y-auto">
        {logs.length === 0 ? (
          <p className="text-slate-500">No sync activity yet.</p>
        ) : (
          logs.map((log, index) => (
            <p key={`${index}-${log}`} className="whitespace-pre-wrap break-words">
              {log}
            </p>
          ))
        )}
        {isSubmitting ? (
          <p className="flex items-center gap-2 text-slate-300">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Processing…
          </p>
        ) : null}
      </div>
    </div>
  );
}
