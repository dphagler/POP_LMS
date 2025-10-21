import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseTheme(themeJson?: unknown) {
  if (!themeJson || typeof themeJson !== "object") {
    return null;
  }
  try {
    return themeJson as Record<string, string>;
  } catch (error) {
    return null;
  }
}
