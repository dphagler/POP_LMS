"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import type { ReactNode } from "react";
import { useColorMode } from "@chakra-ui/react";

export type ThemeMode = "light" | "dark" | "system";

type ThemeModeContextValue = {
  mode: ThemeMode;
  resolvedMode: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
};

const MODE_STORAGE_KEY = "pop-theme-mode";
const MODE_COOKIE = "pop-theme-mode";

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { colorMode, setColorMode } = useColorMode();
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [resolvedMode, setResolvedMode] = useState<"light" | "dark">(
    colorMode === "dark" ? "dark" : "light"
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem(MODE_STORAGE_KEY) ?? getCookie(MODE_COOKIE);
    if (stored === "light" || stored === "dark" || stored === "system") {
      setModeState(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (mode === "system") {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const apply = (matches: boolean) => {
        setColorMode(matches ? "dark" : "light");
      };

      apply(media.matches);
      const handler = (event: MediaQueryListEvent) => apply(event.matches);
      media.addEventListener("change", handler);
      return () => media.removeEventListener("change", handler);
    }

    setColorMode(mode);
  }, [mode, setColorMode]);

  useEffect(() => {
    setResolvedMode(colorMode === "dark" ? "dark" : "light");
  }, [colorMode]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MODE_STORAGE_KEY, mode);
    }
    if (typeof document !== "undefined") {
      const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toUTCString();
      document.cookie = `${MODE_COOKIE}=${mode}; path=/; expires=${expires}; SameSite=Lax`;
    }
  }, [mode]);

  const setMode = useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode);
  }, []);

  const value = useMemo<ThemeModeContextValue>(
    () => ({ mode, resolvedMode, setMode }),
    [mode, resolvedMode, setMode]
  );

  return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>;
}

export function useThemeMode() {
  const context = useContext(ThemeModeContext);
  if (!context) {
    throw new Error("useThemeMode must be used within a ThemeProvider");
  }

  return context;
}

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift() ?? null;
  }
  return null;
}
