/**
 * @role The ground a loop is read on: how far through the source the loop has been moved, in the
 *   loop's own **sixteenths**, which bed the song opens on, how often the ground moves and how far
 *   it crawls when it does (0185). The song's, not a part's (0184). Pure maths — no
 *   clock, no PRNG and no buffer: an index here is unbounded, and what it finally lands on is
 *   resolved where the buffer is (0183, the way a travel is clamped where it is applied).
 * @instead The grid *inside* one bed — the sixteen slots a landing lands on → src/lib/playerSlots.ts.
 *   The lean these share with a jump, spent once for both → `leanStep`, src/lib/playerWalk.ts,
 *   which is where the draw is because the draw needs the walk's own generator. Turning a bed into
 *   buffer seconds for a *sounding* deck → `gridOf` and `slotStart`, src/audio/player.ts, which
 *   fold once per pass; every other surface asks `bedGround` below. The dial each is turned on →
 *   src/lib/playerKnobs.ts.
 */
import { PLAYER_SLOTS } from "./playerSlots.ts";

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

/**
 * How far one move may travel, **counted in the loop's own sixteenths and not in whole beds**.
 * One is a single slot of source, and the ceiling is `PLAYER_SLOTS` — exactly one bed, which is
 * the hop this walk used to take at a distance of one.
 *
 * That is the whole of the crawl: a move of less than sixteen leaves the loop reading a window
 * the source's own bed grid does not begin at, so a leaning pattern creeps across the file and
 * drifts out of phase with it rather than hopping bed to bed. A bed is still one loop-length of
 * source and still what a burst is clamped inside (0183); it is simply no longer true that the
 * ground sits on a boundary of them.
 */
export const PLAYER_BED_DISTANCE_MIN = 1;
export const PLAYER_BED_DISTANCE_MAX = PLAYER_SLOTS;

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
  /** Sixteenths of the loop one move may travel, `PLAYER_BED_DISTANCE_MIN`…`MAX`. Whole. */
  bedDistance: number;
  /** Which way it leans, −1…1. Zero wanders, ±1 only ever goes one way. */
  bedBias: number;
  /** The odds it comes home to the song's own bed instead of crawling on, 0…1. */
  bedHome: number;
};

/**
 * How far the ground may be moved on a real buffer, as the lowest and highest **offset in the
 * loop's own sixteenths** that still leaves a whole loop-length of source under it. Zero is the
 * loop itself, and offset `n` begins at `loop.in + n * span / PLAYER_SLOTS`.
 *
 * A sixteenth and not a bed since the crawl: a bed boundary is no longer where the ground may
 * stand, so what is counted here is the step the walk actually takes and not the loop-lengths it
 * used to hop. The bed itself is unchanged — it is one loop-length of source *beginning at the
 * offset*, which is what a burst is still clamped inside (0183, `bedStart`, src/audio/player.ts).
 *
 * **Offset zero is always one of them.** The loop is inside the buffer by construction
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
  const step = span / PLAYER_SLOTS;
  // Counted as a positive number of sixteenths and then negated only where there is one, so a loop
  // at the very start of the file answers `0` and never `-0`: the two are `Object.is`-distinct, and
  // this pair is compared, spread onto a grid and read back out on every pass (principle 5).
  const back = Math.floor(loopIn / step);
  return {
    from: back > 0 ? -back : 0,
    to: Math.max(0, Math.floor((duration - span - loopIn) / step)),
  };
}

/**
 * One unbounded offset folded onto the ground that exists. **Wrapped and never clamped**: a clamp
 * pins a leaning pattern against the end of the file and leaves it there for the rest of the
 * performance, where a wrap sends it back to the other end and keeps it walking — which is what
 * the slot walk already does at `PLAYER_SLOTS` and is the same answer one grid up.
 *
 * The walk carries the raw offset and this is the only thing that folds it, so there is one author
 * of where a pattern is and one resolver of where that lands (principle 1): an offset means the
 * same thing on every buffer, and re-deriving the tail from the seed cannot drift.
 */
export function bedWrap(offset: number, from: number, to: number): number {
  const room = to - from + 1;
  if (room <= 1) return from;
  return ((((offset - from) % room) + room) % room) + from;
}

/**
 * Where the bed a walk is standing on begins, over a real buffer: the raw offset a step carries,
 * folded onto the ground the file holds, and the buffer second that lands at. One bed long from
 * there, which is the loop's own span.
 *
 * The two functions above composed, because outside the transport they are never asked separately:
 * the picture that draws the standing bed and the gesture that plants it both need the fold *and*
 * the second, and the `/ PLAYER_SLOTS` between them is the crawl's whole arithmetic — said twice it
 * is a rectangle that can disagree with the loop a press writes (principle 1). The transport keeps
 * its own (`bedStart`, src/audio/player.ts): it holds a grid whose bounds were answered once for
 * the whole pass, and re-folding them per source is the one thing that file is shaped to avoid.
 *
 * **`on` is zero exactly when the ground is the loop itself** — a pattern that has not been moved.
 * A rectangle drawn there claims a move that never happened, and a plant there writes back the loop
 * the hand already set, so both callers read it as nothing to do.
 */
export function bedGround(
  loopIn: number,
  span: number,
  duration: number,
  offset: number,
): { on: number; in: number } {
  const { from, to } = bedBounds(loopIn, span, duration);
  const on = bedWrap(offset, from, to);
  return { on, in: loopIn + (on * span) / PLAYER_SLOTS };
}
