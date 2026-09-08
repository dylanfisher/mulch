/**
 * @role What the session's shared ground is: one crawl walked in wall seconds from the context's
 *   own zero, held still between its ticks, moved by the same three words a yard's own ground is
 *   moved by, and — the whole point — the same offset for every reader at the same instant (0313).
 */
import { describe, expect, it } from "vitest";

import { PLAYER_BED_REACH_SLOTS } from "./playerBed.ts";
import { assertGround } from "./playerWire.ts";
import {
  GROUND_EVERY_MAX_SECS,
  GROUND_EVERY_MIN_SECS,
  groundBedAt,
  groundIsLed,
  groundTicksBy,
  SESSION_GROUND_DEFAULTS,
  type SessionGround,
} from "./sessionGround.ts";

const ground = (fields: Partial<SessionGround> = {}): SessionGround => ({
  ...SESSION_GROUND_DEFAULTS,
  ...fields,
});

/** Where the ground stands at each of its first `count` ticks, from zero. */
const walked = (held: SessionGround, count: number): number[] =>
  Array.from({ length: count }, (_, tick) => groundBedAt(held, tick));

// One case per thing the shared ground promises — one answer per instant, held between ticks,
// opening on the loop, moved by its words, bounded — and the length is that list. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("the session's shared ground", () => {
  /**
   * The whole of why two yards land together: nothing about a yard reaches this, so two readers
   * asking about one instant are one question asked twice. Asked over a run of instants rather
   * than one, because a ground that agreed at zero and nowhere else would pass a single-point
   * case and be exactly the drift this exists to refuse (0313, 0097).
   */
  it("answers one offset per instant, however many times it is asked", () => {
    const held = ground({ reach: "anywhere", every: 1 });
    for (const at of [0, 0.5, 1, 1.75, 4, 17.25, 60]) {
      expect(groundBedAt(held, groundTicksBy(held, at))).toBe(
        groundBedAt(held, groundTicksBy(held, at)),
      );
    }
    // And two grounds that are the same ground walk the same crawl: the answer is a function of
    // the shape and the instant, never of which object happened to ask first.
    expect(walked(ground({ reach: "anywhere", every: 1 }), 24)).toEqual(
      walked(ground({ reach: "anywhere", every: 1 }), 24),
    );
  });

  /**
   * Held still between ticks and moved at them, which is what makes the period a period: every
   * instant inside one tick is one ground, and the tick after it is somewhere else.
   */
  it("holds still between its ticks and moves at them", () => {
    const held = ground({ every: 2, reach: "anywhere", way: "on" });
    for (const at of [0, 0.5, 1.9]) expect(groundBedAt(held, groundTicksBy(held, at))).toBe(0);
    expect(groundBedAt(held, groundTicksBy(held, 2))).not.toBe(0);
    expect(groundBedAt(held, groundTicksBy(held, 3.9))).toBe(
      groundBedAt(held, groundTicksBy(held, 2)),
    );
    // Counted from zero and from nothing else, so a reader that arrives late lands on the tick the
    // clock is actually in rather than on its own first (0097).
    expect(groundBedAt(held, groundTicksBy(held, 100))).toBe(
      groundBedAt(held, groundTicksBy(held, 101.9)),
    );
  });

  /** It opens on the loop itself: there is no bed a shared ground could come home to, because the
   *  yards on it hold different sources and only offset zero is on all of them (0313). */
  it("opens on the loop itself, whatever its words say", () => {
    for (const reach of ["nudge", "bed", "anywhere"] as const) {
      expect(groundBedAt(ground({ reach }), 0)).toBe(0);
    }
  });

  /**
   * And the three words move it exactly as they move a yard's own, because they are handed to the
   * same draw: a way of "on" never goes back, and a reach is its own sixteenths and no more
   * (`bedMove`, `leanStep`, principle 1).
   */
  it("moves by the words it is said in", () => {
    const on = walked(ground({ every: 1, way: "on", reach: "nudge" }), 16);
    for (const [tick, bed] of on.entries()) {
      if (tick > 0) expect(bed).toBeGreaterThan(on[tick - 1] ?? 0);
      expect(Math.abs(bed - (on[tick - 1] ?? 0))).toBeLessThanOrEqual(PLAYER_BED_REACH_SLOTS.nudge);
    }
    const back = walked(ground({ every: 1, way: "back", reach: "nudge" }), 16);
    for (const [tick, bed] of back.entries()) {
      if (tick > 0) expect(bed).toBeLessThan(back[tick - 1] ?? 0);
    }
    // A ground that stays put comes home on every move that is due, which is the loop itself —
    // the home roll certain, exactly as `bedWanders: false` reads one tier down (0277).
    expect(walked(ground({ every: 1, wanders: false, way: "on" }), 8)).toEqual(
      Array.from({ length: 8 }, () => 0),
    );
  });

  /**
   * And the clock it is counted on says whether the arithmetic above is even this module's: a
   * ground counted in seconds ticks itself, and one counted in a yard's parts is ticked by that
   * yard — so `groundTicksBy` is the seconds answer and `groundIsLed` is how a caller knows to
   * ask the host instead (0313).
   */
  it("counts its own ticks only where its clock is the wall", () => {
    expect(groundIsLed(ground())).toBe(false);
    expect(groundTicksBy(ground({ every: 2 }), 5)).toBe(2);
    for (const per of ["part", "song"] as const) {
      expect(groundIsLed(ground({ per, leader: "a", every: 4 }))).toBe(true);
    }
  });

  /**
   * And what one may be at all, through the one validator the command wire and the stored session
   * both come through: the words are the module's two records, and the period is bounded by the
   * unit its own clock names — seconds where it counts them, a whole count of parts or rounds
   * otherwise, which is one period and never one per unit (0192, 0313). Whether the yard it names
   * is still held is the session's question and is asked in src/state/session.test.ts.
   */
  it("refuses a ground the module would not have written", () => {
    const whole = {
      per: "second",
      leader: null,
      every: 4,
      wanders: true,
      reach: "nudge",
      way: "either",
    };
    expect(assertGround(whole, "ground")).toEqual(whole);
    expect(assertGround({ ...whole, per: "part", leader: "a" }, "ground").leader).toBe("a");
    for (const refused of [
      { ...whole, every: 0 },
      { ...whole, every: 1000 },
      { ...whole, reach: "sideways" },
      { ...whole, way: "sideways" },
      { ...whole, wanders: 1 },
      { ...whole, per: "hours" },
      { ...whole, leader: "" },
      // A period counted in a yard's parts is a whole count and not a fraction of a second.
      { ...whole, per: "part", leader: "a", every: 0.25 },
      { ...whole, per: "part", leader: "a", every: 1000 },
      { ...whole, per: "part", leader: "a", every: 2.5 },
      // And every field is one of the six, no more and no fewer.
      { ...whole, extra: 1 },
      { per: "second", leader: null, every: 4, wanders: true, reach: "nudge" },
    ]) {
      expect(() => assertGround(refused, "ground")).toThrow();
    }
  });

  /** The bound its one number stands in, and the reading its defaults have: a shared ground always
   *  moves, because a yard that wants a still one turns Together off (0313, principle 1). */
  it("declares a period every yard can share", () => {
    expect(GROUND_EVERY_MIN_SECS).toBeGreaterThan(0);
    expect(GROUND_EVERY_MAX_SECS).toBeGreaterThan(GROUND_EVERY_MIN_SECS);
    expect(SESSION_GROUND_DEFAULTS.every).toBeGreaterThanOrEqual(GROUND_EVERY_MIN_SECS);
    expect(SESSION_GROUND_DEFAULTS.every).toBeLessThanOrEqual(GROUND_EVERY_MAX_SECS);
  });
});
