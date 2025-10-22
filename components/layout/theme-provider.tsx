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
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

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
    Object.entries(theme).forEach(([token, value]) => {
      document.documentElement.style.setProperty(`--${token}`, value);
    });
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

    const root = document.documentElement;
    root.classList.toggle("dark", resolvedMode === "dark");

    if (mode === "system") {
      root.removeAttribute("data-theme-mode");
    } else {
      root.setAttribute("data-theme-mode", mode);
    }

    root.setAttribute("data-theme-resolved", resolvedMode);
    root.style.colorScheme = resolvedMode;

    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toUTCString();
    document.cookie = `pop-theme-mode=${mode}; path=/; expires=${expires}; SameSite=Lax`;
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
  Object.entries(theme).forEach(([token, value]) => {
    document.documentElement.style.setProperty(`--${token}`, value);
  });
}

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() ?? null;
  return null;
}
