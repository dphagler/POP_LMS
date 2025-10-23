import { forwardRef } from "react";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type PageContainerProps = HTMLAttributes<HTMLDivElement>;

export const PageContainer = forwardRef<HTMLDivElement, PageContainerProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "mx-auto w-full max-w-5xl px-6 sm:px-8 lg:px-10 xl:max-w-6xl xl:px-12 2xl:max-w-7xl 2xl:px-16",
        className
      )}
      {...props}
    />
  )
);

PageContainer.displayName = "PageContainer";
