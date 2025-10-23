"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface ProgressProps extends Omit<React.ComponentPropsWithoutRef<"progress">, "value"> {
  value?: number;
}

const Progress = React.forwardRef<HTMLProgressElement, ProgressProps>(
  ({ className, value = 0, ...props }, ref) => {
    const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));

    return (
      <progress
        ref={ref}
        className={cn("progress progress-primary w-full", className)}
        value={clamped}
        max={100}
        {...props}
      />
    );
  }
);
Progress.displayName = "Progress";

export { Progress };
