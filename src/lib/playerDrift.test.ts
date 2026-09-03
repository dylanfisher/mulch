/**
 * @role How long the picture is given to travel a ground move: the one length the jumps module
 *   hands the drift that is neither an identity nor a spacing, derived off the landing the module
 *   already resolves rather than dialled (P174).
 * @instead Everything the module's rows are folded off — identity, spacing, tint, wave, coordinate
 *   and anchor — and the per-frame read that writes them → src/ui/moireRowsSong.test.ts, where the
 *   picture's own set is in hand to read them off.
 */
import { describe, expect, it } from "vitest";

import { EFFECT_ROW_PERIOD_SECS } from "./moire.ts";
import { PLAYER_DEFAULTS } from "./playerCharacter.ts";
import {
  loopStand,
  PLAYER_GROUND_TRAVEL,
  playerGroundSecs,
  playerRowPeriod,
  playerRowStand,
} from "./playerDrift.ts";
import { oneSong } from "./playerSongs.ts";
import type { PlayerSpec } from "./player.ts";

/** A yard's pattern jumping at whatever `burst` says, and otherwise a switch press's own. */
const jumping = (burst: number): PlayerSpec => ({
  seed: 7,
  ...PLAYER_DEFAULTS,
  burst,
  // One repeat, so the landing the dials say is the burst itself and the case is about the burst.
  repeats: 1,
  songs: oneSong([]),
});

describe("loopStand", () => {
  it("anchors a yard that is jumping nowhere on its loop's own in-point", () => {
    // 0274: a loop is a place the yard really is reading, so it is a ground whether or not a walk
    // is standing in it — and it is measured from the same place the walk's ground is, so a ground
    // of zero inside the loop and the loop itself are the one anchor (principle 1).
    const loop = { in: 4, out: 6 };
    expect(loopStand(loop, 16)).toBe(4 / 16);
    expect(loopStand(loop, 16)).toBe(playerRowStand(0, loop, 16)?.centre);
    expect(loopStand({ in: 0, out: 2 }, 16)).toBe(0);
  });

  it("stands a yard with no loop on the whole file, and rests only one with no source", () => {
    // 0292: a yard with no loop is a yard whose loop is the whole file, which begins at the top of
    // it — so the ground is the anchor that loop's own in-point would give, and never the middle.
    expect(loopStand(null, 16)).toBe(0);
    expect(loopStand(null, 16)).toBe(loopStand({ in: 0, out: 16 }, 16));
    expect(loopStand({ in: 4, out: 6 }, 0)).toBe(null);
    expect(loopStand(null, 0)).toBe(null);
    // The walk's own ground still needs a loop to be standing in: a bed is a slot of a loop, and
    // there is no bed on a yard that has none.
    expect(playerRowStand(0, null, 16)).toBe(null);
    expect(playerRowStand(0, { in: 4, out: 6 }, 0)).toBe(null);
  });
});

describe("playerGroundSecs", () => {
  it("takes the travel out of the landing, so a fast jump moves abruptly and a slow one glides", () => {
    // The rule a hand sees, and the reason it is derived rather than dialled: a yard eased over a
    // constant would be a picture chasing a ground several moves back at the fast end of the dial.
    const quick = playerRowPeriod(jumping(0.25));
    const slow = playerRowPeriod(jumping(8));
    expect(quick).toBeLessThan(slow);
    // Both travels finish inside the landing the row they move actually runs on.
    expect(playerGroundSecs(quick)).toBeLessThan(quick);
    expect(playerGroundSecs(slow)).toBeLessThan(slow);
    // And the slow yard glides where the quick one does not: the travel is that landing's own
    // fraction and never a constant, so the two are as far apart as the landings are.
    expect(playerGroundSecs(slow)).toBeGreaterThan(playerGroundSecs(quick));
    expect(playerGroundSecs(slow) / playerGroundSecs(quick)).toBeCloseTo(slow / quick, 10);
    expect(playerGroundSecs(quick)).toBe(quick * PLAYER_GROUND_TRAVEL);
    // The landing it is a fraction of is the *banded* one, which is the length the module resolves
    // and the one the row is drawn at (`playerRowPeriod`) — so under the band's own floor the
    // travel stops shortening with the burst, and a ground moving every jump on a yard that jumps
    // faster than this is a picture still travelling when the next jump lands (docs/plan.md §4).
    expect(quick).toBe(EFFECT_ROW_PERIOD_SECS[0]);
    expect(playerRowPeriod(jumping(0.005))).toBe(quick);
  });

  it("gives no travel at all to a yard with no landing", () => {
    // A yard that is not jumping carries no row of the module's, so its ground cannot move and
    // there is nothing to travel — its caller stands the picture on the ground outright.
    expect(playerGroundSecs(0)).toBe(0);
    expect(playerGroundSecs(-1)).toBe(0);
  });
});
