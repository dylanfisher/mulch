/**
 * @role What a part written by hand is: a run of cells, each one landing — the slot it reads, how
 *   many times it sounds there and how long it waits after — read round and round for as long as
 *   the part lasts (0188). The other author of where the pattern goes, in place of the figure that
 *   draws one. Pure maths: no clock, no PRNG and no knowledge of what a step is.
 * @instead The figure this stands in for — a run of slots the walk lays down for itself →
 *   src/lib/playerFigure.ts. The author's own precedent, one field down: a placed rest taking the
 *   wait over from the roll → src/lib/playerRest.ts (0163). The walk that reads this →
 *   src/lib/playerWalk.ts. The part that carries one → src/lib/playerSong.ts. The row a hand
 *   writes it on → src/ui/PlayerStrip.tsx.
 */
import { exactKeys, objectAt, whole } from "./guards.ts";
import { PLAYER_REPEATS_MAX, PLAYER_REPEATS_MIN } from "./playerRepeats.ts";
import { PLAYER_REST_MAX, PLAYER_REST_MIN } from "./playerRest.ts";
import { PLAYER_SLOTS } from "./playerSlots.ts";

/**
 * How many cells one part may be written as. Sixteen, which is the number every span and hold in
 * this module tops out at and the number of slots the grid is cut into: past it the written figure
 * outlasts anything a listener holds it against, which is the argument `PLAYER_REST_SPAN_MAX` and
 * `PLAYER_PHRASE_KEEP_MAX` are each bounded by.
 */
export const PLAYER_STRIP_MAX = 16;

/**
 * One cell of a written part — one landing, said in the three numbers a hand places rather than
 * rolls. Every bound is a bound this module already declares: a written landing is an ordinary
 * landing, so a second copy of what a slot, a count or a wait may be is the one thing principle 1
 * refuses.
 *
 * There is no jump here, and that is the decision: the jump is the *gap* between two cells, which
 * is `next.slot - this.slot` and is read off the pair. A jump of its own would be a second author
 * of where the cell after it lands (0188).
 */
export type PartStep = {
  /** Which of `PLAYER_SLOTS` divisions of the loop this cell reads. */
  slot: number;
  /** How many times its burst sounds before the next cell — `PLAYER_REPEATS_MIN`…`MAX`. */
  repeats: number;
  /** How long the pattern waits after it, in slots — `PLAYER_REST_MIN`…`MAX`. */
  rest: number;
};

/** A cell at the top of the loop, sounding once and waiting for nothing: what `+` appends. */
export const PLAYER_STRIP_CELL: PartStep = {
  slot: 0,
  repeats: PLAYER_REPEATS_MIN,
  rest: PLAYER_REST_MIN,
};

/**
 * Which cell the jump `at` of a part reads, or null where the part is drawn rather than written.
 * Read modulo the strip's own length, exactly as a placed rest's figure is (`rests[breathed %
 * rests.length]`, src/lib/playerWalk.ts): a strip shorter than the part comes round for as long as
 * the part stands, which is what makes the part's own length the number of times the row repeats
 * and is why no cell carries a repeat bracket of its own (0188).
 */
export function stripStep(steps: readonly PartStep[], at: number): PartStep | null {
  if (steps.length === 0) return null;
  const cell = steps[((at % steps.length) + steps.length) % steps.length];
  return cell ?? null;
}

/**
 * A written part off the wire or out of storage, checked. An empty run is the whole of "this part
 * is drawn" and is the ordinary case, so it is not an error — a part that holds none is the part
 * this module had before one could be written (0188, the way `songOf` reads an empty song).
 *
 * Loud about everything else, for the reason every durable field is: a strip is carried by a
 * command and stored, and a cell quietly reading a slot nobody wrote is exactly the failure
 * principle 5 refuses. Keyed exactly, like every other durable shape — a cell from another build
 * is a cell from another build and not a cell.
 */
export function stripOf(value: unknown, at: string): readonly PartStep[] {
  if (!Array.isArray(value)) throw new TypeError(`${at} is not an array`);
  if (value.length > PLAYER_STRIP_MAX) {
    throw new RangeError(`${at} has ${value.length} cells, over ${PLAYER_STRIP_MAX}`);
  }
  return value.map((raw: unknown, index: number): PartStep => {
    const where = `${at}[${index}]`;
    const cell = objectAt(raw, where);
    exactKeys(cell, STRIP_FIELDS, where);
    return {
      slot: whole(cell["slot"], 0, PLAYER_SLOTS - 1, `${where} slot`),
      repeats: whole(cell["repeats"], PLAYER_REPEATS_MIN, PLAYER_REPEATS_MAX, `${where} repeats`),
      rest: whole(cell["rest"], PLAYER_REST_MIN, PLAYER_REST_MAX, `${where} rest`),
    };
  });
}

/** The fields one cell is keyed against, read exactly as `PART_FIELDS` is (src/lib/player.ts). */
const STRIP_FIELDS = ["slot", "repeats", "rest"] as const;
