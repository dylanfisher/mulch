/**
 * @role The way back from the one reading this card spells in a unit of its own: a ground distance
 *   drawn as a share of the file, typed back as a share and kept in sixteenths (0201).
 */
import { describe, expect, it } from "vitest";

import { PLAYER_BED_DISTANCE_MAX } from "@/lib/playerBed";
import { groundValue } from "@/ui/PlayerDial";

describe("Ground distance reading", () => {
  it("reads a share of the file back into the slots the spec is written in", () => {
    const whole = PLAYER_BED_DISTANCE_MAX;
    expect(groundValue("100%", 0, whole)).toBe(whole);
    expect(groundValue("50", 0, whole)).toBe(whole / 2);
    expect(groundValue("0%", 0, whole)).toBe(0);
    expect(groundValue("half", 0, whole)).toBeUndefined();
  });
});
