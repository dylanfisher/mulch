/**
 * @role How long one landing stays put: how many times its burst repeats before the next jump, how
 *   that count is redrawn and strayed, and how much each repeat shrinks against the one before it.
 *   Pure numbers — no clock, no PRNG and no analysis.
 * @instead How many jumps keep one count, which is `PLAYER_HOLD_MIN…PLAYER_HOLD_MAX` — a hold is
 *   counted in jumps whatever it is holding, so the two are one range and not two that happen to
 *   agree (principle 1) → src/lib/playerRungs.ts. How long each repeat actually sounds, which is
 *   the burst and this ratchet together → `repeatSpans`, src/lib/player.ts. The draw these shape →
 *   src/lib/playerWalk.ts. The dial each is turned on → src/lib/playerKnobs.ts.
 */

/**
 * How many times a burst repeats before the next jump. Sixty-four, so a step at the burst
 * floor can hold a landing for a third of a second rather than a sixteenth of one: the shorter
 * the grain, the more of them one landing takes to be heard as a landing at all, and the count is
 * the only knob that says how long the pattern stays put.
 */
export const PLAYER_REPEATS_MIN = 1;
export const PLAYER_REPEATS_MAX = 64;

/**
 * The odds a repeat count that is due to be redrawn actually is, 0…1. One redraws on every count
 * the hold is up on; zero keeps the count the dial says forever, whatever the hold says. Rolled
 * on every jump the hold is due on, so a failed roll is the same odds again on the next jump and
 * never a redraw postponed — the rate walk's chance, said for the count instead (0134, 0135).
 */
export const PLAYER_REPEATS_CHANCE_MIN = 0;
export const PLAYER_REPEATS_CHANCE_MAX = 1;

/**
 * How far a redrawn count may stray from the dial, in repeats, either way. Zero is the dial's own
 * number every time, which is what 0134 made the count mean and what it still means until this is
 * turned up. The ceiling is the whole dial: the widest stray that can reach either end of the
 * range from anywhere on it, and no wider, since a window is clipped to `PLAYER_REPEATS_MIN…MAX`
 * rather than wrapped.
 */
export const PLAYER_REPEATS_SPREAD_MIN = 0;
export const PLAYER_REPEATS_SPREAD_MAX = PLAYER_REPEATS_MAX - PLAYER_REPEATS_MIN;

/**
 * How much shorter each repeat of one landing is than the repeat before it, as a fraction of it.
 * Zero stands them all equal, which is what a landing was before it could shrink; anything more
 * makes the count a geometric run, so a hold runs out into the jump after it sooner than the count
 * alone says and its gate cuts faster as it goes.
 *
 * What it moves is the windows a landing is cut and ended on, and not the grain inside them: one
 * looping source has one period, so the burst goes on repeating at its own length under a
 * ratcheted landing (0161, src/audio/player.ts).
 *
 * A half at the ceiling: at a half the fourth repeat is an eighth of the grain and the run has
 * reached the floor below within a handful of them, so a wider ratchet would buy no shape the
 * count could still be heard in. A repeat never shrinks past `PLAYER_MIN_SLOT_SECS` — the same
 * window every burst is floored at, which is what keeps a shrinking repeat able to carry its own
 * seams and keeps `MAX_PLAYER_STEPS` covering the arming cadence (src/audio/player.ts).
 */
export const PLAYER_RATCHET_MIN = 0;
export const PLAYER_RATCHET_MAX = 0.5;

/**
 * The five fields of a `PlayerSpec` one landing's length is counted in, declared here because this
 * is what a count is — the same arrangement `TravelSpec` and `FigureSpec` have, and for the same
 * reason (src/lib/playerTravel.ts).
 */
export type RepeatsSpec = {
  /** How many repeats one step holds, PLAYER_REPEATS_MIN…PLAYER_REPEATS_MAX. Whole. */
  repeats: number;
  /** The odds a count that is due to be redrawn is, 0…1. */
  repeatsChance: number;
  /** How far a redrawn count may stray from that, in repeats, 0…PLAYER_REPEATS_SPREAD_MAX. */
  repeatsSpread: number;
  /** How many jumps keep one count, PLAYER_HOLD_MIN…PLAYER_HOLD_MAX. Whole; zero keeps it. */
  repeatsHold: number;
  /** How much each repeat shrinks against the one before it, 0…PLAYER_RATCHET_MAX. */
  ratchet: number;
};
