"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = TabsPrimitive.List;

const TabsTrigger = TabsPrimitive.Trigger;

const TabsContent = TabsPrimitive.Content;

const StyledTabsList = ({ className, ...props }: TabsPrimitive.TabsListProps) => (
  <TabsList className={cn("tabs tabs-boxed", className)} {...props} />
);

const StyledTabsTrigger = (
  { className, ...props }: TabsPrimitive.TabsTriggerProps & { asChild?: boolean }
) => (
  <TabsTrigger
    className={cn(
      "tab min-w-[100px] text-sm font-semibold transition-colors",
      "focus-visible:outline-none",
      "data-[state=active]:bg-base-100 data-[state=active]:text-foreground data-[state=active]:shadow-lg",
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
      "mt-4 rounded-2xl border border-base-300 bg-base-100/90 p-6 text-foreground shadow-lg backdrop-blur",
      "focus-visible:outline-none",
      className
    )}
    {...props}
  />
);

export { Tabs, StyledTabsList as TabsList, StyledTabsTrigger as TabsTrigger, StyledTabsContent as TabsContent };
