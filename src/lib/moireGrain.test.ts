/**
 * @role Tests the noise tile a wobbling picture is grained with: that it is written into alpha
 *   alone, one value per speck and sparse by the floor, and that it is the same tile every run —
 *   which is what makes it a bake and not a frame's work (0129, 0285).
 * @instead How hard the grain bites and where the tile is swept → src/lib/moireLook.test.ts, which
 *   this case split out of with its source at the hard cap (0286).
 */
import { describe, expect, it } from "vitest";

import { GRAIN_FLOOR, GRAIN_SPECK, GRAIN_TILE, grainTile } from "@/lib/moireGrain";

describe("the grain tile", () => {
  it("bakes one sparse value per speck into alpha alone, the same way every run", () => {
    // The tile is baked once, into alpha alone: one value per speck, sparse by the floor, and
    // nothing in the colour channels — a grain takes ink out, and the composite reads the alpha.
    const bytes = new Uint8ClampedArray(GRAIN_TILE * GRAIN_TILE * 4);
    grainTile(bytes, GRAIN_TILE, GRAIN_SPECK);
    let lit = 0;
    let colour = 0;
    for (let at = 0; at < bytes.length; at += 4) {
      if ((bytes[at + 3] ?? 0) > 0) lit += 1;
      colour += (bytes[at] ?? 0) + (bytes[at + 1] ?? 0) + (bytes[at + 2] ?? 0);
    }
    expect(colour).toBe(0);
    const specks = bytes.length / 4;
    expect(lit / specks).toBeGreaterThan(0.2);
    expect(lit / specks).toBeLessThan(1 - GRAIN_FLOOR + 0.1);
    // One value per speck and the same value every run, which is what makes it a bake: the whole
    // block a speck covers holds one number, and a second bake writes the first one again.
    for (const at of [0, 5 * GRAIN_SPECK, 40 * GRAIN_SPECK]) {
      const speck = bytes[(at * GRAIN_TILE + at) * 4 + 3];
      for (let y = at; y < at + GRAIN_SPECK; y++) {
        for (let x = at; x < at + GRAIN_SPECK; x++) {
          expect(bytes[(y * GRAIN_TILE + x) * 4 + 3]).toBe(speck);
        }
      }
    }
    const again = new Uint8ClampedArray(GRAIN_TILE * GRAIN_TILE * 4);
    grainTile(again, GRAIN_TILE, GRAIN_SPECK);
    expect(again).toEqual(bytes);
    // A speck no wide grains nothing, and says so rather than writing a tile of nothing (principle 5).
    expect(() => {
      grainTile(again, GRAIN_TILE, 0);
    }).toThrow(/grains nothing/u);
  });
});
