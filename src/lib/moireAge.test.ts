/**
 * @role Tests the age a picture reads its own performance at: that a deck which has just begun is
 *   at nothing, that the curve only ever rises and never reaches one, and that each of the three
 *   bands it widens is at its floor fresh, whole at the end, and inside its own reach throughout.
 */
import { describe, expect, it } from "vitest";

import { DRIFT_HUE_REACH, DRIFT_PITCH_REACH, DRIFT_REST } from "./moire.ts";
import {
  DRIFT_AGE_FLOOR,
  DRIFT_AGE_REACH_SECS,
  agedFoldReach,
  agedHue,
  agedPitch,
  driftAge,
} from "./moireAge.ts";
import { DRIFT_FOLD_REACH } from "./moireFractal.ts";

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
    for (let secs = 1; secs <= 4 * DRIFT_AGE_REACH_SECS; secs *= 1.5) {
      const age = driftAge(secs);
      expect(age).toBeGreaterThan(last);
      expect(age).toBeLessThan(1);
      last = age;
    }
    // Most of the way there at its own reach, and nothing past an hour is anywhere new.
    expect(driftAge(DRIFT_AGE_REACH_SECS)).toBeGreaterThan(0.5);
    expect(driftAge(3600)).toBeGreaterThan(0.9);
    // A session left open for a week is still a picture and not a smear.
    expect(driftAge(7 * 24 * 3600)).toBeLessThanOrEqual(1);
  });
});

describe("what an age widens", () => {
  it("holds the fold's ceiling between its floor and the reach of every fold there is", () => {
    expect(agedFoldReach(0)).toBeCloseTo(DRIFT_FOLD_REACH * DRIFT_AGE_FLOOR, 9);
    expect(agedFoldReach(1)).toBeCloseTo(DRIFT_FOLD_REACH, 9);
    let last = 0;
    for (const age of AGES) {
      const reach = agedFoldReach(age);
      expect(reach).toBeGreaterThanOrEqual(last);
      expect(reach).toBeLessThanOrEqual(DRIFT_FOLD_REACH);
      last = reach;
    }
  });
});

describe("what an age widens, in colour and in spacing", () => {
  it("carries a hue claim back toward the picture's own ink, and never outside the band", () => {
    // Rest is rest at either end: an age widens a claim and may not invent one.
    for (const age of AGES) expect(agedHue(DRIFT_REST.hue, age)).toBeCloseTo(DRIFT_REST.hue, 9);
    expect(agedHue(DRIFT_HUE_REACH, 1)).toBeCloseTo(DRIFT_HUE_REACH, 9);
    expect(agedHue(0, 1)).toBeCloseTo(0, 9);
    // At either end of a claiming knob's travel, over the whole of the age.
    for (const claim of [0, DRIFT_HUE_REACH]) {
      let apart = 0;
      for (const age of AGES) {
        const hue = agedHue(claim, age);
        expect(hue).toBeGreaterThanOrEqual(0);
        expect(hue).toBeLessThanOrEqual(DRIFT_HUE_REACH);
        const now = Math.abs(hue - DRIFT_REST.hue);
        expect(now).toBeGreaterThanOrEqual(apart);
        apart = now;
      }
      expect(apart).toBeCloseTo(Math.abs(claim - DRIFT_REST.hue), 9);
    }
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
    expect(agedPitch(DRIFT_PITCH_REACH, 0)).toBeCloseTo(DRIFT_PITCH_REACH ** DRIFT_AGE_FLOOR, 9);
    expect(agedPitch(DRIFT_PITCH_REACH, 0)).toBeLessThan(DRIFT_PITCH_REACH);
    expect(agedPitch(DRIFT_REST.pitch, 0)).toBe(DRIFT_REST.pitch);
    // A spacing of nothing is the analyser saying it measured nothing, not a row at no pitch.
    expect(agedPitch(0, 0.5)).toBe(DRIFT_REST.pitch);
  });
});
