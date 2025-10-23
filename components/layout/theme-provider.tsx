"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { captureError } from "@/lib/client-error-reporting";

const ThemeContext = createContext<Record<string, string> | null>(null);
export type ThemeMode = "light" | "dark" | "system";

const MODE_STORAGE_KEY = "pop-theme-mode";
const THEME_STORAGE_KEY = "pop-theme-name";
const MODE_COOKIE = "pop-theme-mode";
const THEME_COOKIE = "pop-theme-name";
const THEME_BY_RESOLVED: Record<"light" | "dark", "pop" | "pop-dark"> = {
  light: "pop",
  dark: "pop-dark"
};

type ThemeModeContextValue = {
  mode: ThemeMode;
  resolvedMode: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
};

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

type ThemeProviderProps = {
  children: React.ReactNode;
  initialTheme?: Record<string, string> | null;
  initialMode?: ThemeMode;
};

export function ThemeProvider({
  children,
  initialTheme = null,
  initialMode = "system"
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Record<string, string> | null>(initialTheme);
  const [mode, setModeState] = useState<ThemeMode>(initialMode);
  const [resolvedMode, setResolvedMode] = useState<"light" | "dark">(() => {
    if (initialMode === "dark") return "dark";
    if (initialMode === "light") return "light";
    return "light";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedMode =
      window.localStorage.getItem(MODE_STORAGE_KEY) ?? getCookie(MODE_COOKIE);
    const parsed = parseThemeMode(storedMode);
    if (parsed) {
      setModeState(parsed);
    }
  }, []);

  useEffect(() => {
    if (theme) return;
    const raw = window.localStorage.getItem("pop-theme") || getCookie("pop-theme");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Record<string, string>;
      setTheme(parsed);
    } catch (error) {
      captureError(error, { event: "theme.parse_failed" });
      window.localStorage.removeItem("pop-theme");
    }
  }, [theme]);

  useEffect(() => {
    if (!theme) return;
    applyThemeTokens(theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (mode === "system") {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const updateResolved = (event: MediaQueryList | MediaQueryListEvent) => {
        setResolvedMode(event.matches ? "dark" : "light");
      };

      updateResolved(media);

      const listener = (event: MediaQueryListEvent) => updateResolved(event);

      if (typeof media.addEventListener === "function") {
        media.addEventListener("change", listener);
        return () => media.removeEventListener("change", listener);
      }

      media.addListener(listener);
      return () => media.removeListener(listener);
    }

    setResolvedMode(mode);
  }, [mode]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    syncDocumentTheme(mode, resolvedMode);
  }, [mode, resolvedMode]);

  const setMode = useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode);
  }, []);

  const themeValue = useMemo(() => theme, [theme]);
  const modeValue = useMemo<ThemeModeContextValue>(
    () => ({ mode, resolvedMode, setMode }),
    [mode, resolvedMode, setMode]
  );

  return (
    <ThemeContext.Provider value={themeValue}>
      <ThemeModeContext.Provider value={modeValue}>{children}</ThemeModeContext.Provider>
    </ThemeContext.Provider>
  );
}

export function useThemeVariables() {
  return useContext(ThemeContext);
}

export function useThemeMode() {
  const context = useContext(ThemeModeContext);
  if (!context) {
    throw new Error("useThemeMode must be used within a ThemeProvider");
  }

  return context;
}

export function setActiveTheme(theme: Record<string, string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("pop-theme", JSON.stringify(theme));
  applyThemeTokens(theme);
}

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() ?? null;
  return null;
}

export function syncDocumentTheme(mode: ThemeMode, resolved: "light" | "dark") {
  const themeName = THEME_BY_RESOLVED[resolved];

  if (typeof document !== "undefined") {
    const root = document.documentElement;
    root.classList.toggle("dark", resolved === "dark");
    root.setAttribute("data-theme", themeName);

    if (mode === "system") {
      root.removeAttribute("data-theme-mode");
    } else {
      root.setAttribute("data-theme-mode", mode);
    }

    root.setAttribute("data-theme-resolved", resolved);
    root.style.colorScheme = resolved;

    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toUTCString();
    document.cookie = `${MODE_COOKIE}=${mode}; path=/; expires=${expires}; SameSite=Lax`;
    document.cookie = `${THEME_COOKIE}=${themeName}; path=/; expires=${expires}; SameSite=Lax`;
  }

  if (typeof window !== "undefined") {
    window.localStorage.setItem(MODE_STORAGE_KEY, mode);
    window.localStorage.setItem(THEME_STORAGE_KEY, themeName);
  }
}

function applyThemeTokens(theme: Record<string, string>) {
  if (typeof document === "undefined") return;
  const rootStyle = document.documentElement.style;

  Object.entries(theme).forEach(([token, value]) => {
    rootStyle.setProperty(`--${token}`, value);
  });

  const primary = theme["color-primary"];
  if (primary) {
    rootStyle.setProperty("--p", primary);
  }

  const primaryContent = theme["color-primary-content"];
  if (primaryContent) {
    rootStyle.setProperty("--pc", primaryContent);
  }
}

function parseThemeMode(value: string | null): ThemeMode | null {
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }
  return null;
}
