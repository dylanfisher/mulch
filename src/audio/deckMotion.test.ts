/**
 * @role The transport's motion contract: a lane whose every cycle is drawn rather than replayed —
 *   the same arming and the same holds as a recorded lane, and one read that says how far it has
 *   gone rather than how far into a cycle (0309). Beside src/audio/deck.test.ts, which is at the
 *   hard cap, over the same fixture.
 */
import { describe, expect, it } from "vitest";

import {
  drawMotionStretch,
  MOTION_STEP_GAP_SECS,
  MOTION_STRETCH_SECS,
  type MotionSpec,
} from "@/lib/motion";
import { deck } from "./deck.test";
import { type Call } from "./deckDouble";
import { emptyDeckPeek } from "./deckPeek";
import { paramKey, PARAMS } from "./params";
import { LANE_SEAM_SECS, PARAM_RAMP_SECS } from "./ramp";
import { AUTOMATION_HORIZON_SECS, LOOKAHEAD_SECS } from "./transport";

/** The cycle origins a schedule was laid against: one hold-and-join per armed cycle (0035). */
const cycleOrigins = (calls: readonly Call[]): number[] =>
  calls
    .filter(([method]) => method === "cancelAndHoldAtTime" || method === "cancelScheduledValues")
    .map(([, when]) => when ?? 0);

// A motion is a lane whose every cycle is drawn rather than replayed: the same arming, the same
// holds, and one read that says how far it has gone rather than how far into a cycle (0309).
// oxlint-disable-next-line max-lines-per-function
describe("deck motion", () => {
  const SMOOTH: MotionSpec = { character: "smooth", seed: 5 };
  const range = PARAMS["deck.gain"];
  const lane = [
    { at: 0, value: 0.25 },
    { at: 0.5, value: 1.25 },
  ];

  it("arms each stretch freshly drawn from the spec, one after the other, from where play begins", () => {
    const { gainCalls, now, voice } = deck();
    now(3);
    voice.setMotion(null, "deck.gain", SMOOTH, 1);
    expect(gainCalls).toEqual([]);

    voice.play();
    const from = 3 + LOOKAHEAD_SECS;
    expect(cycleOrigins(gainCalls).slice(0, 2)).toEqual([from, from + MOTION_STRETCH_SECS]);
    // The first stretch begins at the knob's own value; the second where the first ended.
    expect(gainCalls[1]).toEqual(["linearRampToValueAtTime", 1, from + LANE_SEAM_SECS]);
    const second = drawMotionStretch(SMOOTH, 1, range, 1);
    expect(gainCalls).toContainEqual([
      "linearRampToValueAtTime",
      second[0]!.value,
      from + MOTION_STRETCH_SECS + LANE_SEAM_SECS,
    ]);
    expect(gainCalls).toContainEqual([
      "linearRampToValueAtTime",
      second.at(-1)!.value,
      from + 2 * MOTION_STRETCH_SECS,
    ]);
  });

  it("reports the whole of its elapsed time, unwrapped, and holds it through a stop", () => {
    const { now, voice } = deck();
    voice.setMotion(null, "deck.gain", SMOOTH, 1);
    voice.play();

    const out = emptyDeckPeek();
    now(1.3 + LOOKAHEAD_SECS);
    voice.peek(out);
    expect(out.automation.get(paramKey(null, "deck.gain"))).toBeCloseTo(1.3, 10);
    now(MOTION_STRETCH_SECS + 1.5 + LOOKAHEAD_SECS);
    voice.peek(out);
    expect(out.automation.get(paramKey(null, "deck.gain"))).toBeCloseTo(
      MOTION_STRETCH_SECS + 1.5,
      10,
    );

    voice.stop();
    now(40);
    voice.peek(out);
    expect(out.automation.get(paramKey(null, "deck.gain"))).toBeCloseTo(
      MOTION_STRETCH_SECS + 1.5,
      10,
    );

    voice.setMotion(null, "deck.gain", null, 1);
    voice.peek(out);
    expect(out.automation.size).toBe(0);
  });

  it("keeps its place when the same spec comes back on a new manual value, and starts over for another", () => {
    const { gainCalls, now, voice } = deck();
    voice.setMotion(null, "deck.gain", SMOOTH, 1);
    voice.play();
    gainCalls.length = 0;

    now(1.2);
    voice.setMotion(null, "deck.gain", { ...SMOOTH }, 0.6);
    expect(cycleOrigins(gainCalls)[0]).toBe(LOOKAHEAD_SECS);

    gainCalls.length = 0;
    voice.setMotion(null, "deck.gain", { character: "pulse", seed: 5 }, 0.6);
    expect(cycleOrigins(gainCalls)[0]).toBe(1.2);
  });

  it("gives a released motion back to the manual value and arms it no further", () => {
    const { gainCalls, now, voice } = deck();
    voice.setMotion(null, "deck.gain", SMOOTH, 1);
    voice.play();
    now(0.5);
    gainCalls.length = 0;
    voice.setMotion(null, "deck.gain", null, 0.8);
    expect(gainCalls).toEqual([
      ["cancelScheduledValues", 0.5],
      ["setValueAtTime", 1, 0.5],
      ["linearRampToValueAtTime", 0.8, 0.5 + PARAM_RAMP_SECS],
    ]);
  });

  it("takes a lane's key over, and gives it back to a lane", () => {
    const { voice } = deck();
    voice.setAutomation(null, "deck.gain", lane, 1);
    voice.setMotion(null, "deck.gain", SMOOTH, 1);
    voice.play();
    const out = emptyDeckPeek();
    voice.peek(out);
    expect(out.automation.size).toBe(1);
    voice.setAutomation(null, "deck.gain", lane, 1);
    voice.peek(out);
    expect(out.automation.size).toBe(1);
  });

  it("steps no faster than the graph ramps, and draws a stretch the horizon can hold", () => {
    expect(MOTION_STEP_GAP_SECS).toBeGreaterThanOrEqual(PARAM_RAMP_SECS);
    expect(MOTION_STRETCH_SECS).toBeLessThanOrEqual(AUTOMATION_HORIZON_SECS);
  });
});
