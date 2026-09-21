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
  /** The buffer seconds its source loops, from the slot it starts in — the burst, at its rate. */
  span: number;
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
 * Where the deck is reading at `at`, in buffer seconds, off the entry the clock is inside.
 *
 * Its own rates, not the pass's: a speed change moves the steps armed after it and leaves the ones
 * already laid down reading at the rates their window was measured in. Held at the step's own end
 * — between two steps the pattern is resting and the read head is where the burst left it — and
 * wrapped on the burst's span, which is the slot's only at a burst of one (P67).
 */
export function stepPosition(step: Scheduled, grid: Grid, at: number): number {
  const into = readInto(step, Math.min(at - step.at, step.ends - step.at));
  const read = into > 0 ? into % step.span : 0;
  // A reversed landing walks that same span the other way, so the head is `span` in and coming
  // back rather than at the slot's own edge and going on. It has to be: the playhead and the
  // picture are drawn off this number, and a cursor running forwards under a landing playing
  // backwards is the instrument showing one thing and playing another (P121).
  return (
    slotStart(grid, step.step.slot, step.step.bed) + (step.step.reversed ? step.span - read : read)
  );
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
  const read = into > 0 ? into % spark.span : 0;
  // Backwards where the landing is, for the reason the landing's cursor is: the spark takes the
  // landing's direction, so a cursor running the other way would be the picture saying one thing
  // while the graph plays another (P121).
  return (
    slotStart(grid, spark.slot, step.step.bed) + (step.step.reversed ? spark.span - read : read)
  );
}
