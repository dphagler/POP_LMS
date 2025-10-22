"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { captureError } from "@/lib/client-error-reporting";

const ThemeContext = createContext<Record<string, string> | null>(null);

type ThemeProviderProps = {
  children: React.ReactNode;
  initialTheme?: Record<string, string> | null;
};

export function ThemeProvider({ children, initialTheme = null }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Record<string, string> | null>(initialTheme);

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

  const value = useMemo(() => theme, [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeVariables() {
  return useContext(ThemeContext);
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
