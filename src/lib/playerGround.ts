/**
 * @role The ground drawn as a picture: which bed a point on the source names, the grounds the
 *   pattern's own moves reach next, and the two arithmetics that edit the list a hand holds — the
 *   row's add and the picture's toggle (0194, 0226). Pure maths over a spec and a loop — no canvas, no clock and no buffer beyond its
 *   length (0191).
 * @instead What a bed *is*, how far one may be moved, where one lands on a real buffer and when a
 *   kept one comes round → src/lib/playerBed.ts, whose `bedGround` every rectangle is placed by.
 *   The strip that draws these and the two gestures that write one → src/ui/PlayerGround.tsx and
 *   src/ui/PlayerBeds.tsx. The walk they are read off → src/lib/playerWalk.ts.
 */
import {
  PLAYER_BED_MAX,
  PLAYER_BED_MIN,
  PLAYER_BED_ROUND,
  PLAYER_BEDS_MAX,
  type PlantedBed,
} from "./playerBed.ts";
import { PLAYER_SLOTS } from "./playerSlots.ts";
import { playerSequence } from "./playerWalk.ts";
import type { PlayerSpec } from "./player.ts";

/**
 * How far ahead the strip looks for the grounds a pattern is about to move to, in jumps. A
 * bounded look and not "until it has found enough": a period is a dial that reaches 64, so an
 * unbounded search would walk 256 steps at every commit of a drag on the dial beside it — and what
 * the picture is *for* is the next little while, which is what a bounded one answers exactly (0070,
 * the walk the scope pays for per dial move).
 */
export const PLAYER_GROUND_LOOK = 96;

/** How many grounds ahead are drawn. Four: enough to read a lean off, few enough to tell apart. */
export const PLAYER_GROUND_AHEAD = 4;

/**
 * The grounds the pattern moves to next, in the order it reaches them — raw offsets in the loop's
 * own sixteenths, exactly as a step carries one, so the caller folds them onto the buffer with the
 * same `bedGround` the standing rectangle is placed by (principle 1, 0185).
 *
 * Read off the walk rather than drawn again here: where a ground goes is the seed's business, and a
 * second arithmetic for it would be a picture of moves the pattern is not making (0089). A pattern
 * whose ground never moves answers none, which is what makes an empty strip the honest drawing of
 * `bedEvery: 0`.
 */
export function groundsAhead(spec: PlayerSpec, ahead = PLAYER_GROUND_AHEAD): number[] {
  if (spec.bedEvery <= 0 || ahead <= 0) return [];
  const found: number[] = [];
  let last = spec.bed * PLAYER_SLOTS;
  for (const step of playerSequence(spec, PLAYER_GROUND_LOOK)) {
    if (step.bed === last) continue;
    last = step.bed;
    found.push(step.bed);
    if (found.length >= ahead) break;
  }
  return found;
}

/**
 * The bed a point on the source names: how many whole loop-lengths from the loop's own start it
 * falls, which is the unit `bed` is counted in (0185). Whole, because the dial it writes is —
 * dragging the window moves it bed by bed, and the sixteenths between them are the crawl's, drawn
 * by the pattern rather than placed by a hand.
 *
 * Clamped to the dial's own reach rather than to the file's: which grounds a buffer actually holds
 * is folded where that is known, and a hand pulling past the end of a short file writes a bed that
 * wraps exactly as a walked one does (`bedWrap`, principle 1).
 */
export function bedAt(secs: number, loopIn: number, span: number): number {
  if (span <= 0) return 0;
  const rounded = Math.round((secs - loopIn) / span);
  // `Math.round` answers -0 anywhere in the half-bed below the loop, and -0 and 0 are
  // `Object.is`-distinct: this number is written into a durable spec, compared against the one
  // held and read back out of a log, so the two are made one here — the same care `bedBounds`
  // takes with its own pair (principle 5, src/lib/playerBed.ts).
  const bed = rounded === 0 ? 0 : rounded;
  return Math.min(PLAYER_BED_MAX, Math.max(PLAYER_BED_MIN, bed));
}

/**
 * Whether the list already holds this ground. Its own function because three places ask — both
 * arithmetics below, and the row that has to tell "already kept" from "no room" to say which
 * refusal its `+` is making (principle 1, src/ui/PlayerBeds.tsx).
 */
export function bedKept(beds: readonly PlantedBed[], bed: number): boolean {
  return beds.some((one) => one.bed === bed);
}

/**
 * One ground kept and nothing taken away: the bed added at the count a press leaves it, and **the
 * same list back** where it is already held or where there is no room for another. The caller
 * reads unchanged as nothing to do, the way a drag that has not crossed a bed boundary sends
 * nothing (src/ui/PlayerGround.tsx).
 *
 * Kept in order of the source, so the row under the picture reads left to right the way the blocks
 * over it do.
 *
 * This is the `+` at the end of the row: one press, one meaning. A press that added on the first
 * go and took away on the second emptied the row a hand was filling, because a `+` is not legibly
 * a toggle (P165, 0226).
 */
export function keepBed(beds: readonly PlantedBed[], bed: number): readonly PlantedBed[] {
  if (bedKept(beds, bed)) return beds;
  if (beds.length >= PLAYER_BEDS_MAX) return beds;
  // ES2022 has no toSorted; the array is fresh, so sorting cannot mutate a caller's value.
  // oxlint-disable-next-line unicorn/no-array-sort
  return [...beds, { bed, every: PLAYER_BED_ROUND }].sort((one, two) => one.bed - two.bed);
}

/**
 * One ground kept, or let go: `keepBed` where the list does not hold it, and out of the list where
 * it does. The Option-press on the picture and nothing else — a modifier-press on a lit block a
 * hand can see is legibly a toggle, and the row's `+` is not, so the two gestures edit the one
 * list through one add each rather than through one arithmetic that means two things (0226, 0194).
 */
export function plantBed(beds: readonly PlantedBed[], bed: number): readonly PlantedBed[] {
  if (bedKept(beds, bed)) return beds.filter((one) => one.bed !== bed);
  return keepBed(beds, bed);
}
