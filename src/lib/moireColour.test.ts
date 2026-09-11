/**
 * @role Tests the ramp the picture's ink is read along and the orbit its rest runs on: that a ramp
 *   reads its ends and mixes its middles straight, that the same ramp **cut** reads one stop and
 *   never a colour between two (0366), that a yard not sounding rests where every yard rested
 *   before there was an orbit, and that the orbit reaches both sides of the ramp and comes back
 *   through the middle.
 */
import { describe, expect, it } from "vitest";

import { DRIFT_REST } from "./moire.ts";
import { INK_ORBIT_SECS, INK_WANDER, type Ink, orbitHue, ramp, rampStop } from "./moireColour.ts";

/** The three stops every case below reads through, dark to light with one warm stop between. */
const STOPS: readonly Ink[] = [
  [0, 0, 0, 255],
  [100, 50, 0, 255],
  [255, 255, 255, 255],
];

/** A fresh ink to read into, so one case cannot read what the case before it left behind. */
const ink = (): Ink => [0, 0, 0, 0];

describe("the ramp", () => {
  it("reads nought as the first ink and one as the last, and refuses a ramp of none", () => {
    expect(ramp(STOPS, 0, ink())).toEqual([0, 0, 0, 255]);
    expect(ramp(STOPS, 1, ink())).toEqual([255, 255, 255, 255]);
    expect(ramp(STOPS, 0.5, ink())).toEqual([100, 50, 0, 255]);
    expect(ramp(STOPS, 0.25, ink())).toEqual([50, 25, 0, 255]);
    expect(ramp(STOPS.slice(1, 2), 0.9, ink())).toEqual([100, 50, 0, 255]);
    expect(() => ramp([], 0, ink())).toThrow("reads nothing");
  });

  it("fills the ink it is handed and hands that same array back", () => {
    // One array a build and not one a pixel: the tile's own loop reads this width × height times,
    // and a call that returned a fresh ink would allocate one of them per pixel against the one a
    // build is allowed (0129, 0070, 0332).
    const into = ink();
    const read = ramp(STOPS, 1, into);
    expect(read).toBe(into);
    expect(into).toEqual([255, 255, 255, 255]);
    // And refilled rather than added to: a second read leaves nothing of the first behind.
    expect(ramp(STOPS, 0, into)).toEqual([0, 0, 0, 255]);
    expect(into).toEqual([0, 0, 0, 255]);
  });

  it("reads a value between two stops as a colour between them", () => {
    const between = ramp(STOPS, 0.75, ink());
    for (const channel of [0, 1, 2]) {
      const low = STOPS[1]?.[channel] ?? 0;
      const high = STOPS[2]?.[channel] ?? 0;
      expect(between[channel], `channel ${channel}`).toBeGreaterThan(low);
      expect(between[channel], `channel ${channel}`).toBeLessThan(high);
    }
  });
});

// The cut's own cases, in a list of their own beside the mix's (0007).
describe("the ramp cut to its stops", () => {
  it("reads one stop and never a colour between two", () => {
    // 0366: where a mark's colour is chosen, the ramp is five bands and not a gradient. Read over
    // the whole range rather than at a handful of values, because what the cut promises is that
    // *no* read comes out between two stops.
    const named = new Set(STOPS.map((stop) => stop.join(",")));
    const cut = new Set<string>();
    for (let step = 0; step <= 200; step++) {
      cut.add(rampStop(STOPS, step / 200, ink()).join(","));
    }
    expect([...cut].every((read) => named.has(read))).toBe(true);
    // And every stop is reachable, so a ramp of five is five inks and not the middle three.
    expect(cut.size).toBe(STOPS.length);
  });

  it("cuts to the nearest stop, so a claim worth one stop moves the ink by one", () => {
    // Nearest and not a band apiece: a hue claim is carried by exactly `1 / (stops - 1)` of the
    // ramp (`sceneHue`), so rounding onto the stops' own spacing is what makes one stop of claim
    // one stop of ink wherever the ground already stood. The two end stops keep half a band each,
    // which is what nearest means and why a scene's ends are its rarest inks.
    expect(rampStop(STOPS, 0, ink())).toEqual(STOPS[0]);
    expect(rampStop(STOPS, 0.24, ink())).toEqual(STOPS[0]);
    expect(rampStop(STOPS, 0.26, ink())).toEqual(STOPS[1]);
    expect(rampStop(STOPS, 0.74, ink())).toEqual(STOPS[1]);
    expect(rampStop(STOPS, 0.76, ink())).toEqual(STOPS[2]);
    expect(rampStop(STOPS, 1, ink())).toEqual(STOPS[2]);
    // Off either end it holds, as the mix does, and a ramp of none reads nothing rather than black.
    expect(rampStop(STOPS, -3, ink())).toEqual(STOPS[0]);
    expect(rampStop(STOPS, 4, ink())).toEqual(STOPS[2]);
    expect(() => rampStop([], 0, ink())).toThrow("no stop");
    // And it fills the ink it is handed, for the reason the mix does (0129, 0070).
    const into = ink();
    expect(rampStop(STOPS, 1, into)).toBe(into);
  });
});

describe("the orbit", () => {
  it("rests at the picture's own ink on a yard that is not sounding", () => {
    // A halted picture is painted on a commit in the caller's ink (0144), and a deck that has
    // just begun is the picture every yard drew before 0301.
    expect(orbitHue(0)).toBe(DRIFT_REST.hue);
    expect(orbitHue(-1)).toBe(DRIFT_REST.hue);
  });

  it("swings as far as the wander either side of rest over one orbit, and comes back", () => {
    const orbit = INK_ORBIT_SECS.value;
    let high: number = DRIFT_REST.hue;
    let low: number = DRIFT_REST.hue;
    for (let secs = 1; secs <= orbit; secs += 1) {
      const hue = orbitHue(secs);
      high = Math.max(high, hue);
      low = Math.min(low, hue);
    }
    expect(high).toBeCloseTo(DRIFT_REST.hue + INK_WANDER.value, 6);
    expect(low).toBeCloseTo(DRIFT_REST.hue - INK_WANDER.value, 6);
    // Back through the middle stop every half orbit, so the picture is never parked at an end.
    expect(orbitHue(orbit / 2)).toBeCloseTo(DRIFT_REST.hue, 9);
    expect(orbitHue(orbit)).toBeCloseTo(DRIFT_REST.hue, 9);
    // And moving between two seconds of sounding, which is the whole of what an orbit is.
    expect(orbitHue(orbit / 8)).not.toBeCloseTo(orbitHue(orbit / 4), 3);
  });
});
