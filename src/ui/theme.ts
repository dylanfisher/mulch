/**
 * @role The theme preference — the one place it is read, written and applied.
 * @instead Never read the class off `<html>` or touch localStorage: go through `useTheme`. The
 *   cache, the tab's listener and the guarded read and write → `storedChoice` in
 *   src/ui/preference.ts.
 */
import { useEffect } from "react";

import { storedChoice } from "@/ui/preference";

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

/** `localStorage` is the user's to edit, so anything unrecognised is simply not a choice. */
export function isTheme(value: string | null | undefined): value is Theme {
  return THEMES.some((theme) => theme === value);
}

const choice = storedChoice<Theme>(
  "mulch:theme",
  // What the console calls this preference when the store under it refuses.
  "theme",
  // The stored choice, or the absence of one — which is following the OS. No DOM on the server,
  // and no stored preference either, so everyone starts on system there too.
  (saved) => (isTheme(saved) ? saved : "system"),
  // "system" is the absence of a choice, so it is stored as the absence of one.
  (theme) => (theme === "system" ? null : theme),
  "system",
);

export const setTheme = choice.set;

/**
 * Subscribe to the preference and keep `<html>` in step with it. Called at the app root so
 * every screen honours a stored choice, and again by the toggle, which needs the value —
 * applying the same two classes twice costs nothing.
 */
export function useTheme(): Theme {
  const theme = choice.use();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("light", theme === "light");
    root.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return theme;
}
