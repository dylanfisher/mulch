/**
 * @role The mulcher card mounted outside a renderer, and the deck and the spec it is mounted on:
 *   the props that card takes, written once. Shared, because what the card offers and what its
 *   folds put away are two suites over exactly one fixture (src/audio/deckDouble.ts is the same
 *   shape a tier down) — and the card's prop list is the longest in `src/ui`, so two copies of it
 *   would be two cards to keep in step (principle 1).
 * @instead What each gesture sends → src/ui/PlayerCard.test.tsx. Which fold puts what away →
 *   src/ui/PlayerCardFolds.test.tsx. Nothing here is production code; it exists so a suite can
 *   call the card as a function and read the element it returns.
 */
import type { ReactNode } from "react";

import { manualClock } from "@/app/clock";
import { createInstrument, type Instrument } from "@/app/facade";
import { PLAYER_CAST_MAX } from "@/lib/playerCast";
import type { PlayerSpec } from "@/lib/player";
import type { SongPartId } from "@/lib/playerSong";
import type { DeckState } from "@/state/store";
import { PlayerCard } from "@/ui/PlayerCard";

/** One pattern with every field the module declares set, so a suite never reads a default. */
export const PLAYER: PlayerSpec = {
  bed: 0,
  bedPer: "jump",
  beds: [],
  bedEvery: 0,
  bedDistance: 2,
  bedBias: 0,
  bedHome: 0,
  seed: 9,
  bias: 0,
  stride: 0,
  home: 0,
  phrase: 0,
  phraseKeep: 4,
  phraseChance: 0,
  phraseReturn: 0,
  arrange: 0,
  arrangeKeep: 4,
  arrangeChance: 0,
  arrangeReturn: 0,
  arrangeAmount: 1,
  arrangeGrow: 0,
  arrangeSpan: 0,
  arrangeApart: 0,
  distance: 3,
  repeats: 4,
  repeatsChance: 1,
  repeatsSpread: 0,
  repeatsHold: 0,
  ratchet: 0,
  gate: 0.5,
  drop: 0,
  reverse: 0,
  spark: 0,
  sparkLevel: 0.5,
  sparkDelay: 0,
  burst: 1,
  vary: 0,
  varyChance: 1,
  rest: 0,
  restPulses: 0,
  restSpan: 8,
  restChance: 1,
  restSpread: 0,
  hold: 0,
  chance: 1,
  spread: 2,
  drift: 4,
  climb: 0,
  albums: [],
  cast: PLAYER_CAST_MAX,
};

/** A looped, loaded deck — the only state the card reads beyond the player itself. */
export const deckState = (over: Partial<DeckState>): DeckState => {
  const state = createInstrument(manualClock()).state.getState().decks.a!;
  return { ...state, duration: 2, loop: { in: 0, out: 1 }, ...over };
};

/**
 * Every view preference the yard holds for this card, in one bag: the card holds none of them
 * itself, because each is drawn under a fold that would throw it away (0157, 0198, 0200, 0217).
 * All of them default open here — the yard opens three of them shut and that is the yard's own
 * claim, made where the state lives (src/ui/Deck.tsx) — because what nearly every case reads is a
 * control under one of them.
 */
export type CardView = {
  /** Whether the card itself is folded shut, and the call a press on its heading makes. */
  folded?: boolean;
  setFolded?: (folded: boolean) => void;
  /** Which part of the song the dials are pointed at, and which fold each register is behind. */
  selected?: SongPartId | null;
  fine?: boolean;
  ground?: boolean;
  arrange?: boolean;
  /** Whether a burst written on the card is held to the beat, and the call the toggle makes: the
   *  one of these that is not a fold, and the one case that reads it is the one that presses it
   *  (plan §2, P152). */
  burstHeld?: boolean;
  setBurstHeld?: (held: boolean) => void;
  /** Which song of the first album the section is showing, since a selection reaches that run and
   *  no other (P147). Null is the first, which is what a view preference nobody has set reads as. */
  song?: string | null;
};

/**
 * The card as a call rather than a mount: every fold and selection is the yard's state handed in,
 * so a suite says which one it is asking about and nothing else moves. The setters are inert
 * except the one a caller hands in — a fold says nothing to the instrument, so what a press on one
 * does is the caller's own claim to make (plan §2).
 */
export const playerCard = (
  instrument: Instrument,
  over: Partial<DeckState>,
  view: CardView = {},
): ReactNode =>
  PlayerCard({
    instrument,
    deck: "a",
    state: deckState(over),
    fold: [view.folded ?? false, view.setFolded ?? ((): void => {})],
    fineFold: [view.fine ?? false, (): void => {}],
    groundFold: [view.ground ?? false, (): void => {}],
    arrangeFold: [view.arrange ?? false, (): void => {}],
    songFold: [false, (): void => {}],
    songSelect: [view.selected ?? null, (): void => {}],
    songOpen: [null, (): void => {}],
    songSolo: [null, (): void => {}],
    albumOpen: [null, (): void => {}],
    songViewOpen: [view.song ?? null, (): void => {}],
    burstHeld: [view.burstHeld ?? false, view.setBurstHeld ?? ((): void => {})],
  });
