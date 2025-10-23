import type { Metadata } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Suspense } from "react";
import type { CSSProperties, ReactNode } from "react";
import { PostHogClient } from "@/analytics/posthog-client";
import { cookies } from "next/headers";
import { createLogger, serializeError } from "@/lib/logger";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";

const logger = createLogger({ component: "app.layout" });

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

const THEME_BOOT_SCRIPT = `
(function() {
  try {
    const root = document.documentElement;
    const getCookie = (name) => {
      const value = "; " + document.cookie;
      const parts = value.split("; " + name + "=");
      if (parts.length === 2) {
        return parts.pop().split(";").shift() || null;
      }
      return null;
    };
    const storedMode = localStorage.getItem('pop-theme-mode') || getCookie('pop-theme-mode');
    const storedTheme = localStorage.getItem('pop-theme-name') || getCookie('pop-theme-name');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const mode = storedMode === 'light' || storedMode === 'dark' || storedMode === 'system' ? storedMode : 'system';
    const fallbackResolved = prefersDark ? 'dark' : 'light';
    const resolved = mode === 'dark' ? 'dark' : mode === 'light' ? 'light' : fallbackResolved;
    let theme = storedTheme === 'pop' || storedTheme === 'pop-dark' ? storedTheme : null;
    if (!theme) {
      theme = resolved === 'dark' ? 'pop-dark' : 'pop';
    }
    if (mode === 'dark') {
      theme = 'pop-dark';
    }
    if (mode === 'light') {
      theme = 'pop';
    }
    const resolvedFromTheme = theme === 'pop-dark' ? 'dark' : 'light';
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-theme-resolved', resolvedFromTheme);
    if (mode === 'system') {
      root.removeAttribute('data-theme-mode');
    } else {
      root.setAttribute('data-theme-mode', mode);
    }
    root.classList.toggle('dark', resolvedFromTheme === 'dark');
    root.style.colorScheme = resolvedFromTheme;
  } catch (error) {
    // Ignore initial theme sync errors.
  }
})();
`;

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
  const rawThemeName = cookieStore.get("pop-theme-name")?.value ?? null;
  const initialThemeMode = parseThemeMode(rawThemeMode) ?? "system";
  const initialThemeName = parseThemeName(rawThemeName);
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

  const htmlThemeAttr =
    initialThemeName ??
    (initialThemeMode === "dark" ? "pop-dark" : initialThemeMode === "light" ? "pop" : undefined);

  const themeResolvedFromName =
    htmlThemeAttr === "pop-dark" ? "dark" : htmlThemeAttr === "pop" ? "light" : null;

  const htmlClassName =
    themeResolvedFromName === "dark" || initialThemeMode === "dark" ? "dark" : undefined;
  const htmlThemeModeAttr = initialThemeMode === "system" ? undefined : initialThemeMode;
  const htmlThemeResolvedAttr =
    themeResolvedFromName ?? (initialThemeMode === "system" ? undefined : initialThemeMode);

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={htmlClassName}
      data-theme-mode={htmlThemeModeAttr}
      data-theme={htmlThemeAttr}
      data-theme-resolved={htmlThemeResolvedAttr}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body
        className={cn(
          sans.variable,
          heading.variable,
          "min-h-screen bg-[color:var(--app-background)] text-[color:var(--text-primary)] font-sans antialiased",
          "transition-colors duration-300",
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

function parseThemeName(value: string | null): "pop" | "pop-dark" | null {
  if (value === "pop" || value === "pop-dark") {
    return value;
  }
  return null;
}
