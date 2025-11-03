"use client";

import type { ReactNode } from "react";
import { CacheProvider } from "@chakra-ui/next-js";
import { ChakraProvider, ColorModeScript } from "@chakra-ui/react";
import type { OrgTheme } from "@/lib/ui/theme";
import { ThemeProvider } from "./theme-provider";

export type ProvidersProps = {
  children: ReactNode;
  theme: OrgTheme;
};

export function Providers({ children, theme }: ProvidersProps) {
  const initialColorMode = (theme.config?.initialColorMode ?? "system") as
    | "light"
    | "dark"
    | "system";

  return (
    <CacheProvider>
      <ChakraProvider theme={theme}>
        <ColorModeScript initialColorMode={initialColorMode} />
        <ThemeProvider>{children}</ThemeProvider>
      </ChakraProvider>
    </CacheProvider>
  );
}
