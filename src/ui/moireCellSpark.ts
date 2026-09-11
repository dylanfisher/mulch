/**
 * @role The flash a spark puts on the marks: where across the picture each spark of the landing
 *   sounding is reading, how hard it is still flashing, and the one step that lights it and lets it
 *   fall. A reading of what the yard is doing and never a parameter, exactly as the push beside it
 *   is (0355, 0145) — it rests on the field and belongs to no row, and what it is spent on is the
 *   threshold the frame-side marks are stamped through (`readMarks`, src/ui/moireCanvasMarks.ts),
 *   so a spark is one big mark flashing where it reads while the lattice under it stands still
 *   (0346).
 * @instead The landings still falling, which this stands beside on the one jolt and falls at the
 *   same rate as → src/ui/moireCellPush.ts, whose `CELL_DECAY` is the share of the loop both are
 *   timed against. Where the flash is actually lifted onto the read → `readMarks`,
 *   src/ui/moireCanvasMarks.ts. How wide a big mark is → `SCATTER_SPAN`,
 *   src/lib/moireScreenScatter.ts. What a spark *is* and where it reads →
 *   `PlayerPeek.sparkPositions`, src/audio/deckPeek.ts.
 */
import { easedToward } from "@/lib/moire";
import { centreAcross } from "@/lib/moireGeometry";
import { SCATTER_SPAN } from "@/lib/moireScreenScatter";
import { PLAYER_SPARK_COUNT_MAX } from "@/lib/playerSpark";
import { clamp } from "@/lib/range";

/**
 * How many sparks may be flashing at once: as many as a landing can throw
 * (`PLAYER_SPARK_COUNT_MAX`, src/lib/playerSpark.ts). One declaration and no second count — a ring
 * of its own size would be a fourth number saying how many companions a landing has.
 */
export const CELL_SPARKS = PLAYER_SPARK_COUNT_MAX;

/**
 * How many cells a side the big mark a spark stamps spans: the scatter's own span
 * (`SCATTER_SPAN`, src/lib/moireScreenScatter.ts, 0352). A spark is a peak event and a peak is
 * written as one big mark wherever this picture writes one, so the span is imported rather than
 * chosen again (principle 1).
 */
export const SPARK_CELLS = SCATTER_SPAN;

/** How hard one spark is still flashing, and where on the picture it stands. */
export type MoireCellSpark = {
  /** How hard, nothing to wholly: lit outright and fallen since. */
  at: number;
  /** Where across the picture it is reading, on nought to one across the file. */
  across: number;
  /** And where down it, which is the ground the landing that threw it stands on. */
  centre: number;
  /**
   * And whether the spark in this slot was reading on the frame before. **A spark is an event and
   * its position is not**: a spark's read walks the file while it sounds, so a slot that lit again
   * wherever its position moved would stand at full for as long as the spark lasted, which is a
   * flash held up rather than a flash. The peek reports a slot only while its own start has passed
   * and its sound is standing (0175), so the frame it appears on is the event.
   */
  lit: boolean;
  /**
   * And which landing of this pass it was lit by — the ordinal `peek()` already counts
   * (`PlayerPeek.at`), read here for the reason the jolt reads it (0271). **The list is a prefix of
   * the landing standing and not a set of slots that outlive it**: two sparking landings butt up
   * with no quiet frame between them at the rest delay, so slot nought goes straight from one
   * landing's first spark to the next landing's, and a flag saying only "something was reading
   * here" would drop every flash after the first and leave the fallen one at the wrong column.
   * Null while nothing has lit the slot at all.
   */
  landing: number | null;
};

/** Where the sparks stand before one has been thrown: nothing flashing, anywhere. */
export const cellSparkRest = (): MoireCellSpark[] =>
  Array.from({ length: CELL_SPARKS }, () => ({
    at: 0,
    across: 0,
    centre: 0,
    lit: false,
    landing: null,
  }));

/**
 * One step of the sparks: every one of them fallen by what the clock has moved, and any slot the
 * peek has begun reading lit outright at the place it reads. **Up outright and down rated**, which
 * is the jolt's shape and the push's, and for their reason: a flash that eased in is not a peak.
 *
 * Slot for slot with `PlayerPeek.sparkPositions`, which is the one list of what is actually
 * sounding — so a landing that threw two flashes two, and a slot the walk has stopped reading falls
 * where it stands rather than being cleared, because a spark going quiet is the end of its sound
 * and not the end of its flash. **And the landing's own ordinal beside the flag**, because that
 * list is a prefix of whatever landing is standing: two sparking landings butt up with no quiet
 * frame between them, so a slot carrying the same index across the boundary is a different spark
 * and lights again.
 *
 * Falls outright where there is no clock to fall against — a halted yard, or one with no loop to
 * measure a share of — which is the answer the jolt, the push, the ink and the wind all give
 * (0144, 0271, 0355).
 */
export function cellSparkInto(
  sparks: readonly MoireCellSpark[],
  positions: readonly number[],
  landing: number | null,
  duration: number,
  centre: number,
  elapsed: number,
  over: number,
): void {
  // An indexed walk and never `entries()`: a tuple per slot per frame is an allocation on the
  // per-frame read, which is the one thing this path may not make (0070) — the push beside it walks
  // its own ring for that reason.
  for (let slot = 0; slot < sparks.length; slot++) {
    const spark = sparks[slot];
    if (spark === undefined) continue;
    spark.at = easedToward(spark.at, 0, elapsed, over, 1);
    const at = positions[slot];
    // A file of no length has no column to read a buffer second onto, which is a yard with nothing
    // loaded: it flashes nothing rather than flashing at the left edge (principle 5).
    const reading = at !== undefined && duration > 0;
    if (reading && (!spark.lit || spark.landing !== landing)) {
      spark.at = 1;
      spark.across = clamp(at / duration, 0, 1);
      spark.centre = clamp(centre, 0, 1);
      spark.landing = landing;
    }
    spark.lit = reading;
  }
}

/**
 * The cells one spark's big mark covers on a grid `wide` by `deep`: `SPARK_CELLS` a side, centred
 * on the column it reads at and on the ground its landing stands on, and never off the grid — a
 * picture narrower than the span is covered whole, which is the big mark as large as it can be
 * drawn there.
 *
 * **The column read straight and the row through `centreAcross`.** Where across the picture a spark
 * reads is a fraction of the file and lands where the fraction says; where down it stands is an
 * anchor *turn*, which is inset at both ends the way every row of the picture is (`centreAcross`,
 * src/lib/moireGeometry.ts) — the same argument `pushedRows` makes about the band a landing lifts.
 */
export function sparkCells(
  spark: Readonly<MoireCellSpark>,
  wide: number,
  deep: number,
): { left: number; top: number; across: number; down: number } {
  const across = Math.min(SPARK_CELLS, wide);
  const down = Math.min(SPARK_CELLS, deep);
  return {
    across,
    down,
    left: clamp(Math.round(spark.across * wide - across / 2), 0, wide - across),
    top: clamp(Math.round(centreAcross(spark.centre, deep) - down / 2), 0, deep - down),
  };
}
