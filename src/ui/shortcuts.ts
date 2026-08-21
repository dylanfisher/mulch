/**
 * @role The keyboard shortcut registry and dispatcher: displayed keys and serialisable commands
 *   share one declaration, and editable controls keep their native keyboard behavior.
 */
import { useEffect, useSyncExternalStore } from "react";

import { YARD } from "@/lib/copy";
import type { Command } from "@/app/commands";
import type { Instrument } from "@/app/facade";
import type { SessionState } from "@/state/store";
import { activateYardCommand, playToggleAllCommands } from "@/ui/actions";

export type ShortcutInput = Pick<
  KeyboardEvent,
  "altKey" | "code" | "ctrlKey" | "defaultPrevented" | "metaKey" | "repeat" | "shiftKey"
>;

type Shortcut = {
  keys: readonly string[];
  action: string;
  code: string;
  modifiers: "none" | "primary" | "primary-shift";
  /**
   * Every command this one press sends, in order. Empty when the session cannot answer the
   * gesture — no decks, or none at that index — and more than one when the gesture is the whole
   * instrument's rather than one yard's: a global transport press is the per-deck commands a
   * person pressing every yard in turn would have sent, and never a command of its own (P66).
   */
  commands(state: SessionState): readonly Command[];
};

/**
 * How many decks the number row can address. The keyboard's own limit, not the session's: a
 * session may hold more, and they are reached with the next/previous keys (0029).
 */
export const ADDRESSABLE_DECKS = 9;

/** Which deck the active one is next to, in the session's own order — or null with no decks. */
function stepDeck({ activeDeck, deckList }: SessionState, by: 1 | -1): readonly Command[] {
  if (deckList.length === 0 || activeDeck === null) return [];
  const at = deckList.findIndex((entry) => entry.id === activeDeck);
  // Wrapping, because a list of decks has no ends worth stopping at.
  const entry = deckList[(at + by + deckList.length) % deckList.length];
  return entry === undefined ? [] : [activateYardCommand(entry.id)];
}

export const SHORTCUTS: readonly Shortcut[] = [
  // Space is the whole instrument's transport, not the selected yard's: there is one transport
  // over all the yards, and it is reached from the header's three buttons and from this key
  // (P66). The commands come from src/ui/actions.ts, so the two surfaces cannot disagree.
  {
    keys: ["Space"],
    action: `Play / Pause Every ${YARD}`,
    code: "Space",
    modifiers: "none",
    commands: playToggleAllCommands,
  },
  {
    keys: ["L"],
    action: `Toggle Loop on Active ${YARD}`,
    code: "KeyL",
    modifiers: "none",
    commands: ({ activeDeck }) =>
      activeDeck === null ? [] : [{ t: "deck.loop.toggle", deck: activeDeck }],
  },
  {
    keys: ["["],
    action: `Previous ${YARD}`,
    code: "BracketLeft",
    modifiers: "none",
    commands: (state) => stepDeck(state, -1),
  },
  {
    keys: ["]"],
    action: `Next ${YARD}`,
    code: "BracketRight",
    modifiers: "none",
    commands: (state) => stepDeck(state, 1),
  },
  // One entry per addressable position rather than one entry that parses a code: the registry is
  // also what the gallery displays, so a key nobody can see listed is a key nobody knows about.
  ...Array.from({ length: ADDRESSABLE_DECKS }, (_, index): Shortcut => ({
    keys: [String(index + 1)],
    action: `Activate ${YARD} ${index + 1}`,
    code: `Digit${index + 1}`,
    modifiers: "none",
    commands: ({ deckList }) => {
      const entry = deckList[index];
      return entry === undefined ? [] : [activateYardCommand(entry.id)];
    },
  })),
  {
    keys: ["⌘/Ctrl", "Z"],
    action: "Undo",
    code: "KeyZ",
    modifiers: "primary",
    commands: () => [{ t: "history.undo" }],
  },
  {
    keys: ["⌘/Ctrl", "⇧", "Z"],
    action: "Redo",
    code: "KeyZ",
    modifiers: "primary-shift",
    commands: () => [{ t: "history.redo" }],
  },
  {
    keys: ["⌘/Ctrl", "S"],
    action: "Save session",
    code: "KeyS",
    modifiers: "primary",
    commands: () => [{ t: "session.save" }],
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
/**
 * The first gesture arms too. A window with no focus yet, or one whose keydown the OS swallowed,
 * never saw Option go down, and the press itself is then the only thing that knows — so the
 * reveal reads the modifier the pointer carries. In the capture phase, ahead of every React
 * handler, so the control being pressed is already armed by the time the drag moves it.
 */
const onAltPointer = (event: PointerEvent): void => {
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
    document.addEventListener("pointerdown", onAltPointer, true);
    globalThis.addEventListener("blur", onAltBlur);
  }
  return () => {
    altListeners.delete(listener);
    if (altListeners.size > 0) return;
    document.removeEventListener("keydown", onAltKey);
    document.removeEventListener("keyup", onAltKey);
    document.removeEventListener("pointerdown", onAltPointer, true);
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

/** Show or hide the console. Exported so the palette's entry is the same flip, not a second one. */
export function toggleDebugConsole(): void {
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

/**
 * The command palette's open flag — a view preference exactly like the console's above: it sends
 * nothing, changes no session state and leaves no history entry, so it is deliberately not a
 * `SHORTCUTS` entry either. What the palette then offers is `src/ui/CommandPalette.tsx`; all this
 * file owns is the key that reaches it.
 */
const PALETTE_CODE = "KeyK";
let paletteOpen = false;
const paletteListeners = new Set<() => void>();

/** Whether this key press is ⌘/Ctrl+K, the one gesture that opens the palette. */
export function isPaletteToggle(input: ShortcutInput): boolean {
  if (input.defaultPrevented || input.repeat) return false;
  return input.code === PALETTE_CODE && hasModifiers(input, "primary");
}

/** Open or close the palette. The dialog calls this to close itself; the key below toggles it. */
export function setPaletteOpen(open: boolean): void {
  if (open === paletteOpen) return;
  paletteOpen = open;
  for (const listener of paletteListeners) listener();
}

function subscribePalette(listener: () => void): () => void {
  paletteListeners.add(listener);
  return () => {
    paletteListeners.delete(listener);
  };
}

/** Is the palette open? Closed is the answer on a server render and on first paint. */
export function usePaletteOpen(): boolean {
  return useSyncExternalStore(
    subscribePalette,
    () => paletteOpen,
    () => false,
  );
}

function hasModifiers(input: ShortcutInput, wanted: Shortcut["modifiers"]): boolean {
  if (input.altKey) return false;
  if (wanted === "none") return !input.ctrlKey && !input.metaKey && !input.shiftKey;
  if (wanted === "primary") return input.ctrlKey !== input.metaKey && !input.shiftKey;
  return input.ctrlKey !== input.metaKey && input.shiftKey;
}

/** Everything one press sends — empty when no shortcut matches, or when none can be answered. */
export function commandsForShortcut(input: ShortcutInput, state: SessionState): readonly Command[] {
  if (input.defaultPrevented || input.repeat) return [];
  const shortcut = SHORTCUTS.find(
    ({ code, modifiers }) => code === input.code && hasModifiers(input, modifiers),
  );
  return shortcut?.commands(state) ?? [];
}

/**
 * Space belongs to the transport wherever focus happens to be: no focused button, knob or link
 * ever sees it, so the key means one thing on the whole instrument. It is claimed even when the
 * session cannot answer it, because a key that plays a deck sometimes and presses a button the
 * rest of the time is two keys. Only a field you can type into keeps it — see `isEditable`.
 *
 * Held Shift is not that key. Space alone became the whole instrument's transport in P66, and
 * Shift means the loop and nothing else (0066), so a shifted press names no gesture here — and a
 * key this file claimed, prevented and then answered with nothing would be a press that silently
 * does less than the browser's own.
 */
export function claimsSpace(input: ShortcutInput): boolean {
  return (
    input.code === "Space" && !input.altKey && !input.ctrlKey && !input.metaKey && !input.shiftKey
  );
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return (
    target.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])") !==
    null
  );
}

/**
 * Bind the registry only on the instrument route. One key press sends every command that press
 * means, in order — one for most keys, one per yard for the transport (P66).
 */
export function useKeyboardShortcuts(instrument: Instrument, enabled: boolean): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      // The palette is read before the editable guard, and it is the only key that is: it is how
      // someone who does not know where a control is reaches it, so it has to answer from inside
      // the clip rename field and from inside the palette's own filter box (P41). It carries the
      // primary modifier, which no text field claims for itself.
      if (isPaletteToggle(event)) {
        event.preventDefault();
        setPaletteOpen(!paletteOpen);
        return;
      }
      if (isEditable(event.target)) return;
      if (isDebugConsoleToggle(event)) {
        event.preventDefault();
        toggleDebugConsole();
        return;
      }
      const commands = commandsForShortcut(event, instrument.state.getState());
      // Read the registry before preventing anything: a defaultPrevented press is one another
      // handler has answered, and this one would then be refusing its own key.
      if (commands.length === 0 && !claimsSpace(event)) return;
      event.preventDefault();
      // One press, every command it means, in order — a global transport press is as many as
      // the session holds yards (P66).
      for (const command of commands) instrument.send(command);
    };
    if (enabled) document.addEventListener("keydown", onKeyDown);
    return () => {
      if (enabled) document.removeEventListener("keydown", onKeyDown);
    };
  }, [enabled, instrument]);
}
