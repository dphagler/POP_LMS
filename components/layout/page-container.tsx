import { forwardRef } from "react";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type PageContainerProps = HTMLAttributes<HTMLDivElement>;

export const PageContainer = forwardRef<HTMLDivElement, PageContainerProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("container mx-auto w-full max-w-[1200px] px-6", className)}
      {...props}
    />
  )
);

PageContainer.displayName = "PageContainer";
