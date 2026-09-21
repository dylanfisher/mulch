/**
 * @role The queue entry one step of a jumping pass is, and where that step and its companions are
 *   reading at an instant: the entry's whole shape and the two cursor reads over it, which touch
 *   nothing but the entry, the grid and the arithmetic. Out of src/audio/player.ts because that
 *   file sits at the hard cap and none of this reaches the pass that built it (0045).
 * @instead The pass that fills this queue and scans it → src/audio/player.ts. How much buffer a
 *   landing has read into itself → src/audio/playerWindow.ts. What a companion is →
 *   src/audio/playerSparks.ts. What a step is → `PlayerStep`, src/lib/playerWalk.ts.
 */
import type { PlayerStep } from "@/lib/playerWalk";
import { type Grid, slotStart } from "./playerGrid";
import type { Spark } from "./playerSparks";
import { readInto } from "./playerWindow";

/** One step the transport has going: its source, the fader its seams are on, and where it reads. */
export type Scheduled = {
  source: AudioBufferSourceNode;
  fader: GainNode;
  /**
   * The quieter sources this landing threw, empty where it threw none — held on the landing's own
   * entry and never as entries of their own. That is the whole of what a spark costs the queue:
   * `position` scans this list for the latest entry the clock is at or past, so a companion
   * sitting in it would win that scan and the deck's read head would follow the spark instead of
   * the landing, which is where the pattern actually is (P123).
   *
   * Their level gains are held here too, and for the reason the sources are: what a step is made
   * of is what a step has to let go of, and a node dropped from this list without being
   * disconnected is still wired into the chain.
   */
  sparks: Spark[];
  at: number;
  ends: number;
  /**
   * When this step's own business is over — its end, plus whatever rest the pattern takes. Held
   * unsynced: the clock the next step waits for is whichever one is held when that step is armed,
   * so a clock turned down or off does not leave the tail waiting out the old one's tick (0097).
   */
  next: number;
  /** The buffer seconds its source loops, from the slot it starts in — the burst at its rate, or
   *  the whole bed where the burst outlives what is left of it (`slotRead`,
   *  src/audio/playerWindow.ts). */
  span: number;
  /** How far into that window the slot it landed on begins, which is what the cursor adds before
   *  it takes its modulo (`SlotRead`, src/audio/playerWindow.ts). */
  enters: number;
  /** The rate each of this step's repeats was armed at, and how long each of those repeats is.
   *  Read per step, not per pass: a speed change moves the ones armed after it and must not be
   *  applied to a window laid out for another rate. A pair rather than one number since P124,
   *  because the cursor now sums the repeats a landing has finished at the rungs they were read at
   *  rather than multiplying the whole landing by one rate (0167). Both are exactly `repeats`
   *  long, and `spans` sums to `ends - at`. */
  rates: readonly number[];
  spans: readonly number[];
  /**
   * The very step this entry was armed from, held rather than copied out of. Where it reads, which
   * way round, what it was standing in and the whole of what it was drawn as — a read at the clock
   * answers off the entry the clock is inside rather than off a cursor seconds ahead of it (0157,
   * 0158), and it answers with everything the step carries rather than the four fields this entry
   * used to keep a second copy of (principle 1, 0180). Held until `release`, which the queue's own
   * bound is what bounds.
   */
  step: PlayerStep;
  /**
   * Which landing of this pass it is, counting from the first one the pass laid down — `laid` at
   * the moment it was drawn. Handed to `armStep` rather than read off `laid` there, because both
   * call sites pass `draw()` straight in and a read beside it would be leaning on evaluation
   * order. It is what lets a surface line its own walk of the same spec up with the one sounding.
   */
  ordinal: number;
};

/**
 * Where a read that has gone `into` buffer seconds stands, in buffer seconds, given the slot it
 * landed on and the window its source loops around that slot.
 *
 * `enters` is how far into that window the slot itself is, which is nought for every burst that
 * fits in what is left of the bed and the slot's own offset for one that wrapped (`slotRead`,
 * src/audio/playerWindow.ts). So a wrapping landing's cursor runs off the bed's end and comes back
 * at its head, which is what the source is doing — a playhead that snapped back to the slot there
 * would be the instrument showing one thing and playing another (P121).
 *
 * Backwards is that same window walked the other way, from its end: the head is `span` in and
 * coming back rather than at the slot's own edge and going on, and a wrapping landing read
 * backwards entered at the window's end, so the one expression covers both.
 */
const windowRead = (
  slot: number,
  window: { span: number; enters: number },
  reversed: boolean,
  into: number,
): number => {
  const from = slot - window.enters;
  const read = into > 0 ? into % window.span : 0;
  return from + (reversed ? window.span - read : (window.enters + read) % window.span);
};

/**
 * Where the deck is reading at `at`, in buffer seconds, off the entry the clock is inside.
 *
 * Its own rates, not the pass's: a speed change moves the steps armed after it and leaves the ones
 * already laid down reading at the rates their window was measured in. Held at the step's own end
 * — between two steps the pattern is resting and the read head is where the burst left it — and
 * wrapped on the burst's span, which is the slot's only at a burst of one (P67).
 */
export function stepPosition(step: Scheduled, grid: Grid, at: number): number {
  const into = readInto(step, Math.min(at - step.at, step.ends - step.at));
  return windowRead(slotStart(grid, step.step.slot, step.step.bed), step, step.step.reversed, into);
}

/**
 * Where one spark of `step` is reading at `at`, or null where it is not reading yet — a delayed
 * companion whose own start is still ahead.
 *
 * One answer per companion off the same entry and never a second queue: `position` goes on
 * answering off the landing, which is precisely why a spark rides the landing's entry (0166), so
 * the cursors the peaks paint for them are asked for separately (0175).
 */
export function sparkPosition(
  step: Scheduled,
  spark: Spark,
  grid: Grid,
  at: number,
): number | null {
  // The landing's window is what `readInto` sums over, so a spark held back is the difference
  // of two reads of it: how far the landing has read now, less how far it had read when the
  // spark started. That keeps the two on one ladder — the companion is stepped at the landing's
  // own boundaries, so it reads at the landing's rate at every instant and differs only by where
  // it entered (0167, 0175).
  const held = Math.min(at - step.at, step.ends - step.at);
  const from = Math.min(spark.at - step.at, step.ends - step.at);
  if (held < from) return null;
  const into = readInto(step, held) - readInto(step, from);
  // Backwards where the landing is, for the reason the landing's cursor is: the spark takes the
  // landing's direction, so a cursor running the other way would be the picture saying one thing
  // while the graph plays another (P121).
  return windowRead(slotStart(grid, spark.slot, step.step.bed), spark, step.step.reversed, into);
}
