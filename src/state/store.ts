/**
 * @role The session store — each deck's persistent state, written only by src/app's send().
 * @instead Mutating it from a component or reading it via polling → send a command through
 *          src/app/facade.ts and subscribe.
 */
import { PARAMS, type ParamId } from "@/audio/params";
import type { SourceRef } from "@/lib/source";
import { createStore } from "zustand/vanilla";

export const DECK_IDS = ["a", "b"] as const;
export type DeckId = (typeof DECK_IDS)[number];

export type DeckState = {
  params: Record<ParamId, number>;
  /** What was loaded, as the command that loaded it — the session records the same data. */
  source: SourceRef | null;
  /** Seconds of audio loaded; 0 when nothing is. */
  duration: number;
  /** Written only by the graph's own report (src/app/engine.ts) — never on intent. */
  playing: boolean;
  loop: { in: number; out: number } | null;
};

export type SessionState = {
  decks: Record<DeckId, DeckState>;
};

const defaultDeck = (): DeckState => ({
  // The keys come straight from PARAMS, so the narrowing is total — the registry is the proof.
  // oxlint-disable-next-line no-unsafe-type-assertion
  params: Object.fromEntries(
    Object.entries(PARAMS).map(([id, p]) => [id, p.default]),
  ) as DeckState["params"],
  source: null,
  duration: 0,
  playing: false,
  loop: null,
});

export const createSessionStore = () =>
  createStore<SessionState>(() => ({
    decks: { a: defaultDeck(), b: defaultDeck() },
  }));

export type SessionStore = ReturnType<typeof createSessionStore>;

/**
 * Change one deck, leaving every other deck's identity untouched so a subscriber can compare by
 * reference. The one write helper: `src/app` is the only tier that calls it (docs/map.md).
 */
export function patchDeck(store: SessionStore, deck: DeckId, patch: Partial<DeckState>): void {
  store.setState((s) => ({ decks: { ...s.decks, [deck]: { ...s.decks[deck], ...patch } } }));
}

/**
 * The read-only half of the store, which is all `src/ui` is ever handed — the review rule in
 * docs/plan.md §5 made a type. Declared as properties rather than methods so a subscriber can
 * pass them straight to `useSyncExternalStore` without unbinding anything.
 */
export type SessionReader = {
  getState: () => SessionState;
  subscribe: (listener: () => void) => () => void;
};
