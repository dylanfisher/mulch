/**
 * @role The crawl both grounds walk: where an offset stands at its nth move, that staying put is
 *   coming home, and that a walk grown later is the walk it would have been asked for at once.
 * @instead The shared ground's clock and its durable shape → ./sessionGround.test.ts.
 */
import { describe, expect, it } from "vitest";

import { crawlBedAt, type Crawl } from "./playerCrawl.ts";

const WANDERS: Crawl = { seed: 11, home: 0, lean: { distance: 4, bias: 0, home: 0, stride: 0 } };

describe("the crawl a ground walks", () => {
  it("opens on its home and walks away from it", () => {
    const key = {};
    expect(crawlBedAt(key, WANDERS, 0)).toBe(0);
    const walked = [1, 2, 3, 4].map((tick) => crawlBedAt(key, WANDERS, tick));
    expect(walked.some((bed) => bed !== 0)).toBe(true);
    // A nudge reaches a quarter of a bed per move and no further, so four of them cannot be more.
    for (const [at, bed] of walked.entries())
      expect(Math.abs(bed)).toBeLessThanOrEqual(4 * (at + 1));
  });

  it("comes home on every move where staying put is certain", () => {
    const stays: Crawl = { ...WANDERS, home: 32, lean: { ...WANDERS.lean, home: 1 } };
    const key = {};
    for (const tick of [0, 1, 2, 7]) expect(crawlBedAt(key, stays, tick)).toBe(32);
  });

  it("grows one walk, so a tick asked for late is the tick it always was", () => {
    const atOnce = crawlBedAt({}, WANDERS, 6);
    const grown = {};
    for (const tick of [1, 2, 3, 4, 5]) crawlBedAt(grown, WANDERS, tick);
    expect(crawlBedAt(grown, WANDERS, 6)).toBe(atOnce);
  });

  it("draws the same walk from the same seed and another from another", () => {
    const same = crawlBedAt({}, WANDERS, 5);
    expect(crawlBedAt({}, WANDERS, 5)).toBe(same);
    expect(crawlBedAt({}, { ...WANDERS, seed: 12 }, 5)).not.toBe(same);
  });
});
