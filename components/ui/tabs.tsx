"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = TabsPrimitive.List;

const TabsTrigger = TabsPrimitive.Trigger;

const TabsContent = TabsPrimitive.Content;

const StyledTabsList = ({ className, ...props }: TabsPrimitive.TabsListProps) => (
  <TabsList
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
);

const StyledTabsTrigger = (
  { className, ...props }: TabsPrimitive.TabsTriggerProps & { asChild?: boolean }
) => (
  <TabsTrigger
    className={cn(
      "inline-flex min-w-[100px] items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all",
      "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "data-[state=active]:bg-background data-[state=active]:text-foreground",
      "data-[state=active]:shadow",
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
      "mt-2 border border-border bg-card text-card-foreground shadow-sm",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
);

export { Tabs, StyledTabsList as TabsList, StyledTabsTrigger as TabsTrigger, StyledTabsContent as TabsContent };
