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
    <div className={cn("join rounded-btn bg-base-200 p-1", className)}>
      {OPTIONS.map((option) => {
        const isActive = density === option.value;
        return (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={isActive ? "primary" : "ghost"}
            aria-pressed={isActive}
            onClick={() => {
              if (!isActive) {
                onDensityChange(option.value);
              }
            }}
            className={cn(
              "join-item h-8 min-h-[2rem] rounded-btn px-3 text-xs font-semibold",
              isActive ? "text-primary-content" : "text-muted-foreground"
            )}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
