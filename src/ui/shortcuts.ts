/**
 * @role The keyboard shortcut registry and dispatcher: displayed keys and serialisable commands
 *   share one declaration, and editable controls keep their native keyboard behavior.
 */
import { useEffect } from "react";

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
  command(state: SessionState): Command;
};

export const SHORTCUTS: readonly Shortcut[] = [
  {
    keys: ["Space"],
    action: "Play / stop active deck",
    code: "Space",
    modifiers: "none",
    command: ({ activeDeck }) => ({ t: "deck.play.toggle", deck: activeDeck }),
  },
  {
    keys: ["⇧", "Space"],
    action: "Play / stop all decks",
    code: "Space",
    modifiers: "shift",
    command: () => ({ t: "decks.play.toggle" }),
  },
  {
    keys: ["L"],
    action: "Toggle loop on active deck",
    code: "KeyL",
    modifiers: "none",
    command: ({ activeDeck }) => ({ t: "deck.loop.toggle", deck: activeDeck }),
  },
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

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return (
    target.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])") !==
    null
  );
}

function handlesSpace(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return target.closest("button, a[href], [role], [tabindex]:not([tabindex='-1'])") !== null;
}

/** Bind the registry only on the instrument route; one key press sends exactly one command. */
export function useKeyboardShortcuts(instrument: Instrument, enabled: boolean): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (isEditable(event.target) || (event.code === "Space" && handlesSpace(event.target)))
        return;
      const command = commandForShortcut(event, instrument.state.getState());
      if (command === null) return;
      event.preventDefault();
      instrument.send(command);
    };
    if (enabled) document.addEventListener("keydown", onKeyDown);
    return () => {
      if (enabled) document.removeEventListener("keydown", onKeyDown);
    };
  }, [enabled, instrument]);
}
