/**
 * @role The keyboard shortcut registry and dispatcher: displayed keys and serialisable commands
 *   share one declaration, and editable controls keep their native keyboard behavior.
 */
import { useEffect, useSyncExternalStore } from "react";

import { YARD } from "@/lib/copy";
import type { Command } from "@/app/commands";
import type { Instrument } from "@/app/facade";
import type { SessionState } from "@/state/store";

type ShortcutInput = Pick<
  KeyboardEvent,
  "altKey" | "code" | "ctrlKey" | "defaultPrevented" | "metaKey" | "repeat" | "shiftKey"
>;

type Shortcut = {
  keys: readonly string[];
  action: string;
  code: string;
  modifiers: "none" | "shift" | "primary" | "primary-shift";
  /** Null when the session cannot answer this gesture — no decks, or none at that index. */
  command(state: SessionState): Command | null;
};

/**
 * How many decks the number row can address. The keyboard's own limit, not the session's: a
 * session may hold more, and they are reached with the next/previous keys (0029).
 */
export const ADDRESSABLE_DECKS = 9;

/** Which deck the active one is next to, in the session's own order — or null with no decks. */
function stepDeck({ activeDeck, deckList }: SessionState, by: 1 | -1): Command | null {
  if (deckList.length === 0 || activeDeck === null) return null;
  const at = deckList.findIndex((entry) => entry.id === activeDeck);
  // Wrapping, because a list of decks has no ends worth stopping at.
  const entry = deckList[(at + by + deckList.length) % deckList.length];
  return entry === undefined ? null : { t: "deck.activate", deck: entry.id };
}

export const SHORTCUTS: readonly Shortcut[] = [
  {
    keys: ["Space"],
    action: `Play / Pause Active ${YARD}`,
    code: "Space",
    modifiers: "none",
    command: ({ activeDeck }) =>
      activeDeck === null ? null : { t: "deck.play.toggle", deck: activeDeck },
  },
  {
    keys: ["⇧", "Space"],
    action: `Play / Pause All ${YARD}s`,
    code: "Space",
    modifiers: "shift",
    command: () => ({ t: "decks.play.toggle" }),
  },
  {
    keys: ["L"],
    action: `Toggle Loop on Active ${YARD}`,
    code: "KeyL",
    modifiers: "none",
    command: ({ activeDeck }) =>
      activeDeck === null ? null : { t: "deck.loop.toggle", deck: activeDeck },
  },
  {
    keys: ["["],
    action: `Previous ${YARD}`,
    code: "BracketLeft",
    modifiers: "none",
    command: (state) => stepDeck(state, -1),
  },
  {
    keys: ["]"],
    action: `Next ${YARD}`,
    code: "BracketRight",
    modifiers: "none",
    command: (state) => stepDeck(state, 1),
  },
  // One entry per addressable position rather than one entry that parses a code: the registry is
  // also what the gallery displays, so a key nobody can see listed is a key nobody knows about.
  ...Array.from({ length: ADDRESSABLE_DECKS }, (_, index): Shortcut => ({
    keys: [String(index + 1)],
    action: `Activate ${YARD} ${index + 1}`,
    code: `Digit${index + 1}`,
    modifiers: "none",
    command: ({ deckList }) => {
      const entry = deckList[index];
      return entry === undefined ? null : { t: "deck.activate", deck: entry.id };
    },
  })),
  {
    keys: ["⌘/Ctrl", "Z"],
    action: "Undo",
    code: "KeyZ",
    modifiers: "primary",
    command: () => ({ t: "history.undo" }),
  },
  {
    keys: ["⌘/Ctrl", "⇧", "Z"],
    action: "Redo",
    code: "KeyZ",
    modifiers: "primary-shift",
    command: () => ({ t: "history.redo" }),
  },
  {
    keys: ["⌘/Ctrl", "S"],
    action: "Save session",
    code: "KeyS",
    modifiers: "primary",
    command: () => ({ t: "session.save" }),
  },
];

/**
 * Option/Alt held — the automation reveal (0024). Deliberately not a `SHORTCUTS` entry: it sends
 * no command and produces no event, it only says which controls are currently armed, and every
 * shortcut above already refuses to fire while it is down. One document listener serves every
 * subscriber, registered with the first and released with the last, the way src/ui/frame.ts does.
 */
let altHeld = false;
const altListeners = new Set<() => void>();

function publishAlt(next: boolean): void {
  if (next === altHeld) return;
  altHeld = next;
  for (const listener of altListeners) listener();
}

const onAltKey = (event: KeyboardEvent): void => {
  publishAlt(event.altKey);
};
const onAltBlur = (): void => {
  // A window that loses focus never sees the keyup, and a knob left armed would record a gesture
  // nobody asked for.
  publishAlt(false);
};

function subscribeAlt(listener: () => void): () => void {
  altListeners.add(listener);
  if (altListeners.size === 1) {
    document.addEventListener("keydown", onAltKey);
    document.addEventListener("keyup", onAltKey);
    globalThis.addEventListener("blur", onAltBlur);
  }
  return () => {
    altListeners.delete(listener);
    if (altListeners.size > 0) return;
    document.removeEventListener("keydown", onAltKey);
    document.removeEventListener("keyup", onAltKey);
    globalThis.removeEventListener("blur", onAltBlur);
    publishAlt(false);
  };
}

export function useAltHeld(): boolean {
  return useSyncExternalStore(
    subscribeAlt,
    () => altHeld,
    () => false,
  );
}

/**
 * The debug console's open flag — a view preference like the theme, not a command: it sends
 * nothing, changes no session state and leaves no history entry, so it is deliberately not a
 * `SHORTCUTS` entry. It still enters through this file, because every key does. One module
 * boolean serves every subscriber, the way the Option reveal above does.
 */
const DEBUG_CONSOLE_CODE = "Backquote";
let debugConsoleOpen = false;
const debugConsoleListeners = new Set<() => void>();

/** Whether this key press is the console toggle — the same guards a command shortcut gets. */
export function isDebugConsoleToggle(input: ShortcutInput): boolean {
  if (input.defaultPrevented || input.repeat) return false;
  return input.code === DEBUG_CONSOLE_CODE && hasModifiers(input, "none");
}

function toggleDebugConsole(): void {
  debugConsoleOpen = !debugConsoleOpen;
  for (const listener of debugConsoleListeners) listener();
}

function subscribeDebugConsole(listener: () => void): () => void {
  debugConsoleListeners.add(listener);
  return () => {
    debugConsoleListeners.delete(listener);
  };
}

/** Is the debug console open? Closed is the answer on a server render and on first paint. */
export function useDebugConsoleOpen(): boolean {
  return useSyncExternalStore(
    subscribeDebugConsole,
    () => debugConsoleOpen,
    () => false,
  );
}

function hasModifiers(input: ShortcutInput, wanted: Shortcut["modifiers"]): boolean {
  if (input.altKey) return false;
  if (wanted === "none") return !input.ctrlKey && !input.metaKey && !input.shiftKey;
  if (wanted === "shift") return input.shiftKey && !input.ctrlKey && !input.metaKey;
  if (wanted === "primary") return input.ctrlKey !== input.metaKey && !input.shiftKey;
  return input.ctrlKey !== input.metaKey && input.shiftKey;
}

export function commandForShortcut(input: ShortcutInput, state: SessionState): Command | null {
  if (input.defaultPrevented || input.repeat) return null;
  const shortcut = SHORTCUTS.find(
    ({ code, modifiers }) => code === input.code && hasModifiers(input, modifiers),
  );
  return shortcut?.command(state) ?? null;
}

/**
 * Space belongs to the transport wherever focus happens to be: no focused button, knob or link
 * ever sees it, so the key means one thing on the whole instrument. It is claimed even when the
 * session cannot answer it, because a key that plays a deck sometimes and presses a button the
 * rest of the time is two keys. Only a field you can type into keeps it — see `isEditable`.
 */
export function claimsSpace(input: ShortcutInput): boolean {
  return input.code === "Space" && !input.altKey && !input.ctrlKey && !input.metaKey;
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return (
    target.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])") !==
    null
  );
}

/** Bind the registry only on the instrument route; one key press sends exactly one command. */
export function useKeyboardShortcuts(instrument: Instrument, enabled: boolean): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (isEditable(event.target)) return;
      if (isDebugConsoleToggle(event)) {
        event.preventDefault();
        toggleDebugConsole();
        return;
      }
      const command = commandForShortcut(event, instrument.state.getState());
      // Read the registry before preventing anything: a defaultPrevented press is one another
      // handler has answered, and this one would then be refusing its own key.
      if (command === null && !claimsSpace(event)) return;
      event.preventDefault();
      if (command !== null) instrument.send(command);
    };
    if (enabled) document.addEventListener("keydown", onKeyDown);
    return () => {
      if (enabled) document.removeEventListener("keydown", onKeyDown);
    };
  }, [enabled, instrument]);
}
