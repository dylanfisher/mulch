/**
 * @role What a yard's sequence is worth at an instant, proved to be a function of its steps and
 *   the instant alone — the claim an offline render of the same fade rests on (0204, 0379).
 */
import { describe, expect, it } from "vitest";
import {
  assertSequence,
  SEQUENCE_SECS_MAX,
  SEQUENCE_STEPS_MAX,
  sequenceLevelAt,
  sequenceRamps,
  sequenceSpanSecs,
  type DeckSequence,
} from "./deckSequence.ts";

/** In over four, play four, out over four, rest four: sixteen seconds, every kind once. */
const BREATH: DeckSequence = [
  { kind: "in", secs: 4 },
  { kind: "play", secs: 4 },
  { kind: "out", secs: 4 },
  { kind: "rest", secs: 4 },
];

describe("the level at an instant", () => {
  it("is one throughout for no sequence", () => {
    expect(sequenceLevelAt([], -1)).toBe(1);
    expect(sequenceLevelAt([], 0)).toBe(1);
    expect(sequenceLevelAt([], 1e6)).toBe(1);
  });

  it("ramps through a fade in, holds, ramps through a fade out, and rests", () => {
    expect(sequenceLevelAt(BREATH, 0)).toBe(0);
    expect(sequenceLevelAt(BREATH, 1)).toBeCloseTo(0.25);
    expect(sequenceLevelAt(BREATH, 4)).toBe(1);
    expect(sequenceLevelAt(BREATH, 6)).toBe(1);
    expect(sequenceLevelAt(BREATH, 9)).toBeCloseTo(0.75);
    expect(sequenceLevelAt(BREATH, 12)).toBe(0);
    expect(sequenceLevelAt(BREATH, 15)).toBe(0);
  });

  it("stands at the first step's start before it begins and at the last step's end after", () => {
    // Before nought is where a lookahead reads; the fade has not started, so nought (0379).
    expect(sequenceLevelAt(BREATH, -2)).toBe(0);
    expect(sequenceLevelAt([{ kind: "out", secs: 2 }], -2)).toBe(1);
    // Past the end the transport is untouched and the level stays where it was left: a yard that
    // faded out goes on looping silently, one that faded in goes on at one (0379).
    expect(sequenceLevelAt(BREATH, 100)).toBe(0);
    expect(sequenceLevelAt([{ kind: "in", secs: 2 }], 100)).toBe(1);
  });

  it("sums the steps for the span", () => {
    expect(sequenceSpanSecs([])).toBe(0);
    expect(sequenceSpanSecs(BREATH)).toBe(16);
  });
});

describe("the ramps a window is laid as", () => {
  it("pin the level at each end and carry every edge strictly between", () => {
    // A sequence begun at 10, a window from 12 to 20: the edges at 14 and 18 fall inside it.
    expect(sequenceRamps(BREATH, 10, 12, 20)).toEqual([
      [0.5, 12],
      [1, 14],
      [1, 18],
      [0.5, 20],
    ]);
  });

  it("carry no edge that sits on the window's ends, which the pins already say", () => {
    expect(sequenceRamps(BREATH, 10, 14, 18)).toEqual([
      [1, 14],
      [1, 18],
    ]);
  });

  it("are two flat pins past the end and for no sequence", () => {
    expect(sequenceRamps(BREATH, 0, 40, 48)).toEqual([
      [0, 40],
      [0, 48],
    ]);
    expect(sequenceRamps([], 0, 40, 48)).toEqual([
      [1, 40],
      [1, 48],
    ]);
  });

  it("are the same window whoever asks for it", () => {
    // The offline pump lays windows four seconds at a time; the live one eight ahead every four.
    // Laid end to end, each edge is read the same, because the ramps depend on nothing else (0204).
    const offline = [
      ...sequenceRamps(BREATH, 1, 1, 5),
      ...sequenceRamps(BREATH, 1, 5, 9),
      ...sequenceRamps(BREATH, 1, 9, 13),
    ];
    const live = sequenceRamps(BREATH, 1, 1, 13);
    for (const [value, at] of live) expect(offline).toContainEqual([value, at]);
  });
});

describe("the gate a durable sequence comes through", () => {
  it("passes a well-formed list back in its own spelling", () => {
    expect(assertSequence(BREATH, "steps")).toEqual(BREATH);
    expect(assertSequence([], "steps")).toEqual([]);
  });

  it("refuses what is not a list of steps", () => {
    expect(() => assertSequence(null, "steps")).toThrow(/steps is not a list/u);
    expect(() => assertSequence([1], "steps")).toThrow(/steps\[0\] is not an object/u);
    expect(() => assertSequence([{ kind: "in" }], "steps")).toThrow(/steps\[0\] has keys/u);
    expect(() => assertSequence([{ kind: "in", secs: 1, x: 1 }], "steps")).toThrow(/has keys/u);
  });

  it("refuses a kind nobody declared", () => {
    expect(() => assertSequence([{ kind: "hold", secs: 1 }], "steps")).toThrow(
      /steps\[0\] kind is hold, expected one of in, play, out, rest/u,
    );
  });

  it("refuses seconds that are not whole and within bounds", () => {
    expect(() => assertSequence([{ kind: "in", secs: 0 }], "steps")).toThrow(/outside/u);
    expect(() => assertSequence([{ kind: "in", secs: SEQUENCE_SECS_MAX + 1 }], "s")).toThrow(
      /outside/u,
    );
    expect(() => assertSequence([{ kind: "in", secs: 1.5 }], "steps")).toThrow(/not whole/u);
    expect(() => assertSequence([{ kind: "in", secs: null }], "steps")).toThrow(/secs/u);
  });

  it("refuses a sequence longer than one may be", () => {
    const long = Array.from({ length: SEQUENCE_STEPS_MAX + 1 }, () => ({ kind: "play", secs: 1 }));
    expect(() => assertSequence(long, "steps")).toThrow(/at most 64/u);
  });
});
