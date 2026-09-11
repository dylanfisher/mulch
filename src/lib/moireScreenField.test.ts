/**
 * @role Tests the ink a tile's cells are written in: that the scene's ramp is **cut** where the
 *   mark is chosen, so a covered pixel of a tile the three channels stand level across is exactly
 *   one of the five stops the scene named and never a mix of two, and that the flatness pulls
 *   those five toward the ramp's middle stop until at one there is only the middle stop left
 *   (0366). Level across the three, because the fringe and the channel gains multiply the cell's
 *   ink after the cut and are a term of their own (0130): what is read here is the cut.
 * @instead Where the stops come from → src/ui/moireScreenStops.ts. The ramp itself and the cut →
 *   src/lib/moireColour.ts. Which mark a cell is written in and where it stands →
 *   src/lib/moireScreenCells.ts. Who bakes the tile and when → src/ui/moireScreenShop.test.ts.
 */
import { afterEach, describe, expect, it } from "vitest";

import { type Ink } from "@/lib/moireColour";
import { forgetScreenField, screenField, type ScreenBake } from "@/lib/moireScreenField";
import { GLYPH_FLAT } from "@/lib/moireScreenFilm";
import { resetTuning, setTuning } from "@/lib/moireTuning";
import { YARD_SCENE_REST } from "@/lib/yardScene";

/** A tile big enough to hold a whole lattice and small enough to bake in a case. */
const WIDE = 200;
const DEEP = 200;

/**
 * Five stops no two of which are near each other, so a mix of any two is a colour that is none of
 * them: what this file reads is whether a covered pixel landed on a stop or between two.
 */
const STOPS: readonly Ink[] = [
  [10, 10, 10, 255],
  [60, 40, 20, 255],
  [120, 90, 40, 255],
  [190, 150, 85, 255],
  [235, 225, 200, 255],
];

/** The stop the flatness pulls the other four toward, found the way the cut finds its own. */
const MID = STOPS[Math.floor(STOPS.length / 2)] ?? [0, 0, 0, 0];

/** One order with nothing on it but the ink: no fringe, no dispersion, no saturation, flat gains. */
const order = (hue: number): ScreenBake => ({
  key: `stops|${hue}`,
  width: WIDE,
  height: DEEP,
  seen: DEEP,
  pitch: 10,
  rowPitch: 14,
  cell: 10,
  beat: 0,
  own: [200, 120, 40, 255],
  lift: STOPS,
  gains: [
    [1, 1, 1],
    [1, 1, 1],
    [1, 1, 1],
  ],
  tint: { fringe: 0, disperse: 0, hue, saturate: 0 },
  yard: { ...YARD_SCENE_REST },
  cells: [],
  alphabet: "marks",
  armed: null,
});

/**
 * Every colour a covered pixel was written in at `flat`, counted — over the whole travel of the
 * hue rather than at one rung of it, because a claim slides the whole field along the ramp
 * (`sceneHue`) and one tile of one ground stands on two of the five stops. What the sweep says is
 * that the cut holds wherever the ground has been carried to.
 */
function coveredInks(flat: number): Map<string, number> {
  setTuning("glyph.flat", flat);
  const seen = new Map<string, number>();
  for (const hue of [0, 0.25, 0.5, 0.75, 1]) {
    forgetScreenField();
    const pixels = new Uint8ClampedArray(WIDE * DEEP * 4);
    screenField(order(hue), pixels);
    for (let at = 0; at < pixels.length; at += 4) {
      if (pixels[at + 3] === 0) continue;
      const ink = `${pixels[at]},${pixels[at + 1]},${pixels[at + 2]}`;
      seen.set(ink, (seen.get(ink) ?? 0) + 1);
    }
  }
  return seen;
}

// One flat list of what a mark is written in (0007).
describe("the ink a mark is written in", () => {
  afterEach(() => {
    resetTuning();
    forgetScreenField();
  });

  it("writes every covered pixel in one of the scene's five stops and never a mix of two", () => {
    const named = new Set(STOPS.map((stop) => `${stop[0]},${stop[1]},${stop[2]}`));
    const seen = coveredInks(0);
    // The case is worth reading only if the sweep actually walked the ramp: one stop everywhere
    // would pass this by drawing a picture of nothing. Three of the five, because a ground read
    // through a claim's whole travel reaches that much of its own ramp and the ends are the
    // rarest inks a nearest-stop cut has (`rampStop`, whose own cases read all five).
    expect(seen.size, "the sweep came out in one ink").toBeGreaterThan(2);
    for (const ink of seen.keys()) {
      expect(named.has(ink), `a covered pixel is ${ink}, which is no stop of the scene`).toBe(true);
    }
  });

  it("pulls all five to the ramp's middle stop at a flatness of one", () => {
    const seen = coveredInks(1);
    expect([...seen.keys()]).toEqual([`${MID[0]},${MID[1]},${MID[2]}`]);
  });

  it("rests where the five are still several inks and not the middle stop alone", () => {
    // Where the flatness rests is what the page actually draws, and under 0346 it rested at one —
    // the whole picture in the middle stop. Colour comes back by resting short of that (0366).
    expect(coveredInks(GLYPH_FLAT.rest).size, "the resting picture is one ink").toBeGreaterThan(1);
  });
});
