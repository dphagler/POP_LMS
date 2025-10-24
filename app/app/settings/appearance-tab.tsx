"use client";

import { useMemo } from "react";
import { Check, Monitor, Moon, Palette, Sun } from "lucide-react";

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
    label: "POP",
    description: "Bright, airy palette tailored to the POP visual language.",
    icon: Sun,
  },
  {
    value: "dark",
    label: "POP Dark",
    description: "Moody contrast for comfortable viewing after hours.",
    icon: Moon,
  },
  {
    value: "system",
    label: "System",
    description: "Match your device’s appearance settings.",
    icon: Monitor,
  },
];

const TOKEN_SWATCHES = [
  { name: "Primary", className: "bg-primary text-primary-content" },
  { name: "Secondary", className: "bg-secondary text-secondary-content" },
  { name: "Accent", className: "bg-accent text-accent-content" },
  { name: "Neutral", className: "bg-neutral text-neutral-content" },
  { name: "Info", className: "bg-info text-info-content" },
  { name: "Success", className: "bg-success text-success-content" },
  { name: "Warning", className: "bg-warning text-warning-content" },
  { name: "Error", className: "bg-error text-error-content" },
  { name: "Base-100", className: "border border-base-300 bg-base-100 text-base-content" },
  { name: "Base-200", className: "border border-base-300 bg-base-200 text-base-content" },
  { name: "Base-300", className: "border border-base-300 bg-base-300 text-base-content" },
];

export function AppearanceSettings() {
  const { mode, resolvedMode, setMode } = useThemeMode();

  const activeThemeName = useMemo(() => {
    if (mode === "system") {
      return resolvedMode === "dark" ? "pop-dark" : "pop";
    }
    return mode === "dark" ? "pop-dark" : "pop";
  }, [mode, resolvedMode]);

  const statusMessage = useMemo(() => {
    if (mode === "system") {
      return `Following your system preference. Currently ${resolvedMode} mode.`;
    }
    if (mode === "dark") {
      return "POP Dark is active across the app.";
    }
    return "POP (light) is active across the app.";
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
                    "group card cursor-pointer border border-base-300 bg-base-100 transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lg",
                    isActive ? "border-primary shadow-lg" : "shadow-sm"
                  )}
                >
                  <div className="card-body gap-3">
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
                    <p className="text-xs text-muted-foreground leading-relaxed">{option.description}</p>
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
          <div className="flex items-start gap-3">
            <Palette className="h-5 w-5 shrink-0" aria-hidden />
            <div className="space-y-1 text-sm">
              <p className="font-medium">{statusMessage}</p>
              <p className="text-xs text-muted-foreground">Active theme: <code data-theme-active>{activeThemeName}</code></p>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Theme tokens</h3>
            <span className="badge badge-outline badge-sm">{activeThemeName}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TOKEN_SWATCHES.map((token) => (
              <div
                key={token.name}
                className={cn(
                  "flex min-h-[88px] flex-col justify-between rounded-2xl p-4 text-sm shadow-sm",
                  token.className
                )}
              >
                <span className="font-semibold">{token.name}</span>
                <span className="text-xs opacity-80">{token.className}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
