import { describe, expect, it } from "vitest";

import { PLAYER_SLOTS } from "@/lib/playerSlots";
import {
  fenceOf,
  leashOf,
  moveSaid,
  nextOf,
  padOf,
  reachOf,
  sideOf,
  SKETCH_BREATH_STEP,
  SKETCH_EITHER_SIDES,
  SKETCH_FENCE_AT,
  SKETCH_LEASH_AT,
  SKETCH_LEASH_SLACK,
  SKETCH_LOOP,
  SKETCH_LOOP_MIN,
  SKETCH_MOVE,
  SKETCH_MOVE_SAID,
  SKETCH_PAD_AT,
  SKETCH_REACH_EDGES,
  SKETCH_REACH_SLOTS,
  SKETCH_REACHES,
  type SketchMove,
  windowsAhead,
} from "@/ui/sketch/sketchMove";
import { SKETCH_GROUND, SKETCH_SOURCE_SLOTS } from "@/ui/sketch/sketchWalk";

describe("the four facts, said", () => {
  /** The fixture opens every picture on something visible: a loop that moves and breathes. */
  it("opens on a move every picture can draw, standing where the other bench stands", () => {
    expect(SKETCH_MOVE.wanders).toBe(true);
    expect(SKETCH_BREATH_STEP[SKETCH_MOVE.breath]).not.toBe(0);
    expect(SKETCH_LOOP.at).toBe(SKETCH_GROUND.standing);
  });

  it("says a wandering loop with its reach and way, and a staying one without either", () => {
    expect(SKETCH_MOVE_SAID).toBe("wanders a nudge on, and grows");
    expect(moveSaid({ ...SKETCH_MOVE, wanders: false })).toBe("stays put, and grows");
  });

  it("names every reach in sixteenths, a quarter of a bed to the whole file", () => {
    expect(SKETCH_REACH_SLOTS["a nudge"]).toBe(PLAYER_SLOTS / 4);
    expect(SKETCH_REACH_SLOTS["a bed"]).toBe(PLAYER_SLOTS);
    expect(SKETCH_REACH_SLOTS.anywhere).toBe(SKETCH_SOURCE_SLOTS);
    for (const reach of SKETCH_REACHES) {
      expect(reachOf(SKETCH_REACH_SLOTS[reach]), `${reach} does not read back as itself`).toBe(
        reach,
      );
    }
    expect(reachOf(SKETCH_REACH_EDGES.nudge)).toBe("a bed");
    expect(reachOf(SKETCH_REACH_EDGES.bed)).toBe("anywhere");
  });

  it("turns a wheel of words one word on, and comes round", () => {
    expect(nextOf(SKETCH_REACHES, "a nudge")).toBe("a bed");
    expect(nextOf(SKETCH_REACHES, "anywhere")).toBe("a nudge");
    expect(() => nextOf(["a nudge", "a bed"], "a mile")).toThrow(/not on the wheel/u);
  });
});

describe("the windows ahead", () => {
  it("carries the loop a reach on the way's side each move, and breathes it a step", () => {
    const ahead = windowsAhead(SKETCH_MOVE, 3);
    const nudge = SKETCH_REACH_SLOTS["a nudge"];
    expect(ahead.map((window) => window.at)).toEqual([
      SKETCH_LOOP.at + nudge,
      SKETCH_LOOP.at + nudge * 2,
      SKETCH_LOOP.at + nudge * 3,
    ]);
    expect(ahead.map((window) => window.span)).toEqual([
      SKETCH_LOOP.span + SKETCH_BREATH_STEP.grows,
      SKETCH_LOOP.span + SKETCH_BREATH_STEP.grows * 2,
      SKETCH_LOOP.span + SKETCH_BREATH_STEP.grows * 3,
    ]);
  });

  it("never moves a loop that stays, and never shrinks one below its floor", () => {
    const still: SketchMove = { ...SKETCH_MOVE, wanders: false, breath: "shrinks" };
    const ahead = windowsAhead(still, 8);
    for (const window of ahead) expect(window.at).toBe(SKETCH_LOOP.at);
    expect(ahead.at(-1)?.span).toBe(SKETCH_LOOP_MIN);
    expect(windowsAhead(SKETCH_MOVE, 0)).toEqual([]);
  });

  it("holds every window inside the file, whatever the reach", () => {
    for (const reach of SKETCH_REACHES) {
      for (const way of ["back", "on"] as const) {
        for (const window of windowsAhead({ ...SKETCH_MOVE, reach, way }, 6)) {
          expect(window.at).toBeGreaterThanOrEqual(0);
          expect(window.at + window.span).toBeLessThanOrEqual(SKETCH_SOURCE_SLOTS);
        }
      }
    }
  });

  it("takes the hand-written sides in turn when the way is either", () => {
    const sides = [1, 2, 3, 4, 5].map((nth) => sideOf("either way", nth));
    expect(sides).toEqual([...SKETCH_EITHER_SIDES, SKETCH_EITHER_SIDES[0]]);
    expect(sideOf("back", 3)).toBe(-1);
    expect(sideOf("on", 3)).toBe(1);
  });
});

describe("three gestures read as the same facts", () => {
  it("reads a leash by its length and its side, and a slack one as staying", () => {
    expect(leashOf(SKETCH_LEASH_AT, SKETCH_MOVE)).toEqual(SKETCH_MOVE);
    expect(leashOf(PLAYER_SLOTS, SKETCH_MOVE)).toMatchObject({ reach: "a bed", way: "on" });
    expect(leashOf(-3, SKETCH_MOVE)).toMatchObject({
      wanders: true,
      reach: "a nudge",
      way: "back",
    });
    expect(leashOf(60, SKETCH_MOVE)).toMatchObject({ reach: "anywhere", way: "on" });
    // Slack says nothing about the reach or the way, so both are the move a hand had.
    const had: SketchMove = { ...SKETCH_MOVE, reach: "anywhere", way: "back" };
    expect(leashOf(SKETCH_LEASH_SLACK - 1, had)).toEqual({ ...had, wanders: false });
    // A leash has a side, so it never says either way.
    expect(leashOf(20, { ...SKETCH_MOVE, way: "either way" }).way).toBe("on");
  });

  it("reads a pad across as the way and up as the reach, with the foot staying put", () => {
    expect(padOf(SKETCH_PAD_AT.x, SKETCH_PAD_AT.y, SKETCH_MOVE)).toEqual(SKETCH_MOVE);
    expect(padOf(0, 0.95, SKETCH_MOVE)).toMatchObject({ reach: "anywhere", way: "either way" });
    expect(padOf(-1, 0.3, SKETCH_MOVE)).toMatchObject({ reach: "a nudge", way: "back" });
    expect(padOf(1, 0.05, SKETCH_MOVE)).toMatchObject({ wanders: false, way: "on" });
  });

  it("reads a fence by the room it leaves, leaning to the side with twice the room", () => {
    expect(fenceOf(SKETCH_FENCE_AT.left, SKETCH_FENCE_AT.right, SKETCH_MOVE)).toEqual(SKETCH_MOVE);
    const end = SKETCH_LOOP.at + SKETCH_LOOP.span;
    expect(fenceOf(SKETCH_LOOP.at, end, SKETCH_MOVE)).toMatchObject({ wanders: false });
    // The whole file is a bed and a half either side of where the loop stands, which is a bed.
    expect(fenceOf(0, SKETCH_SOURCE_SLOTS, SKETCH_MOVE)).toMatchObject({
      reach: "a bed",
      way: "either way",
    });
    expect(fenceOf(SKETCH_LOOP.at - 20, end + 4, SKETCH_MOVE)).toMatchObject({
      reach: "a bed",
      way: "back",
    });
    // A post inside the loop leaves no room on that side rather than negative room.
    expect(fenceOf(SKETCH_LOOP.at + 8, end + 12, SKETCH_MOVE)).toMatchObject({
      reach: "a bed",
      way: "on",
    });
  });
});
