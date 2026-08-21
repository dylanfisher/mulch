/**
 * @role The pattern generator's contract: the same seed is the same sequence of positions, a
 *   different seed is a different one, and every field a step carries stays inside what the
 *   module declared (0089).
 */
import { describe, expect, it } from "vitest";

import {
  assertPlayer,
  playerSequence,
  playerWalk,
  PLAYER_BURST_MAX,
  PLAYER_BURST_MIN,
  PLAYER_DISTANCE_MAX,
  PLAYER_DRIFT_MAX,
  PLAYER_GATE_FLOOR,
  PLAYER_RATES,
  PLAYER_REPEATS_MAX,
  PLAYER_REST_MAX,
  PLAYER_SLOTS,
  PLAYER_VARY_MAX,
  type PlayerSpec,
} from "./player.ts";

/** The player's own clock, all four of it turned away from the plain-jump defaults (P67). */
const CLOCKED = { burst: 0.5, vary: 0.5, rest: 0.75, drift: 3 } as const;

const SPEC: PlayerSpec = {
  seed: 1,
  variation: "wander",
  distance: 4,
  repeats: 4,
  gate: 0.5,
  burst: 1,
  vary: 0,
  rest: 0,
  drift: 0,
};

const spec = (patch: Partial<PlayerSpec> = {}): PlayerSpec => ({ ...SPEC, ...patch });

/** How far each step moved from the one before it, in slots. */
const moves = (steps: { slot: number }[]): number[] =>
  steps.slice(1).map((step, index) => step.slot - (steps[index]?.slot ?? 0));

/** A move read on the ring the grid is: forward wrapping at the top reads negative otherwise. */
const wrapped = (move: number): number => (move + PLAYER_SLOTS) % PLAYER_SLOTS;

// One case per claim the generator makes; the length tracks how many claims it makes rather than
// how much any of them decides. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("the player's pattern", () => {
  // The whole reason the seed is durable: an export and its fingerprint mean nothing if the
  // second render of one session is a different performance (0068, 0089).
  it("draws the same sequence from the same seed, every time and in any host", () => {
    const first = playerSequence(spec(), 64);
    const second = playerSequence(spec(), 64);
    expect(second).toEqual(first);
    // And a walk taken one step at a time is the same walk taken all at once — the sequence is
    // the cursor's, not a second implementation of it.
    const walk = playerWalk(spec());
    expect(Array.from({ length: 64 }, () => walk())).toEqual(first);
  });

  it("draws a different sequence from a different seed", () => {
    const one = playerSequence(spec({ seed: 1 }), 64);
    const two = playerSequence(spec({ seed: 2 }), 64);
    expect(two).not.toEqual(one);
    // Not merely a different first step: the two disagree about where to read for most of the
    // pattern, which is what makes a seed a performance rather than an offset.
    const same = one.filter((step, index) => step.slot === two[index]?.slot);
    expect(same.length).toBeLessThan(one.length / 2);
  });

  it("begins at the top of the loop, so a play starts where a play starts", () => {
    expect(playerSequence(spec(), 1)[0]?.slot).toBe(0);
  });

  it("keeps every step inside the grid and the ranges the module declared", () => {
    for (const step of playerSequence(spec({ distance: PLAYER_DISTANCE_MAX, repeats: 9 }), 500)) {
      expect(Number.isInteger(step.slot)).toBe(true);
      expect(step.slot).toBeGreaterThanOrEqual(0);
      expect(step.slot).toBeLessThan(PLAYER_SLOTS);
      expect(Number.isInteger(step.repeats)).toBe(true);
      expect(step.repeats).toBeGreaterThanOrEqual(1);
      expect(step.repeats).toBeLessThanOrEqual(9);
      expect(step.gate).toBeGreaterThanOrEqual(PLAYER_GATE_FLOOR);
      expect(step.gate).toBeLessThanOrEqual(1);
    }
  });

  // The variation is the one field that is a kind rather than an amount, and this is the whole
  // difference between the two kinds.
  it("only ever moves on under `forward`, and both ways under `wander`", () => {
    const forward = playerSequence(spec({ variation: "forward", distance: 3 }), 400);
    for (const move of moves(forward)) {
      expect(wrapped(move)).toBeGreaterThanOrEqual(1);
      expect(wrapped(move)).toBeLessThanOrEqual(3);
    }
    const wander = playerSequence(spec({ variation: "wander", distance: 3 }), 400);
    const back = moves(wander).filter((move) => move < 0 && move > -PLAYER_SLOTS + 3);
    expect(back.length).toBeGreaterThan(0);
  });

  it("never travels further than the distance it was given", () => {
    const near = playerSequence(spec({ variation: "wander", distance: 1 }), 200);
    for (const [index, step] of near.entries()) {
      if (index === 0) continue;
      const previous = near[index - 1]?.slot ?? 0;
      const move = Math.abs(step.slot - previous);
      expect(Math.min(move, PLAYER_SLOTS - move)).toBe(1);
    }
  });

  // A gate of zero is the module switched off rather than set very open: nothing cuts a repeat,
  // so the transport schedules no gain move inside a step at all (0089).
  it("leaves every repeat whole at a gate of zero, and cuts them at a gate of one", () => {
    for (const step of playerSequence(spec({ gate: 0 }), 200)) expect(step.gate).toBe(1);
    const hard = playerSequence(spec({ gate: 1 }), 200);
    expect(hard.every((step) => step.gate === 1)).toBe(false);
    expect(Math.min(...hard.map((step) => step.gate))).toBeLessThan(0.5);
  });

  // The player's own clock: the walk stays a pure function of the seed with all four of the new
  // fields moved, which is the constraint the rest of P67 hangs off (0068, 0089).
  it("draws the same bursts, rests and rates from the same seed", () => {
    const clocked = spec(CLOCKED);
    expect(playerSequence(clocked, 64)).toEqual(playerSequence(clocked, 64));
    // And nothing about the clock is the plain pattern: the module actually reads these.
    expect(playerSequence(clocked, 64)).not.toEqual(playerSequence(spec(), 64));
  });

  // What a knob moved mid-pattern re-derives: the tail of the same walk, by step count alone.
  // Never a wall clock — that is what keeps two renders of one session the same file (P67).
  it("winds forward to a step count, so a tail is the same walk's tail", () => {
    const clocked = spec(CLOCKED);
    const whole = playerSequence(clocked, 64);
    const tail = playerWalk(clocked, 20);
    expect(Array.from({ length: 44 }, () => tail())).toEqual(whole.slice(20));
  });

  it("varies a burst either way, and never below the shortest one the module draws", () => {
    for (const step of playerSequence(spec({ burst: PLAYER_BURST_MAX, vary: 1 }), 500)) {
      expect(step.burst).toBeGreaterThanOrEqual(PLAYER_BURST_MIN);
      expect(step.burst).toBeLessThanOrEqual(2 * PLAYER_BURST_MAX);
    }
    const varied = playerSequence(spec({ burst: 1, vary: PLAYER_VARY_MAX }), 200);
    expect(varied.some((step) => step.burst > 1)).toBe(true);
    expect(varied.some((step) => step.burst < 1)).toBe(true);
    // A vary of zero is the knob switched off rather than set very small: exactly the burst.
    for (const step of playerSequence(spec({ burst: 0.25, vary: 0 }), 200)) {
      expect(step.burst).toBe(0.25);
    }
  });

  it("rests exactly as long as it was asked to, without drawing for it", () => {
    for (const step of playerSequence(spec({ rest: PLAYER_REST_MAX }), 200)) {
      expect(step.rest).toBe(PLAYER_REST_MAX);
    }
    for (const step of playerSequence(spec({ rest: 0 }), 200)) expect(step.rest).toBe(0);
  });

  // The drift is what makes a pattern evolve rather than repeat, and it is a count rather than a
  // magnitude: how far the rate may wander is the module's, how often it does is the performer's.
  it("holds one read rate for as many jumps as the drift asks, and none at zero", () => {
    for (const step of playerSequence(spec({ drift: 0 }), 200)) expect(step.rate).toBe(1);
    const drifting = playerSequence(spec({ drift: 4, seed: 3 }), 400);
    for (const step of drifting) expect(PLAYER_RATES).toContain(step.rate);
    expect(drifting.some((step) => step.rate !== 1)).toBe(true);
    // A rate is drawn every fourth jump and held in between — asked of where a draw may happen
    // rather than of the runs, because a draw is free to land on the rate it was already holding.
    for (const [index, step] of drifting.entries()) {
      if (index === 0 || index % 4 === 0) continue;
      expect(step.rate).toBe(drifting[index - 1]?.rate);
    }
    expect(
      drifting.filter((step, index) => step.rate !== drifting[index - 1]?.rate).length,
    ).toBeGreaterThan(1);
  });

  it("refuses a spec that is not one, field by field", () => {
    expect(assertPlayer(null, "a player")).toBeNull();
    expect(assertPlayer(spec(), "a player")).toEqual(SPEC);
    const { gate: _withoutGate, ...missing } = SPEC;
    expect(() => assertPlayer(missing, "a player")).toThrow(/expected/u);
    expect(() => assertPlayer({ ...SPEC, extra: 1 }, "a player")).toThrow(/expected/u);
    expect(() => assertPlayer({ ...SPEC, variation: "sideways" }, "a player")).toThrow(
      /not one declared/u,
    );
    expect(() => assertPlayer({ ...SPEC, seed: -1 }, "a player")).toThrow(/outside/u);
    expect(() => assertPlayer({ ...SPEC, seed: 1.5 }, "a player")).toThrow(/not whole/u);
    expect(() => assertPlayer({ ...SPEC, distance: 0 }, "a player")).toThrow(/outside/u);
    expect(() => assertPlayer({ ...SPEC, repeats: PLAYER_REPEATS_MAX + 1 }, "a player")).toThrow(
      /outside/u,
    );
    expect(() => assertPlayer({ ...SPEC, gate: 1.5 }, "a player")).toThrow(/outside/u);
    expect(() => assertPlayer({ ...SPEC, gate: Number.NaN }, "a player")).toThrow(/finite/u);
    expect(() => assertPlayer({ ...SPEC, burst: 0 }, "a player")).toThrow(/outside/u);
    expect(() => assertPlayer({ ...SPEC, burst: PLAYER_BURST_MAX + 1 }, "a player")).toThrow(
      /outside/u,
    );
    expect(() => assertPlayer({ ...SPEC, vary: -0.5 }, "a player")).toThrow(/outside/u);
    expect(() => assertPlayer({ ...SPEC, rest: PLAYER_REST_MAX + 1 }, "a player")).toThrow(
      /outside/u,
    );
    expect(() => assertPlayer({ ...SPEC, drift: 1.5 }, "a player")).toThrow(/not whole/u);
    expect(() => assertPlayer({ ...SPEC, drift: PLAYER_DRIFT_MAX + 1 }, "a player")).toThrow(
      /outside/u,
    );
  });
});
