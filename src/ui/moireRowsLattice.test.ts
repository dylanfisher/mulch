/**
 * @role Tests the lattice the rack stands in: that a rack holding anything puts one row over the
 *   whole picture and an empty or bypassed one puts none, that it is cut as loud as the output is
 *   off the shape the read travels, and that it stands on the ground with its phase on the deck's
 *   own clock (0278).
 * @instead The other rows the whole field owns → src/ui/moireRowsField.test.ts, which this split
 *   out of at the 800-line hard cap (0045). How the shape it is cut from is read and travelled →
 *   src/ui/moireShape.test.ts. The cell itself → src/lib/moireLattice.test.ts.
 */
import { describe, expect, it } from "vitest";

import { emptyMasterPeek } from "@/audio/context";
import { emptyDeckPeek } from "@/audio/deckPeek";
import { effectParamDefaults } from "@/audio/params";
import { fold } from "@/lib/copy";
import { FLAT_BEND, LINEAR_GEOMETRY, type MoireRow } from "@/lib/moire";
import { fractalStopsRest } from "@/lib/moireFractal";
import { LATTICE_CUT, LATTICE_GEOMETRY } from "@/lib/moireLattice";
import { PLAIN_PROFILE } from "@/lib/moireProfiles";
import { PLAIN_CUT } from "@/lib/moireSound";
import { NO_GROWN } from "@/ui/moireGrown";
import { joltRest } from "@/ui/moireJolt";
import { moireRows, refillRows as filledRows, type MoireLane } from "@/ui/moireRows";
import { ROW_KEYS } from "@/ui/moireRowsField";
import { screenInkRest } from "@/ui/moireScreenInk";
import { shapeRest } from "@/ui/moireShape";

/** One deck lane as a row: something in the picture beside the field's own (moireRowsField.test.ts). */
const lane: MoireLane = {
  key: "a lane of this yard's own",
  period: 2,
  shape: fold("a lane of this yard's own"),
  bend: FLAT_BEND,
  profile: PLAIN_PROFILE,
  geometry: LINEAR_GEOMETRY,
};

/** One row of a picture, or a loud no: an index the picture does not hold is a broken fixture. */
const rowAt = (rows: readonly MoireRow[], at: number): MoireRow => {
  const row = rows.at(at);
  if (row === undefined) throw new Error(`the picture has no row ${at}`);
  return row;
};

const SILENT_MASTER = emptyMasterPeek();
const ARRIVED = Number.POSITIVE_INFINITY;
const STOOD = fractalStopsRest();

describe("the lattice the rack stands in", () => {
  it("stands a lattice over a rack holding anything, and cuts it as loud as the output is", () => {
    // No rack, no lattice: the picture drawn before there was a rack in it (0278).
    const bare = moireRows([lane], [], 4, PLAIN_CUT, null, NO_GROWN, null);
    expect(bare.reads.some((read) => read.lattice)).toBe(false);
    // A bypassed entry is not in the picture, and neither is its lattice.
    const held = {
      id: "fx",
      effect: "reverb" as const,
      bypassed: true,
      params: effectParamDefaults("reverb", "fx"),
      automation: {},
      motion: {},
      bounds: {},
    };
    expect(
      moireRows([lane], [held], 4, PLAIN_CUT, null, NO_GROWN, null).reads.some(
        (read) => read.lattice,
      ),
    ).toBe(false);
    // One unbypassed entry is one lattice, last of all, cut along the cell and at no depth until a
    // read has said how loud the output is.
    const { rows, reads } = moireRows(
      [lane],
      [{ ...held, bypassed: false }],
      4,
      PLAIN_CUT,
      null,
      NO_GROWN,
      null,
    );
    expect(reads.filter((read) => read.lattice)).toHaveLength(1);
    expect(reads.at(-1)?.key).toBe(ROW_KEYS.lattice);
    const lattice = rowAt(rows, -1);
    expect(lattice.geometry).toBe(LATTICE_GEOMETRY);
    expect(lattice.depth).toBe(0);
    expect(lattice.reference).toBe(false);
    // Read on a quiet output it stands at the floor; read on a loud one, the whole cut — off the
    // shape the read travels, and never off the master directly, so a hit thickens it over the
    // shape's own window rather than between two frames (`shapeTravelInto`).
    const peek = emptyDeckPeek();
    filledRows(
      rows,
      reads,
      peek,
      1,
      null,
      0,
      null,
      SILENT_MASTER,
      ARRIVED,
      0,
      STOOD,
      STOOD,
      screenInkRest(),
      [],
      joltRest(),
      shapeRest(),
    );
    expect(lattice.depth).toBe(LATTICE_CUT[0]);
    filledRows(
      rows,
      reads,
      peek,
      1,
      null,
      0,
      null,
      SILENT_MASTER,
      ARRIVED,
      0,
      STOOD,
      STOOD,
      screenInkRest(),
      [],
      joltRest(),
      { ...shapeRest(), loud: 1 },
    );
    expect(lattice.depth).toBe(LATTICE_CUT[1]);
    // And it stands on the ground like the reference row, with its phase on the deck's own clock.
    const reference = rows[reads.findIndex((read) => read.heard !== null)];
    expect(lattice.centre).toBe(reference?.centre);
    expect(lattice.phase).toBe(0);
  });
});
