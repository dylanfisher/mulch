/**
 * @role The sequencer view — whether every yard is drawn folded with its sequence in the header's
 *   slack — the one place it is read and written. A view preference exactly like the theme's: it
 *   sends nothing, changes no session state and leaves no history entry (plan §2, 0379).
 * @instead Never touch localStorage for it: go through `useSequencerMode`. The theme, whose shape
 *   this copies → src/ui/theme.ts.
 */
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "mulch:sequencer";
/** The one value the key holds while the view is on; absent is off. */
const ON = "on";

const listeners = new Set<() => void>();

/** Read once, then held here: `getSnapshot` runs on every render and must be cheap. */
let current: boolean | undefined;

/**
 * `localStorage` is not always there to be read — blocked cookies, a third-party frame — and this
 * runs during render, so an escaping error would take the whole tree down over a view preference.
 * Loud but proportionate: say so, then draw the yards the ordinary way (src/ui/theme.ts).
 */
function stored(): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === ON;
  } catch (error) {
    console.error("mulch: cannot read the stored sequencer view, drawing the yards whole", error);
    return false;
  }
}

function getSnapshot(): boolean {
  current ??= stored();
  return current;
}

/** No DOM on the server, and no stored preference either — everyone starts on the yards. */
function getServerSnapshot(): boolean {
  return false;
}

/** A choice made in one tab is a choice made in all: drop the cache when another tab writes. */
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

export function setSequencerMode(on: boolean): void {
  current = on;
  // Where reading throws, writing throws too. The choice still applies for this session; it just
  // will not outlive the tab, which is worth a line in the console and nothing more.
  try {
    if (on) localStorage.setItem(STORAGE_KEY, ON);
    else localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("mulch: cannot store the sequencer view, it will not survive a reload", error);
  }
  for (const notify of listeners) notify();
}

/** Whether the sequencer view is on. */
export function useSequencerMode(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
