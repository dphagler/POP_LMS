"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { type ThemeMode, useThemeMode } from "./theme-provider";

const OPTIONS: Array<{ icon: typeof Sun; label: string; value: ThemeMode }> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor }
];

export function ThemeModeToggle({ className }: { className?: string }) {
  const { mode, resolvedMode, setMode } = useThemeMode();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

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
  const systemStatus = mode === "system" ? ` (currently ${resolvedMode} mode)` : "";

  const handleSelect = (value: ThemeMode) => {
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
          {mode === "system" ? ` (${resolvedMode} mode active)` : null}
        </span>
      </Button>
      <div
        role="menu"
        aria-label="Select theme"
        className={cn(
          "absolute right-0 z-30 mt-2 w-48 origin-top-right rounded-md border bg-popover p-1 text-sm shadow-lg outline-none",
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
                "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left transition-colors duration-200 ease-in-out hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isActive ? "text-foreground" : "text-muted-foreground"
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
