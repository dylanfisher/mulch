/** @role Pure tests for keyboard matching and its one-command-per-gesture contract. */
import { describe, expect, it } from "vitest";

import { createSessionStore } from "@/state/store";
import { commandForShortcut } from "./shortcuts";

const key = (
  code: string,
  overrides: Partial<Parameters<typeof commandForShortcut>[0]> = {},
): Parameters<typeof commandForShortcut>[0] => ({
  altKey: false,
  code,
  ctrlKey: false,
  defaultPrevented: false,
  metaKey: false,
  repeat: false,
  shiftKey: false,
  ...overrides,
});

describe("keyboard shortcuts", () => {
  it("maps every gesture to one serialisable command targeting the active deck", () => {
    const state = { ...createSessionStore().getState(), activeDeck: "b" as const };
    const commands = [
      commandForShortcut(key("Space"), state),
      commandForShortcut(key("Space", { shiftKey: true }), state),
      commandForShortcut(key("KeyL"), state),
      commandForShortcut(key("KeyZ", { metaKey: true }), state),
      commandForShortcut(key("KeyZ", { ctrlKey: true, shiftKey: true }), state),
      commandForShortcut(key("KeyS", { metaKey: true }), state),
      commandForShortcut(key("KeyS", { ctrlKey: true }), state),
    ];

    expect(commands).toEqual([
      { t: "deck.play.toggle", deck: "b" },
      { t: "decks.play.toggle" },
      { t: "deck.loop.toggle", deck: "b" },
      { t: "history.undo" },
      { t: "history.redo" },
      { t: "session.save" },
      { t: "session.save" },
    ]);
    expect(JSON.parse(JSON.stringify(commands))).toEqual(commands);
  });

  it("ignores repeats, handled events, extra modifiers, and unrelated keys", () => {
    const state = createSessionStore().getState();
    expect(commandForShortcut(key("Space", { repeat: true }), state)).toBeNull();
    expect(commandForShortcut(key("Space", { defaultPrevented: true }), state)).toBeNull();
    expect(commandForShortcut(key("KeyL", { altKey: true }), state)).toBeNull();
    expect(commandForShortcut(key("KeyS", { ctrlKey: true, metaKey: true }), state)).toBeNull();
    expect(commandForShortcut(key("KeyZ", { ctrlKey: true, metaKey: true }), state)).toBeNull();
  });
});
