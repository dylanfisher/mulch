/**
 * @role Tests the screen's own terms as arithmetic, with nothing painted: that four gratings and a
 *   band keep more of the ink than the screen takes at every density, that the band rolls on the
 *   picture's own motion and holds where that stops, and that the lattice comes round at the tile's
 *   edge rather than running a seam down the picture. Beside src/ui/moireScreen.test.ts, which
 *   stands at the line cap and paints for every case it holds (0045).
 * @instead What the painter puts down, and where → src/ui/moireScreen.test.ts. The terms themselves
 *   → src/lib/moireScreenFilm.ts. The alphabet the marks are written in →
 *   src/ui/moireScreenAlphabet.test.ts.
 */
import { describe, expect, it } from "vitest";

import type { MoireRow } from "@/lib/moire";
import { moireRow as row } from "@/lib/moireRow";
import {
  bandKeep,
  beatPx,
  blobKeep,
  columnKeep,
  gridPitchPx,
  rowPitchPx,
  scanKeep,
  SCREEN_FLOOR,
  tilePx,
} from "@/lib/moireScreenFilm";
import { bandTurns } from "@/ui/moireScreen";

/** The loop's own row at a phase: the reference every band here is rolled against. */
const reference = (phase: number): MoireRow => row({ period: 4, phase, reference: true });

describe("the screen's own terms", () => {
  it("keeps more of the ink than the screen takes, at every density", () => {
    // A texture over the picture and not a mask cut out of it: four gratings and a band multiply
    // into every pixel, so the floor is on the whole tile and not on any one of them.
    for (const dpr of [1, 2, 3]) {
      const pitch = gridPitchPx(dpr);
      const rowPitch = rowPitchPx(dpr);
      const width = beatPx(pitch);
      const height = tilePx(6 * beatPx(rowPitch), rowPitch);
      let kept = 0;
      for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++)
          kept +=
            columnKeep(x, pitch) * scanKeep(y, rowPitch, height) * blobKeep(x, y, pitch, rowPitch);
      expect(kept / (width * height)).toBeGreaterThan(SCREEN_FLOOR);
    }
  });

  it("rolls the band on the picture's own motion and holds where that stops", () => {
    // No clock of its own: the reference row is the deck's read position, so a halted yard — the
    // one that is painted and not animated (0040) — draws the band where it stopped.
    const other = row({ period: 2, phase: 0.7 });
    expect(bandTurns([other, reference(0)])).toBe(0);
    expect(bandTurns([other, reference(1)])).toBeCloseTo(0.25, 10);
    expect(bandTurns([other, reference(3)])).toBeCloseTo(0.75, 10);
    // Twice, with nothing moved between: the same picture, and not a frame further on.
    expect(bandTurns([other, reference(1)])).toBe(bandTurns([other, reference(1)]));
    // A picture with no loop under it has no band to roll and no second clock to roll it.
    expect(bandTurns([other])).toBe(0);
  });

  it("brings the lattice round rather than running a seam down the picture", () => {
    // The tile is shifted, not rebuilt, so its two ends are the same place: a discontinuity here
    // is an edge travelling down the picture once a cycle. Read at the heights a canvas actually
    // takes and not at the divisible ones — the strip is 32 CSS pixels and the overlay is whatever
    // the shell leaves.
    const rowPitch = rowPitchPx(2);
    const cell = beatPx(rowPitch);
    for (const canvasPx of [1, 17, 64, 599, 1200]) {
      const height = tilePx(canvasPx, rowPitch);
      expect(height % cell).toBe(0);
      expect(height).toBeGreaterThanOrEqual(canvasPx);
      for (const y of [0, 1, cell - 1, cell, height - 1])
        expect(scanKeep(y + height, rowPitch, height)).toBeCloseTo(
          scanKeep(y, rowPitch, height),
          10,
        );
    }
    // And it is a band and not a flat tint: darkest at the tile's own zero, gone at its middle.
    const tall = tilePx(599, rowPitch);
    expect(bandKeep(0, tall)).toBeLessThan(bandKeep(tall / 2, tall));
    expect(bandKeep(tall / 2, tall)).toBe(1);
  });
});
