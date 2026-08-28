/**
 * @role The ground a loop is read on: the source cut into loop-length **beds**, which bed the song
 *   opens on, how often the loop moves to another and how it travels when it does. The song's, not
 *   a part's (0184). Pure maths — no
 *   clock, no PRNG and no buffer: an index here is unbounded, and what it finally lands on is
 *   resolved where the buffer is (0183, the way a travel is clamped where it is applied).
 * @instead The grid *inside* one bed — the sixteen slots a landing lands on → src/lib/playerSlots.ts.
 *   The lean these share with a jump, spent once for both → `leanStep`, src/lib/playerWalk.ts,
 *   which is where the draw is because the draw needs the walk's own generator. Turning a bed into
 *   buffer seconds → `gridOf` and `slotStart`, src/audio/player.ts. The dial each is turned on →
 *   src/lib/playerKnobs.ts.
 */

/**
 * How far from the loop's own bed a song may open, in beds either way. Zero is the loop itself,
 * which is where every pattern that has never been told otherwise opens and is the module as it
 * was before it could move at all.
 *
 * Sixty-four, which is not a fact about any buffer and cannot be: how many beds a source actually
 * holds depends on its length and on the loop the hand set, and neither is durable *here* — a spec
 * is checked identically whatever deck it lands on (0089). So the range is the widest reach a dial
 * can usefully offer and the buffer is what decides which of them exist, at the one place that
 * knows: `bedWrap` below, called from the transport with bounds the buffer answered for.
 */
export const PLAYER_BED_MIN = -64;
export const PLAYER_BED_MAX = 64;

/**
 * How many jumps pass between one bed move and the next. **Zero never moves**, and is the whole of
 * "the loop stays where the hand put it" — the module exactly as it was before this field existed,
 * with no second flag that could disagree with it (principle 1, the shape `phrase: 0` and
 * `arrange: 0` already have).
 *
 * Counted in jumps because every counter in this module is: a part's length, a count's hold, a
 * figure's keep. The module has no tempo and never needs one — the loop is the bar, and a jump is
 * the unit the module is counted in (0173, src/lib/playerSlots.ts). The ceiling is a part's own,
 * so a period no part could outlast is a period the arrangement below could never come round on.
 */
export const PLAYER_BED_EVERY_MIN = 0;
export const PLAYER_BED_EVERY_MAX = 64;

/** How many beds one move may travel. One is the next bed along; the ceiling is a long walk. */
export const PLAYER_BED_DISTANCE_MIN = 1;
export const PLAYER_BED_DISTANCE_MAX = 16;

/**
 * Which way that walk leans, −1…1. Zero is as likely to go back as on, which is wandering; one
 * only ever moves on through the source and minus one only ever moves back.
 *
 * An amount and not a choice between two named walks, for the reason 0162 gave when it took the
 * named walks off the jump: a bias of +1 *is* "forward", so a spec holding both would be one
 * instruction arriving from two fields. It is the same field the jump has, one grid up, and it is
 * drawn by the same arithmetic (`leanStep`, src/lib/playerWalk.ts).
 */
export const PLAYER_BED_BIAS_MIN = -1;
export const PLAYER_BED_BIAS_MAX = 1;

/**
 * The odds one move comes home to the song's own bed instead of travelling, 0…1. One never leaves
 * it, which is a performance that always plays on the same ground however long it runs; zero never
 * returns, which is a loop that walks away and keeps walking.
 *
 * Home is `bed` above — the song's, not a part's (0184). The ground is one walk over the source
 * that the whole arrangement is read on, so there is one place for it to come home to; a part
 * carrying a home of its own would be the parts disagreeing about where the loop is.
 *
 * Read before the distance is drawn and short-circuiting it, exactly as a jump's home is (P87).
 */
export const PLAYER_BED_HOME_MIN = 0;
export const PLAYER_BED_HOME_MAX = 1;

/**
 * The five fields of a `PlayerSpec` the ground under a pattern is shaped by, declared here for the
 * reason `TravelSpec`'s four and `FigureSpec`'s three are declared beside what they are: the spec
 * in src/lib/player.ts is this and the rest of the pattern's amounts, each said once (principle 1).
 *
 * All five are the *song's* and none of them is a part's (0184) — which is `PLAYER_SONG_KNOBS`'
 * business in src/lib/playerKnobs.ts rather than this file's, because nothing here knows what a
 * part is.
 */
export type BedSpec = {
  /** Which bed the song opens on, from the loop's own. `PLAYER_BED_MIN`…`MAX`. Whole; zero is the loop. */
  bed: number;
  /** Jumps between one move and the next, 0…`PLAYER_BED_EVERY_MAX`. Whole; zero never moves. */
  bedEvery: number;
  /** Beds one move may travel, `PLAYER_BED_DISTANCE_MIN`…`MAX`. Whole. */
  bedDistance: number;
  /** Which way it leans, −1…1. Zero wanders, ±1 only ever goes one way. */
  bedBias: number;
  /** The odds it comes home to the song's own bed instead of travelling, 0…1. */
  bedHome: number;
};

/**
 * Which beds a buffer actually holds, as the lowest and highest index that fits whole inside it,
 * with the loop itself as bed zero. A bed is the loop's own length of source, so bed `n` begins at
 * `loop.in + n * span` and the reachable ones are those whose whole length lies in the file.
 *
 * **Bed zero is always one of them.** The loop is inside the buffer by construction
 * (`setLoop` clamps both edges, src/audio/deck.ts), so `from` is never above zero and `to` never
 * below it — a loop with no room either side is a pattern that never leaves it, which is this
 * module before it could move.
 */
export function bedBounds(
  loopIn: number,
  span: number,
  duration: number,
): { from: number; to: number } {
  if (span <= 0) return { from: 0, to: 0 };
  // Counted as a positive number of beds and then negated only where there is one, so a loop at
  // the very start of the file answers `0` and never `-0`: the two are `Object.is`-distinct, and
  // this pair is compared, spread onto a grid and read back out on every pass (principle 5).
  const back = Math.floor(loopIn / span);
  return {
    from: back > 0 ? -back : 0,
    to: Math.max(0, Math.floor((duration - span - loopIn) / span)),
  };
}

/**
 * One unbounded index folded onto the beds that exist. **Wrapped and never clamped**: a clamp pins
 * a leaning pattern against the end of the file and leaves it there for the rest of the
 * performance, where a wrap sends it back to the other end and keeps it walking — which is what
 * the slot walk already does at `PLAYER_SLOTS` and is the same answer one grid up.
 *
 * The walk carries the raw index and this is the only thing that folds it, so there is one author
 * of where a pattern is and one resolver of where that lands (principle 1): a bed index means the
 * same thing on every buffer, and re-deriving the tail from the seed cannot drift.
 */
export function bedWrap(bed: number, from: number, to: number): number {
  const beds = to - from + 1;
  if (beds <= 1) return from;
  return ((((bed - from) % beds) + beds) % beds) + from;
}
