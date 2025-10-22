import type { Metadata } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Suspense } from "react";
import type { CSSProperties, ReactNode } from "react";
import { PostHogClient } from "@/analytics/posthog-client";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: "POP Initiative LMS",
  description: "Production-ready starter for the POP Initiative LMS"
};

export default async function RootLayout({
  children
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();
  const rawTheme = cookieStore.get("pop-theme")?.value ?? null;
  let initialTheme: Record<string, string> | null = null;

  if (rawTheme) {
    try {
      const parsed = JSON.parse(rawTheme) as Record<string, string>;
      initialTheme = parsed;
    } catch (error) {
      console.warn("Failed to parse theme cookie", error);
    }
  }

  const themeStyle = initialTheme
    ? (Object.fromEntries(
        Object.entries(initialTheme).map(([token, value]) => [`--${token}`, value])
      ) as CSSProperties)
    : undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          "[color-scheme:light_dark]"
        )}
        style={themeStyle}
      >
        <ThemeProvider initialTheme={initialTheme}>
          <Suspense fallback={null}>
            <PostHogClient />
          </Suspense>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
