/**
 * @role The lull's look, held to its own numbers: a period inside its band, a duty and a depth
 *   under their ceilings and at nought together, and a draw that dims the field for the dark share
 *   of a cycle on the deck's clock and draws it whole otherwise.
 */
import { describe, expect, it } from "vitest";

import {
  BLINK_CEILING,
  BLINK_DUTY,
  BLINK_PERIOD,
  blinkDark,
  blinkDepth,
  blinkDuty,
  blinkLook,
  blinkPeriod,
  blinkPhase,
} from "./moireBlink.ts";

/** A context that records the alpha each draw was made at. */
function surface() {
  const draws: number[] = [];
  const into = {
    globalAlpha: 1,
    drawImage: () => {
      draws.push(into.globalAlpha);
    },
  };
  // oxlint-disable-next-line no-unsafe-type-assertion -- the pass reads only these two members
  return { draws, into: into as unknown as CanvasRenderingContext2D };
}

// oxlint-disable-next-line no-unsafe-type-assertion -- the pass never reads the source
const FIELD = { width: 8, height: 8 } as HTMLCanvasElement;

describe("the blink", () => {
  it("cycles inside its band on the Gap's turn, and never past it", () => {
    expect(blinkPeriod(0)).toBe(BLINK_PERIOD[0]);
    expect(blinkPeriod(1)).toBe(BLINK_PERIOD[1]);
    expect(blinkPeriod(0.5)).toBeCloseTo(Math.sqrt(BLINK_PERIOD[0] * BLINK_PERIOD[1]), 9);
    expect(blinkPeriod(-3)).toBe(BLINK_PERIOD[0]);
    expect(blinkPeriod(9)).toBe(BLINK_PERIOD[1]);
  });

  it("stands dark for the Chance's share of each cycle under the duty, and nought at nought", () => {
    expect(BLINK_DUTY.value).toBeGreaterThan(0);
    expect(BLINK_DUTY.value).toBeLessThanOrEqual(0.5);
    expect(blinkDuty(0)).toBe(0);
    expect(blinkDuty(1)).toBe(BLINK_DUTY.value);
    // The top of the cycle is the dark of it, so a halted yard at nought is drawn resting; half
    // way round the pulse is gone, and it is back a cycle on.
    expect(blinkDark(0, 0.5, 1, 0)).toBe(1);
    const period = blinkPeriod(0.5);
    expect(blinkDark(period * 0.5, 0.5, 1, 0)).toBeCloseTo(0, 9);
    expect(blinkDark(period, 0.5, 1, 0)).toBeCloseTo(1, 9);
    // A narrower duty is a sharper pulse: the same quarter turn stands darker at every chance.
    expect(blinkDark(period * 0.25, 0.5, 0.2, 0)).toBeLessThan(blinkDark(period * 0.25, 0.5, 1, 0));
    for (const at of [0, 0.1, 0.3, 0.6, 0.9]) {
      expect(blinkDark(period * at, 0.5, 0.5, 7)).toBeGreaterThanOrEqual(0);
      expect(blinkDark(period * at, 0.5, 0.5, 7)).toBeLessThanOrEqual(1);
    }
    // The seed stands the cycle somewhere of its own, inside a turn, and a seed of nought at nought.
    expect(blinkPhase(0)).toBe(0);
    expect(blinkPhase(1)).toBeGreaterThan(0);
    expect(blinkPhase(1)).toBeLessThan(1);
    expect(blinkPhase(1)).not.toBeCloseTo(blinkPhase(2), 2);
    expect(blinkDark(0, 0.5, 1, 1)).toBeCloseTo(blinkDark(period * blinkPhase(1), 0.5, 1, 0), 9);
  });

  it("takes a depth under its ceiling that is nought whichever of the Chance's readings is", () => {
    expect(BLINK_CEILING.value).toBeGreaterThan(0);
    expect(BLINK_CEILING.value).toBeLessThan(1);
    expect(blinkDepth(0, 1)).toBe(0);
    expect(blinkDepth(1, 0)).toBe(0);
    expect(blinkDepth(1, 1)).toBe(BLINK_CEILING.value);
    expect(blinkDepth(0.5, 0.5)).toBeGreaterThan(0);
    expect(blinkDepth(0.5, 0.5)).toBeLessThan(BLINK_CEILING.value);
  });

  it("draws the field, then takes it out of itself by the pulse, and only the field at no chance", () => {
    expect(blinkLook.at).toBe("pass");
    expect(blinkLook.terms).toEqual({ share: "turn", spacing: "turn", seed: "value" });
    if (blinkLook.at !== "pass") throw new Error("the blink is a pass");
    const on = surface();
    blinkLook.pass(on.into, FIELD, 1, { share: 1, spacing: 0.5, seed: 0 }, 0, 0, 1);
    expect(on.draws).toEqual([1, BLINK_CEILING.value]);
    const off = surface();
    blinkLook.pass(
      off.into,
      FIELD,
      1,
      { share: 1, spacing: 0.5, seed: 0 },
      0,
      blinkPeriod(0.5) * 0.5,
      1,
    );
    expect(off.draws[0]).toBe(1);
    expect(off.draws[1]).toBeCloseTo(0, 9);
    // A lull at no chance draws the field whole at every instant, and nothing more.
    const none = surface();
    blinkLook.pass(none.into, FIELD, 0, { share: 0, spacing: 0.5 }, 0, 0, 1);
    expect(none.draws).toEqual([1]);
  });
});
