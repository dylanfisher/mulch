/** @role Pure tests for keyboard matching and its one-command-per-gesture contract. */
// One case per gesture family, each listing every key it covers — the length tracks how many
// keys the registry declares rather than any branching (0007).
// oxlint-disable max-lines-per-function
import { describe, expect, it, vi } from "vitest";

import { addDeck, createSessionStore } from "@/state/store";

/**
 * The Option reveal is an external store, so the hook is only the thin read over it. Mocking
 * `useSyncExternalStore` down to its two arguments is what lets the subscription itself — the
 * part that adds and removes document listeners — be tested without a renderer or a DOM (0024).
 */
type Store = {
  subscribe: (listener: () => void) => () => void;
  snapshot: () => boolean;
};
const store: { current: Store | null } = { current: null };

vi.mock("react", () => ({
  useEffect: () => {},
  useSyncExternalStore: (subscribe: Store["subscribe"], snapshot: Store["snapshot"]) => {
    store.current = { subscribe, snapshot };
    return snapshot();
  },
}));

import { claimsSpace, commandForShortcut, isDebugConsoleToggle, useAltHeld } from "./shortcuts";

type Listener = (event: { altKey: boolean }) => void;

/** A document and a window that only remember what is listening to them. */
function stubHost() {
  const listeners = new Map<string, Set<Listener>>();
  const host = {
    addEventListener: (type: string, listener: Listener) => {
      (listeners.get(type) ?? listeners.set(type, new Set()).get(type))?.add(listener);
    },
    removeEventListener: (type: string, listener: Listener) => {
      listeners.get(type)?.delete(listener);
    },
  };
  vi.stubGlobal("document", host);
  vi.stubGlobal("addEventListener", host.addEventListener);
  vi.stubGlobal("removeEventListener", host.removeEventListener);
  return {
    listeners,
    count: () => [...listeners.values()].reduce((total, set) => total + set.size, 0),
    fire: (type: string, altKey: boolean) => {
      for (const listener of listeners.get(type) ?? []) listener({ altKey });
    },
  };
}

describe("the Option reveal", () => {
  it("tracks the key, releases on blur, and listens only while someone is subscribed", () => {
    const host = stubHost();
    try {
      useAltHeld();
      const captured = store.current;
      if (captured === null) throw new Error("the reveal registered no external store");
      const { subscribe, snapshot } = captured;
      expect(host.count()).toBe(0);

      let notified = 0;
      const unsubscribe = subscribe(() => {
        notified += 1;
      });
      // One document listener per key phase, one for the press that carries it, plus blur.
      expect(host.count()).toBe(4);
      expect(snapshot()).toBe(false);

      host.fire("keydown", true);
      expect(snapshot()).toBe(true);
      expect(notified).toBe(1);
      // Held is held: a repeat is not a second edge.
      host.fire("keydown", true);
      expect(notified).toBe(1);

      // A window that loses focus never sees the keyup, so blur has to disarm (0024).
      host.fire("blur", false);
      expect(snapshot()).toBe(false);
      expect(notified).toBe(2);

      // The last subscriber leaving takes every listener with it, and leaves nothing held.
      host.fire("keydown", true);
      unsubscribe();
      expect(host.count()).toBe(0);
      expect(snapshot()).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("takes the Option a press carries, for the one the window never saw", () => {
    const host = stubHost();
    try {
      useAltHeld();
      const captured = store.current;
      if (captured === null) throw new Error("the reveal registered no external store");
      const { subscribe, snapshot } = captured;
      const unsubscribe = subscribe(() => {});

      // No keydown ever arrived — an unfocused window, or a press the OS swallowed — so the
      // gesture itself is the only thing that knows Option is down.
      host.fire("pointerdown", true);
      expect(snapshot()).toBe(true);
      // And the next press without it disarms, the way a keyup would have.
      host.fire("pointerdown", false);
      expect(snapshot()).toBe(false);
      unsubscribe();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

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
    const session = createSessionStore();
    addDeck(session, "b", "🌴", "North Willow");
    const state = { ...session.getState(), activeDeck: "b" };
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

  it("walks the session's own deck list, and addresses it by position", () => {
    const session = createSessionStore();
    addDeck(session, "b", "🌴", "North Willow");
    addDeck(session, "c", "🌴", "North Willow");
    const state = session.getState();

    // Next and previous wrap, because a list of decks has no ends worth stopping at (0029).
    expect(commandForShortcut(key("BracketRight"), state)).toEqual({
      t: "deck.activate",
      deck: "b",
    });
    expect(commandForShortcut(key("BracketLeft"), state)).toEqual({
      t: "deck.activate",
      deck: "c",
    });
    expect(commandForShortcut(key("Digit3"), state)).toEqual({ t: "deck.activate", deck: "c" });
    // A position the session does not hold sends nothing at all — no command, no error.
    expect(commandForShortcut(key("Digit4"), state)).toBeNull();
  });

  it("sends nothing at all when the session holds no decks", () => {
    const state = { ...createSessionStore().getState(), activeDeck: null, deckList: [], decks: {} };

    expect(commandForShortcut(key("Space"), state)).toBeNull();
    expect(commandForShortcut(key("KeyL"), state)).toBeNull();
    expect(commandForShortcut(key("BracketRight"), state)).toBeNull();
    expect(commandForShortcut(key("Digit1"), state)).toBeNull();
    // The gestures that never named a deck still work with none held.
    expect(commandForShortcut(key("Space", { shiftKey: true }), state)).toEqual({
      t: "decks.play.toggle",
    });
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

describe("the space bar", () => {
  it("is claimed whatever is focused, and whether or not the session can answer it", () => {
    // The transport key is taken from the focused control every time: a Space that presses a
    // button when no deck can play would be two keys wearing one label.
    expect(claimsSpace(key("Space"))).toBe(true);
    expect(claimsSpace(key("Space", { shiftKey: true }))).toBe(true);
    expect(claimsSpace(key("Space", { repeat: true }))).toBe(true);
    // The window manager's and the browser's own gestures still belong to them.
    expect(claimsSpace(key("Space", { altKey: true }))).toBe(false);
    expect(claimsSpace(key("Space", { metaKey: true }))).toBe(false);
    expect(claimsSpace(key("Space", { ctrlKey: true }))).toBe(false);
    expect(claimsSpace(key("Enter"))).toBe(false);
  });
});

describe("the debug console toggle", () => {
  it("is one unmodified key, and never a command", () => {
    const state = createSessionStore().getState();
    expect(isDebugConsoleToggle(key("Backquote"))).toBe(true);
    expect(commandForShortcut(key("Backquote"), state)).toBeNull();
  });

  it("ignores repeats, handled events, modified presses, and unrelated keys", () => {
    expect(isDebugConsoleToggle(key("Backquote", { repeat: true }))).toBe(false);
    expect(isDebugConsoleToggle(key("Backquote", { defaultPrevented: true }))).toBe(false);
    expect(isDebugConsoleToggle(key("Backquote", { metaKey: true }))).toBe(false);
    expect(isDebugConsoleToggle(key("Backquote", { shiftKey: true }))).toBe(false);
    expect(isDebugConsoleToggle(key("Backquote", { altKey: true }))).toBe(false);
    expect(isDebugConsoleToggle(key("KeyL"))).toBe(false);
  });
});
