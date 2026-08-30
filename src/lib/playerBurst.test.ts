/**
 * @role The two ways of arriving at a burst that are not the dial: what a run of presses says the
 *   interval is, and which division of a beat a written burst is held to (P152).
 */
import { describe, expect, it } from "vitest";

import { PLAYER_BURST_MAX, PLAYER_BURST_MIN, PLAYER_BURST_STEP } from "@/lib/player";
import { beatBurst, PLAYER_TAP_PRESSES, tapBurst, tapPress } from "@/lib/playerBurst";

describe("a tapped burst", () => {
  /** Nought presses and one set nothing, which is the whole of what an interval needs two for. */
  it("says nothing until there are two presses", () => {
    expect(tapBurst([])).toBeNull();
    expect(tapBurst([1000])).toBeNull();
    expect(tapBurst([1000, 1500])).toBe(0.5);
  });

  /** The mean of the intervals and not the last of them: a hand keeping time is steadier over
   *  three presses than over the two it happened to finish on. */
  it("means the intervals between the presses it kept", () => {
    expect(tapBurst([0, 400, 900])).toBeCloseTo(0.45, 6);
  });

  /** A tap can name nothing the dial cannot: the ends of its range, and its own step. */
  it("clamps onto the dial's range and lands on its step", () => {
    expect(tapBurst([0, 5000])).toBe(PLAYER_BURST_MAX);
    expect(tapBurst([0, 1])).toBe(PLAYER_BURST_MIN);
    const odd = tapBurst([0, 333]) ?? 0;
    expect(Math.abs(odd - 0.333)).toBeLessThan(PLAYER_BURST_STEP);
    const steps = (odd - PLAYER_BURST_MIN) / PLAYER_BURST_STEP;
    expect(steps).toBe(Math.round(steps));
  });

  /** The oldest is dropped on every press, so a tap that keeps going follows the hand. */
  it("keeps the last few presses and drops the oldest", () => {
    let times: readonly number[] = [];
    for (const at of [0, 100, 200, 300, 400]) times = tapPress(times, at);
    expect(times).toHaveLength(PLAYER_TAP_PRESSES);
    expect(times.at(0)).toBe(100);
    expect(times.at(-1)).toBe(400);
  });

  /**
   * And a gap the burst could not hold is a new tap rather than the old one being averaged
   * against: the run starts again, so the two presses after it are the whole answer.
   */
  it("starts the run again after a gap no burst could hold", () => {
    const after = tapPress([0, 100], 100 + PLAYER_BURST_MAX * 1000 + 1);
    expect(after).toHaveLength(1);
    expect(tapBurst(after)).toBeNull();
  });
});

describe("a burst held to the beat", () => {
  /** The halvings of the beat, and nothing between two of them. */
  it("rounds onto the nearest whole division", () => {
    expect(beatBurst(0.3, 120)).toBeCloseTo(0.25, 6);
    expect(beatBurst(0.51, 120)).toBeCloseTo(0.5, 6);
    expect(beatBurst(0.02, 120)).toBeCloseTo(0.015625, 6);
  });

  /**
   * Nearest in ratio and not in difference. At 120bpm the crossover between the beat and its half
   * is at 0.354s and not at 0.375s, so a burst of 0.36 is held up to the beat: by difference it
   * would fall to the half, which is the reading that puts two thirds of the dial's travel on one
   * division.
   */
  it("crosses over at the geometric mean, where the dial's own travel does", () => {
    expect(beatBurst(0.36, 120)).toBeCloseTo(0.5, 6);
    expect(beatBurst(0.34, 120)).toBeCloseTo(0.25, 6);
  });

  /** Only the divisions the dial can name are candidates, at either end. */
  it("passes over a division the dial could not hold", () => {
    // A beat of 3s at 20bpm is longer than the whole range, so the halving below it is the top.
    expect(beatBurst(1.6, 20)).toBeCloseTo(1.5, 6);
    // And a beat of 0.1s at 600bpm runs out below: a thirty-second of it is under the floor.
    expect(beatBurst(0.004, 600)).toBeCloseTo(0.00625, 6);
  });

  /** A beat with no division inside the range at all holds nothing, so the burst stays put. */
  it("leaves a burst where it is when no division fits", () => {
    expect(beatBurst(0.25, 600_000)).toBe(0.25);
  });

  /** And a deck with no grid never reaches this: its toggle is refused, so a call with one is a
   *  caller that skipped the refusal (principle 5). */
  it("refuses a tempo of nought", () => {
    expect(() => beatBurst(0.25, 0)).toThrow(RangeError);
  });
});
