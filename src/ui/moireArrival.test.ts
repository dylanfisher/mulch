/**
 * @role What a row joining the picture or leaving it does to the whole of it: the share one row is
 *   in the picture at all, how a rebuilt set takes that share off the set it replaces, how a row
 *   the session has dropped goes on being drawn until it has finished leaving, and the one thing
 *   all of it is for — the picture's weight moving continuously across a population change instead
 *   of restacking between two frames.
 * @instead The share's own step → src/lib/moireArrival.ts. The rows a set holds and the read that
 *   fills them → src/ui/moireRows.test.ts. The other three things a rebuilt set carries →
 *   src/ui/moireRowsField.test.ts, where the ground's own carry is measured.
 */
import { describe, expect, it } from "vitest";

import { emptyDeckPeek } from "@/audio/deckPeek";
import { effectById } from "@/audio/effects/registry";
import { fractalStopsRest } from "@/lib/moireFractal";
import { DRIFT_ARRIVAL_SECS } from "@/lib/moireArrival";
import { PLAIN_CUT } from "@/lib/moireSound";
import { emptyMasterPeek } from "@/audio/context";
import { carryArrivals } from "@/ui/moireCarry";
import { drawnGratings } from "@/ui/moireCanvas";
import { NO_GROWN } from "@/ui/moireGrown";
import { moireRows, refillRows } from "@/ui/moireRows";
import { joltRest } from "@/ui/moireJolt";
import { screenInkRest } from "@/ui/moireScreenInk";
import type { MoireRowSet } from "@/ui/moireRowsField";
import { shapeRest } from "@/ui/moireShape";
import type { DeckState } from "@/state/store";

/** A rack instance the way the session builds one: every parameter its entry declares, at rest. */
const instance = (id: string): DeckState["effects"][number] => ({
  id,
  effect: "delay",
  bypassed: false,
  params: Object.fromEntries(effectById("delay").params.map((param) => [param.id, param.default])),
  automation: {},
  bounds: {},
});

const built = (effects: DeckState["effects"]): MoireRowSet =>
  moireRows([], effects, 4, PLAIN_CUT, null, NO_GROWN, null);

/**
 * One read of a set, `elapsed` seconds on from the last, on a yard that is sounding — which is what
 * gives a share a clock to travel against at all (`arrivedInto`).
 */
function read(set: MoireRowSet, elapsed: number): void {
  const peek = emptyDeckPeek();
  peek.sounding = 1;
  refillRows(
    set.rows,
    set.reads,
    peek,
    1,
    null,
    4,
    null,
    emptyMasterPeek(),
    elapsed,
    0,
    fractalStopsRest(),
    fractalStopsRest(),
    screenInkRest(),
    [],
    joltRest(),
    shapeRest(),
  );
}

/** How much of the picture the row named `key` is, wherever the set is holding it. */
function shareOf(set: MoireRowSet, key: string): number {
  const at = set.reads.findIndex((row) => row.key === key);
  const row = set.rows[at];
  if (row === undefined) throw new Error(`the picture holds no row called ${key}`);
  return row.arrival;
}

describe("a row arriving in the picture", () => {
  /**
   * The whole point of the share. What the picture weighs is solved for how many rows there are
   * (`gratingDepth`), so an effect added at once moved every other row's depth between two frames —
   * the flash the picture used to answer a rack change with. A row arrives as the fraction it is
   * instead, so the frame after the add weighs what the frame before it did.
   */
  it("admits an added row over the arrival rather than between two frames", () => {
    // Two instances and then three, so the macro row is out of the picture either side of the add
    // and the count moves by exactly the row that arrived (`macroInto`, src/ui/moireRowsField.ts).
    const was = built([instance("fx1"), instance("fx2")]);
    read(was, DRIFT_ARRIVAL_SECS);
    const before = drawnGratings(was.rows, 0);

    const now = built([instance("fx1"), instance("fx2"), instance("fx3")]);
    carryArrivals(was, now);
    expect(shareOf(now, "rack:fx1")).toBe(1);
    expect(shareOf(now, "rack:fx3")).toBe(0);
    // The frame the rack changed on weighs what the frame before it weighed: the added row is
    // nought of a grating, so the count the depth is solved for has not moved. Read for no time at
    // all first, because a frame is a read — the lattice over the rack is cut as loud as the
    // output is and weighs nothing until one has said how loud that is (`latticeHeard`).
    read(now, 0);
    expect(drawnGratings(now.rows, 0)).toBeCloseTo(before, 9);

    // A quarter of the way in it is a quarter of a row, and the count has moved a quarter of the
    // way — which is the motion, and it is the thing a flash is not.
    read(now, DRIFT_ARRIVAL_SECS / 4);
    expect(shareOf(now, "rack:fx3")).toBeCloseTo(0.25, 9);
    expect(drawnGratings(now.rows, 0)).toBeCloseTo(before + 0.25, 9);

    read(now, DRIFT_ARRIVAL_SECS);
    expect(shareOf(now, "rack:fx3")).toBe(1);
    expect(drawnGratings(now.rows, 0)).toBeCloseTo(before + 1, 9);
  });

  /**
   * And the same event the other way round. A removed instance has no row in the set that replaces
   * it, so without this the picture loses a whole grating in one frame — which is the same flash
   * read backwards.
   */
  it("holds a dropped row in the picture until it has finished leaving", () => {
    const was = built([instance("fx1"), instance("fx2"), instance("fx3")]);
    read(was, DRIFT_ARRIVAL_SECS);
    const before = drawnGratings(was.rows, 0);

    const now = built([instance("fx1"), instance("fx2")]);
    carryArrivals(was, now);
    expect(shareOf(now, "rack:fx3")).toBe(1);
    expect(now.reads.some((row) => row.key === "rack:fx3" && row.leaving)).toBe(true);
    read(now, 0);
    expect(drawnGratings(now.rows, 0)).toBeCloseTo(before, 9);

    read(now, DRIFT_ARRIVAL_SECS / 2);
    expect(shareOf(now, "rack:fx3")).toBeCloseTo(0.5, 9);
    expect(drawnGratings(now.rows, 0)).toBeCloseTo(before - 0.5, 9);
    read(now, DRIFT_ARRIVAL_SECS);
    expect(shareOf(now, "rack:fx3")).toBe(0);
    expect(drawnGratings(now.rows, 0)).toBeCloseTo(before - 1, 9);
    // And the next rebuild is where a row wholly gone stops being carried at all.
    const after = built([instance("fx1"), instance("fx2")]);
    carryArrivals(now, after);
    expect(after.reads.some((row) => row.key === "rack:fx3")).toBe(false);
  });

  /**
   * And no travel at all on a yard with no clock to travel against, which is the answer the ink and
   * the wind both give one: a halted picture is painted on a commit and never on a frame (0144), so
   * a share timed against a clock that is not running would strand every row it had not admitted.
   */
  it("admits a row outright on a yard that is not sounding", () => {
    const was = built([instance("fx1")]);
    const now = built([instance("fx1"), instance("fx2")]);
    carryArrivals(was, now);
    const peek = emptyDeckPeek();
    expect(peek.sounding).toBe(0);
    refillRows(
      now.rows,
      now.reads,
      peek,
      1,
      null,
      4,
      null,
      emptyMasterPeek(),
      0.05,
      0,
      fractalStopsRest(),
      fractalStopsRest(),
      screenInkRest(),
      [],
      joltRest(),
      shapeRest(),
    );
    expect(shareOf(now, "rack:fx2")).toBe(1);
  });

  /**
   * And a row is matched by its own name and never by where it stands: removing the first of two
   * instances shifts every row after it, and a share taken by index would hand the second row the
   * first one's — which is the failure the key exists for.
   */
  it("matches a row by its own name and not by where it stands", () => {
    const first = built([instance("fx1")]);
    read(first, DRIFT_ARRIVAL_SECS);
    // A second instance, a quarter admitted — so the two rows in the picture hold two shares and a
    // carry that took the wrong one would say so.
    const was = built([instance("fx1"), instance("fx2")]);
    carryArrivals(first, was);
    read(was, DRIFT_ARRIVAL_SECS / 4);
    expect(shareOf(was, "rack:fx1")).toBe(1);
    expect(shareOf(was, "rack:fx2")).toBeCloseTo(0.25, 9);

    // Now the *first* instance is removed, so the row that was second stands first. By index it
    // would inherit the share of the row that has left; by name it keeps its own.
    const then = built([instance("fx2")]);
    carryArrivals(was, then);
    expect(shareOf(then, "rack:fx2")).toBeCloseTo(0.25, 9);
    expect(shareOf(then, "rack:fx1")).toBe(1);
    expect(then.reads.some((row) => row.key === "rack:fx1" && row.leaving)).toBe(true);
  });
});
