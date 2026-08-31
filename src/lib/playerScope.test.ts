/**
 * @role What the scope makes of a window of steps: where a landing sits, how wide it is, where its
 *   repeats split, and the three things about one a shape rather than a colour has to say — a hole
 *   is hollow, a reversed landing mirrors, and a spark is a ghost at its own slot and its own
 *   delay.
 * @instead What a step is drawn as → src/lib/playerWalk.test.ts. What a painting of this looks
 *   like → src/ui/PlayerScope.test.tsx.
 */
import { describe, expect, it } from "vitest";

import { PLAYER_FADE_SECS, repeatSpans } from "./player.ts";
import { PLAYER_SCOPE_LANDINGS, scopeAim, scopeGeometry, scopeMark } from "./playerScope.ts";
import { PLAYER_REPEATS_MAX, PLAYER_REPEATS_MIN } from "./playerRepeats.ts";
import { PLAYER_DISTANCE_MAX, PLAYER_DISTANCE_MIN } from "./playerSlots.ts";
import { playerSequence } from "./playerWalk.ts";
import { PLAYER_DEFAULTS } from "./playerCharacter.ts";
import type { PlayerStep } from "./playerWalk.ts";

/** One slot of a one-second loop, which is what every case here measures a rest in. */
const SLOT_SECS = 1 / 16;

/** A landing with nothing switched on, so each case turns exactly the one field it is about. */
const landing = (fields: Partial<PlayerStep> = {}): PlayerStep => ({
  slot: 0,
  bed: 0,
  repeats: 1,
  burst: 0.1,
  rest: 0,
  rates: [1],
  ratchet: 0,
  dropped: false,
  reversed: false,
  sparked: null,
  gate: 1,
  part: null,
  voice: null,
  song: null,
  place: null,
  ...fields,
});

// One flat list of the geometry's cases, one per thing a block has to say (0007). See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("the scope's geometry", () => {
  /**
   * The sheet is laid out from its own first landing, and the clock is a position on it rather
   * than its left edge: that is what holds the picture still while a sheet plays (0187).
   */
  it("lays the whole sheet out and says which block the clock is inside", () => {
    const steps = playerSequence({ seed: 3, ...PLAYER_DEFAULTS }, 40);
    const geometry = scopeGeometry(steps, 5, SLOT_SECS);
    expect(geometry.blocks).toHaveLength(PLAYER_SCOPE_LANDINGS);
    expect(geometry.at).toBe(5);
    expect(geometry.blocks[0]?.slot).toBe(steps[0]?.slot);
    expect(geometry.blocks[0]?.from).toBe(0);
    expect(geometry.blocks[5]?.slot).toBe(steps[5]?.slot);
    // And it runs out rather than wrapping: a sheet handed fewer landings than it holds is the
    // steps there are.
    expect(scopeGeometry(steps.slice(0, 4), 0, SLOT_SECS).blocks).toHaveLength(4);
  });

  /**
   * A knob moved mid-landing re-derives the *tail*: `rearm` keeps the entry already sounding and
   * lays the ones after it down again, so a caller's own walk of the spec held now disagrees with
   * the sound at the first block and nowhere else. The transport is the authority on the block the
   * playhead runs across, and it hands that block over (0180).
   */
  it("draws the landing the transport handed over, not the one its own walk would draw", () => {
    const walked = [landing({ slot: 1 }), landing({ slot: 2 }), landing({ slot: 3 })];
    const sounding = landing({ slot: 14, dropped: true });
    const { blocks } = scopeGeometry(walked, 1, SLOT_SECS, sounding);
    expect(blocks[1]?.slot).toBe(14);
    expect(blocks[1]?.dropped).toBe(true);
    // And only the block the clock is inside: what is before it sounded as it was walked and what
    // is after it is the walk under whatever spec is held now.
    expect(blocks.map((block) => block.slot)).toEqual([1, 14, 3]);
    // With nothing standing — a yard that is not playing — the walk's own step is the block.
    expect(scopeGeometry(walked, 1, SLOT_SECS).blocks[1]?.slot).toBe(2);
  });

  /** Every landing is as wide as it sounds, and the wait after one is the gap before the next. */
  it("lays each landing out at its own length, with the rest as the gap after it", () => {
    const one = landing({ burst: 0.2, repeats: 2 });
    const two = landing({ slot: 4, burst: 0.1, repeats: 1, rest: 1 });
    const { blocks, secs } = scopeGeometry([one, two, landing({ slot: 9 })], 0, SLOT_SECS);
    expect(secs).toBeCloseTo(0.4 + 0.1 + SLOT_SECS + 0.1, 10);
    expect(blocks[0]?.to).toBeCloseTo(0.4 / secs, 10);
    // The rest is what stands between the second block's end and the third's start, and nothing
    // else moves them apart.
    expect((blocks[2]?.from ?? 0) - (blocks[1]?.to ?? 0)).toBeCloseTo(SLOT_SECS / secs, 10);
    expect(blocks[1]?.from).toBeCloseTo(blocks[0]?.to ?? 0, 10);
  });

  /**
   * The split marks are the repeats, off `repeatSpans` — the one place a repeat's length is
   * computed and the one the transport ends a landing at, so the picture and the sound cut a
   * landing in the same places (principle 1, P118).
   */
  it("splits a landing where its repeats do, shortening across them under a ratchet", () => {
    const step = landing({ burst: 0.4, repeats: 4, ratchet: 0.5 });
    const { blocks, secs } = scopeGeometry([step], 0, SLOT_SECS);
    const spans = repeatSpans(step.burst, step.repeats, step.ratchet);
    expect(blocks[0]?.splits).toHaveLength(4);
    expect(blocks[0]?.splits.at(-1)).toBeCloseTo(1, 10);
    let end = 0;
    for (const [at, span] of spans.entries()) {
      end += span;
      expect(blocks[0]?.splits[at]).toBeCloseTo(end / secs, 10);
    }
    // And each repeat is shorter than the one before it, which is the whole of what a ratchet is.
    const widths = (blocks[0]?.splits ?? []).map(
      (split, at) => split - (blocks[0]?.splits[at - 1] ?? 0),
    );
    for (let at = 1; at < widths.length; at++) {
      expect(widths[at]).toBeLessThan(widths[at - 1] ?? 0);
    }
  });

  /** A hole is hollow and a reversed landing mirrors — both the step's own field, carried through. */
  it("carries a hole and a reversal through to the block", () => {
    const { blocks } = scopeGeometry([landing({ dropped: true, reversed: true })], 0, SLOT_SECS);
    expect(blocks[0]?.dropped).toBe(true);
    expect(blocks[0]?.reversed).toBe(true);
    expect(blocks[0]?.gate).toBe(1);
    const gated = scopeGeometry([landing({ gate: 0.25 })], 0, SLOT_SECS);
    expect(gated.blocks[0]?.gate).toBe(0.25);
  });

  /**
   * A spark is a ghost at its own slot, at its own level, opening the fraction of its landing the
   * delay says — the same arithmetic `armStep` writes its fade at, so the ghost is where the second
   * source actually starts (0175).
   */
  it("puts a spark's ghost at its own slot and its own delay", () => {
    const step = landing({ burst: 1, sparked: { slot: 11, level: 0.5, delay: 0.5 } });
    const { blocks, secs } = scopeGeometry([step, landing({ slot: 2 })], 0, SLOT_SECS);
    const spark = blocks[0]?.spark;
    expect(spark?.slot).toBe(11);
    expect(spark?.level).toBe(0.5);
    expect(spark?.at).toBeCloseTo((0.5 * (1 - PLAYER_FADE_SECS)) / secs, 10);
    // A landing that threw none draws none, rather than a ghost at nothing.
    expect(blocks[1]?.spark).toBeNull();
  });

  /** A sheet with nothing in it is no blocks, rather than a division by a length of zero. */
  it("draws nothing for a sheet with no landings in it", () => {
    expect(scopeGeometry([], 0, SLOT_SECS)).toEqual({ blocks: [], secs: 0, at: 0 });
    // And a sheet nothing has been walked onto yet, whichever landing the clock says it is on.
    expect(scopeGeometry([], 7, SLOT_SECS)).toEqual({ blocks: [], secs: 0, at: 7 });
  });
});

describe("a landing the ground moved under", () => {
  it("marks the block the bed changed at, and no others", () => {
    const geometry = scopeGeometry(
      [landing({ bed: 0 }), landing({ bed: 0 }), landing({ bed: 2 }), landing({ bed: 2 })],
      0,
      SLOT_SECS,
    );
    // The first is a window opening rather than a move, so it is never marked (0183).
    expect(geometry.blocks.map((block) => block.moved)).toEqual([false, false, true, false]);
  });
});

/**
 * A wait is a gap, and a gap is exactly what the seam between two landings that follow each other
 * immediately looks like — so the block says where its own wait begins and ends rather than leaving
 * the picture to read it as absence (P156).
 */
describe("a landing that rests", () => {
  it("says where its wait begins and ends, and says none where it does not rest", () => {
    const rested = landing({ burst: 0.2, repeats: 1, rest: 2 });
    const { blocks, secs } = scopeGeometry(
      [rested, landing({ slot: 4, burst: 0.2 })],
      0,
      SLOT_SECS,
    );
    // It begins where the sounding stops and ends where the next landing starts: one sum, not two.
    expect(blocks[0]?.wait?.from).toBeCloseTo(blocks[0]?.to ?? 0, 10);
    expect(blocks[0]?.wait?.to).toBeCloseTo((0.2 + 2 * SLOT_SECS) / secs, 10);
    expect(blocks[0]?.wait?.to).toBeCloseTo(blocks[1]?.from ?? 0, 10);
    expect(blocks[1]?.wait).toBeNull();
  });

  /**
   * The reason the mark has to exist at all: a sheet that rests and a sheet that does not can span
   * the same seconds and put their landings in different places, and nothing but the wait itself
   * says which of the two a hand is looking at.
   */
  it("tells a rested sheet from an unrested one laid out at the same total", () => {
    const rested = [landing({ burst: 0.2, rest: 3 }), landing({ slot: 4, burst: 0.2, rest: 3 })];
    const straight = [
      landing({ burst: 0.2 + 3 * SLOT_SECS }),
      landing({ slot: 4, burst: 0.2 + 3 * SLOT_SECS }),
    ];
    const one = scopeGeometry(rested, 0, SLOT_SECS);
    const two = scopeGeometry(straight, 0, SLOT_SECS);
    expect(one.secs).toBeCloseTo(two.secs, 10);
    // The same total, and the same seam between the two landings — the wait is the whole of the
    // difference.
    expect(one.blocks[1]?.from).toBeCloseTo(two.blocks[1]?.from ?? 0, 10);
    expect(one.blocks[0]?.wait).not.toBeNull();
    expect(two.blocks[0]?.wait).toBeNull();
    expect(one.blocks[0]?.to).toBeLessThan(two.blocks[0]?.to ?? 0);
  });
});

/**
 * And a sheet that never rests says no wait anywhere on it. Whether there is a wait is asked of
 * `rest` and never of the layout's own two numbers: `landingSecs` folds a landing's spans from
 * nought and the sheet folds them from where the block began, so the same sum lands an ulp apart on
 * about one landing in ten — which as a comparison is a wait of 4e-16 seconds, drawn a whole
 * hairline wide and read out as "0s left".
 */
describe("a sheet that never rests", () => {
  it("says no wait on a sheet of landings that never rest, at any width they happen to sum to", () => {
    const awkward = landing({
      burst: 0.2919670096794322,
      repeats: 7,
      ratchet: 0.48161725521297255,
    });
    const { blocks } = scopeGeometry(
      Array.from({ length: 8 }, () => awkward),
      0,
      0.25,
    );
    expect(blocks.map((block) => block.wait)).toEqual(Array.from({ length: 8 }, () => null));
  });
});

/**
 * Which tier a boundary belongs to comes off the `place` the step carries and is never re-derived
 * here: `createSongs` is the one thing that advances the tiers (0221, principle 1).
 */
/** One place, at the two counts a case is about. Nought is the last jump of what it counts. */
const standing = (partLeft: number, songLeft: number) => ({
  song: "song-1",
  songPlay: 0,
  partLeft,
  songLeft,
});

describe("a boundary between two rounds", () => {
  it("wears the deepest tier that ends after it, and none where the run carries on", () => {
    const { blocks } = scopeGeometry(
      [
        landing({ place: standing(2, 5) }),
        landing({ place: standing(0, 3) }),
        landing({ place: standing(0, 0) }),
        landing(),
      ],
      0,
      SLOT_SECS,
    );
    expect(blocks.map((block) => block.edge)).toEqual([null, "part", "song", null]);
  });
});

/**
 * The picture is a control and not only a readout: a drag across it writes the two numbers whose
 * shape it draws, so a hand can ask for "wander further" or "make it busier" without finding two
 * dials by name (0197). The claims are the mapping's — the gesture itself is the surface's
 * (src/ui/PlayerScope.tsx).
 */
describe("aiming at the picture", () => {
  it("puts each end of the picture at each end of the knob's own range", () => {
    expect(scopeAim(0, 0)).toEqual({
      distance: PLAYER_DISTANCE_MIN,
      repeats: PLAYER_REPEATS_MIN,
    });
    expect(scopeAim(1, 1)).toEqual({
      distance: PLAYER_DISTANCE_MAX,
      repeats: PLAYER_REPEATS_MAX,
    });
  });

  /**
   * Both are counted knobs, so a fraction of the way across lands on a whole number rather than
   * between two: `assertPlayer` refuses a fractional one loudly rather than rounding it for us,
   * which is why the rounding is here and not at the caller (`isWholeKnob`).
   */
  it("lands on whole numbers anywhere between those ends", () => {
    for (const fraction of [0.13, 0.37, 0.5, 0.62, 0.99]) {
      const aim = scopeAim(fraction, fraction);
      expect(Number.isInteger(aim.distance)).toBe(true);
      expect(Number.isInteger(aim.repeats)).toBe(true);
    }
  });

  /**
   * A pointer captured by the surface keeps reporting however far it has left it (0114), so the
   * fraction handed here is routinely outside the picture — and a knob's range is the whole of what
   * it may hold. Clamped rather than refused: a drag that ran off the top is a hand asking for the
   * most of something, not a gesture to drop.
   */
  it("clamps a pointer that has left the picture to the range's own ends", () => {
    expect(scopeAim(-3, -3)).toEqual(scopeAim(0, 0));
    expect(scopeAim(4, 4)).toEqual(scopeAim(1, 1));
  });

  /** The two axes are independent: across says how far, up says how many, and neither reads the
   *  other. Drawn from opposite corners so a mapping that swapped them would fail here. */
  it("reads the two axes apart", () => {
    const aim = scopeAim(0, 1);
    expect(aim.distance).toBe(PLAYER_DISTANCE_MIN);
    expect(aim.repeats).toBe(PLAYER_REPEATS_MAX);
  });

  /**
   * The crosshair is drawn where a press on it would write, which is the whole claim `scopeMark`
   * exists for: a marker a fraction off its own gesture says the mapping is something other than
   * what it is (0198). Round-tripped through the aim rather than compared against arithmetic
   * written twice — the numbers a hand can reach are exactly the ones a drag produces.
   */
  it("marks a point a press there would write", () => {
    for (const fraction of [0, 0.13, 0.5, 0.62, 1]) {
      const aim = scopeAim(fraction, fraction);
      const mark = scopeMark(aim.distance, aim.repeats);
      expect(scopeAim(mark.across, mark.up)).toEqual(aim);
    }
  });

  /** Each end of the range at each end of the picture, the other way round from the aim above. */
  it("puts each end of the knob's own range at each end of the picture", () => {
    expect(scopeMark(PLAYER_DISTANCE_MIN, PLAYER_REPEATS_MIN)).toEqual({ across: 0, up: 0 });
    expect(scopeMark(PLAYER_DISTANCE_MAX, PLAYER_REPEATS_MAX)).toEqual({ across: 1, up: 1 });
  });

  /**
   * A dial may be turned past what a drag can ask for, and a marker off the edge of the picture is
   * one a hand cannot grab — so it stops at the edge rather than being drawn where nothing is.
   */
  it("clamps a spec outside the picture's own ends onto them", () => {
    expect(scopeMark(PLAYER_DISTANCE_MAX + 9, PLAYER_REPEATS_MAX + 9)).toEqual({
      across: 1,
      up: 1,
    });
    expect(scopeMark(PLAYER_DISTANCE_MIN - 9, PLAYER_REPEATS_MIN - 9)).toEqual({
      across: 0,
      up: 0,
    });
  });
});
