"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = TabsPrimitive.List;

const TabsTrigger = TabsPrimitive.Trigger;

const TabsContent = TabsPrimitive.Content;

const StyledTabsList = ({ className, ...props }: TabsPrimitive.TabsListProps) => (
  <TabsList className={cn("tabs tabs-lifted w-full", className)} {...props} />
);

const StyledTabsTrigger = (
  { className, ...props }: TabsPrimitive.TabsTriggerProps & { asChild?: boolean }
) => (
  <TabsTrigger
    className={cn(
      "tab min-w-[9rem] whitespace-nowrap text-sm font-semibold transition-colors",
      "focus-visible:outline-none",
      "data-[state=active]:!border-base-300 data-[state=active]:bg-base-100 data-[state=active]:text-base-content",
      "data-[state=inactive]:text-muted-foreground",
      className
    )}
    {...props}
  />
);

const StyledTabsContent = (
  { className, ...props }: TabsPrimitive.TabsContentProps & { asChild?: boolean }
) => (
  <TabsContent
    className={cn(
      "mt-0 rounded-b-box border border-base-300 bg-base-100 p-6 text-base-content shadow-lg",
      "focus-visible:outline-none",
      className
    )}
    {...props}
  />
);

export { Tabs, StyledTabsList as TabsList, StyledTabsTrigger as TabsTrigger, StyledTabsContent as TabsContent };
