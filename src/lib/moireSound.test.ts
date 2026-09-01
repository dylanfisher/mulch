/**
 * @role Tests the readings of the whole session's output the drift spends: how its level becomes
 *   the only depth its own row has, how its brightness becomes a spacing (0228), and how the shape
 *   of its spectrum tightens and hardens the fold the picture is laid back into (P178, 0240).
 * @instead The reference row's own cut, the wash and how the ground turns the field — every other
 *   function in this file — are measured where they reach a picture, in
 *   src/ui/moireRowsField.test.ts. The scans the two readings come off → src/lib/peaks.test.ts.
 */
import { describe, expect, it } from "vitest";

import { DRIFT_DEPTH_FLOOR, DRIFT_PITCH_REACH, DRIFT_REST } from "./moire";
import { FRACTAL_BITE } from "./moireFractal";
import {
  densityPitch,
  FRACTAL_EDGE_BAND,
  FRACTAL_FLATNESS_BAND,
  FRACTAL_BITE_CEILING,
  heardBite,
  heardLevel,
  heardBeat,
  heardTilt,
  pulsedDepth,
  SOURCE_DENSITY_REACH,
} from "./moireSound";
import { moireRow } from "./moireRow";
import { spectralTilt } from "./peaks";

/** How deep the session's own row is drawn at an output of `level`: a row with no depth of its own,
 *  cut by the only reading it has. */
const row = (level: number): number =>
  pulsedDepth({ ...moireRow(), depth: 0, pulse: heardLevel(level) });

describe("what the session's own output is worth to a picture", () => {
  /**
   * P167: the row of the whole session is built with no depth of its own, so its meter is the only
   * depth it has — which is what makes a session nobody can hear draw nothing at all.
   */
  it("spends the output's level as the whole of one row's depth", () => {
    expect(heardLevel(0)).toBe(0);
    expect(heardLevel(0.5)).toBe(0.5);
    // Bounded at both ends whatever the bus hands over: a meter may read hotter than full scale
    // where the gain does, and a picture the reading could push past either end would be a reading
    // deciding what the knobs are allowed to say.
    expect(heardLevel(4)).toBe(1);
    expect(heardLevel(-1)).toBe(0);
    // A reading that is no number at all is not a loud one: a bus reporting nothing draws nothing,
    // which is the picture that was there before there was an output to hear.
    expect(heardLevel(Number.NaN)).toBe(0);
    expect(heardLevel(Number.POSITIVE_INFINITY)).toBe(0);
    // And what that is as a cut: nothing at silence, rising to the floor a turned-down effect sits
    // at when the output is at full scale. Up rather than down, which is the one direction a
    // reading that belongs to nothing on the yard may move a row (0213, 0228).
    expect(row(0)).toBe(0);
    expect(row(1)).toBe(DRIFT_DEPTH_FLOOR);
    expect(row(0.5)).toBeCloseTo(DRIFT_DEPTH_FLOOR / 2, 9);
    expect(row(0.25)).toBeLessThan(row(0.75));
  });

  /**
   * And the other of the two: how bright the same window is, spent through the band every reading
   * in the picture is spent as a spacing through — a reading is a spacing in one spelling
   * (principle 1, `densityPitch`).
   */
  it("spends the output's brightness as a spacing through the one band", () => {
    // Dark to bright is coarse to fine, monotonically, and it saturates at both ends rather than
    // running off either.
    const band = [0, 0.25, 0.5, 0.75, 1].map((tilt) => heardTilt(tilt));
    expect(band.every((pitch, at) => at === 0 || pitch < (band[at - 1] ?? 0))).toBe(true);
    expect(heardTilt(0)).toBe(DRIFT_PITCH_REACH);
    expect(heardTilt(1)).toBeCloseTo(1 / DRIFT_PITCH_REACH, 9);
    expect(heardTilt(-1)).toBe(heardTilt(0));
    expect(heardTilt(4)).toBe(heardTilt(1));
    // The one band and not a second reading of it: the same answer the density of a source is
    // drawn at, at the reach that scale is counted against.
    expect(heardTilt(0.5)).toBe(densityPitch(0.5 * SOURCE_DENSITY_REACH));
    // Silence answers the coarse end and not a rest of its own: what says a silent session has
    // nothing to draw is its level, and a row cut at nothing is not in the picture at all.
    expect(heardTilt(spectralTilt(new Float32Array(1024)))).toBe(heardTilt(0));
    // A reading the bus could not produce leaves the row where it was built.
    expect(heardTilt(Number.NaN)).toBe(DRIFT_REST.pitch);
  });
});

/**
 * P178: and the two the support is cut by. What the output sounds like reaches the picture as how
 * hard its support cuts — a sharp sound bites harder and a resonance beats the set against its own
 * next scale — and neither of them is a map: which places the support is seeded off is the
 * population an automator is standing and nothing else says it (0241, 0245).
 */
describe("what the shape of the output's spectrum is worth to the support", () => {
  it("beats the support against its own next scale as the output rings, and not at all under a wash", () => {
    // A broad wash is a flatness at the top of the band the instrument actually reaches: the
    // support is cut once and whole, exactly as its maps drew it.
    expect(heardBeat(FRACTAL_FLATNESS_BAND[1])).toBeCloseTo(0, 9);
    // And a narrow resonance is one at the bottom of it: the whole of the second cut.
    expect(heardBeat(FRACTAL_FLATNESS_BAND[0])).toBeCloseTo(1, 6);
    // Monotone between the two, and — the whole point of reading the flatness across the band it
    // occupies rather than across 0..1 — the travel is spent on readings a sound can produce: a
    // smeared mix at a hundredth and a hiss at a third are two different pictures, not one.
    const band = [0.002, 0.01, 0.05, 0.1, 0.25].map((flatness) => heardBeat(flatness));
    for (const [at, beat] of band.entries()) {
      if (at > 0) expect(beat).toBeLessThan(band[at - 1] ?? Number.NaN);
    }
    // A third of the whole travel spent between a smeared mix and a resonance, which is what
    // "spent on readings a sound can produce" has to mean.
    expect(heardBeat(0.01) - heardBeat(0.1)).toBeGreaterThan(1 / 3);

    // Silence is the picture drawn before there was a reading, and never the tightest support there
    // is: `flatness: 0` is the spectrum saying it measured nothing (`spectralFlatness`), and read
    // straight it is a perfect resonance.
    expect(heardBeat(0)).toBe(0);
    expect(heardBeat(Number.NaN)).toBe(0);
    // Bounded whatever arrives: a reading past either end of the band beats it no further.
    expect(heardBeat(4)).toBeCloseTo(0, 9);
    expect(heardBeat(1e-9)).toBeCloseTo(1, 6);
    expect(heardBeat(-1)).toBe(0);
  });

  it("bites harder as the output sharpens, and never past a share that would empty the picture", () => {
    // A dull sound cuts at the share every support was cut at before there was a reading.
    expect(heardBite(0)).toBe(FRACTAL_BITE);
    expect(heardBite(Number.NaN)).toBe(FRACTAL_BITE);
    // And a sharp one hardens it, up to a ceiling well under one: the gratings' own depth is solved
    // against what the support leaves standing, so a bite near one leaves them nothing to cut with.
    expect(heardBite(FRACTAL_EDGE_BAND[1])).toBeCloseTo(FRACTAL_BITE_CEILING, 9);
    // Across the band a centroid actually sits in and not across 0..1: a mix puts its energy a
    // couple of kilohertz up against a Nyquist of twenty-four, so read straight every sound there
    // is would leave the support within a fiftieth of where it started.
    expect(heardBite(FRACTAL_EDGE_BAND[0])).toBe(FRACTAL_BITE);
    expect(heardBite(0.05)).toBeGreaterThan(FRACTAL_BITE);
    expect(heardBite(0.05)).toBeLessThan(heardBite(0.15));
    expect(heardBite(0.15) - heardBite(0.05)).toBeGreaterThan(0.02);
    expect(heardBite(4)).toBeCloseTo(FRACTAL_BITE_CEILING, 9);
    // Never past one, and *at* one is right: the row is one grating among the picture's product
    // and one is what every other row rests at, so a ceiling under it would draw the picture's own
    // structure fainter than every knob in the yard (0246).
    expect(FRACTAL_BITE_CEILING).toBeLessThanOrEqual(1);
    expect(FRACTAL_BITE_CEILING).toBeGreaterThan(FRACTAL_BITE);
  });
});
