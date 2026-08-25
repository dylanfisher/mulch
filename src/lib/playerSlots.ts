/**
 * @role The grid a jumping pattern lands on: how many divisions the loop is cut into, how far one
 *   jump may travel over them, how long a figure of them may be — and which of them the pattern is
 *   allowed to land on at all, as one durable whole number and the snap that puts a jump onto a
 *   permitted slot (0165). Pure maths: no clock, no PRNG and no analysis, because a mask is
 *   ordinary durable numbers and never a live read of what a machine measured (plan §2).
 * @instead What a mask is written by — the one-shot gesture that reads a source's onsets once and
 *   sends them as numbers → src/ui/PlayerSlots.tsx. Where the snap is spent, and every other
 *   number one jump is drawn from → src/lib/playerWalk.ts. The rest of the spec these bounds are
 *   part of, and the one validator that refuses an empty mask → src/lib/player.ts.
 */
import { insideLoop, type Loop } from "./timeline.ts";

/**
 * How many divisions the loop is cut into. Sixteen, so the grid is the loop's own sixteenths —
 * which is what "beat-aware where the loop is" means for a loop that was snapped to a bar: the
 * player has no tempo of its own and never needs one, because every position it can name is a
 * fraction of the loop the performer already set.
 *
 * Here rather than in src/lib/player.ts since 0165: the three bounds below are each derived from
 * it, so the grid is a family of the spec's numbers and sits in a module of its own beside what
 * reads it, the way the travel's and the rest's do (0045, P119, P120). It is also what keeps this
 * file clear of the spec — the mask's own bound is `PLAYER_SLOTS` bits wide, and a bound reaching
 * back into src/lib/player.ts for the count would close a cycle the two files evaluate inside.
 * The one thing it does reach for is src/lib/timeline.ts, which is where a loop and the half-open
 * rule for being inside one are said once (principle 1).
 */
export const PLAYER_SLOTS = 16;

/**
 * The grid as a list, so every surface that draws or counts one slot at a time reads the count
 * once rather than spelling out a loop of its own (principle 1).
 */
export const PLAYER_GRID: readonly number[] = Array.from(
  { length: PLAYER_SLOTS },
  (_unused, slot) => slot,
);

/** How far a jump may travel, in slots. One is the next slot along; the whole grid is anywhere. */
export const PLAYER_DISTANCE_MIN = 1;
export const PLAYER_DISTANCE_MAX = PLAYER_SLOTS;

/**
 * How many slots make one figure — the run the walk lays down and then reads back, so a pattern
 * says something twice before it says anything new (0151). Zero is off, and off is the memoryless
 * walk this module was until it could keep a figure: every knob it had shaped the draw of the next
 * slot and none of them made the pattern repeat itself.
 *
 * The ceiling is the whole grid. A figure longer than the loop has slots would be a run repeating
 * over a thing shorter than itself, which is a loop and not a figure.
 */
export const PLAYER_PHRASE_MIN = 0;
export const PLAYER_PHRASE_MAX = PLAYER_SLOTS;

/**
 * Which slots a pattern may land on, as the whole number `PLAYER_SLOTS` booleans pack into: bit
 * *n* set is slot *n* permitted. One number rather than a list of sixteen, because it is carried
 * in a command and read in a log — a mask is one thing a hand did, and sixteen booleans spread
 * over sixteen lines of a `deck.player` envelope is one thing spelled sixteen ways (0165).
 *
 * The floor is one and not zero, and that is the whole of what "an empty mask is refused" means: a
 * pattern that may land nowhere has no next slot to draw, so a spec holding one is not a spec that
 * plays quietly — it is a spec `assertPlayer` refuses (principle 5). The ceiling is every slot
 * permitted, which is what a switch press leaves and is the grid the module jumped on before it
 * could be masked at all.
 */
export const PLAYER_MASK_MIN = 1;
export const PLAYER_MASK_MAX = 2 ** PLAYER_SLOTS - 1;

/** Whether a mask permits one slot. The one place a bit of it is read. */
export const slotAllowed = (mask: number, slot: number): boolean => ((mask >>> slot) & 1) === 1;

/** The same mask with one slot turned on or off — what a hand's press on the strip sends. */
export const withSlot = (mask: number, slot: number, allowed: boolean): number =>
  allowed ? (mask | (1 << slot)) >>> 0 : (mask & ~(1 << slot)) >>> 0;

/**
 * The nearest slot a mask permits, measured around the grid the way a jump wraps around it — the
 * jump itself, where the mask already permits where it landed, so a full mask is the identity and
 * a pattern under one draws exactly the stream it drew before there was a mask (0165).
 *
 * Snapped rather than re-drawn, and that is the choice that keeps `distance` meaning what its
 * caption says: a re-drawn jump would take as many draws as the mask is sparse, so how far a jump
 * goes would depend on which slots the sample happened to hit. Ties go the way the grid is
 * counted — a landing exactly between two permitted slots takes the one ahead — because a tie has
 * to break the same way on every machine and forward is the direction the loop is read in.
 *
 * Loud on an empty mask rather than answering a slot nothing permits: `assertPlayer` refuses one,
 * so reaching here with zero is a spec that came from somewhere other than the validator.
 */
export function nearestSlot(mask: number, slot: number): number {
  for (let away = 0; away <= PLAYER_SLOTS / 2; away++) {
    const ahead = (slot + away) % PLAYER_SLOTS;
    if (slotAllowed(mask, ahead)) return ahead;
    const behind = (slot - away + PLAYER_SLOTS) % PLAYER_SLOTS;
    if (slotAllowed(mask, behind)) return behind;
  }
  throw new RangeError(`a player mask permits no slot: ${mask}`);
}

/**
 * The mask a source's own transients make of one loop: the slot each onset inside the loop falls
 * in, and no others — so a pattern lands where the sample does.
 *
 * Read once, at the gesture, and never at walk time. Analysis is not a pure function of stored
 * bytes — `decodeAudioData` may resample, so onsets differ across machines (plan §2) — and a mask
 * that were a live read of them would be a spec meaning one thing on the machine that made it and
 * another on the machine that replays it. What this returns travels in an ordinary `deck.player`
 * command as ordinary durable numbers, undone and replayed like any other edit (0089, 0165).
 *
 * Zero where no onset lands in the loop, which is not a mask: the gesture that asks for one has
 * nothing to send and says so by offering nothing, and `assertPlayer` would refuse it anyway.
 */
export function maskFromOnsets(onsets: readonly number[], loop: Loop): number {
  const span = loop.out - loop.in;
  if (span <= 0) return 0;
  let mask = 0;
  for (const at of onsets) {
    // Half-open, by the one statement of that rule rather than by a second spelling of it: `out`
    // is the edge the cycle wraps at and never a position the source is read from (src/lib/timeline.ts).
    if (!insideLoop(at, loop)) continue;
    // The last slot holds the edge: an onset a float's breadth under `out` is inside the loop and
    // has to land somewhere, and `PLAYER_SLOTS` is one past the grid.
    const slot = Math.min(PLAYER_SLOTS - 1, Math.floor(((at - loop.in) / span) * PLAYER_SLOTS));
    mask |= 1 << slot;
  }
  return mask >>> 0;
}
