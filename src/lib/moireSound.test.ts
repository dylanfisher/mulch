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
import { FOLD_KEEP, FOLD_RATIO_BAND } from "./moireFractal";
import {
  densityPitch,
  FOLD_EDGE_BAND,
  FOLD_FLATNESS_BAND,
  FOLD_HARD_CEILING,
  FOLD_TIGHT_FLOOR,
  heardHard,
  heardLevel,
  heardTight,
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
 * P178: and the two the fold is cut by. What the output sounds like reaches the picture as the
 * shape of the spiral it is folded into — a resonance tightens it and a sharp sound hardens it —
 * and neither of them is a depth: how deep the picture folds is the population an automator is
 * standing and nothing else says it (0240).
 */
describe("what the shape of the output's spectrum is worth to the fold", () => {
  /** The loosest spiral a seed alone can draw, which is where a wash leaves one. */
  const LOOSE = FOLD_RATIO_BAND[1];

  it("tightens the spiral as the output rings and leaves a wash as loose as its seed drew it", () => {
    // A broad wash is a flatness at the top of the band the instrument actually reaches: the spiral
    // stays where the holding instance's id put it.
    expect(heardTight(LOOSE, FOLD_FLATNESS_BAND[1])).toBeCloseTo(LOOSE, 9);
    // And a narrow resonance is one at the bottom of it: the spiral is drawn as tight as the fold
    // goes, which is under the loose end of the band a seed alone reaches.
    expect(heardTight(LOOSE, FOLD_FLATNESS_BAND[0])).toBeCloseTo(FOLD_TIGHT_FLOOR, 6);
    // Monotone between the two, and — the whole point of reading the flatness across the band it
    // occupies rather than across 0..1 — the travel is spent on readings a sound can produce: a
    // smeared mix at a hundredth and a hiss at a third are two different folds, not one.
    const band = [0.002, 0.01, 0.05, 0.1, 0.25].map((flatness) => heardTight(LOOSE, flatness));
    for (const [at, ratio] of band.entries()) {
      if (at > 0) expect(ratio).toBeGreaterThan(band[at - 1] ?? Number.NaN);
    }
    expect(heardTight(LOOSE, 0.1) - heardTight(LOOSE, 0.01)).toBeGreaterThan(0.1);
    for (const ratio of FOLD_RATIO_BAND) expect(heardTight(ratio, 0.2)).toBeLessThan(ratio);

    // Silence is the picture drawn before there was a reading, and never the tightest fold there
    // is: `flatness: 0` is the spectrum saying it measured nothing (`spectralFlatness`), and read
    // straight it is a perfect resonance.
    expect(heardTight(LOOSE, 0)).toBe(LOOSE);
    expect(heardTight(LOOSE, Number.NaN)).toBe(LOOSE);
    // Bounded whatever arrives: a reading past either end of the band moves the spiral no further.
    expect(heardTight(LOOSE, 4)).toBeCloseTo(LOOSE, 9);
    expect(heardTight(LOOSE, 1e-9)).toBeCloseTo(FOLD_TIGHT_FLOOR, 6);
    expect(heardTight(LOOSE, -1)).toBe(LOOSE);
  });

  it("hardens the fold as the output sharpens, and never past a share that would fill it", () => {
    // A dull sound lays the fold at the share every fold was laid at before there was a reading.
    expect(heardHard(0)).toBe(FOLD_KEEP);
    expect(heardHard(Number.NaN)).toBe(FOLD_KEEP);
    // And a sharp one hardens it, up to a ceiling under one: a share of one would union the stack
    // to opaque, which is a picture with nothing left in it (0143).
    expect(heardHard(FOLD_EDGE_BAND[1])).toBeCloseTo(FOLD_HARD_CEILING, 9);
    // Across the band a centroid actually sits in and not across 0..1: a mix puts its energy a
    // couple of kilohertz up against a Nyquist of twenty-four, so read straight every sound there
    // is would leave the fold within a fiftieth of where it started.
    expect(heardHard(FOLD_EDGE_BAND[0])).toBe(FOLD_KEEP);
    expect(heardHard(0.05)).toBeGreaterThan(FOLD_KEEP);
    expect(heardHard(0.05)).toBeLessThan(heardHard(0.15));
    expect(heardHard(0.15) - heardHard(0.05)).toBeGreaterThan(0.02);
    expect(heardHard(4)).toBeCloseTo(FOLD_HARD_CEILING, 9);
    expect(FOLD_HARD_CEILING).toBeLessThan(1);
  });
});
