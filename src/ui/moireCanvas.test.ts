/** @role Tests that a row covers the whole canvas at any stride, and never asks for more. */
import { describe, expect, it } from "vitest";

import { rowTicks } from "@/ui/moireCanvas";

describe("moireCanvas", () => {
  it("covers the canvas at every stride, and never asks for more ticks than it has pixels", () => {
    const width = 3000;
    // Ticks closer together than one is wide are a solid band, drawn as one rectangle: a run of
    // them would either stop partway across the row or cost one rectangle per cycle.
    expect(rowTicks(0.52, width)).toBeNull();
    expect(rowTicks(0, width)).toBeNull();
    for (const stride of [2, 3, 7.5, 100, 4000]) {
      const ticks = rowTicks(stride, width);
      expect(ticks).not.toBeNull();
      // The last tick lands at or past the right edge, so the row is drawn all the way across.
      expect((ticks ?? 0) * stride).toBeGreaterThanOrEqual(width);
      // And the count is bounded by the canvas, because the stride is at least a tick wide.
      expect(ticks ?? 0).toBeLessThanOrEqual(width);
    }
  });
});
