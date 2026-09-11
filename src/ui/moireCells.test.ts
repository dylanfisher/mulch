/**
 * @role Tests which passes over the cells a standing rack runs and the key the tile they bake is
 *   held under (0349): that a look declaring no pass is in none of it and writes nothing into the
 *   key, that a look on its way in or out is read at the step it has travelled to, and that every
 *   term reaching the bake is one of the look's own.
 * @instead What a pass does to the cells → src/lib/moireCells.test.ts. That the passes reach the
 *   bake and move no ink → src/ui/moireCanvasMarks.test.ts. Which looks a rack stands at all →
 *   src/ui/moireLooks.test.ts.
 */
import { describe, expect, it } from "vitest";

import { CELL_TERMS } from "@/lib/moireCells";
import { DRIFT_STEPS } from "@/lib/moire";
import { LOOKS, type LookName, type LookTerm, type LookTerms } from "@/lib/moireLook";
import type { MoireLook } from "@/ui/moireLooks";
import { cellsKey, rackCells } from "@/ui/moireCells";

/** One look of a standing rack, arrived — the shape `rackLooks` answers with. */
const look = (name: LookName, terms: LookTerms = {}, at = 1, key: string = name): MoireLook => ({
  key,
  look: name,
  presence: at,
  at,
  terms,
  held: 0,
});

// One flat list of the reading's cases (0007).
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("the passes a standing rack runs over the cells", () => {
  it("holds one entry per standing look that declares a pass, and none for the rest", () => {
    // The step's own case: a pass declared by no standing effect runs nothing, and the key of a
    // picture whose rack declares none is the key it was already held under.
    expect(rackCells([])).toHaveLength(0);
    expect(cellsKey([])).toBe("");
    const bare = rackCells([look("warp", { bend: 1, wander: 1 }), look("blocks", { block: 1 })]);
    expect(bare).toHaveLength(0);
    expect(cellsKey(bare)).toBe("");
    // And both of the block's own: the delay's and the reverb's, in the rack's own order, each
    // carrying the pass its look declared.
    const standing = rackCells([
      look("echoes", { spacing: 1, count: 1, fade: 1 }),
      look("bloom", { amount: 1, radius: 1 }),
    ]);
    expect(standing.map((cells) => cells.look)).toEqual(["echoes", "bloom"]);
    // The set carries the name and never the function: the runner looks the pass up, because a
    // standing set crosses to the worker as the order a bake is made of (0354).
    for (const cells of standing) expect(LOOKS[cells.look].cells).toBeDefined();
    expect(cellsKey(standing)).not.toBe("");
  });

  it("reads every look at the step its travel has reached, and drops one that has left", () => {
    // A knob turned is a rebake and a knob held is not: presence and terms alike are stepped onto
    // the ladder the ink's own terms walk (`stepped`, src/ui/moireScreenInk.ts).
    const step = 1 / DRIFT_STEPS;
    const part = rackCells([look("bloom", { amount: 1, radius: step * 1.4 }, step * 2.4)]);
    expect(part[0]?.at).toBeCloseTo(step * 2, 12);
    expect(part[0]?.terms.radius).toBeCloseTo(step, 12);
    // Two racks a hair apart are one tile and not two.
    expect(cellsKey(rackCells([look("bloom", { radius: step * 1.4 }, step * 2.4)]))).toBe(
      cellsKey(rackCells([look("bloom", { radius: step * 1.2 }, step * 2.1)])),
    );
    // And a look the picture has travelled out of is in none of it: a pass at nought does nothing,
    // and leaving it in the set would put a term nobody can see into the tile's key.
    expect(rackCells([look("bloom", { radius: 1 }, 0)])).toHaveLength(0);
  });

  it("carries the look's own terms and no others into the key", () => {
    // The step's other refusal: a pass whose terms are not the look's own. Every term a pass reads
    // is one the entry declared into its look, so `CELL_TERMS` is a subset of the whole set and a
    // term nobody declared stands at nought.
    const declared: Partial<Record<LookTerm, unknown>> = {
      ...LOOKS.echoes.terms,
      ...LOOKS.bloom.terms,
    };
    for (const term of CELL_TERMS) expect(declared[term], `${term} is nobody's term`).toBeDefined();
    const standing = rackCells([look("echoes", { spacing: 1, count: 0, fade: 1 })]);
    expect(standing[0]?.terms.spacing).toBe(1);
    expect(standing[0]?.terms.count).toBe(0);
    expect(standing[0]?.terms.radius).toBe(0);
    // The fade is the delay's own term and no cell pass reads it, so two delays that differ only
    // in it are one tile.
    expect(cellsKey(standing)).toBe(
      cellsKey(rackCells([look("echoes", { spacing: 1, count: 0 })])),
    );
  });
});
