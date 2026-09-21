/**
 * @role The sequencer view — whether every yard is drawn folded with its sequence in the header's
 *   slack — the one place it is read and written. A view preference exactly like the theme's: it
 *   sends nothing, changes no session state and leaves no history entry (plan §2, 0379).
 * @instead Never touch localStorage for it: go through `useSequencerMode`. The guarded read and
 *   write themselves → src/ui/preference.ts. The theme, whose shape this copies → src/ui/theme.ts.
 */
import { useSyncExternalStore } from "react";

import { readStored, writeStored } from "@/ui/preference";

const STORAGE_KEY = "mulch:sequencer";

/** What the console calls this preference when the store under it refuses. */
const SAID = "sequencer view";
/** The one value the key holds while the view is on; absent is off. */
const ON = "on";

const listeners = new Set<() => void>();

/** Read once, then held here: `getSnapshot` runs on every render and must be cheap. */
let current: boolean | undefined;

/** On only where the key says so; anything else, including no store at all, draws the yards the
 *  ordinary way (src/ui/preference.ts). */
function stored(): boolean {
  return readStored(STORAGE_KEY, SAID) === ON;
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
  // Off is the absence of a choice, so it is stored as the absence of one.
  writeStored(STORAGE_KEY, on ? ON : null, SAID);
  for (const notify of listeners) notify();
}

/** Whether the sequencer view is on. */
export function useSequencerMode(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
