/**
 * @role The flash a spark puts on the marks: the light outright on the frame the peek begins
 *   reading a slot, the fall over the same share of the loop a landing's flare falls over, and the
 *   big mark's own square of cells.
 * @instead The flare of the landing that threw it → src/ui/moireCellPush.test.ts. Where the flash is
 *   spent — the boxed read lifted the whole ramp before a band is cut out of it →
 *   src/ui/moireCanvasMarks.test.ts.
 */
import { describe, expect, it } from "vitest";

import { centreAcross } from "@/lib/moireGeometry";
import { SCATTER_SPAN } from "@/lib/moireScreenScatter";
import { PLAYER_SPARK_COUNT_MAX } from "@/lib/playerSpark";
import {
  CELL_SPARKS,
  cellSparkInto,
  cellSparkRest,
  SPARK_CELLS,
  sparkCells,
} from "@/ui/moireCellSpark";

/** How long a whole fall takes here: the share of a loop the landing's own flare falls over. */
const OVER = 2;

/** The whole file one spark reads in, in buffer seconds. */
const DURATION = 8;

// One flat list of the spark's cases, each a few lines against the one module (0007).
// oxlint-disable-next-line max-lines-per-function
describe("the flash a spark puts on the marks", () => {
  it("lights a slot outright the frame it begins reading, and never again while it reads", () => {
    const sparks = cellSparkRest();
    expect(sparks).toHaveLength(PLAYER_SPARK_COUNT_MAX);
    expect(CELL_SPARKS).toBe(PLAYER_SPARK_COUNT_MAX);
    for (const spark of sparks) expect(spark.at).toBe(0);
    // Nothing reading is nothing flashing, which is the still lattice 0346 shipped.
    cellSparkInto(sparks, [], 1, DURATION, 0.5, 0.1, OVER);
    expect(sparks[0]?.at).toBe(0);
    // A slot the peek begins reading lights outright at the column it reads and on the ground its
    // landing stands: a flash that eased in is not a peak.
    cellSparkInto(sparks, [2], 1, DURATION, 0.25, 0.1, OVER);
    expect(sparks[0]?.at).toBe(1);
    expect(sparks[0]?.across).toBeCloseTo(0.25, 12);
    expect(sparks[0]?.centre).toBeCloseTo(0.25, 12);
    // And it falls from there even while the spark goes on sounding: a spark's read walks the file,
    // so a slot lit wherever its position moved would stand at full for as long as it lasted.
    cellSparkInto(sparks, [3], 1, DURATION, 0.25, OVER / 4, OVER);
    expect(sparks[0]?.at).toBeCloseTo(0.75, 12);
    expect(sparks[0]?.across, "the column is the one it lit at").toBeCloseTo(0.25, 12);
    // A landing that throws two flashes two, and the slots the peek is not reading stay dark.
    const two = cellSparkRest();
    cellSparkInto(two, [1, 5], 1, DURATION, 0.5, 0.1, OVER);
    expect(two.map((spark) => spark.at)).toEqual([1, 1, 0, 0]);
    expect(two[1]?.across).toBeCloseTo(0.625, 12);
  });

  it("falls away over its landing's own share of the loop, and outright on a halted yard", () => {
    const sparks = cellSparkRest();
    cellSparkInto(sparks, [4], 1, DURATION, 0.5, 0.1, OVER);
    // The spark stops sounding, and its flash goes on falling where it stands: the end of a sound
    // is not the end of the flash.
    cellSparkInto(sparks, [], 1, DURATION, 0.5, OVER / 2, OVER);
    expect(sparks[0]?.at).toBeCloseTo(0.5, 12);
    cellSparkInto(sparks, [], 1, DURATION, 0.5, OVER, OVER);
    expect(sparks[0]?.at).toBe(0);
    // And a slot that went quiet lights again the next time the peek reads it: the next landing's
    // own spark is an event of its own.
    cellSparkInto(sparks, [6], 1, DURATION, 0.5, 0.1, OVER);
    expect(sparks[0]?.at).toBe(1);
    expect(sparks[0]?.across).toBeCloseTo(0.75, 12);
    // A yard with no clock to fall against drops outright, which is the answer the jolt, the push
    // and the wind all give (0144).
    cellSparkInto(sparks, [], 1, DURATION, 0.5, 0.1, 0);
    expect(sparks[0]?.at).toBe(0);
    // And a file of no length has no column to read a buffer second onto, so it flashes nothing.
    const nowhere = cellSparkRest();
    cellSparkInto(nowhere, [1], 1, 0, 0.5, 0.1, OVER);
    expect(nowhere[0]?.at).toBe(0);
  });

  it("lights again for the next landing's spark, there being no quiet frame between them", () => {
    // The peek's list is a prefix of whatever landing is standing, not a set of slots that outlive
    // it (`peek`, src/audio/player.ts): at the rest delay two sparking landings butt up, so slot
    // nought goes straight from one landing's first spark to the next landing's with nothing empty
    // in between. Read off the flag alone, every flash after the first would be dropped and the
    // fallen one would keep the column of a spark that had stopped sounding.
    const sparks = cellSparkRest();
    cellSparkInto(sparks, [1], 7, DURATION, 0.5, 0.1, OVER);
    expect(sparks[0]?.at).toBe(1);
    cellSparkInto(sparks, [1.5], 7, DURATION, 0.5, OVER / 2, OVER);
    expect(sparks[0]?.at, "the same spark's read walking the file").toBeCloseTo(0.5, 12);
    expect(sparks[0]?.across).toBeCloseTo(0.125, 12);
    // And the next landing's own spark, on the very next frame and at the same slot: a flash of its
    // own, at its own column.
    cellSparkInto(sparks, [6], 8, DURATION, 0.25, 0.01, OVER);
    expect(sparks[0]?.at).toBe(1);
    expect(sparks[0]?.across).toBeCloseTo(0.75, 12);
    expect(sparks[0]?.centre).toBeCloseTo(0.25, 12);
  });

  it("covers step 5's own span of cells, centred where it reads and never off the grid", () => {
    // A spark is a peak event, and a peak is written as one big mark wherever this picture writes
    // one: the scatter's span and no second choice of it (0352).
    expect(SPARK_CELLS).toBe(SCATTER_SPAN);
    const wide = 40;
    const deep = 30;
    const middle = sparkCells(
      { at: 1, across: 0.5, centre: 0.5, lit: true, landing: 0 },
      wide,
      deep,
    );
    expect(middle.across).toBe(SPARK_CELLS);
    expect(middle.down).toBe(SPARK_CELLS);
    expect(middle.left).toBe(Math.round(0.5 * wide - SPARK_CELLS / 2));
    // Down the picture through the one map every row of it is drawn through: a centre is an anchor
    // turn and not a fraction of the height (`centreAcross`).
    expect(middle.top).toBe(Math.round(centreAcross(0.5, deep) - SPARK_CELLS / 2));
    // Never off the grid at either end: the block is the same size wherever it lands.
    for (const across of [0, 1]) {
      for (const centre of [0, 1]) {
        const box = sparkCells({ at: 1, across, centre, lit: true, landing: 0 }, wide, deep);
        expect(box.left, `a spark at ${across}`).toBeGreaterThanOrEqual(0);
        expect(box.left + box.across).toBeLessThanOrEqual(wide);
        expect(box.top, `on the ground ${centre}`).toBeGreaterThanOrEqual(0);
        expect(box.top + box.down).toBeLessThanOrEqual(deep);
      }
    }
    // And a picture narrower than the span is covered whole, which is the big mark as large as it
    // can be drawn there.
    const tiny = sparkCells({ at: 1, across: 0.5, centre: 0.5, lit: true, landing: 0 }, 2, 1);
    expect([tiny.left, tiny.across, tiny.top, tiny.down]).toEqual([0, 2, 0, 1]);
  });
});
