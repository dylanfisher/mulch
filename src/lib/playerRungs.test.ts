/**
 * @role What the read rate does across a pattern: that a hold keeps one rate for as many jumps as
 *   it says, that a due change is rolled, that a drawn one stays inside the spread and that it
 *   travels no further than the drift — the four claims 0118 made about the ladder, read off the
 *   walk that unfolds it.
 * @instead What one landing does to the ladder once it is on it — the climb, and the fold that
 *   keeps it inside the spread → src/lib/playerWalk.test.ts. Every other number a step is drawn
 *   from → src/lib/player.test.ts.
 */
import { describe, expect, it } from "vitest";

import type { PlayerSpec } from "./player.ts";
import { PLAYER_DEFAULTS } from "./playerCharacter.ts";
import {
  PLAYER_DRIFT_MAX,
  PLAYER_RATE_UNITY,
  PLAYER_RATES,
  PLAYER_SPREAD_MAX,
} from "./playerRungs.ts";
import { playerSequence } from "./playerWalk.ts";

/** A pattern at the values the switch leaves, so the only thing moving below is the rate walk. */
const spec = (patch: Partial<PlayerSpec> = {}): PlayerSpec => ({
  seed: 11,
  ...PLAYER_DEFAULTS,
  ...patch,
});

/** Which rung of the ladder a rate sits on: a signed distance from the deck's own (0118). */
const rungOf = (rate: number): number =>
  (PLAYER_RATES as readonly number[]).indexOf(rate) - PLAYER_RATE_UNITY;

// One case per claim the ladder makes, which is what its length is. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("the read rate walk", () => {
  // The hold is what makes a pattern evolve rather than repeat, and it is a count: how often the
  // rate lets go. How far it then goes is `spread` and `drift`, and whether it goes at all is
  // `chance` — all three the performer's now rather than the module's (0118).
  it("holds one read rate for as many jumps as the hold asks, and none at zero", () => {
    for (const step of playerSequence(spec({ hold: 0 }), 200)) expect(step.rates[0]).toBe(1);
    const walked = playerSequence(spec({ hold: 4, seed: 3 }), 400);
    for (const step of walked) expect(PLAYER_RATES).toContain(step.rates[0]);
    expect(walked.some((step) => step.rates[0] !== 1)).toBe(true);
    // A rate is drawn every fourth jump and held in between. A draw always lands somewhere it was
    // not, so these runs are exactly four long rather than at most four (0118).
    for (const [index, step] of walked.entries()) {
      if (index === 0 || index % 4 === 0) continue;
      expect(step.rates[0]).toBe(walked[index - 1]?.rates[0]);
    }
    const changes = walked.filter((step, index) => step.rates[0] !== walked[index - 1]?.rates[0]);
    expect(changes.length).toBe(walked.length / 4);
  });

  // The odds a due change fires. One is the promise the module used to make unconditionally; zero
  // is a hold that never lets go however high its count, which is a different thing from a hold of
  // zero and reachable from any of them.
  it("rolls a due rate change against the chance, and never changes at none of it", () => {
    for (const step of playerSequence(spec({ hold: 1, chance: 0 }), 400))
      expect(step.rates[0]).toBe(1);
    // Due on every jump: at half odds the rate changes on some of them and holds through others,
    // which no count of jumps alone can express.
    const rolled = playerSequence(spec({ hold: 1, chance: 0.5, seed: 5 }), 400);
    const changed = rolled.filter(
      (step, index) => step.rates[0] !== rolled[index - 1]?.rates[0],
    ).length;
    expect(changed).toBeGreaterThan(0);
    expect(changed).toBeLessThan(rolled.length - 1);
    // And a failed roll is the same odds again on the next jump rather than a change postponed:
    // at full odds every jump changes, so nothing was being saved up.
    const certain = playerSequence(spec({ hold: 1, chance: 1, seed: 5 }), 200);
    for (const [index, step] of certain.entries()) {
      if (index === 0) continue;
      expect(step.rates[0]).not.toBe(certain[index - 1]?.rates[0]);
    }
  });

  // How far from the deck's own rate a drawn one may sit. Zero is a pattern that jumps at one
  // speed however often its hold expires — the same sound `hold: 0` gives, by the other road.
  it("keeps every drawn rate inside the spread, and never leaves unity at none of it", () => {
    for (const step of playerSequence(spec({ hold: 1, spread: 0 }), 400))
      expect(step.rates[0]).toBe(1);
    for (const spread of [1, 2, PLAYER_SPREAD_MAX]) {
      const walked = playerSequence(spec({ hold: 1, spread, seed: 7 }), 600);
      const rungs = walked.map((step) => rungOf(step.rates[0] ?? 1));
      for (const rung of rungs) expect(Math.abs(rung)).toBeLessThanOrEqual(spread);
      // And it reaches both ends of what it was allowed, so the bound is a bound and not a floor.
      expect(Math.max(...rungs)).toBe(spread);
      expect(Math.min(...rungs)).toBe(-spread);
    }
  });

  // How far one change may travel from the rate it is on — `distance` a rung down. One slides
  // along the ladder and never leaps; the whole of it may land anywhere the spread allows.
  it("travels at most a drift of rungs per change, and always leaves the rung it is on", () => {
    for (const drift of [1, 2, PLAYER_DRIFT_MAX]) {
      const walked = playerSequence(
        spec({ hold: 1, drift, spread: PLAYER_SPREAD_MAX, seed: 4 }),
        600,
      );
      const rungs = walked.map((step) => rungOf(step.rates[0] ?? 1));
      const travels = rungs.slice(1).map((rung, index) => rung - (rungs[index] ?? 0));
      for (const move of travels) {
        expect(Math.abs(move)).toBeLessThanOrEqual(drift);
        // Never zero: a change that changes nothing is a jump the performer asked for and did not
        // get, and excluding the current rung is also what keeps the ladder's ends unweighted.
        expect(move).not.toBe(0);
      }
      expect(Math.max(...travels.map((move) => Math.abs(move)))).toBe(drift);
      // Both directions, so a rate is as likely to fall as to rise.
      expect(travels.some((move) => move > 0)).toBe(true);
      expect(travels.some((move) => move < 0)).toBe(true);
    }
  });
});
