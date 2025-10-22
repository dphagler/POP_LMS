"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DataDensity = "comfortable" | "compact";

type DataDensityToggleProps = {
  density: DataDensity;
  onDensityChange: (density: DataDensity) => void;
  className?: string;
};

const OPTIONS: Array<{ label: string; value: DataDensity }> = [
  { label: "Comfortable", value: "comfortable" },
  { label: "Compact", value: "compact" }
];

export function DataDensityToggle({ density, onDensityChange, className }: DataDensityToggleProps) {
  return (
    <div className={cn("inline-flex items-center gap-1 rounded-md border border-input bg-muted/40 p-1", className)}>
      {OPTIONS.map((option) => {
        const isActive = density === option.value;
        return (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={isActive ? "secondary" : "ghost"}
            aria-pressed={isActive}
            onClick={() => {
              if (!isActive) {
                onDensityChange(option.value);
              }
            }}
            className={cn(
              "h-7 px-2 text-xs",
              isActive ? "shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
