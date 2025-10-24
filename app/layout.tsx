import type { Metadata } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Suspense } from "react";
import type { ReactNode } from "react";
import { PostHogClient } from "@/analytics/posthog-client";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import { CacheProvider } from "@chakra-ui/next-js";
import { ChakraProvider, ColorModeScript } from "@chakra-ui/react";
import { popTheme } from "@/lib/ui/theme";
import { ThemeProvider } from "@/components/layout/theme-provider";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

const heading = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  title: "POP Initiative LMS",
  description: "Production-ready starter for the POP Initiative LMS"
};

export default function RootLayout({
  children
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(sans.variable, heading.variable)}>
        <CacheProvider>
          <ChakraProvider theme={popTheme}>
            <ColorModeScript initialColorMode={popTheme.config.initialColorMode} />
            <ThemeProvider>
              <Suspense fallback={null}>
                <PostHogClient />
              </Suspense>
              {children}
            </ThemeProvider>
          </ChakraProvider>
        </CacheProvider>
      </body>
    </html>
  );
}
