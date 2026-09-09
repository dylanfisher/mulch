// What the delay says about its own Time that no other knob in the registry says: that it is a
// length of wall seconds a hand may tap out and hold to the beat (0326).
import { describe, expect, it } from "vitest";

import { PLAYER_BURST_MAX, PLAYER_BURST_MIN } from "@/lib/player";
import type { ParamDeclaration } from "./contract";
import { delayEffect } from "./delay";
import { EFFECTS } from "./registry";

/** Which of a list of declarations say a hand may tap them out. */
const tapped = (params: readonly ParamDeclaration[]): string[] =>
  params.filter((param) => param.beat === true).map((param) => param.id);

describe("the delay's tapped time", () => {
  it("declares the tap on its Time and on neither of the other two", () => {
    expect(tapped(delayEffect.params)).toEqual(["delay.time"]);
  });

  it("keeps that Time inside the range the tap and the hold can answer with", () => {
    const params: readonly ParamDeclaration[] = delayEffect.params;
    const time = params.find((param) => param.id === "delay.time")!;
    expect(time.min).toBeGreaterThanOrEqual(PLAYER_BURST_MIN);
    expect(time.max).toBeLessThanOrEqual(PLAYER_BURST_MAX);
  });

  // The rack draws the tap off the declaration and never off an effect's id, so what makes the
  // delay the only card wearing one is that it is the only entry saying so — asserted here rather
  // than left to a reading of the eleven files (0055, 0205).
  it("is the one entry in the registry that says it at all", () => {
    expect(EFFECTS.flatMap((effect) => tapped(effect.params))).toEqual(["delay.time"]);
  });
});
