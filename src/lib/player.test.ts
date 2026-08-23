/**
 * @role The pattern generator's contract: the same seed is the same sequence of positions, a
 *   different seed is a different one, and every field a step carries stays inside what the
 *   module declared (0089).
 */
// The file is one describe of one case per claim, so its length is how many claims the
// generator makes. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
import { describe, expect, it } from "vitest";

import {
  assertPlayer,
  assertSync,
  syncedFrom,
  SYNC_MAX_SECS,
  SYNC_MIN_SECS,
  playerSequence,
  playerWalk,
  PLAYER_BURST_MAX,
  PLAYER_BURST_MIN,
  PLAYER_MIN_SLOT_SECS,
  PLAYER_DISTANCE_MAX,
  PLAYER_HOLD_MAX,
  PLAYER_GATE_FLOOR,
  PLAYER_RATES,
  PLAYER_RATE_UNITY,
  PLAYER_SPREAD_MAX,
  PLAYER_DRIFT_MAX,
  PLAYER_REPEATS_MAX,
  PLAYER_REPEATS_MIN,
  PLAYER_REPEATS_SPREAD_MAX,
  PLAYER_SEED_MAX,
  PLAYER_REST_MAX,
  PLAYER_SLOTS,
  PLAYER_VARY_MAX,
  type PlayerSpec,
} from "./player.ts";

/** The player's own clock, all four of it turned away from the plain-jump defaults (P67). */
const CLOCKED = { burst: 0.5, vary: 0.5, rest: 0.75, hold: 3 } as const;

const SPEC: PlayerSpec = {
  seed: 1,
  variation: "wander",
  distance: 4,
  repeats: 4,
  repeatsChance: 1,
  repeatsSpread: 0,
  repeatsHold: 0,
  gate: 0.5,
  burst: 1,
  vary: 0,
  varyChance: 1,
  rest: 0,
  restChance: 1,
  restSpread: 0,
  hold: 0,
  chance: 1,
  spread: 2,
  drift: 4,
};

const spec = (patch: Partial<PlayerSpec> = {}): PlayerSpec => ({ ...SPEC, ...patch });

/** Which rung of the ladder a rate sits on: a signed distance from the deck's own (0118). */
const rungOf = (rate: number): number =>
  (PLAYER_RATES as readonly number[]).indexOf(rate) - PLAYER_RATE_UNITY;

/** How far each step moved from the one before it, in slots. */
const moves = (steps: { slot: number }[]): number[] =>
  steps.slice(1).map((step, index) => step.slot - (steps[index]?.slot ?? 0));

/** A move read on the ring the grid is: forward wrapping at the top reads negative otherwise. */
const wrapped = (move: number): number => (move + PLAYER_SLOTS) % PLAYER_SLOTS;

// One case per claim the generator makes; the length tracks how many claims it makes rather than
// how much any of them decides — and the file is that list, so both bounds are the number of
// claims. See docs/decisions/0007-reviewed-oversized-functions.md.
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
      expect(step.repeats).toBe(9);
      expect(step.gate).toBeGreaterThanOrEqual(PLAYER_GATE_FLOOR);
      expect(step.gate).toBeLessThanOrEqual(1);
    }
  });

  /**
   * The one reading of the card where the count is supposed to be arithmetic: with vary, rest and
   * hold at zero a landing sounds the number of times the Repeats dial says and not a number under
   * it (0134, P96). Read at more than one seed, because the defect this replaces was a draw and a
   * draw is right at some seeds by luck — and read again with the player's own clock running,
   * because a count is exact whatever else the pattern is straying.
   */
  it("plays the repeats it was set, at every seed and every count", () => {
    for (const seed of [1, 2, 7, 1234, PLAYER_SEED_MAX]) {
      for (const repeats of [1, 2, 4, 9, PLAYER_REPEATS_MAX]) {
        for (const clock of [{ vary: 0, rest: 0, hold: 0 }, CLOCKED]) {
          const drawn = playerSequence(spec({ ...clock, seed, repeats }), 200);
          expect(drawn.map((step) => step.repeats)).toEqual(
            Array.from({ length: drawn.length }, () => repeats),
          );
        }
      }
    }
  });

  /**
   * The count's own door, and the three amounts behind it: how many jumps keep one count, how far
   * a redrawn one may stray from the dial, and whether a due redraw fires at all (0135). A count
   * is kept for exactly the number of jumps the keep says — read block by block rather than as
   * runs, because a fresh draw inside the spread may land on the count it is already on, which a
   * rate's draw never does.
   */
  it("keeps one repeat count for as many jumps as the keep asks, and strays it inside its spread", () => {
    const walked = playerSequence(
      spec({ repeats: 4, repeatsHold: 4, repeatsSpread: 2, seed: 3 }),
      400,
    );
    for (const [index, step] of walked.entries()) {
      expect(step.repeats).toBeGreaterThanOrEqual(2);
      expect(step.repeats).toBeLessThanOrEqual(6);
      expect(step.repeats).toBe(walked[index - (index % 4)]?.repeats);
    }
    expect(walked.some((step) => step.repeats !== 4)).toBe(true);
  });

  /**
   * The two ways of asking for the count the dial says, from either end: a keep of zero never
   * lets go of it, and a chance of zero never redraws however often the keep is up — which is the
   * arithmetic 0134 gave the count, still reachable from any spread (0135).
   */
  it("never redraws a repeat count at no chance, and clips a spread to the dial's own range", () => {
    for (const off of [{ repeatsHold: 0 }, { repeatsHold: 1, repeatsChance: 0 }]) {
      for (const step of playerSequence(spec({ repeats: 4, repeatsSpread: 8, ...off }), 200)) {
        expect(step.repeats).toBe(4);
      }
    }
    // And a keep turned up over a spread of zero costs the stream nothing: there is nowhere to
    // draw to, so nothing is drawn and every other field of every step is the one it was — a dial
    // that names the count must not move everything except the count (0134, 0135).
    for (const keep of [1, 4, PLAYER_HOLD_MAX]) {
      expect(playerSequence(spec({ repeats: 4, repeatsHold: keep }), 200)).toEqual(
        playerSequence(spec({ repeats: 4, repeatsHold: 0 }), 200),
      );
    }
    // The widest spread from the bottom of the dial: clipped to the range rather than wrapped, so
    // a count is a count and never a zero or a sixty-fifth repeat.
    const wide = playerSequence(
      spec({ repeats: 1, repeatsHold: 1, repeatsSpread: PLAYER_REPEATS_SPREAD_MAX, seed: 5 }),
      400,
    );
    for (const step of wide) {
      expect(Number.isInteger(step.repeats)).toBe(true);
      expect(step.repeats).toBeGreaterThanOrEqual(PLAYER_REPEATS_MIN);
      expect(step.repeats).toBeLessThanOrEqual(PLAYER_REPEATS_MAX);
    }
    expect(wide.some((step) => step.repeats === PLAYER_REPEATS_MAX)).toBe(true);
  });

  /**
   * The vary is seconds and not a fraction: half a second of burst strayed by a tenth reaches a
   * tenth either side of it, which is a band a fraction of the burst cannot draw — 0.1 read as a
   * fraction is a twentieth of a second either way and nothing outside it (0135).
   */
  it("strays a burst by the seconds the vary says, on the burst's own scale", () => {
    const drawn = playerSequence(spec({ burst: 0.5, vary: 0.1, seed: 11 }), 500);
    for (const step of drawn) {
      expect(step.burst).toBeGreaterThanOrEqual(0.4 - 1e-9);
      expect(step.burst).toBeLessThanOrEqual(0.6 + 1e-9);
    }
    // Outside the band the same number meant as a fraction, at both ends, which is the whole of
    // what changed.
    expect(drawn.some((step) => step.burst < 0.45)).toBe(true);
    expect(drawn.some((step) => step.burst > 0.55)).toBe(true);
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
    // The widest stray the dial reaches, in seconds, over the longest burst: a length either side
    // of it, floored at the shortest the module will play and never past the sum of the two.
    for (const step of playerSequence(
      spec({ burst: PLAYER_BURST_MAX, vary: PLAYER_VARY_MAX }),
      500,
    )) {
      expect(step.burst).toBeGreaterThanOrEqual(PLAYER_BURST_MIN);
      expect(step.burst).toBeLessThanOrEqual(PLAYER_BURST_MAX + PLAYER_VARY_MAX);
    }
    const varied = playerSequence(spec({ burst: 1, vary: PLAYER_VARY_MAX }), 200);
    expect(varied.some((step) => step.burst > 1)).toBe(true);
    expect(varied.some((step) => step.burst < 1)).toBe(true);
    // A vary of zero is the knob switched off rather than set very small: exactly the burst.
    for (const step of playerSequence(spec({ burst: 0.25, vary: 0 }), 200)) {
      expect(step.burst).toBe(0.25);
    }
  });

  // The performer's floor is the seam's own, in wall seconds, and it is reached rather than
  // approached: a burst is a duration now, so the shortest one a hand can ask for is exactly the
  // shortest window the transport will play, on every loop rather than only on long ones (0119).
  it("draws the shortest burst exactly, and refuses one under the seam's floor", () => {
    expect(PLAYER_BURST_MIN).toBe(PLAYER_MIN_SLOT_SECS);
    // Drawn as asked rather than pinned to a bound, at the floor and just above it (P82).
    for (const burst of [PLAYER_BURST_MIN, PLAYER_BURST_MIN * 2]) {
      expect(assertPlayer({ ...SPEC, burst }, "a player")?.burst).toBe(burst);
      for (const step of playerSequence(spec({ burst, vary: 0 }), 200)) {
        expect(step.burst).toBe(burst);
      }
    }
    expect(() => assertPlayer({ ...SPEC, burst: PLAYER_BURST_MIN / 2 }, "a player")).toThrow(
      /outside/u,
    );
    // A burst in the old unit — four, meaning four slots — is now four seconds and out of range,
    // which is how a spec from before this build is refused rather than quietly transposed (0026).
    expect(() => assertPlayer({ ...SPEC, burst: 4 }, "a player")).toThrow(/outside/u);
  });

  /**
   * The two ends the performer asked the module to reach: a landing that repeats sixty-four
   * times, and a grain of five milliseconds. Both are stated in the units a hand reads them in —
   * a count and whole milliseconds — because the point of moving a bound is what the dial can now
   * be set to, and derived arithmetic would pass whatever the constants happened to say (0120).
   * That the top of the range is a count a pattern actually plays is the case above (0134).
   */
  it("counts a landing to sixty-four repeats, and draws a grain of five milliseconds", () => {
    expect(PLAYER_REPEATS_MAX).toBe(64);
    expect(Math.round(PLAYER_BURST_MIN * 1000)).toBe(5);
    expect(assertPlayer({ ...SPEC, repeats: PLAYER_REPEATS_MAX }, "a player")?.repeats).toBe(64);
  });

  it("rests exactly as long as it was asked to while nothing behind the dial says otherwise", () => {
    for (const step of playerSequence(spec({ rest: PLAYER_REST_MAX }), 200)) {
      expect(step.rest).toBe(PLAYER_REST_MAX);
    }
    for (const step of playerSequence(spec({ rest: 0 }), 200)) expect(step.rest).toBe(0);
  });

  /**
   * The two amounts behind the Rest dial's own marker: whether the wait is taken at all and how
   * far a taken one strays (P87). A refused wait is zero rather than a shorter one — no wait is
   * the steps butting up, which is what a rest of zero already gives.
   */
  it("takes a wait on the odds it was given, and strays a taken one either way", () => {
    const some = playerSequence(spec({ rest: 2, restChance: 0.5, seed: 5 }), 400);
    expect(some.some((step) => step.rest === 0)).toBe(true);
    expect(some.some((step) => step.rest === 2)).toBe(true);
    for (const step of playerSequence(spec({ rest: 2, restChance: 0 }), 200)) {
      expect(step.rest).toBe(0);
    }
    const strayed = playerSequence(spec({ rest: 2, restSpread: 0.5, seed: 7 }), 400).map(
      (step) => step.rest,
    );
    expect(Math.min(...strayed)).toBeGreaterThanOrEqual(1);
    expect(Math.max(...strayed)).toBeLessThanOrEqual(3);
    expect(strayed.some((rest) => rest < 2)).toBe(true);
    expect(strayed.some((rest) => rest > 2)).toBe(true);
  });

  /**
   * The one amount behind the Vary dial's marker: the odds a landing's length is varied at all.
   * A chance of zero leaves every landing exactly as long as the burst says, which a vary of zero
   * also gives and by a different road (P87).
   */
  it("varies a landing's length only on the odds the chance allows", () => {
    for (const step of playerSequence(spec({ burst: 0.5, vary: 1, varyChance: 0 }), 200)) {
      expect(step.burst).toBe(0.5);
    }
    const some = playerSequence(spec({ burst: 0.5, vary: 1, varyChance: 0.5, seed: 5 }), 400).map(
      (step) => step.burst,
    );
    expect(some.some((burst) => burst === 0.5)).toBe(true);
    expect(some.some((burst) => burst !== 0.5)).toBe(true);
  });

  // The hold is what makes a pattern evolve rather than repeat, and it is a count: how often the
  // rate lets go. How far it then goes is `spread` and `drift`, and whether it goes at all is
  // `chance` — all three the performer's now rather than the module's (0118).
  it("holds one read rate for as many jumps as the hold asks, and none at zero", () => {
    for (const step of playerSequence(spec({ hold: 0 }), 200)) expect(step.rate).toBe(1);
    const walked = playerSequence(spec({ hold: 4, seed: 3 }), 400);
    for (const step of walked) expect(PLAYER_RATES).toContain(step.rate);
    expect(walked.some((step) => step.rate !== 1)).toBe(true);
    // A rate is drawn every fourth jump and held in between. A draw always lands somewhere it was
    // not, so these runs are exactly four long rather than at most four (0118).
    for (const [index, step] of walked.entries()) {
      if (index === 0 || index % 4 === 0) continue;
      expect(step.rate).toBe(walked[index - 1]?.rate);
    }
    const changes = walked.filter((step, index) => step.rate !== walked[index - 1]?.rate);
    expect(changes.length).toBe(walked.length / 4);
  });

  // The odds a due change fires. One is the promise the module used to make unconditionally; zero
  // is a hold that never lets go however high its count, which is a different thing from a hold of
  // zero and reachable from any of them.
  it("rolls a due rate change against the chance, and never changes at none of it", () => {
    for (const step of playerSequence(spec({ hold: 1, chance: 0 }), 400)) expect(step.rate).toBe(1);
    // Due on every jump: at half odds the rate changes on some of them and holds through others,
    // which no count of jumps alone can express.
    const rolled = playerSequence(spec({ hold: 1, chance: 0.5, seed: 5 }), 400);
    const changed = rolled.filter((step, index) => step.rate !== rolled[index - 1]?.rate).length;
    expect(changed).toBeGreaterThan(0);
    expect(changed).toBeLessThan(rolled.length - 1);
    // And a failed roll is the same odds again on the next jump rather than a change postponed:
    // at full odds every jump changes, so nothing was being saved up.
    const certain = playerSequence(spec({ hold: 1, chance: 1, seed: 5 }), 200);
    for (const [index, step] of certain.entries()) {
      if (index === 0) continue;
      expect(step.rate).not.toBe(certain[index - 1]?.rate);
    }
  });

  // How far from the deck's own rate a drawn one may sit. Zero is a pattern that jumps at one
  // speed however often its hold expires — the same sound `hold: 0` gives, by the other road.
  it("keeps every drawn rate inside the spread, and never leaves unity at none of it", () => {
    for (const step of playerSequence(spec({ hold: 1, spread: 0 }), 400)) expect(step.rate).toBe(1);
    for (const spread of [1, 2, PLAYER_SPREAD_MAX]) {
      const walked = playerSequence(spec({ hold: 1, spread, seed: 7 }), 600);
      const rungs = walked.map((step) => rungOf(step.rate));
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
      const rungs = walked.map((step) => rungOf(step.rate));
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

  // One assertion per field the validator refuses, so the length is how many fields the spec
  // declares. See docs/decisions/0007-reviewed-oversized-functions.md.
  // oxlint-disable-next-line max-lines-per-function
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
    // The count's own three: a probability, a whole spread in repeats, and a whole keep in jumps.
    expect(() => assertPlayer({ ...SPEC, repeatsChance: 1.5 }, "a player")).toThrow(/outside/u);
    expect(() => assertPlayer({ ...SPEC, repeatsSpread: 0.5 }, "a player")).toThrow(/not whole/u);
    expect(() =>
      assertPlayer({ ...SPEC, repeatsSpread: PLAYER_REPEATS_SPREAD_MAX + 1 }, "a player"),
    ).toThrow(/outside/u);
    expect(() => assertPlayer({ ...SPEC, repeatsHold: PLAYER_HOLD_MAX + 1 }, "a player")).toThrow(
      /outside/u,
    );
    expect(() => assertPlayer({ ...SPEC, gate: 1.5 }, "a player")).toThrow(/outside/u);
    expect(() => assertPlayer({ ...SPEC, gate: Number.NaN }, "a player")).toThrow(/finite/u);
    expect(() => assertPlayer({ ...SPEC, burst: 0 }, "a player")).toThrow(/outside/u);
    expect(() => assertPlayer({ ...SPEC, burst: PLAYER_BURST_MAX + 1 }, "a player")).toThrow(
      /outside/u,
    );
    expect(() => assertPlayer({ ...SPEC, vary: -0.5 }, "a player")).toThrow(/outside/u);
    expect(() => assertPlayer({ ...SPEC, varyChance: 1.5 }, "a player")).toThrow(/outside/u);
    expect(() => assertPlayer({ ...SPEC, restChance: -0.1 }, "a player")).toThrow(/outside/u);
    expect(() => assertPlayer({ ...SPEC, restSpread: 2 }, "a player")).toThrow(/outside/u);
    expect(() => assertPlayer({ ...SPEC, rest: PLAYER_REST_MAX + 1 }, "a player")).toThrow(
      /outside/u,
    );
    expect(() => assertPlayer({ ...SPEC, hold: 1.5 }, "a player")).toThrow(/not whole/u);
    // The rate walk's three, which are two counts and a probability (0118).
    expect(() => assertPlayer({ ...SPEC, chance: 1.5 }, "a player")).toThrow(/outside/u);
    expect(() => assertPlayer({ ...SPEC, chance: -0.1 }, "a player")).toThrow(/outside/u);
    expect(() => assertPlayer({ ...SPEC, spread: 1.5 }, "a player")).toThrow(/not whole/u);
    expect(() => assertPlayer({ ...SPEC, spread: PLAYER_SPREAD_MAX + 1 }, "a player")).toThrow(
      /outside/u,
    );
    // A drift of zero is a change that cannot travel, which is a spec asking for nothing rather
    // than for stillness — `spread` is where stillness is said (0118).
    expect(() => assertPlayer({ ...SPEC, drift: 0 }, "a player")).toThrow(/outside/u);
    expect(() => assertPlayer({ ...SPEC, drift: 2.5 }, "a player")).toThrow(/not whole/u);
    expect(() => assertPlayer({ ...SPEC, hold: PLAYER_HOLD_MAX + 1 }, "a player")).toThrow(
      /outside/u,
    );
  });

  /**
   * A spec stored before the count had a door is refused whole rather than read as one of this
   * build's, and it is the key set that refuses it: it carries no `repeatsChance`,
   * `repeatsSpread` or `repeatsHold`. Its `vary` cannot be refused on its own — a fraction of the
   * burst is a number inside the seconds range that replaced it, which is exactly why the key set
   * has to be the gate. Pre-release, such a spec is discarded and never repaired (0026, 0135).
   */
  it("refuses a spec from before the count had its own door, on its key set", () => {
    const { repeatsChance: _c, repeatsSpread: _s, repeatsHold: _h, ...before } = SPEC;
    expect(() => assertPlayer({ ...before, vary: 0.5 }, "a player")).toThrow(/expected/u);
    // And the fields it is missing are named in what the refusal expected, so the discard says
    // which build the spec came from.
    expect(() => assertPlayer({ ...before, vary: 0.5 }, "a player")).toThrow(/repeatsChance/u);
  });

  it("refuses a shared clock that is not one, and passes no clock through", () => {
    expect(assertSync(null, "session.sync")).toBeNull();
    expect(assertSync(SYNC_MIN_SECS, "session.sync")).toBe(SYNC_MIN_SECS);
    expect(assertSync(SYNC_MAX_SECS, "session.sync")).toBe(SYNC_MAX_SECS);
    expect(() => assertSync(SYNC_MIN_SECS / 2, "session.sync")).toThrow(/outside/u);
    expect(() => assertSync(SYNC_MAX_SECS + 1, "session.sync")).toThrow(/outside/u);
    expect(() => assertSync(Number.NaN, "session.sync")).toThrow(/finite/u);
    expect(() => assertSync("1", "session.sync")).toThrow(/finite/u);
  });

  /**
   * The whole of the clock as maths: a tick is a multiple of the period counted from zero, so
   * two decks asking from anywhere get the same answers and neither's grid depends on when it
   * started asking. A time already on a tick stays on it rather than being pushed a period on by
   * a float's last bit (0097).
   */
  it("puts the next step on a tick counted from zero, wherever it is asked from", () => {
    expect(syncedFrom(1.234, null)).toBe(1.234);
    // Zero is already a tick, and the signed zero the ceiling leaves is the same instant.
    expect(syncedFrom(0, 0.5)).toBeCloseTo(0, 12);
    expect(syncedFrom(0.5, 0.5)).toBeCloseTo(0.5, 12);
    expect(syncedFrom(0.51, 0.5)).toBeCloseTo(1, 12);
    expect(syncedFrom(0.3 + 0.3 + 0.3, 0.3)).toBeCloseTo(0.9, 12);
    for (const at of [0.07, 1.31, 4.9, 11.2]) {
      const tick = syncedFrom(at, 0.4);
      expect(tick).toBeGreaterThanOrEqual(at - 1e-9);
      expect(tick - at).toBeLessThan(0.4);
      expect(tick / 0.4).toBeCloseTo(Math.round(tick / 0.4), 9);
    }
  });
});
