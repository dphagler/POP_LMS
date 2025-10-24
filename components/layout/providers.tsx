"use client";

import type { ReactNode } from "react";
import { CacheProvider } from "@chakra-ui/next-js";
import { ChakraProvider, ColorModeScript } from "@chakra-ui/react";
import { popTheme } from "@/lib/ui/theme";
import { ThemeProvider } from "./theme-provider";

export type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <CacheProvider>
      <ChakraProvider theme={popTheme}>
        <ColorModeScript initialColorMode={popTheme.config.initialColorMode} />
        <ThemeProvider>{children}</ThemeProvider>
      </ChakraProvider>
    </CacheProvider>
  );
}
