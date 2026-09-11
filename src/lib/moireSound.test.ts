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
  heardSides,
  heardBeat,
  rackScatter,
  RACK_SHATTER_BROKEN,
  rackTail,
  RACK_TAIL_BAND,
  RACK_TAIL_LONGEST_SECS,
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
   * And what the same output's two sides say about where its weight is: the gap between them, which
   * is what leans the lattice and lifts the louder half of the marks (0361).
   */
  it("reads the output's two sides as the gap between them, signed toward the left", () => {
    // Silence and a centred mix both stand between the two sides, at whatever level.
    expect(heardSides(0, 0)).toBe(0);
    expect(heardSides(0.7, 0.7)).toBe(0);
    // Signed toward the left, and the gap and never a ratio: a quiet pan says less than a loud one,
    // where a ratio would say the same of both.
    expect(heardSides(1, 0)).toBe(1);
    expect(heardSides(0, 1)).toBe(-1);
    expect(heardSides(0.2, 0)).toBeCloseTo(0.2, 12);
    expect(heardSides(0.2, 0)).toBeLessThan(heardSides(1, 0));
    // Bounded either way whatever the bus hands over, for `heardLevel`'s reason: these are peaks
    // measured where the decks land and may read hotter than full scale.
    expect(heardSides(4, 0)).toBe(1);
    expect(heardSides(0, 4)).toBe(-1);
    // And a reading that is no number at all is a picture with no side to lean to.
    expect(heardSides(Number.NaN, 0)).toBe(0);
    expect(heardSides(0, Number.POSITIVE_INFINITY)).toBe(0);
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

/**
 * And the reading of the whole rack the field's own wind rests on: three reverbs and two delays
 * deep, the picture used to be the picture a dry yard draws, and washed-out floating is the first
 * thing an ear names about that rack (0267).
 */
describe("how long the standing rack takes to fall silent", () => {
  it("reads the longest tail that is heard, across the band it is stated on", () => {
    // Nothing standing is nothing: the picture a dry yard drew before there was a tail in it, and
    // the answer rather than a fallback (0145).
    expect(rackTail([])).toBe(0);
    // And a rack of one entry at the floor no settle goes under is that same picture: the floor is
    // the bottom of the band, so every rack of biquads and one-poles reads dry.
    expect(rackTail([{ settle: RACK_TAIL_BAND[0], presence: 1 }])).toBe(0);
    // Between the two ends it rises, and it saturates at the top rather than running off it.
    expect(rackTail([{ settle: 3, presence: 1 }])).toBeGreaterThan(0.5);
    expect(rackTail([{ settle: 3, presence: 1 }])).toBeLessThan(
      rackTail([{ settle: 6, presence: 1 }]),
    );
    expect(rackTail([{ settle: RACK_TAIL_LONGEST_SECS, presence: 1 }])).toBeCloseTo(1, 9);
    expect(rackTail([{ settle: 600, presence: 1 }])).toBe(1);
    // A loop at unity never falls silent at all (`feedbackSettleSecs`, src/lib/settle.ts), which is
    // the top of the band and not a reason to leave it out of the reading.
    expect(rackTail([{ settle: Number.POSITIVE_INFINITY, presence: 1 }])).toBe(1);
    // And that is `Infinity` alone: a settle that came back NaN is a plugin's arithmetic and not a
    // tail, and read as the longest one there is it would blow the whole field off a bug.
    expect(rackTail([{ settle: Number.NaN, presence: 1 }])).toBe(0);
    expect(rackTail([{ settle: Number.NEGATIVE_INFINITY, presence: 1 }])).toBe(0);
  });

  it("takes the longest and never the sum, and weighs each tail by what is heard of it", () => {
    const long = rackTail([{ settle: 4, presence: 1 }]);
    // The stages run at once, so three reverbs of four seconds are settled when one of them is —
    // the same argument `rackSettleSecs` makes, and a sum would have a rack of short entries read
    // as a rack of long ones.
    expect(rackTail(Array.from({ length: 3 }, () => ({ settle: 4, presence: 1 })))).toBe(long);
    // And what nobody can hear is not in the picture: a reverb at a wet of nothing is a tail that
    // never reaches the ear, however long its own decay is set.
    expect(rackTail([{ settle: 600, presence: 0 }])).toBe(0);
    expect(rackTail([{ settle: 8, presence: 0.5 }])).toBe(rackTail([{ settle: 4, presence: 1 }]));
    // A presence outside its own bounds cannot make one either way, and every answer stays inside
    // the band: it is a share of a reading and never a second knob on it.
    for (const presence of [-1, 0.5, 2, Number.NaN]) {
      const tail = rackTail([{ settle: 600, presence }]);
      expect(tail).toBeGreaterThanOrEqual(0);
      expect(tail).toBeLessThanOrEqual(1);
    }
    expect(rackTail([{ settle: 600, presence: 2 }])).toBe(1);
    expect(rackTail([{ settle: 600, presence: Number.NaN }])).toBe(0);
  });
});

/**
 * And the reading of the same rack the field's own shatter rests on: six scatters is the yard at
 * its most broken, and the picture it used to draw was six straight rows at six pitches (0269).
 */
describe("how much of the standing rack is scatter", () => {
  it("reads nothing where nothing is scattering, and one where the whole rack is", () => {
    // Nothing standing is nothing: the picture drawn before there was a scatter in it, and the
    // answer rather than a fallback (0145). And one whole scatter is that same picture — its claim
    // on the field is one row's pitch, which displaces nothing in a field of fourteen rows.
    expect(rackScatter([])).toBe(0);
    expect(rackScatter(scattering(1))).toBe(0);
    // Six of them is the whole band, and nothing past it: a rack of a dozen is as broken as a
    // picture gets rather than a picture broken twice as far.
    expect(rackScatter(scattering(RACK_SHATTER_BROKEN))).toBe(1);
    expect(rackScatter(scattering(2 * RACK_SHATTER_BROKEN))).toBe(1);
    // Between the two ends it rises evenly, a fourth instance adding exactly what the third did —
    // which is what the band being linear says, where the tail's is a ratio of two lengths.
    const steps = Array.from({ length: RACK_SHATTER_BROKEN }, (_each, at) =>
      rackScatter(scattering(at + 1)),
    );
    const [alone = 0, two = 0, three = 0, four = 0] = steps;
    expect(alone).toBe(0);
    expect(two).toBeCloseTo(0.2, 9);
    expect(three - two).toBeCloseTo(four - three, 9);
  });

  it("sums what each instance is set to, and weighs it by both of its own values", () => {
    // The sum and never the longest, which is the whole difference from the tail above: stages that
    // chop each chop what the one before it already chopped.
    const two = rackScatter(scattering(2));
    expect(two).toBeGreaterThan(rackScatter(scattering(1)));
    // Each entry weighs itself by its own two declared values — how crowded its windows are, and
    // how much of the signal they take at all — so four turned halfway down is a pair wholly in.
    expect(rackScatter(scattering(4, { chance: 0.5 }))).toBe(two);
    expect(rackScatter(scattering(4, { presence: 0.5 }))).toBe(two);
    // And an instance at either of them turned off is not scattering at all, however the other
    // stands: a gate of nothing writes its input straight back out (0202).
    const three = rackScatter(scattering(3));
    expect(rackScatter([...scattering(3), { chance: 0, presence: 1 }])).toBe(three);
    expect(rackScatter([...scattering(3), { chance: 1, presence: 0 }])).toBe(three);
    // Every answer is inside the stated band at every input, and a value that is not a number is
    // not a share of anything: it weighs nothing, exactly as an unreadable presence does above.
    for (const chance of [-1, 0.5, 2, Number.NaN, Number.POSITIVE_INFINITY]) {
      const share = rackScatter([{ chance, presence: 1 }, ...scattering(3)]);
      expect(share).toBeGreaterThanOrEqual(0);
      expect(share).toBeLessThanOrEqual(1);
    }
    expect(rackScatter([{ chance: Number.NaN, presence: 1 }, ...scattering(3)])).toBe(three);
    expect(rackScatter([{ chance: 1, presence: Number.NaN }, ...scattering(3)])).toBe(three);
  });
});

/** A rack of `standing` scatters, wholly in unless a case turns one of their two values down. */
const scattering = (
  standing: number,
  over: Partial<{ chance: number; presence: number }> = {},
): { chance: number; presence: number }[] =>
  Array.from({ length: standing }, () => ({ chance: 1, presence: 1, ...over }));
