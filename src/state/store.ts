/**
 * @role The session store — each deck's persistent state, written only by src/app's send().
 * @instead Mutating it from a component or reading it via polling → send a command through
 *          src/app/facade.ts and subscribe.
 */
import { PARAM_DEFAULTS, type AutomationParamId, type ParamId } from "@/audio/params";
import type { EffectId } from "@/audio/effects/registry";
import type { AutomationLane } from "@/lib/automation";
import type { SourceRef } from "@/lib/source";
import { createStore } from "zustand/vanilla";

export const DECK_IDS = ["a", "b"] as const;
export type DeckId = (typeof DECK_IDS)[number];
export const INITIAL_DECK_ID: DeckId = DECK_IDS[0];

export function isDeckId(value: unknown): value is DeckId {
  return typeof value === "string" && DECK_IDS.some((deck) => deck === value);
}

/** Build one value per registered deck without repeating the registry as an object literal. */
export function fromDecks<const Id extends string, T>(
  decks: readonly Id[],
  value: (deck: Id) => T,
): Record<Id, T> {
  // The registry proves that the derived object has every Id exactly once.
  // oxlint-disable-next-line no-unsafe-type-assertion
  return Object.fromEntries(decks.map((deck) => [deck, value(deck)])) as Record<Id, T>;
}

export type DeckState = {
  params: Record<ParamId, number>;
  automation: Partial<Record<AutomationParamId, AutomationLane>>;
  /** Active effects in signal order. Each registered effect may appear at most once. */
  effects: EffectId[];
  /**
   * Which of `effects` are currently out of the signal path, in that same order. A bypassed
   * effect keeps its place in the rack and every one of its parameter values (0023).
   */
  bypassed: EffectId[];
  /** What was loaded, as the command that loaded it — the session records the same data. */
  source: SourceRef | null;
  /** Seconds of audio loaded; 0 when nothing is. */
  duration: number;
  /** Written only by the graph's own report (src/app/engine.ts) — never on intent. */
  playing: boolean;
  loop: { in: number; out: number } | null;
};

export type SessionState = {
  activeDeck: DeckId;
  decks: Record<DeckId, DeckState>;
};

const defaultDeck = (): DeckState => ({
  // Spread, not shared: each deck owns its values from the moment it exists.
  params: { ...PARAM_DEFAULTS },
  automation: {},
  effects: [],
  bypassed: [],
  source: null,
  duration: 0,
  playing: false,
  loop: null,
});

export const createSessionStore = () =>
  createStore<SessionState>(() => ({
    activeDeck: INITIAL_DECK_ID,
    decks: fromDecks(DECK_IDS, defaultDeck),
  }));

export type SessionStore = ReturnType<typeof createSessionStore>;

/**
 * Change one deck, leaving every other deck's identity untouched so a subscriber can compare by
 * reference. The one write helper: `src/app` is the only tier that calls it (docs/map.md).
 */
export function patchDeck(
  store: SessionStore,
  deck: DeckId,
  /** A patch, or one derived from the deck as it is — so a read-and-write stays one read. */
  patch: Partial<DeckState> | ((deck: DeckState) => Partial<DeckState>),
): void {
  store.setState((s) => {
    const current = s.decks[deck];
    const next = typeof patch === "function" ? patch(current) : patch;
    return { decks: { ...s.decks, [deck]: { ...current, ...next } } };
  });
}

/** Change which registered deck keyboard commands target. `src/app` remains the only caller. */
export function activateDeck(store: SessionStore, deck: DeckId): void {
  store.setState({ activeDeck: deck });
}

/** Replace one fully prepared durable session in one observable store write. */
export function replaceSession(store: SessionStore, state: SessionState): void {
  store.setState(state, true);
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
