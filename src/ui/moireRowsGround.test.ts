/**
 * @role The ground a yard whose walk stands nowhere is measured from: its loop, and the travel the
 *   field makes to a loop a hand has moved — over half the loop while the yard sounds, and outright
 *   on a halted one (0274, 0235).
 * @instead The rows a lane, a rack instance, a grown run and the macro row make →
 *   src/ui/moireRows.test.ts, which is at the 800-line hard cap and which this case would have put
 *   over it (0045). The ground the walk reads inside the loop, and the module's rows on it →
 *   src/ui/moireRowsSong.test.ts. The two rows that belong to the whole field →
 *   src/ui/moireRowsField.test.ts. The stand itself as arithmetic → src/lib/playerDrift.test.ts.
 */
import { describe, expect, it } from "vitest";

import { emptyMasterPeek } from "@/audio/context";
import { emptyDeckPeek } from "@/audio/deckPeek";
import { DRIFT_CENTRE_REACH, DRIFT_REST } from "@/lib/moire";
import { fractalStopsRest } from "@/lib/moireFractal";
import { PLAIN_CUT } from "@/lib/moireSound";
import { PLAYER_GROUND_TRAVEL, playerGroundSecs } from "@/lib/playerDrift";
import type { Loop } from "@/lib/timeline";
import { NO_GROWN } from "@/ui/moireGrown";
import { joltRest } from "@/ui/moireJolt";
import { moireRows, refillRows } from "@/ui/moireRows";
import { screenInkRest } from "@/ui/moireScreenInk";
import { shapeRest } from "@/ui/moireShape";

/** An output with nothing in it: the ground is read off the loop and never off the bus. */
const SILENT_MASTER = emptyMasterPeek();
/** A read with all the time in the world behind it: a move that has already finished travelling. */
const ARRIVED = Number.POSITIVE_INFINITY;
/** A picture of a performance that has just begun. */
const FRESH = 0;
/** The picture's own structure at rest, so nothing here but the ground travels. */
const STOOD = fractalStopsRest();

// One case over one ground, a line past the cap since the ink travel gained the term no row claims
// (0283). See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("the loop as the ground", () => {
  // One ground read at eight elapsed times through one closure: splitting it would hand `rows`,
  // `reads` and the reference row between two cases that are the same picture (0292 added the
  // no-loop pair). See docs/decisions/0007-reviewed-oversized-functions.md.
  // oxlint-disable-next-line max-lines-per-function
  it("travels the field to a moved loop over half the loop while the yard sounds, and stands on it outright halted", () => {
    // 0274: a loop is a place the yard really is reading, so a hand moving it across the file is a
    // ground move like a jump is — and the picture is the one surface that could show it (0235).
    const { rows, reads } = moireRows([], [], 2, PLAIN_CUT, null, NO_GROWN, null);
    const at = reads.findIndex((read) => read.heard !== null);
    const reference = rows[at];
    if (reference === undefined) throw new Error("the picture has no reference row");
    const duration = 16;
    const travelled = (loop: Loop | null, elapsed: number, sounding: number): number => {
      refillRows(
        rows,
        reads,
        { ...emptyDeckPeek(), sounding },
        1,
        loop,
        duration,
        null,
        SILENT_MASTER,
        elapsed,
        FRESH,
        STOOD,
        STOOD,
        screenInkRest(),
        [],
        joltRest(),
        shapeRest(),
      );
      return reference.centre;
    };
    // Standing at the top of the file, and the loop is dragged to the middle of it.
    expect(travelled({ in: 0, out: 2 }, ARRIVED, 1)).toBe(0);
    const over = playerGroundSecs(2);
    expect(over).toBe(2 * PLAYER_GROUND_TRAVEL);
    // A quarter of the travel in a quarter of it: the rate is the whole reach over half the loop,
    // so a jump across the file sweeps where a nudge along it slides.
    expect(travelled({ in: 8, out: 10 }, over / 4, 1)).toBeCloseTo(DRIFT_CENTRE_REACH / 4, 12);
    expect(travelled({ in: 8, out: 10 }, over / 4, 1)).toBeCloseTo(DRIFT_CENTRE_REACH / 2, 12);
    // Arrived, and it stays arrived.
    expect(travelled({ in: 8, out: 10 }, over, 1)).toBe(8 / 16);
    // Every row on the ground went with it: the field is one ground.
    for (const [index, read] of reads.entries()) {
      if (read.heard !== null || read.ground !== null) expect(rows[index]?.centre).toBe(8 / 16);
    }
    // A halted yard is painted on a commit and never on a frame, so the loop it was moved to is
    // where it stands, outright.
    expect(travelled({ in: 4, out: 6 }, 0, 0)).toBe(4 / 16);
    // And no loop at all is the whole file, the loop it stands on: the top of it, not the middle
    // (0292), and outright however little of the window has passed — a loop cleared is not a loop
    // dragged along, and half the file is minutes of gliding.
    expect(travelled(null, over / 8, 1)).toBe(0);
    expect(travelled(null, ARRIVED, 1)).toBe(0);
    expect(DRIFT_REST.centre).not.toBe(0);
  });
});
