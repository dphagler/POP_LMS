import type { Metadata } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Suspense } from "react";
import type { CSSProperties, ReactNode } from "react";
import { PostHogClient } from "@/analytics/posthog-client";
import { cookies } from "next/headers";
import { createLogger, serializeError } from "@/lib/logger";

const logger = createLogger({ component: "app.layout" });

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
  const rawThemeMode = cookieStore.get("pop-theme-mode")?.value ?? null;
  const initialThemeMode = parseThemeMode(rawThemeMode) ?? "system";
  let initialTheme: Record<string, string> | null = null;

  if (rawTheme) {
    try {
      const parsed = JSON.parse(rawTheme) as Record<string, string>;
      initialTheme = parsed;
    } catch (error) {
      logger.warn({
        event: "app.layout.invalid_theme_cookie",
        error: serializeError(error)
      });
    }
  }

  const themeStyle = initialTheme
    ? (Object.fromEntries(
        Object.entries(initialTheme).map(([token, value]) => [`--${token}`, value])
      ) as CSSProperties)
    : undefined;

  const htmlClassName = initialThemeMode === "dark" ? "dark" : undefined;
  const htmlThemeModeAttr = initialThemeMode === "system" ? undefined : initialThemeMode;
  const htmlThemeResolvedAttr = initialThemeMode === "system" ? undefined : initialThemeMode;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={htmlClassName}
      data-theme-mode={htmlThemeModeAttr}
      data-theme-resolved={htmlThemeResolvedAttr}
    >
      <body
        className={cn(
          "min-h-screen bg-gradient-to-b from-slate-950 via-slate-950/95 to-slate-950 font-sans antialiased",
          "dark:from-slate-950 dark:via-slate-950/90 dark:to-slate-950",
          "[color-scheme:light_dark]"
        )}
        style={themeStyle}
      >
        <ThemeProvider initialTheme={initialTheme} initialMode={initialThemeMode}>
          <Suspense fallback={null}>
            <PostHogClient />
          </Suspense>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

function parseThemeMode(value: string | null) {
  if (!value) return null;
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }
  return null;
}
