"use client";

import { useMemo } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";

import { useThemeMode, type ThemeMode } from "@/components/layout/theme-provider";
import { Card } from "@/components/ui/card";
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
    <Card className="shadow-xl">
      <div className="card-body space-y-6">
        <div className="space-y-1">
          <h2 className="text-balance">Theme</h2>
          <p className="text-sm text-muted-foreground">
            Choose how POP Initiative looks on this device. Your selection is saved in this browser.
          </p>
        </div>
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-foreground">Color mode</legend>
          <div className="grid gap-4 md:grid-cols-3">
            {OPTIONS.map((option) => {
              const Icon = option.icon;
              const isActive = option.value === mode;
              return (
                <label
                  key={option.value}
                  htmlFor={`theme-${option.value}`}
                  className={cn(
                    "card cursor-pointer border border-base-300 bg-base-100 transition hover:border-primary/60 hover:shadow-lg",
                    isActive ? "border-primary shadow-lg" : "shadow-sm"
                  )}
                >
                  <div className="card-body gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <Icon className="h-5 w-5" aria-hidden />
                        {option.label}
                      </span>
                      {isActive ? (
                        <span className="badge badge-primary badge-sm gap-1">
                          <Check className="h-3 w-3" aria-hidden />
                          Active
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                  <input
                    id={`theme-${option.value}`}
                    type="radio"
                    name="theme-mode"
                    value={option.value}
                    checked={isActive}
                    onChange={() => setMode(option.value)}
                    className="hidden"
                  />
                </label>
              );
            })}
          </div>
        </fieldset>
        <div className="alert alert-info" aria-live="polite">
          <span>{statusMessage}</span>
        </div>
      </div>
    </Card>
  );
}
