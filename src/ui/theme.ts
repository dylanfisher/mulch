/**
 * @role The theme preference — the one place it is read, written and applied.
 * @instead Never read the class off `<html>` or touch localStorage: go through `useTheme`.
 */
import { useEffect, useSyncExternalStore } from "react";

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

const listeners = new Set<() => void>();

/** Read once, then held here: `getSnapshot` runs on every render and must be cheap. */
let current: Theme | undefined;

/** `localStorage` is the user's to edit, so anything unrecognised is simply not a choice. */
export function isTheme(value: string | null | undefined): value is Theme {
  return THEMES.some((theme) => theme === value);
}

/**
 * `localStorage` is not always there to be read: blocking all cookies, or embedding the app
 * in a third-party frame, makes access throw rather than return null. This runs inside
 * `getSnapshot`, i.e. during render, so an escaping error takes the whole tree down — a blank
 * instrument over a theme preference. Loud but proportionate: say so, then follow the OS.
 */
function stored(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return isTheme(saved) ? saved : "system";
  } catch (error) {
    console.error("mulch: cannot read the stored theme, following the system instead", error);
    return "system";
  }
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
  // Where reading throws, writing throws too. The choice still applies for this session;
  // it just will not outlive the tab, which is worth a line in the console and nothing more.
  try {
    if (theme === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, theme);
  } catch (error) {
    console.error("mulch: cannot store the theme, it will not survive a reload", error);
  }
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
