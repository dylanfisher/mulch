/**
 * @role What the zone a hand marked promises: one span in the loop's own sixteenths, checked as
 *   loudly as everything else durable, and the narrowing it is for.
 * @instead The bounds it narrows and the fold every ground comes through →
 *   src/lib/playerBed.test.ts. The whole spec it is one field of → src/lib/player.test.ts. The
 *   strip a hand marks it on → src/ui/PlayerGround.test.tsx.
 */
import { describe, expect, it } from "vitest";

import { assertPlayer, playerProjection } from "./playerWire.ts";
import { PLAYER_DEFAULTS } from "./playerCharacter.ts";
import { PLAYER_ZONE_MAX, PLAYER_ZONE_MIN, zoneOf } from "./playerZone.ts";
import type { PlayerSpec } from "./player.ts";

/** One whole spec, so a case says only what it is about (the shape src/lib/player.test.ts uses). */
const SPEC: PlayerSpec = { seed: 5, ...PLAYER_DEFAULTS };

describe("the zone a ground is bounded to", () => {
  /**
   * A pair the wrong way round is refused rather than turned over: it is a spec from something
   * that was not counting them, and quietly correcting it would hide that (principle 5). Null is
   * the whole of "no zone" and is the ordinary case, so it is not an error.
   */
  it("refuses a zone that runs backwards, off the grid, or past the reach", () => {
    expect(() => zoneOf({ from: 4, to: 3 }, "a zone")).toThrow(/runs from 4 down to 3/u);
    expect(() => zoneOf({ from: 0.5, to: 3 }, "a zone")).toThrow(/whole/u);
    expect(() => zoneOf({ from: 0, to: PLAYER_ZONE_MAX + 1 }, "a zone")).toThrow(/outside/u);
    expect(() => zoneOf({ from: PLAYER_ZONE_MIN - 1, to: 0 }, "a zone")).toThrow(/outside/u);
    // Keyed exactly, like everything else durable: a field missing or one nobody declared.
    expect(() => zoneOf({ from: 0 }, "a zone")).toThrow(/expected/u);
    expect(() => zoneOf({ from: 0, to: 3, at: 1 }, "a zone")).toThrow(/expected/u);
    expect(() => zoneOf(4, "a zone")).toThrow(/object/u);
  });

  it("keeps the two ends the module allows, and no zone at all", () => {
    const marked = { from: PLAYER_ZONE_MIN, to: PLAYER_ZONE_MAX };
    expect(zoneOf(marked, "a zone")).toEqual(marked);
    expect(zoneOf(null, "a zone")).toBeNull();
    // And the signed zero a wire may carry is the same edge, because this pair is held durably
    // and compared against the one in the store (principle 5, `bedAt`).
    expect(Object.is(zoneOf({ from: -0, to: 0 }, "a zone")?.from, 0)).toBe(true);
  });

  /**
   * And it rides the whole spec: refused there by the same rule, and projected with the rest so
   * one zone has exactly one spelling in the session (0021).
   */
  it("is one field of a spec, refused and spelled with the rest of it", () => {
    expect(() => assertPlayer({ ...SPEC, zone: { from: 4, to: 3 } }, "a player")).toThrow(
      /a player zone runs from 4 down to 3/u,
    );
    expect(assertPlayer({ ...SPEC, zone: { from: -2, to: 5 } }, "a player")?.zone).toEqual({
      from: -2,
      to: 5,
    });
    expect(assertPlayer({ ...SPEC, zone: null }, "a player")?.zone).toBeNull();
    expect(JSON.stringify(playerProjection({ ...SPEC, zone: { from: -2, to: 5 } }))).toContain(
      '"zone":{"from":-2,"to":5}',
    );
    expect(JSON.stringify(playerProjection(SPEC))).toContain('"zone":null');
  });
});
