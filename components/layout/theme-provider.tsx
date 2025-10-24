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

const defaultPrimaryByTheme: Record<string, string | null> = {};
const defaultPrimaryContentByTheme: Record<string, string | null> = {};

function applyThemeTokens(theme: Record<string, string>) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const rootStyle = root.style;

  Object.entries(theme).forEach(([token, value]) => {
    rootStyle.setProperty(`--${token}`, value);
  });

  if (typeof window === "undefined") return;

  const computedAfter = window.getComputedStyle(root);
  const candidatePrimary = cleanupColor(
    theme["color-primary"] ?? computedAfter.getPropertyValue("--color-primary")
  );
  const candidatePrimaryContent = cleanupColor(
    theme["color-primary-content"] ??
      computedAfter.getPropertyValue("--color-primary-content")
  );
  const themeKey = root.getAttribute("data-theme") ?? "default";

  if (
    candidatePrimary &&
    candidatePrimaryContent &&
    hasSufficientContrast(candidatePrimary, candidatePrimaryContent)
  ) {
    rootStyle.setProperty("--p", candidatePrimary);
    rootStyle.setProperty("--pc", candidatePrimaryContent);
    return;
  }

  const inlinePrimary = rootStyle.getPropertyValue("--color-primary");
  const inlinePrimaryContent = rootStyle.getPropertyValue("--color-primary-content");
  const [fallbackPrimary, fallbackPrimaryContent] = resolveFallbackPrimary(
    themeKey,
    rootStyle,
    inlinePrimary,
    inlinePrimaryContent
  );

  if (fallbackPrimary) {
    rootStyle.setProperty("--p", fallbackPrimary);
  } else {
    rootStyle.removeProperty("--p");
  }

  if (fallbackPrimaryContent) {
    rootStyle.setProperty("--pc", fallbackPrimaryContent);
  } else {
    rootStyle.removeProperty("--pc");
  }
}

function resolveFallbackPrimary(
  themeKey: string,
  rootStyle: CSSStyleDeclaration,
  inlinePrimary: string,
  inlinePrimaryContent: string
): [string | null, string | null] {
  if (typeof window === "undefined") {
    return [cleanupColor(defaultPrimaryByTheme[themeKey] ?? null), cleanupColor(defaultPrimaryContentByTheme[themeKey] ?? null)];
  }

  if (!(themeKey in defaultPrimaryByTheme) || !(themeKey in defaultPrimaryContentByTheme)) {
    rootStyle.removeProperty("--color-primary");
    rootStyle.removeProperty("--color-primary-content");

    const ownerNode = rootStyle.ownerNode as Element | null;
    const fallbackElement = ownerNode ?? document.documentElement;
    const computed = window.getComputedStyle(fallbackElement);
    defaultPrimaryByTheme[themeKey] = cleanupColor(computed.getPropertyValue("--color-primary"));
    defaultPrimaryContentByTheme[themeKey] = cleanupColor(
      computed.getPropertyValue("--color-primary-content")
    );

    const restoredPrimary = cleanupColor(inlinePrimary);
    if (restoredPrimary) {
      rootStyle.setProperty("--color-primary", restoredPrimary);
    } else {
      rootStyle.removeProperty("--color-primary");
    }

    const restoredPrimaryContent = cleanupColor(inlinePrimaryContent);
    if (restoredPrimaryContent) {
      rootStyle.setProperty("--color-primary-content", restoredPrimaryContent);
    } else {
      rootStyle.removeProperty("--color-primary-content");
    }
  }

  return [
    cleanupColor(defaultPrimaryByTheme[themeKey] ?? null),
    cleanupColor(defaultPrimaryContentByTheme[themeKey] ?? null)
  ];
}

function hasSufficientContrast(colorA: string, colorB: string) {
  const ratio = getContrastRatio(colorA, colorB);
  return typeof ratio === "number" && ratio >= 4.5;
}

function getContrastRatio(colorA: string, colorB: string) {
  const rgbA = parseColor(colorA);
  const rgbB = parseColor(colorB);

  if (!rgbA || !rgbB) return null;

  const luminanceA = relativeLuminance(rgbA);
  const luminanceB = relativeLuminance(rgbB);
  const [lighter, darker] = luminanceA > luminanceB
    ? [luminanceA, luminanceB]
    : [luminanceB, luminanceA];

  return (lighter + 0.05) / (darker + 0.05);
}

type RGB = [number, number, number];

function parseColor(input: string): RGB | null {
  const value = cleanupColor(input);
  if (!value) return null;

  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) {
    const hex = value.slice(1);
    const normalized = hex.length === 3
      ? hex
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : hex;
    const int = parseInt(normalized, 16);
    return [
      (int >> 16) & 0xff,
      (int >> 8) & 0xff,
      int & 0xff
    ];
  }

  const rgbMatch = value.match(/^rgba?\(([^)]+)\)$/i);
  if (rgbMatch) {
    const [r, g, b] = rgbMatch[1]
      .split(",")
      .slice(0, 3)
      .map((component) => Number.parseFloat(component.trim()));
    if ([r, g, b].every((channel) => Number.isFinite(channel))) {
      return [r, g, b];
    }
  }

  return null;
}

function relativeLuminance([r, g, b]: RGB) {
  const toLinear = (channel: number) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };

  const [lr, lg, lb] = [toLinear(r), toLinear(g), toLinear(b)];
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function cleanupColor(value?: string | null) {
  return value?.trim() || null;
}

function parseThemeMode(value: string | null): ThemeMode | null {
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }
  return null;
}
