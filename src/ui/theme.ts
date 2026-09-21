/**
 * @role The theme preference — the one place it is read, written and applied.
 * @instead Never read the class off `<html>` or touch localStorage: go through `useTheme`.
 */
import { useEffect, useSyncExternalStore } from "react";

import { readStored, writeStored } from "@/ui/preference";

/**
 * "system" is the absence of a choice, and the absence of a class: `src/ui/tokens.css`
 * writes every colour as `light-dark(…)` under `color-scheme: light dark`, so following
 * the OS costs no JavaScript. A choice adds `.light` or `.dark` to `<html>`, which is the
 * only thing that overrides it.
 */
export const THEMES = ["light", "system", "dark"] as const;

export type Theme = (typeof THEMES)[number];

/**
 * The next theme along, in the order the picker lays them out. One gesture that says "toggle the
 * theme" — the palette's entry (P41) — means a step through the same three the toggle group
 * offers, so there is one order and it is declared once, above.
 */
export function nextTheme(theme: Theme): Theme {
  return THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length] ?? "system";
}

const STORAGE_KEY = "mulch:theme";

/** What the console calls this preference when the store under it refuses. */
const SAID = "theme";

const listeners = new Set<() => void>();

/** Read once, then held here: `getSnapshot` runs on every render and must be cheap. */
let current: Theme | undefined;

/** `localStorage` is the user's to edit, so anything unrecognised is simply not a choice. */
export function isTheme(value: string | null | undefined): value is Theme {
  return THEMES.some((theme) => theme === value);
}

/** The stored choice, or the absence of one — which is following the OS (src/ui/preference.ts). */
function stored(): Theme {
  const saved = readStored(STORAGE_KEY, SAID);
  return isTheme(saved) ? saved : "system";
}

function getSnapshot(): Theme {
  current ??= stored();
  return current;
}

/** No DOM on the server, and no stored preference either — everyone starts on system. */
function getServerSnapshot(): Theme {
  return "system";
}

/**
 * `localStorage` is shared between tabs, so a choice made in one is a choice made in all:
 * the cache has to be dropped when another tab writes, or the two diverge until reload.
 */
function onStorage(event: StorageEvent) {
  if (event.key !== null && event.key !== STORAGE_KEY) return;
  current = stored();
  for (const notify of listeners) notify();
}

function subscribe(onChange: () => void) {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

export function setTheme(theme: Theme) {
  current = theme;
  // "system" is the absence of a choice, so it is stored as the absence of one.
  writeStored(STORAGE_KEY, theme === "system" ? null : theme, SAID);
  for (const notify of listeners) notify();
}

/**
 * Subscribe to the preference and keep `<html>` in step with it. Called at the app root so
 * every screen honours a stored choice, and again by the toggle, which needs the value —
 * applying the same two classes twice costs nothing.
 */
export function useTheme(): Theme {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("light", theme === "light");
    root.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return theme;
}
