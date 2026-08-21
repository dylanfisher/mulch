/**
 * @role The session store — each deck's persistent state, written only by src/app's send().
 * @instead Mutating it from a component or reading it via polling → send a command through
 *          src/app/facade.ts and subscribe.
 */
import {
  DECK_PARAM_DEFAULTS,
  type DeckAutomationParamId,
  type DeckParamId,
  type ParamId,
} from "@/audio/params";
import type { EffectInstanceId } from "@/audio/effects/contract";
import type { BeatAnalysis } from "@/lib/analysis";
import { INITIAL_YARD_EMOJI, INITIAL_YARD_NAME } from "@/lib/copy";
import type { AutomationLane } from "@/lib/automation";
import { assertDurableText } from "@/lib/guards";
import { fromIds } from "@/lib/records";
import type { SourceRef } from "@/lib/source";
import { createStore } from "zustand/vanilla";
import type { Clip, SessionDeck, SessionEffect } from "./session";

/**
 * A deck's identity: an opaque, durable, caller-supplied string, exactly like a clip's (0029).
 * There is no registry of them — the session's own `deckList` is the list, and membership is a
 * question only a session can answer.
 */
export type DeckId = string;

/**
 * One deck's place in the session: its id, and the emoji and name drawn for it when it was added
 * (0057). Both are durable and caller-supplied like the id — a reducer that rolled its own would
 * make replay, restore and the fingerprint non-deterministic — and both are decoration, not
 * identity: two decks may carry the same ones.
 */
export type DeckEntry = { id: DeckId; emoji: string; name: string };

/** The id of the one deck a fresh session boots with. Not a floor, and not a fixture (0029). */
export const INITIAL_DECK_ID: DeckId = "a";

/** The ids a deck list holds, in its own order — for the callers that ask only about membership. */
export const deckIdsOf = (list: readonly DeckEntry[]): DeckId[] => list.map((entry) => entry.id);

/** Whether the session holds this deck. The list is the registry, so this is the whole test. */
export const holdsDeck = (list: readonly DeckEntry[], deck: DeckId): boolean =>
  list.some((entry) => entry.id === deck);

/** The one guard on a deck id, shared by the commands and the stored-shape validator. */
export function assertDeckId(value: unknown, at: string): asserts value is DeckId {
  assertDurableText(value, at);
}

/** Build one value per registered deck without repeating the registry as an object literal. */
export function fromDecks<const Id extends string, T>(
  decks: readonly Id[],
  value: (deck: Id) => T,
): Record<Id, T> {
  return fromIds(decks, value);
}

/**
 * One entry of a deck-keyed map, or a loud throw. A deck id is an opaque string, so nothing in
 * the type system can prove a map holds one — an id nobody added is a mistake, not a default
 * (0029). Serves the live decks, the durable ones and the durations map alike.
 */
export function deckIn<T>(decks: Readonly<Record<DeckId, T>>, deck: DeckId): T {
  const found = decks[deck];
  if (found === undefined) throw new TypeError(`unknown deck: ${deck}`);
  return found;
}

/**
 * The lane a (deck, instance, parameter) is holding, or undefined — the one lane lookup, because
 * a value and its lane belong to the pair rather than to the parameter alone (0030).
 */
export function laneIn(
  deck: DeckState,
  instance: EffectInstanceId | null,
  param: ParamId,
): AutomationLane | undefined {
  if (instance === null) {
    const own: Partial<Record<string, AutomationLane>> = deck.automation;
    return own[param];
  }
  const entry = deck.effects.find((current) => current.id === instance);
  // Loud rather than empty: a lane lookup naming an instance the rack does not hold is a caller
  // asking about something that is not there, not a pair that happens to hold no lane.
  if (entry === undefined) throw new TypeError(`rack holds no instance ${instance}`);
  const held: Partial<Record<string, AutomationLane>> = entry.automation;
  return held[param];
}

export type DeckState = {
  /** The deck's own parameters. An effect's values live on its rack instance (0030). */
  params: Record<DeckParamId, number>;
  automation: Partial<Record<DeckAutomationParamId, AutomationLane>>;
  /**
   * The rack in signal order: any number of instances of any registered effect, each with its
   * own id, values, lanes and bypass flag (0030).
   */
  effects: SessionEffect[];
  /** What was loaded, as the command that loaded it — the session records the same data. */
  source: SourceRef | null;
  /** Seconds of audio loaded; 0 when nothing is. */
  duration: number;
  /**
   * Tempo and onset candidates for what is loaded, or null until the worker has answered for
   * this buffer. Derived from the source and never durable: the loop it helped choose is what
   * the session records, and every load re-derives this (0025).
   */
  analysis: BeatAnalysis | null;
  /** Written only by the graph's own report (src/app/engine.ts) — never on intent. */
  playing: boolean;
  /**
   * Where the playhead is being held, in seconds into the buffer, or null for a deck that is
   * playing or stopped at the top of its loop. A pause puts it here and so does a seek, which is
   * the same fact by a different gesture (0041): the next play resumes here, and it survives
   * nothing else — a stop, a load or a remove forgets it (0038).
   * Live only, like `playing`: a session records what a deck holds, not where it was left.
   */
  paused: number | null;
  loop: { in: number; out: number } | null;
  /** The jump pattern this deck plays under, or null for one that plays its loop straight (0089). */
  player: SessionDeck["player"];
};

export type SessionState = {
  /** Null exactly when the session holds no decks; a floor of one was rejected (0029). */
  activeDeck: DeckId | null;
  /** The decks this session holds, in the order they are shown and addressed. */
  deckList: DeckEntry[];
  /** Keyed by `deckList`, which is the list; these two are validated as one shape (0029). */
  decks: Record<DeckId, DeckState>;
  /**
   * Every deck id this session has ever drawn, in the order it drew them — including the ones it
   * no longer holds. A letter is spent when it is drawn and does not come back, and no list of
   * live decks can say that after a remove, so the session carries it (P55). Superset of
   * `deckList`'s ids by construction: adding a deck spends its id, removing one does not free it.
   */
  spentDeckIds: DeckId[];
  /**
   * The captured deck presets, in capture order. Durable and inert: a clip holds no buffer, no
   * schedule and no nodes, so the live store carries exactly what the session stores (0027).
   */
  clips: Clip[];
  /**
   * The shared jump clock every yard's player begins its next step on, in seconds, or null for a
   * session whose yards each keep their own time. The first durable fact that belongs to more
   * than one deck, which is why it is the session's and not a field on any of them (0097).
   */
  sync: number | null;
};

const defaultDeck = (): DeckState => ({
  // Spread, not shared: each deck owns its values from the moment it exists.
  params: { ...DECK_PARAM_DEFAULTS },
  automation: {},
  effects: [],
  source: null,
  duration: 0,
  analysis: null,
  playing: false,
  paused: null,
  loop: null,
  player: null,
});

export const createSessionStore = () =>
  createStore<SessionState>(() => ({
    activeDeck: INITIAL_DECK_ID,
    deckList: [{ id: INITIAL_DECK_ID, emoji: INITIAL_YARD_EMOJI, name: INITIAL_YARD_NAME }],
    decks: fromDecks([INITIAL_DECK_ID], defaultDeck),
    spentDeckIds: [INITIAL_DECK_ID],
    clips: [],
    sync: null,
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
    // A write to a deck the session does not hold would otherwise invent one, keyed by a name
    // `deckList` never learns. Loud, because it can only be a caller that skipped the guard.
    if (current === undefined) throw new Error(`no deck ${deck}`);
    const next = typeof patch === "function" ? patch(current) : patch;
    return { decks: { ...s.decks, [deck]: { ...current, ...next } } };
  });
}

/** Change which held deck keyboard commands target. `src/app` remains the only caller. */
export function activateDeck(store: SessionStore, deck: DeckId): void {
  store.setState({ activeDeck: deck });
}

/**
 * Append one empty deck. It becomes active when there was no active deck — a session that held
 * none has nothing for the keyboard to target until it does (0029). Its id joins the spent list
 * here, which is the one place a deck enters a session, so nothing can add one without spending
 * its letter (P55).
 */
export function addDeck(store: SessionStore, deck: DeckId, emoji: string, name: string): void {
  store.setState((s) => ({
    activeDeck: s.activeDeck ?? deck,
    deckList: [...s.deckList, { id: deck, emoji, name }],
    decks: { ...s.decks, [deck]: defaultDeck() },
    spentDeckIds: union(s.spentDeckIds, [deck]),
  }));
}

/**
 * The spent list's one rule, in the one place it is written: what is already there, then whatever
 * of `arriving` is not — order kept, no repeats, and never shorter than it was. A letter said out
 * loud is not unsaid, so nothing in this file removes one (0082).
 */
const union = (held: readonly DeckId[], arriving: readonly DeckId[]): DeckId[] => [
  ...held,
  ...arriving.filter((id) => !held.includes(id)),
];

/**
 * Take a stored session's spent ids back, on top of whatever this store has already spent. The
 * boot restore replays the decks a session held as `deck.add`s, which respends exactly those —
 * the letters it drew and then removed are reachable only from the stored field, and would come
 * back round on the next add without this (0082). `src/app` remains the only caller.
 */
export function spendDeckIds(store: SessionStore, ids: readonly DeckId[]): void {
  store.setState((s) => ({ spentDeckIds: union(s.spentDeckIds, ids) }));
}

/**
 * Drop one deck and everything the session held for it. Removing the active one activates its
 * neighbour, or nothing at all when it was the last — a session may hold zero decks (0029).
 */
export function removeDeck(store: SessionStore, deck: DeckId): void {
  store.setState((s) => {
    const at = s.deckList.findIndex((entry) => entry.id === deck);
    const deckList = s.deckList.filter((entry) => entry.id !== deck);
    const decks = { ...s.decks };
    delete decks[deck];
    const neighbour = deckList[Math.min(at, deckList.length - 1)]?.id ?? null;
    return { activeDeck: s.activeDeck === deck ? neighbour : s.activeDeck, deckList, decks };
  });
}

/** Replace the whole clip list. `src/app` remains the only caller, as with every writer here. */
export function setClips(store: SessionStore, clips: Clip[]): void {
  store.setState({ clips });
}

/** Hold the session's shared jump clock, or drop it with null (0097). `src/app` alone calls it. */
export function setSync(store: SessionStore, sync: number | null): void {
  store.setState({ sync });
}

/**
 * Replace one fully prepared durable session in one observable store write. Every field is the
 * incoming session's but one: the spent letters are the union, because this is the write an undo
 * and an import both arrive through, and a letter said out loud is not unsaid by rewinding the
 * session it was said in (0082). The union keeps the incoming order and appends what only the
 * store had, so it stays a superset of `deckList` whichever session wrote it.
 */
export function replaceSession(store: SessionStore, state: SessionState): void {
  store.setState(
    (s) => ({ ...state, spentDeckIds: union(state.spentDeckIds, s.spentDeckIds) }),
    true,
  );
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
