import type { Metadata } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Suspense } from "react";
import { PostHogClient } from "@/analytics/posthog-client";

export const metadata: Metadata = {
  title: "POP Initiative LMS",
  description: "Production-ready starter for the POP Initiative LMS"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          "[color-scheme:light]"
        )}
      >
        <ThemeProvider>
          <Suspense fallback={null}>
            <PostHogClient />
          </Suspense>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
