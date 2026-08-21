/** @role Pure tests for keyboard matching and its one-command-per-gesture contract. */
// One case per gesture family, each listing every key it covers — the length tracks how many
// keys the registry declares rather than any branching (0007).
// oxlint-disable max-lines-per-function
import { describe, expect, it, vi } from "vitest";

import { addDeck, createSessionStore, patchDeck } from "@/state/store";

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

import { keyPress as key } from "@/ui/keyPress";
import {
  claimsSpace,
  commandsForShortcut,
  isDebugConsoleToggle,
  isPaletteToggle,
  useAltHeld,
} from "./shortcuts";

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

describe("keyboard shortcuts", () => {
  it("maps every gesture to serialisable commands, and Space to one per yard", () => {
    const session = createSessionStore();
    addDeck(session, "b", "🌴", "North Willow");
    // Space is the whole instrument's, so both yards have to be worth sending to: an unloaded
    // yard has no playhead to move and is skipped (P66).
    for (const deck of ["a", "b"]) patchDeck(session, deck, { duration: 2 });
    const state = { ...session.getState(), activeDeck: "b" };
    const commands = [
      commandsForShortcut(key("Space"), state),
      commandsForShortcut(key("KeyL"), state),
      commandsForShortcut(key("KeyZ", { metaKey: true }), state),
      commandsForShortcut(key("KeyZ", { ctrlKey: true, shiftKey: true }), state),
      commandsForShortcut(key("KeyS", { metaKey: true }), state),
      commandsForShortcut(key("KeyS", { ctrlKey: true }), state),
    ];

    expect(commands).toEqual([
      // One press, one command per yard, in the session's own order — the yard's own play
      // control pressed on every yard, never an all-decks command of its own (P66).
      [
        { t: "deck.play.toggle", deck: "a" },
        { t: "deck.play.toggle", deck: "b" },
      ],
      [{ t: "deck.loop.toggle", deck: "b" }],
      [{ t: "history.undo" }],
      [{ t: "history.redo" }],
      [{ t: "session.save" }],
      [{ t: "session.save" }],
    ]);
    expect(JSON.parse(JSON.stringify(commands))).toEqual(commands);
  });

  it("walks the session's own deck list, and addresses it by position", () => {
    const session = createSessionStore();
    addDeck(session, "b", "🌴", "North Willow");
    addDeck(session, "c", "🌴", "North Willow");
    const state = session.getState();

    // Next and previous wrap, because a list of decks has no ends worth stopping at (0029).
    expect(commandsForShortcut(key("BracketRight"), state)).toEqual([
      { t: "deck.activate", deck: "b" },
    ]);
    expect(commandsForShortcut(key("BracketLeft"), state)).toEqual([
      { t: "deck.activate", deck: "c" },
    ]);
    expect(commandsForShortcut(key("Digit3"), state)).toEqual([{ t: "deck.activate", deck: "c" }]);
    // A position the session does not hold sends nothing at all — no command, no error.
    expect(commandsForShortcut(key("Digit4"), state)).toEqual([]);
  });

  it("sends nothing at all when the session holds no decks", () => {
    const state = { ...createSessionStore().getState(), activeDeck: null, deckList: [], decks: {} };

    // A press with no yards to send to is a press that does nothing, never an error (P66).
    expect(commandsForShortcut(key("Space"), state)).toEqual([]);
    expect(commandsForShortcut(key("KeyL"), state)).toEqual([]);
    expect(commandsForShortcut(key("BracketRight"), state)).toEqual([]);
    expect(commandsForShortcut(key("Digit1"), state)).toEqual([]);
    // The gestures that never named a deck still work with none held.
    expect(commandsForShortcut(key("KeyS", { metaKey: true }), state)).toEqual([
      { t: "session.save" },
    ]);
  });

  it("ignores repeats, handled events, extra modifiers, and unrelated keys", () => {
    const state = createSessionStore().getState();
    expect(commandsForShortcut(key("Space", { repeat: true }), state)).toEqual([]);
    expect(commandsForShortcut(key("Space", { defaultPrevented: true }), state)).toEqual([]);
    // Shift no longer names a second transport key: Space alone is the whole instrument's (P66).
    expect(commandsForShortcut(key("Space", { shiftKey: true }), state)).toEqual([]);
    expect(commandsForShortcut(key("KeyL", { altKey: true }), state)).toEqual([]);
    expect(commandsForShortcut(key("KeyS", { ctrlKey: true, metaKey: true }), state)).toEqual([]);
    expect(commandsForShortcut(key("KeyZ", { ctrlKey: true, metaKey: true }), state)).toEqual([]);
  });
});

describe("the space bar", () => {
  it("is claimed whatever is focused, and whether or not the session can answer it", () => {
    // The transport key is taken from the focused control every time: a Space that presses a
    // button when no deck can play would be two keys wearing one label.
    expect(claimsSpace(key("Space"))).toBe(true);
    expect(claimsSpace(key("Space", { repeat: true }))).toBe(true);
    // Shift names no gesture here any more, so the key is left to whatever holds focus rather
    // than claimed, prevented and answered with nothing (0066, P66).
    expect(claimsSpace(key("Space", { shiftKey: true }))).toBe(false);
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
    expect(commandsForShortcut(key("Backquote"), state)).toEqual([]);
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

describe("the command palette toggle", () => {
  // ⌘/Ctrl+K, and never a command: the palette is a view preference like the console above, and
  // what it then offers is what sends (P41).
  it("is the primary modifier and K, and never a command", () => {
    const state = createSessionStore().getState();
    expect(isPaletteToggle(key("KeyK", { metaKey: true }))).toBe(true);
    expect(isPaletteToggle(key("KeyK", { ctrlKey: true }))).toBe(true);
    expect(commandsForShortcut(key("KeyK", { metaKey: true }), state)).toEqual([]);
  });

  it("ignores repeats, handled events, the bare key, and both modifiers at once", () => {
    expect(isPaletteToggle(key("KeyK"))).toBe(false);
    expect(isPaletteToggle(key("KeyK", { metaKey: true, repeat: true }))).toBe(false);
    expect(isPaletteToggle(key("KeyK", { metaKey: true, defaultPrevented: true }))).toBe(false);
    expect(isPaletteToggle(key("KeyK", { ctrlKey: true, metaKey: true }))).toBe(false);
    expect(isPaletteToggle(key("KeyK", { metaKey: true, shiftKey: true }))).toBe(false);
    expect(isPaletteToggle(key("KeyK", { metaKey: true, altKey: true }))).toBe(false);
    expect(isPaletteToggle(key("KeyJ", { metaKey: true }))).toBe(false);
  });
});
