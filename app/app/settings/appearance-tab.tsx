"use client";

import { useMemo } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";

import { useThemeMode, type ThemeMode } from "@/components/layout/theme-provider";
import { cn } from "@/lib/utils";

type ThemeOption = {
  icon: typeof Sun;
  label: string;
  description: string;
  value: ThemeMode;
};

const OPTIONS: ThemeOption[] = [
  {
    value: "light",
    label: "Light",
    description: "Bright interface for well-lit environments.",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Dimmed colors for low-light viewing.",
    icon: Moon,
  },
  {
    value: "system",
    label: "System",
    description: "Match your device’s appearance settings.",
    icon: Monitor,
  },
];

export function AppearanceSettings() {
  const { mode, resolvedMode, setMode } = useThemeMode();
  const statusMessage = useMemo(() => {
    if (mode === "system") {
      return `Following your system preference. Currently ${resolvedMode} mode.`;
    }
    return `Currently using ${mode} mode.`;
  }, [mode, resolvedMode]);

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-1">
        <h2 className="text-balance">Theme</h2>
        <p className="text-sm text-muted-foreground">
          Choose how POP Initiative looks on this device. Your selection is saved in this browser.
        </p>
      </div>
      <fieldset className="space-y-4">
        <legend className="text-sm font-medium">Color mode</legend>
        <div className="grid gap-3 md:grid-cols-3">
          {OPTIONS.map((option) => {
            const Icon = option.icon;
            const isActive = option.value === mode;
            return (
              <label
                key={option.value}
                htmlFor={`theme-${option.value}`}
                className={cn(
                  "group relative flex cursor-pointer flex-col gap-3 rounded-md border p-4 text-left transition",
                  isActive
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background hover:bg-muted/50"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <Icon className="h-4 w-4" aria-hidden />
                    {option.label}
                  </span>
                  {isActive ? (
                    <span className="flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                      <Check className="h-3 w-3" aria-hidden />
                      Active
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">{option.description}</p>
                <input
                  id={`theme-${option.value}`}
                  type="radio"
                  name="theme-mode"
                  value={option.value}
                  checked={isActive}
                  onChange={() => setMode(option.value)}
                  className="sr-only"
                />
              </label>
            );
          })}
        </div>
      </fieldset>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {statusMessage}
      </p>
    </div>
  );
}
