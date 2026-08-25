/**
 * @role What a jumping pattern sounds like, as something a hand can ask for by name: the values a
 *   switch press leaves, the characters a pattern may be drawn as — each a *region* of the spec
 *   rather than one point in it — and the amount saying how far from plain a draw is taken (0152).
 *   Pure maths: no clock, no React, and no PRNG of its own, because the draw is a gesture's and
 *   the caller is the one holding it.
 * @instead What any one of these numbers means, and the range each is declared inside →
 *   src/lib/player.ts, which is the module a character is a setting of. The menu that presses one
 *   → src/ui/PlayerCharacter.tsx. Nothing here knows what a step is: a character is a spec and
 *   never a sound.
 */
import {
  PLAYER_KNOBS,
  PLAYER_RATE_RUNGS,
  type PlayerDefaults,
  type PlayerKnob,
  type PlayerVariation,
} from "./player.ts";
import { fromIds } from "./records.ts";

/**
 * What pressing the switch holds: the middle of every range, walking both ways, with nothing
 * cutting a repeat. A performer turns the module on to hear jumps; a stutter is the next gesture.
 *
 * The player's own clock starts switched off in the same sense — a burst about as long as a slot
 * of the loop these defaults were written against, nothing varying it, no rest between jumps and
 * one held rate — so the module still sounds like plain jumps until a knob asks for something
 * else (P67).
 *
 * Here rather than on the card that presses it, because it is no longer only what a switch leaves:
 * it is the point every character below is a distance from, and the spec an amount of zero blends
 * back to. Two gestures now set a whole spec at once and they read one declaration (principle 1).
 */
export const PLAYER_DEFAULTS = {
  variation: "wander",
  distance: 4,
  // No figure, which is the memoryless walk the module was before it could keep one — so a switch
  // pressed today sounds like a switch pressed before 0151, and the Phrase dial is a thing a hand
  // reaches for. Its keep is four because that is the number of times a run has to come round to
  // be heard as a run at all; its chance and its return are amounts and start at their own zero,
  // so the first figure a person hears is one that repeats exactly and then moves on.
  phrase: 0,
  phraseKeep: 4,
  phraseChance: 0,
  phraseReturn: 0,
  repeats: 4,
  // The count exactly as the dial says it, which is what 0134 made it: nothing keeps a drawn
  // count, so nothing is drawn, and the three amounts behind the marker are things a hand reaches
  // for rather than things it has to undo before the Repeats dial means what it says (0135).
  repeatsChance: 1,
  repeatsSpread: 0,
  repeatsHold: 0,
  gate: 0,
  // A quarter of a second: the old default of one slot, on the four-second loop that default was
  // written against. A duration now, so it is that length on every loop (0119).
  burst: 0.25,
  vary: 0,
  // Every landing varied, once anything is varying at all: the chance is a maybe a hand reaches
  // for rather than something it has to undo before the Vary dial does anything (P87).
  varyChance: 1,
  rest: 0,
  restChance: 1,
  restSpread: 0,
  hold: 0,
  // The rate walk, set to what the module did before it had one: every due change fires, over the
  // five rates the ladder used to be, leaping anywhere among them. So a switch pressed today
  // sounds like a switch pressed before 0118, and the three amounts behind the Hold dial are
  // things a hand reaches for rather than things it has to undo first.
  chance: 1,
  spread: 2,
  drift: PLAYER_RATE_RUNGS,
} as const satisfies PlayerDefaults;

/**
 * The characters, as a declared list rather than an open pool — the same kind of thing
 * `PLAYER_VARIATIONS` and `PLAYER_RATES` are, and closed for the same reason: what a pattern may
 * be asked to sound like is the module's decision, and how far into it to go is the performer's.
 *
 * `plain` is first and is the identity: its region names no knob, so drawing it is
 * `PLAYER_DEFAULTS` exactly and pressing it puts the card back where the switch left it. Every
 * other one is a direction away from that.
 */
export const PLAYER_CHARACTERS = [
  "plain",
  "stutter",
  "riff",
  "scatter",
  "breathe",
  "slide",
] as const;
export type PlayerCharacter = (typeof PLAYER_CHARACTERS)[number];

/**
 * How much of the character a press takes, 0…1. Zero is plain — the draw is made and then blended
 * all the way back, so the amount is a dial over one drawn character rather than a second draw —
 * and one is the character as its region drew it.
 */
export const PLAYER_AMOUNT_MIN = 0;
export const PLAYER_AMOUNT_MAX = 1;

/**
 * The finest a hand may set that. A hundredth, which is finer than any single knob's move across
 * its own range at this width and coarse enough that an arrow key is heard.
 */
export const PLAYER_AMOUNT_STEP = 0.01;

/**
 * Which knobs count rather than measure, so a drawn or blended value is rounded onto a whole
 * number before anything durable holds it.
 *
 * `assertPlayer` in src/lib/player.ts is the judge of this and not this list: it is the one
 * validator, it already refuses a fractional count, and src/lib/playerCharacter.test.ts puts every
 * character's draw at every amount through it. So a knob missing here fails the gate rather than
 * quietly reaching the session as 3.7 repeats.
 */
const PLAYER_WHOLE_KNOBS: ReadonlySet<PlayerKnob> = new Set<PlayerKnob>([
  "distance",
  "phrase",
  "phraseKeep",
  "repeats",
  "repeatsSpread",
  "repeatsHold",
  "hold",
  "spread",
  "drift",
]);

/**
 * Where a knob sits a fraction of the way from one of its values to another — the one rule both
 * halves of this file move by, so drawing inside a region and blending back toward plain cannot
 * disagree about what "half way" means.
 *
 * Geometric for the burst, arithmetic for everything else. The burst is the one dial the card
 * draws on a log curve, because its range spans three orders of magnitude: half way from 250ms to
 * 10ms is 50ms by the ear and by the dial, where the arithmetic middle is 130ms — a knob that has
 * barely moved. Neither end can be zero, since the burst's own floor is `PLAYER_BURST_MIN`.
 */
const at = (knob: PlayerKnob, from: number, to: number, fraction: number): number => {
  // Both ends by name rather than by arithmetic. `from + (to - from) * 1` is not `to` in binary
  // floating point — 0.2 + (0.5 − 0.2) × 1 is 0.5000000000000001 — and the ends are the two values
  // this file promises exactly: all of a character is the character as it was drawn, and none of
  // it is `PLAYER_DEFAULTS`.
  if (fraction === PLAYER_AMOUNT_MIN) return from;
  if (fraction === PLAYER_AMOUNT_MAX) return to;
  const value = knob === "burst" ? from * (to / from) ** fraction : from + (to - from) * fraction;
  return PLAYER_WHOLE_KNOBS.has(knob) ? Math.round(value) : value;
};

/** One character: the walk it is, and the span of every knob it has an opinion about. */
type Region = {
  /** A choice between two named walks rather than an amount, which is why it is not a span. */
  variation: PlayerVariation;
  /**
   * What the character is about, and nothing else: every knob it does not name is left at
   * `PLAYER_DEFAULTS`, so what moves on the card when a name is pressed is what the name means.
   * That is the whole of how this teaches — a person reads the character off the dials that
   * jumped, rather than off twenty tooltips.
   *
   * Each span is drawn inside rather than landed on, so pressing one name twice is two patterns
   * of one kind. A character is a region, which is what 0152 decided.
   */
  knobs: Partial<Record<PlayerKnob, readonly [low: number, high: number]>>;
};

/**
 * The regions themselves. Every bound is inside its knob's own declared range — the arithmetic
 * never clamps, because a character that had to be clipped to be legal would be a character whose
 * author was guessing.
 */
export const PLAYER_CHARACTER_REGIONS: Record<PlayerCharacter, Region> = {
  // Names no knob: the identity, and the way back.
  plain: { variation: PLAYER_DEFAULTS.variation, knobs: {} },
  // Stays where it is and hammers: the shortest bursts the ear still hears as timbre, held for
  // long counts, with the gate cutting most of each one.
  stutter: {
    variation: "forward",
    knobs: {
      distance: [1, 3],
      repeats: [8, 24],
      gate: [0.4, 0.9],
      burst: [0.01, 0.04],
    },
  },
  // The figure, doing what a figure is for: a short run kept for several passes, barely evolving,
  // and coming home more often than it branches (0151).
  riff: {
    variation: "wander",
    knobs: {
      distance: [2, 6],
      phrase: [3, 6],
      phraseKeep: [3, 8],
      phraseChance: [0, 0.2],
      phraseReturn: [0.5, 1],
      repeats: [2, 6],
      burst: [0.1, 0.3],
    },
  },
  // Nowhere twice: the whole grid within reach, the rate let go of every few jumps, and a wait
  // that may or may not be taken so the rhythm never settles.
  scatter: {
    variation: "wander",
    knobs: {
      distance: [12, 16],
      repeats: [1, 4],
      burst: [0.05, 0.25],
      vary: [0.05, 0.3],
      rest: [0, 2],
      restChance: [0.2, 0.5],
      hold: [1, 3],
      spread: [3, 4],
    },
  },
  // Long grains and the silence between them: few repeats, a wait most jumps take, and enough
  // stray in both that no two breaths are the same length.
  breathe: {
    variation: "forward",
    knobs: {
      distance: [2, 6],
      repeats: [1, 3],
      burst: [0.4, 1.2],
      vary: [0.1, 0.4],
      rest: [2, 4],
      restChance: [0.5, 1],
      restSpread: [0.2, 0.6],
    },
  },
  // The rate walk doing the work: a drift of one rung is the one setting that makes a pattern
  // slide between speeds rather than leap among them, held over several jumps at a time (0118).
  slide: {
    variation: "forward",
    knobs: {
      phrase: [0, 4],
      repeats: [4, 8],
      burst: [0.15, 0.4],
      hold: [2, 6],
      chance: [0.5, 1],
      spread: [3, 4],
      drift: [1, 1],
    },
  },
};

/**
 * One draw from a character's region, at full strength — every knob it names taken from inside its
 * span, and every knob it does not left where the switch leaves it.
 *
 * `random` is the caller's for the reason `createFigure`'s is: this runs on a click and its result
 * travels in the command, so the session recorded is the session replayed (0089). Nothing on a
 * play-time or render path may call it.
 */
export function drawCharacter(character: PlayerCharacter, random: () => number): PlayerDefaults {
  const region = PLAYER_CHARACTER_REGIONS[character];
  const knobs = fromIds(PLAYER_KNOBS, (knob) => {
    const span = region.knobs[knob];
    return span === undefined ? PLAYER_DEFAULTS[knob] : at(knob, span[0], span[1], random());
  });
  return { ...knobs, variation: region.variation };
}

/**
 * The same draw, taken part of the way: every knob a fraction of the distance from plain to what
 * was drawn. The amount is applied to a drawn character rather than to a region, so dragging it
 * moves *this* pattern toward and away from plain instead of drawing a new one on every frame —
 * which is what makes it a control and not a die (0152).
 */
export function blendCharacter(target: PlayerDefaults, amount: number): PlayerDefaults {
  const knobs = fromIds(PLAYER_KNOBS, (knob) =>
    at(knob, PLAYER_DEFAULTS[knob], target[knob], amount),
  );
  return {
    ...knobs,
    // A walk is one of two named things and cannot be half taken, so it changes at the middle of
    // the sweep — the one field of a character the amount steps over rather than travels.
    variation: amount >= PLAYER_AMOUNT_MAX / 2 ? target.variation : PLAYER_DEFAULTS.variation,
  };
}
