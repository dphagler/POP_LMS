"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { syncDocumentTheme, type ThemeMode, useThemeMode } from "./theme-provider";

const OPTIONS: Array<{ icon: typeof Sun; label: string; value: ThemeMode }> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor }
];

export function ThemeModeToggle({ className }: { className?: string }) {
  const { mode, resolvedMode, setMode } = useThemeMode();
  const [open, setOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const activeOption = OPTIONS.find((option) => option.value === mode) ?? OPTIONS[2];
  const ActiveIcon = activeOption.icon;
  const systemStatus =
    mode === "system" && isMounted ? ` (currently ${resolvedMode} mode)` : "";

  const handleSelect = (value: ThemeMode) => {
    const resolved = getResolvedMode(value);
    syncDocumentTheme(value, resolved);
    setMode(value);
    setOpen(false);
  };

  return (
    <div className={cn("relative", className)} ref={menuRef}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Theme set to ${activeOption.label}${systemStatus}. Toggle theme menu.`}
        title={`Theme set to ${activeOption.label}${systemStatus}`}
        onClick={() => setOpen((previous) => !previous)}
        className="rounded-full transition-colors duration-500 ease-in-out"
      >
        <ActiveIcon className="h-5 w-5" aria-hidden />
        <span className="sr-only" aria-live="polite">
          Theme set to {activeOption.label}
          {mode === "system" && isMounted ? ` (${resolvedMode} mode active)` : null}
        </span>
      </Button>
      <div
        role="menu"
        aria-label="Select theme"
        className={cn(
          "absolute right-0 z-30 mt-2 w-48 origin-top-right rounded-2xl border border-base-300 bg-base-100/95 p-2 text-sm shadow-xl backdrop-blur",
          open ? "block" : "hidden"
        )}
      >
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const isActive = option.value === mode;
          return (
            <button
              key={option.value}
              type="button"
              role="menuitemradio"
              aria-checked={isActive}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left transition-colors duration-200 ease-in-out",
                "hover:bg-[color:var(--surface-hover)] focus-visible:outline-none",
                isActive
                  ? "bg-[color:var(--surface-muted-strong)] text-foreground shadow-inner"
                  : "text-muted-foreground"
              )}
              onClick={() => handleSelect(option.value)}
            >
              <span className="flex items-center gap-2">
                <Icon className="h-4 w-4" aria-hidden />
                {option.label}
              </span>
              {isActive ? <Check className="h-4 w-4" aria-hidden /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function getResolvedMode(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  }

  return mode;
}
