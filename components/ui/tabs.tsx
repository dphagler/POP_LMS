"use client";

import { forwardRef } from "react";
import {
  Tab,
  TabList,
  TabPanels,
  Tabs as ChakraTabs,
  type TabListProps as ChakraTabListProps,
  type TabPanelProps as ChakraTabPanelProps,
  TabPanel,
  type TabProps as ChakraTabProps,
  type TabPanelsProps as ChakraTabPanelsProps,
  type TabsProps as ChakraTabsProps
} from "@chakra-ui/react";

export type TabsProps = ChakraTabsProps;

const Tabs = forwardRef<HTMLDivElement, TabsProps>((props, ref) => {
  const { colorScheme = "primary", variant = "enclosed", children, ...rest } = props;
  return (
    <ChakraTabs ref={ref} colorScheme={colorScheme} variant={variant} {...rest}>
      {children}
    </ChakraTabs>
  );
});
Tabs.displayName = "Tabs";

const TabsList = forwardRef<HTMLDivElement, ChakraTabListProps>((props, ref) => {
  const { gap, borderBottom, borderColor, px, py, ...rest } = props;

  return (
    <TabList
      ref={ref}
      gap={gap ?? 2}
      borderBottom={borderBottom ?? "1px solid"}
      borderColor={borderColor ?? "border.subtle"}
      px={px ?? 2}
      py={py ?? 1}
      {...rest}
    />
  );
});
TabsList.displayName = "TabsList";

const TabsTrigger = forwardRef<HTMLButtonElement, ChakraTabProps>((props, ref) => {
  const { fontWeight, fontSize, borderTopRadius, _selected, _focusVisible, ...rest } = props;

  return (
    <Tab
      ref={ref}
      fontWeight={fontWeight ?? "semibold"}
      fontSize={fontSize ?? "sm"}
      borderTopRadius={borderTopRadius ?? "lg"}
      _selected=
        {_selected ?? {
          color: "fg.default",
          bg: "bg.surface",
          borderColor: "border.subtle",
          borderBottomColor: "bg.surface"
        }}
      _focusVisible=
        {_focusVisible ?? {
          boxShadow: "0 0 0 2px var(--chakra-colors-primary-200)",
          _dark: { boxShadow: "0 0 0 2px var(--chakra-colors-primary-400)" }
        }}
      _disabled={{ opacity: 0.5, cursor: "not-allowed" }}
      {...rest}
    />
  );
});
TabsTrigger.displayName = "TabsTrigger";

const TabsPanelsWrapper = forwardRef<HTMLDivElement, ChakraTabPanelsProps>((props, ref) => {
  const { mt, ...rest } = props;
  return <TabPanels ref={ref} mt={mt ?? 4} {...rest} />;
});
TabsPanelsWrapper.displayName = "TabsPanels";

const TabsContent = forwardRef<HTMLDivElement, ChakraTabPanelProps>((props, ref) => {
  const { px, py, borderRadius, borderWidth, borderColor, background, boxShadow, ...rest } = props;

  return (
    <TabPanel
      ref={ref}
      px={px ?? 6}
      py={py ?? 4}
      borderRadius={borderRadius ?? "xl"}
      borderWidth={borderWidth ?? "1px"}
      borderColor={borderColor ?? "border.subtle"}
      background={background ?? "bg.surface"}
      boxShadow={boxShadow ?? "sm"}
      {...rest}
    />
  );
});
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsPanelsWrapper as TabsPanels, TabsContent };
