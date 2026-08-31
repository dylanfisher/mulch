/**
 * @role The mulcher card mounted outside a renderer, and the deck and the spec it is mounted on:
 *   the props that card takes, written once. Shared, because what the card offers and what its
 *   folds put away are two suites over exactly one fixture (src/audio/deckDouble.ts is the same
 *   shape a tier down) — and the card's prop list is the longest in `src/ui`, so two copies of it
 *   would be two cards to keep in step (principle 1).
 *   The walks that read that element are here too, for the same reason the props are: what the
 *   card offers, what its switch does and what its folds put away are three suites over one
 *   element, and three copies of the walk would be three trees to keep in step (principle 1).
 * @instead What each gesture sends → src/ui/PlayerCard.test.tsx. What the switch does →
 *   src/ui/PlayerCardSwitch.test.tsx. Which fold puts what away → src/ui/PlayerCardFolds.test.tsx.
 *   Nothing here is production code; it exists so a suite can call the card as a function and read
 *   the element it returns.
 */
import { isValidElement, type ReactNode } from "react";

import { manualClock } from "@/app/clock";
import { createInstrument, type Instrument } from "@/app/facade";
import { PLAYER_CAST_MAX } from "@/lib/playerCast";
import type { PlayerSpec } from "@/lib/player";
import type { SongPartId } from "@/lib/playerSong";
import type { DeckState } from "@/state/store";
import { PlayerCard } from "@/ui/PlayerCard";
import { PlayerFront } from "@/ui/PlayerFront";

/** One pattern with every field the module declares set, so a suite never reads a default. */
export const PLAYER: PlayerSpec = {
  bypassed: false,
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

/** The press on the one control the card names rather than draws a knob for. */
export const pressLabelled = (element: unknown, label: string): (() => void) => {
  const walk = (node: unknown): (() => void) | null => {
    if (Array.isArray(node)) {
      for (const child of node) {
        const found = walk(child);
        if (found !== null) return found;
      }
      return null;
    }
    if (
      !isValidElement<{ "aria-label"?: string; onClick?: () => void; children?: unknown }>(node)
    ) {
      return null;
    }
    if (node.props["aria-label"] === label && node.props.onClick !== undefined) {
      return node.props.onClick;
    }
    return walk(node.props.children);
  };
  const press = walk(element);
  if (press === null) throw new Error(`no control labelled ${label}`);
  return press;
};

/** Whatever a control's own handler takes — a suite's job is which command it sends. */
export type Press = (...args: unknown[]) => void;

/** The props a control of the card may carry, as the walks below need to read them. */
export type Control = Partial<Record<(typeof HANDLER_KEYS)[number], Press>> & {
  children?: unknown;
  /** What a dial is named by, and how this walk tells one from the frame around it. */
  knob?: unknown;
  /** The two a control of the module carries and nothing else on this card does: the spec it
   *  reads and what it snaps back to (src/ui/PlayerMore.tsx). */
  player?: unknown;
  defaults?: unknown;
};

export const HANDLER_KEYS = [
  "onPressedChange",
  "onCheckedChange",
  "onValueChange",
  "onChange",
  "onClick",
] as const;

/**
 * What the card keyed one component on, or null where it keyed it on nothing. Read rather than
 * inferred, because a key is what decides whether a press throws that component's state away and
 * nothing it renders says so (P164).
 */
export const keyOf = (element: unknown, of: unknown): string | null => {
  const walk = (node: unknown): string | null => {
    if (Array.isArray(node)) {
      for (const child of node) {
        const found = walk(child);
        if (found !== null) return found;
      }
      return null;
    }
    if (!isValidElement<Control>(node)) return null;
    if (node.type === of) return node.key;
    return walk(node.props.children);
  };
  return walk(element);
};

/** Every handler the card put on a control, in render order — one press is one command. */
export const handlers = (element: unknown): Press[] => {
  const found: Press[] = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const child of node) walk(child);
      return;
    }
    if (!isValidElement<Control>(node)) return;
    const { type, props } = node;
    // A dial on this row is a component named by the knob it draws, so its own handler is one
    // layer in. Called rather than descended into — the identity `useCallback` above is what makes
    // that possible — and only for a dial: the runs beside them are components with hooks of
    // their own that no stand-in covers, and their amounts are their own suites' business
    // (src/ui/PlayerDial.tsx, src/ui/PlayerRun.tsx).
    // The card's front, called rather than descended into for the reason a dial is: the reseed it
    // holds is one of this card's own gestures, and the front takes no hooks, so calling it is
    // exactly writing its contents out here. The six names inside it are `PlayerCharacter`'s own
    // suite's business, the way a run's amounts are (src/ui/PlayerFront.tsx).
    if (type === PlayerFront) {
      // oxlint-disable-next-line no-unsafe-type-assertion
      walk((type as (props: Control) => unknown)(props));
      return;
    }
    if (typeof type === "function" && props.knob !== undefined) {
      // A function component and a class one are both functions to `typeof`, and only one is
      // callable; this tree holds no class components.
      // oxlint-disable-next-line no-unsafe-type-assertion
      walk((type as (props: Control) => unknown)(props));
      return;
    }
    for (const key of HANDLER_KEYS) {
      const handler = props[key];
      if (handler !== undefined) found.push(handler);
    }
    walk(props.children);
  };
  walk(element);
  return found;
};

/**
 * Where the switch is among the handlers: the heading folds the card and comes first, because the
 * heading is the fold (0106) — and the switch stands at the other end of that same heading, ahead
 * of the card's own corner, whether or not there is a pattern (0107 amended, 0173).
 */
export const SWITCH = 1;
