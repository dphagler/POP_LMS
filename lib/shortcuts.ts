"use client";

import { useEffect } from "react";

export type ShortcutDefinition = {
  id: string;
  label: string;
  keys: string[];
  href: string;
};

export type ShortcutRegistration = {
  id: string;
  keys: string[];
  onMatch: () => void;
};

export type ShortcutOptions = {
  enabled?: boolean;
  timeoutMs?: number;
};

const TEXT_INPUT_TAGS = new Set(["input", "textarea", "select"]);

function shouldIgnoreEvent(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null;
  if (event.metaKey || event.ctrlKey || event.altKey) {
    return true;
  }

  if (!target) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const tagName = target.tagName?.toLowerCase();
  return tagName ? TEXT_INPUT_TAGS.has(tagName) : false;
}

function normalizeKey(key: string): string | null {
  if (!key) {
    return null;
  }

  const value = key.length === 1 ? key.toLowerCase() : key.toLowerCase();
  if (/^[a-z0-9]$/.test(value)) {
    return value;
  }

  return null;
}

export function useShortcutSequences(shortcuts: ShortcutRegistration[], options: ShortcutOptions = {}) {
  const { enabled = true, timeoutMs = 1000 } = options;

  useEffect(() => {
    if (!enabled || shortcuts.length === 0) {
      return;
    }

    let buffer: string[] = [];
    let timer: number | null = null;
    const maxLength = Math.max(...shortcuts.map((shortcut) => shortcut.keys.length));
    const normalizedShortcuts = shortcuts.map((shortcut) => ({
      ...shortcut,
      keys: shortcut.keys.map((key) => key.toLowerCase())
    }));

    const resetBuffer = () => {
      buffer = [];
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
    };

    const scheduleReset = () => {
      if (timer !== null) {
        window.clearTimeout(timer);
      }

      timer = window.setTimeout(() => {
        resetBuffer();
      }, timeoutMs);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || shouldIgnoreEvent(event)) {
        return;
      }

      const normalizedKey = normalizeKey(event.key);
      if (!normalizedKey) {
        resetBuffer();
        return;
      }

      buffer.push(normalizedKey);
      if (buffer.length > maxLength) {
        buffer = buffer.slice(buffer.length - maxLength);
      }

      const matched = normalizedShortcuts.find((shortcut) => {
        if (buffer.length < shortcut.keys.length) {
          return false;
        }

        const start = buffer.length - shortcut.keys.length;
        return shortcut.keys.every((value, index) => buffer[start + index] === value);
      });

      if (matched) {
        event.preventDefault();
        matched.onMatch();
        resetBuffer();
        return;
      }

      scheduleReset();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      if (timer !== null) {
        window.clearTimeout(timer);
      }
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, shortcuts, timeoutMs]);
}
