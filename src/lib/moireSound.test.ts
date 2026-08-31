/**
 * @role Tests the two readings of the whole session's output that the drift spends as a row: how
 *   its level becomes the only depth that row has, and how its brightness becomes a spacing (0228).
 * @instead The reference row's own cut, the wash and how the ground turns the field — every other
 *   function in this file — are measured where they reach a picture, in
 *   src/ui/moireRowsField.test.ts. The scans the two readings come off → src/lib/peaks.test.ts.
 */
import { describe, expect, it } from "vitest";

import { DRIFT_DEPTH_FLOOR, DRIFT_PITCH_REACH, DRIFT_REST } from "./moire";
import {
  densityPitch,
  heardLevel,
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
