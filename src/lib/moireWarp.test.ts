/**
 * @role Tests the warp a sway bends the field with: that it rests at nothing, is bounded at the
 *   ceiling, and comes round on its own phase.
 * @instead Where the slices are actually slid → src/ui/moireCanvas.test.ts.
 */
import { describe, expect, it } from "vitest";

import { WARP_CEILING, warpShare, warpSlideX, warpSlideY } from "./moireWarp.ts";

describe("the warp a sway bends the field with", () => {
  it("bends nothing at rest, and never past the ceiling", () => {
    expect(warpShare(0)).toBe(0);
    expect(warpShare(-1)).toBe(0);
    expect(warpShare(1)).toBe(WARP_CEILING.value);
    expect(warpShare(4)).toBe(WARP_CEILING.value);
    for (let t = 0; t <= 2; t += 0.05) {
      expect(warpSlideX(0, 0.3, t)).toBeCloseTo(0);
      expect(warpSlideY(0, 0.3, t)).toBeCloseTo(0);
      expect(Math.abs(warpSlideX(warpShare(1), 0.3, t))).toBeLessThanOrEqual(WARP_CEILING.value);
      expect(Math.abs(warpSlideY(warpShare(1), 0.3, t))).toBeLessThanOrEqual(WARP_CEILING.value);
    }
  });

  it("comes round a whole turn of phase, and the two passes never share a slide", () => {
    const share = warpShare(0.5);
    expect(warpSlideX(share, 0.2, 0.4)).toBeCloseTo(warpSlideX(share, 1.2, 0.4));
    expect(warpSlideY(share, 0.2, 0.4)).toBeCloseTo(warpSlideY(share, 1.2, 0.4));
    // A phase that moves moves the bend: the sway's own rate is what walks it.
    expect(warpSlideX(share, 0.2, 0.4)).not.toBeCloseTo(warpSlideX(share, 0.45, 0.4));
    // And the down pass and the across pass are not one diagonal: at the same place and phase
    // they bend by different amounts.
    expect(warpSlideX(share, 0.2, 0.4)).not.toBeCloseTo(warpSlideY(share, 0.2, 0.4));
  });
});
