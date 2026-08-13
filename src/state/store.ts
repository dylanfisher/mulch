/**
 * @role The session store — each deck's persistent state, written only by src/app's send().
 * @instead Mutating it from a component or reading it via polling → send a command through
 *          src/app/facade.ts and subscribe.
 */
import { PARAMS, type ParamId } from "@/audio/params";
import { createStore } from "zustand/vanilla";

export const DECK_IDS = ["a", "b"] as const;
export type DeckId = (typeof DECK_IDS)[number];

export type DeckState = {
  params: Record<ParamId, number>;
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
});

export const createSessionStore = () =>
  createStore<SessionState>(() => ({
    decks: { a: defaultDeck(), b: defaultDeck() },
  }));

export type SessionStore = ReturnType<typeof createSessionStore>;
