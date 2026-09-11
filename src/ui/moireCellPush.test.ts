/**
 * @role The push a landing puts on the marks: the snap up at the landing's own level, the fall over
 *   a share of the loop, the ring that keeps the boldest few landings falling at once, and the cell
 *   rows one of them stands in.
 * @instead How hard a landing struck at all, and the whole field's answer to a hit →
 *   src/ui/moireJolt.test.ts, which also holds the read that times this fall against the loop.
 *   Where the push is spent — the boxed read lifted one mark before a band is cut out of it →
 *   src/ui/moireCanvasMarks.test.ts.
 */
import { describe, expect, it } from "vitest";

import { DRIFT_CENTRE_SWING } from "@/lib/moire";
import { centreAcross } from "@/lib/moireGeometry";
import { resetTuning } from "@/lib/moireTuning";
import {
  CELL_DECAY,
  CELL_PUSHES,
  cellPushInto,
  cellPushRest,
  PUSH_BAND,
  pushedRows,
} from "@/ui/moireCellPush";

/** How long a whole fall takes at the rest, on a loop of four seconds. */
const OVER = CELL_DECAY.rest * 4;

// One flat list of the push's cases, each a few lines against the one module (0007).
// oxlint-disable-next-line max-lines-per-function
describe("the push a landing puts on the marks", () => {
  it("takes a landing up outright and lets it fall over its share of the loop", () => {
    resetTuning();
    const pushes = cellPushRest();
    expect(pushes).toHaveLength(CELL_PUSHES);
    for (const push of pushes) expect(push.at).toBe(0);
    // Up outright on the frame the landing sounds, at the level it landed at and the place it
    // stands: a flare that eased in is not a landing.
    cellPushInto(pushes, 1, 0.25, 0.05, OVER);
    expect(pushes[0]?.at).toBe(1);
    expect(pushes[0]?.centre).toBe(0.25);
    // And down at a constant rate from there: a quarter of the fall is a quarter gone.
    cellPushInto(pushes, 0, 0, OVER / 4, OVER);
    expect(pushes[0]?.at).toBeCloseTo(0.75, 12);
    cellPushInto(pushes, 0, 0, OVER, OVER);
    expect(pushes[0]?.at).toBe(0);
    // And never longer than the loop it is a share of, whatever the dial is set to.
    expect(CELL_DECAY.max).toBe(1);
  });

  it("falls outright where there is no clock to fall against", () => {
    const pushes = cellPushRest();
    cellPushInto(pushes, 1, 0.5, 0.05, OVER);
    // A halted yard, or one with no loop to take a share of: the answer the jolt, the ink and the
    // wind all give (0144).
    cellPushInto(pushes, 0, 0, 0.05, 0);
    for (const push of pushes) expect(push.at).toBe(0);
  });

  it("keeps the boldest few landings falling at once and drops the rest", () => {
    const pushes = cellPushRest();
    // Four landings, each into a slot of its own, because every slot is weaker than what lands.
    for (let landing = 0; landing < CELL_PUSHES; landing++) {
      cellPushInto(pushes, 1 - landing / 10, landing / 10, 0, OVER);
    }
    expect(pushes.map((push) => push.at)).toEqual([1, 0.9, 0.8, 0.7]);
    // A fifth, bolder than the weakest, takes the weakest slot and nothing else moves.
    cellPushInto(pushes, 0.75, 0.9, 0, OVER);
    expect(pushes.map((push) => push.at)).toEqual([1, 0.9, 0.8, 0.75]);
    expect(pushes[3]?.centre).toBe(0.9);
    // One weaker than every slot is dropped outright: what the picture shows is the boldest four.
    cellPushInto(pushes, 0.5, 0.1, 0, OVER);
    expect(pushes.map((push) => push.at)).toEqual([1, 0.9, 0.8, 0.75]);
    // And a landing with no distance behind it is not a landing at all.
    cellPushInto(pushes, 0, 0.1, 0, OVER);
    expect(pushes.map((push) => push.at)).toEqual([1, 0.9, 0.8, 0.75]);
  });

  it("stands in the cell rows its own anchor could be standing in, and no others", () => {
    // The band is one step of the ladder a row's anchor is quantised onto, and never a second
    // declaration of how far apart two anchors stand (principle 1).
    expect(PUSH_BAND).toBe(DRIFT_CENTRE_SWING);
    const deep = 32;
    // And it stands where the rows themselves stand: a centre is an anchor turn, and where a turn
    // lands is `centreAcross` — inset a quarter from either end. Read straight down the picture
    // instead, a landing at nought would flare the top of it and the rows would be a quarter down.
    const middle = pushedRows({ at: 1, centre: 0.5 }, deep);
    expect(middle).toEqual({ top: 15, of: 2 });
    expect(middle.top).toBeLessThanOrEqual(centreAcross(0.5, deep));
    const first = pushedRows({ at: 1, centre: 0 }, deep);
    expect(first.top).toBe(Math.floor(centreAcross(0, deep)));
    expect(first.top, "and never at the top of a picture no anchor reaches").toBeGreaterThan(0);
    // Two landings a step apart light two bands that do not touch, at any depth: they share the one
    // edge between them, and a cell taken by both would be lifted twice — two marks where the band
    // is one.
    for (const rows of [30, 32, 61, 144]) {
      const lower = pushedRows({ at: 1, centre: 0.5 }, rows);
      const upper = pushedRows({ at: 1, centre: 0.5 - PUSH_BAND }, rows);
      const under = pushedRows({ at: 1, centre: 0.5 + PUSH_BAND }, rows);
      expect(upper.top + upper.of, `a picture ${rows} cells deep, above`).toBeLessThanOrEqual(
        lower.top,
      );
      expect(lower.top + lower.of, `a picture ${rows} cells deep, below`).toBeLessThanOrEqual(
        under.top,
      );
    }
    // Cut to the grid at either end, and never off it — the far end being where an anchor's own
    // travel stops and not the foot of the picture.
    const bottom = pushedRows({ at: 1, centre: 1 }, deep);
    expect(bottom.top + bottom.of).toBe(Math.ceil(centreAcross(1, deep)));
    expect(bottom.top + bottom.of).toBeLessThan(deep);
    // And at least one row wherever it stands, however few cells the picture holds: a band narrower
    // than a cell still stands in the cell it is inside.
    for (const centre of [0, 0.3, 0.5, 0.99, 1]) {
      const one = pushedRows({ at: 1, centre }, 1);
      expect(one, `a picture one cell deep, at ${centre}`).toEqual({ top: 0, of: 1 });
    }
  });
});
