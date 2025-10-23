"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SettingsToastMessage = {
  variant: "success" | "error";
  title: string;
  description?: string;
};

type SettingsToastProps = {
  toast: SettingsToastMessage | null;
  onDismiss: () => void;
};

export function SettingsToast({ toast, onDismiss }: SettingsToastProps) {
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timeout);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const isSuccess = toast.variant === "success";
  const role = isSuccess ? "status" : "alert";
  const liveRegion = isSuccess ? "polite" : "assertive";

  return (
    <div
      role={role}
      aria-live={liveRegion}
      className={cn(
        "fixed right-4 top-4 z-50 w-full max-w-sm rounded-2xl border p-4 shadow-xl backdrop-blur bg-base-100/95",
        isSuccess
          ? "border-[color:var(--color-success)]/40 text-[color:var(--color-success-content)]"
          : "border-[color:var(--color-error)]/40 text-[color:var(--color-error-content)]"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="font-semibold">{toast.title}</p>
          {toast.description ? (
            <p className="mt-1 text-sm leading-relaxed">{toast.description}</p>
          ) : null}
        </div>
        <Button
          type="button"
          onClick={onDismiss}
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full p-0 text-current/80 hover:text-current"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
