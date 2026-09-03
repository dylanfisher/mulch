/**
 * @role Tests the age a picture reads its own performance at: that a deck which has just begun is
 *   at nothing, that the curve only ever rises and never reaches one, and that each of the four
 *   bands it widens is at its floor fresh, whole at the end, and inside its own reach throughout.
 */
import { describe, expect, it } from "vitest";

import {
  DRIFT_FEEDBACK_REACH,
  DRIFT_HUE_REACH,
  DRIFT_PITCH_REACH,
  DRIFT_REST,
  DRIFT_STEPS,
} from "./moire.ts";
import {
  DRIFT_AGE_FLOOR,
  DRIFT_AGE_REACH_SECS,
  DRIFT_RUN_FEEDBACK,
  agedHue,
  agedOpening,
  agedPitch,
  driftAge,
  runFeedback,
} from "./moireAge.ts";
import { FRACTAL_OPENING, FRACTAL_REACH, fractalZoom } from "./moireFractal.ts";

/** The ages every spend below is read at: the two ends, and a scatter of the room between them. */
const AGES = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1];

describe("driftAge", () => {
  it("is nothing at nothing, and at anything a deck that is not sounding can report", () => {
    expect(driftAge(0)).toBe(0);
    // A halted deck reads 0 and nothing else can reach here, but a picture may not be a NaN away
    // from a reading it did not expect: below nothing is nothing (`DeckPeek.sounding`).
    expect(driftAge(-1)).toBe(0);
  });

  it("only ever rises, and saturates rather than arriving", () => {
    let last = driftAge(0);
    for (let secs = 1; secs <= 4 * DRIFT_AGE_REACH_SECS.value; secs *= 1.5) {
      const age = driftAge(secs);
      expect(age).toBeGreaterThan(last);
      expect(age).toBeLessThan(1);
      last = age;
    }
    // Most of the way there at its own reach, and nothing past an hour is anywhere new.
    expect(driftAge(DRIFT_AGE_REACH_SECS.value)).toBeGreaterThan(0.5);
    expect(driftAge(3600)).toBeGreaterThan(0.9);
    // A session left open for a week is still a picture and not a smear.
    expect(driftAge(7 * 24 * 3600)).toBeLessThanOrEqual(1);
  });
});

// One flat list of the bands an age widens, each read across the same scatter of ages above it:
// splitting it would separate four cases that are the same claim about four terms (0007).
// oxlint-disable-next-line max-lines-per-function
describe("what an age widens, in colour, in spacing, in what a run lays back and in the opening", () => {
  it("carries a hue claim back toward the rest the orbit has reached, and never outside the band", () => {
    // Rest is rest at either end: an age widens a claim and may not invent one — and the rest it
    // is spent against is wherever the orbit has got to, which the age never moves (0301).
    for (const orbit of [0.2, DRIFT_REST.hue, 0.8]) {
      for (const age of AGES) expect(agedHue(DRIFT_REST.hue, age, orbit)).toBeCloseTo(orbit, 9);
    }
    expect(agedHue(DRIFT_HUE_REACH, 1, DRIFT_REST.hue)).toBeCloseTo(DRIFT_HUE_REACH, 9);
    expect(agedHue(0, 1, DRIFT_REST.hue)).toBeCloseTo(0, 9);
    // At either end of a claiming knob's travel, over the whole of the age.
    for (const claim of [0, DRIFT_HUE_REACH]) {
      let apart = 0;
      for (const age of AGES) {
        const hue = agedHue(claim, age, DRIFT_REST.hue);
        expect(hue).toBeGreaterThanOrEqual(0);
        expect(hue).toBeLessThanOrEqual(DRIFT_HUE_REACH);
        const now = Math.abs(hue - DRIFT_REST.hue);
        expect(now).toBeGreaterThanOrEqual(apart);
        apart = now;
      }
      expect(apart).toBeCloseTo(Math.abs(claim - DRIFT_REST.hue), 9);
    }
    // A bold claim over a rest near one end asks for a stop the ramp does not have, and is held
    // at the end rather than read past it.
    expect(agedHue(DRIFT_HUE_REACH, 1, 0.9)).toBe(DRIFT_HUE_REACH);
    expect(agedHue(0, 1, 0.1)).toBe(0);
  });

  it("draws the reference row's spacing inside its own reach at every age", () => {
    // The band is a ratio about rest, so a fresh picture is a power of the spacing the sound asked
    // for and never a different side of rest from it.
    for (const cut of [DRIFT_PITCH_REACH, 1 / DRIFT_PITCH_REACH]) {
      let apart = 0;
      for (const age of AGES) {
        const pitch = agedPitch(cut, age);
        expect(pitch).toBeGreaterThanOrEqual(1 / DRIFT_PITCH_REACH);
        expect(pitch).toBeLessThanOrEqual(DRIFT_PITCH_REACH);
        const now = Math.abs(Math.log(pitch));
        expect(now).toBeGreaterThanOrEqual(apart);
        apart = now;
      }
      expect(apart).toBeCloseTo(Math.abs(Math.log(cut)), 9);
    }
    // The floor is the whole of what a fresh picture gets, and a row at rest is rest at every age.
    expect(agedPitch(DRIFT_PITCH_REACH, 0)).toBeCloseTo(
      DRIFT_PITCH_REACH ** DRIFT_AGE_FLOOR.value,
      9,
    );
    expect(agedPitch(DRIFT_PITCH_REACH, 0)).toBeLessThan(DRIFT_PITCH_REACH);
    expect(agedPitch(DRIFT_REST.pitch, 0)).toBe(DRIFT_REST.pitch);
    // A spacing of nothing is the analyser saying it measured nothing, not a row at no pitch.
    expect(agedPitch(0, 0.5)).toBe(DRIFT_REST.pitch);
  });

  it("lays back what a standing run earns, over the band the age has opened", () => {
    // A yard growing nothing lays nothing back and is exactly the picture it was, however long it
    // has sounded: an age widens a claim and may not invent one (0141).
    for (const age of AGES) expect(runFeedback(0, age)).toBe(0);
    // The run's own ramp: the whole band once `FRACTAL_REACH` places are up, and nothing a bigger
    // population can add to it.
    expect(runFeedback(FRACTAL_REACH, 1)).toBeCloseTo(DRIFT_RUN_FEEDBACK.value, 9);
    expect(runFeedback(40, 1)).toBeCloseTo(DRIFT_RUN_FEEDBACK.value, 9);
    // The floor is the whole of what a fresh picture gets of it.
    expect(runFeedback(FRACTAL_REACH, 0)).toBeCloseTo(
      DRIFT_RUN_FEEDBACK.value * DRIFT_AGE_FLOOR.value,
      9,
    );
    // And in between: only ever rising with the age, and never past the band's own ceiling.
    let last = 0;
    for (const age of AGES) {
      const share = runFeedback(1, age);
      expect(share).toBeGreaterThanOrEqual(last);
      expect(share).toBeLessThanOrEqual(DRIFT_RUN_FEEDBACK.value);
      last = share;
    }
    expect(last).toBeGreaterThan(runFeedback(1, 0));
    // Half the dimension and never the whole of it: a hand still has somewhere to go past the
    // deepest a run can ask for (`boldestRow` takes the max, 0139).
    expect(DRIFT_RUN_FEEDBACK.value).toBeLessThan(DRIFT_FEEDBACK_REACH);
  });

  it("opens the structure inside its own band at every age, and never past the band", () => {
    // A scale and not a blend, so half the band is a root of it and not half of it.
    expect(agedOpening(0)).toBeCloseTo(FRACTAL_OPENING.value ** DRIFT_AGE_FLOOR.value, 9);
    expect(agedOpening(1)).toBeCloseTo(FRACTAL_OPENING.value, 9);
    let last = 0;
    for (const age of AGES) {
      const opening = agedOpening(age);
      expect(opening).toBeGreaterThanOrEqual(last);
      // A fresh picture still opens and closes, over less of the room to do it in (0141).
      expect(opening).toBeGreaterThan(1);
      expect(opening).toBeLessThanOrEqual(FRACTAL_OPENING.value);
      last = opening;
    }
    expect(last).toBeGreaterThan(agedOpening(0));
    // And what the row is actually drawn at, handed the band the age has earned: back at one at the
    // bottom of its own breath at every age, and at that band and no further at the top of it.
    for (const age of AGES) {
      const opening = agedOpening(age);
      expect(fractalZoom(0, opening)).toBeCloseTo(1, 12);
      expect(fractalZoom(0.5, opening)).toBeCloseTo(opening, 12);
      expect(fractalZoom(0.5, opening)).toBeLessThanOrEqual(FRACTAL_OPENING.value);
    }
  });
});

describe("the opening's own ladder", () => {
  /**
   * The age is a saturating exponential and never stops moving, where the opening is baked into a
   * picture-sized tile: unstepped it would ask for one at every frame. Stepped, a picture that has
   * barely aged is exactly the picture it was.
   */
  it("stands still between two steps of the age", () => {
    expect(agedOpening(0.5)).toBe(agedOpening(0.5 + 1e-6));
    expect(agedOpening(0.5)).toBe(agedOpening(0.5 - 1e-6));
    // And across a whole performance it opens once per step of the ladder and no oftener, which is
    // what the extra bakes cost.
    const stops = new Set<number>();
    for (let at = 0; at <= 1000; at += 1) stops.add(agedOpening(at / 1000));
    expect(stops.size).toBe(DRIFT_STEPS + 1);
  });
});
