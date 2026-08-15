/** @role Pure tests for keyboard matching and its one-command-per-gesture contract. */
import { describe, expect, it, vi } from "vitest";

import { createSessionStore } from "@/state/store";

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

import { commandForShortcut, useAltHeld } from "./shortcuts";

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
      // One document listener per key phase plus the window's blur.
      expect(host.count()).toBe(3);
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
