/**
 * @role What a placed wait is, as arithmetic: the known Euclidean patterns the generator has to
 *   answer with, the two ends it answers without iterating, and the rule saying which of the
 *   field's two authors is live (0163).
 * @instead What a placed pattern does to a walk — that it repeats over a seed, and that the two
 *   rolled amounts leave the stream alone while it is authoring → src/lib/playerWalk.test.ts.
 */
import { describe, expect, it } from "vitest";

import { PLAYER_REST_SPAN_MAX, restIsPlaced, restPattern, type RestSpec } from "./playerRest.ts";

/** A pattern as the string the literature writes it in, which is how the cases below read. */
const spelled = (pattern: readonly boolean[]) =>
  pattern.map((waits) => (waits ? "x" : ".")).join("");

/** Only the two fields the rule reads; the other three of a `RestSpec` say nothing about it. */
const wait = (restPulses: number, restSpan: number): RestSpec => ({
  rest: 2,
  restChance: 1,
  restSpread: 0,
  restPulses,
  restSpan,
});

describe("the pattern a placed wait falls on", () => {
  /**
   * The two everyone names, and the reason the module takes a Bjorklund pattern rather than the
   * one-line remainder formula: that formula answers a rotation of each of these, which is a
   * different rhythm to hear even where it is the same set of gaps.
   */
  it("spreads its pulses the way the known Euclidean patterns do", () => {
    expect(spelled(restPattern(3, 8))).toBe("x..x..x.");
    expect(spelled(restPattern(5, 8))).toBe("x.xx.xx.");
  });

  /** A pattern is as long as its span whatever is asked of it, because the walk reads it modulo
   *  its own length and a short one would place a figure the span never comes round on. */
  it("is as long as the span, at every span a dial reaches", () => {
    for (let span = 1; span <= PLAYER_REST_SPAN_MAX; span++) {
      for (let pulses = 0; pulses <= span; pulses++) {
        const pattern = restPattern(pulses, span);
        expect(pattern).toHaveLength(span);
        expect(pattern.filter(Boolean)).toHaveLength(pulses);
      }
    }
  });

  /** The two ends, and the one past the far end: the dials are bounded independently, so more
   *  pulses than the span holds is reachable and is every jump waiting rather than a throw. */
  it("answers its ends without iterating toward them", () => {
    expect(spelled(restPattern(0, 4))).toBe("....");
    expect(spelled(restPattern(4, 4))).toBe("xxxx");
    expect(spelled(restPattern(9, 4))).toBe("xxxx");
  });

  /** Which author is live, which is a rule and never a second field (0163). */
  it("is the author of the wait for as long as it has a pulse in it", () => {
    expect(restIsPlaced(wait(0, 8))).toBe(false);
    expect(restIsPlaced(wait(1, 8))).toBe(true);
  });
});
