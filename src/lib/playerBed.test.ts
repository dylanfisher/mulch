/**
 * @role What the ground is over a real buffer: how far through a file the loop may be moved, in
 *   the loop's own sixteenths, and where an unbounded offset lands once it is folded onto that.
 *   The whole of what src/lib/playerBed.ts decides, and the reason the walk may carry a raw one
 *   (0183). And then the walk's own half of it: when the loop moves, on whichever of the four
 *   clocks the period is counted on, and how far one move goes (0192, P158).
 * @instead Everything else a step is drawn from → src/lib/playerWalk.test.ts, which is where these
 *   cases were until this pair of subjects outgrew one file (0045).
 */
// A few lines over the soft cap and well under the hard one: two subjects that already split off
// src/lib/playerWalk.test.ts once (0045), each one case per index a walk can carry into a bed.
// Splitting again would part the fold from the clock that reaches it. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
import { describe, expect, it } from "vitest";

// One import per module a bed is read through — the spec, the walk, the characters, the songs and
// the seed — because a bed is only visible in the steps a whole pattern lays. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import { partVoice, type PlayerSpec } from "./player.ts";
import { playerProjection } from "./playerWire.ts";
import {
  bedBounds,
  bedGround,
  bedsOf,
  bedWrap,
  PLAYER_BED_MAX,
  PLAYER_BED_MIN,
  PLAYER_BED_DISTANCE_MAX,
} from "./playerBed.ts";
import { PLAYER_BIAS_MAX } from "./playerTravel.ts";
import { drawCharacter, PLAYER_DEFAULTS } from "./playerCharacter.ts";
import type { PlayerCharacter } from "./playerCast.ts";
import type { SongPart } from "./playerSong.ts";
import { mulberry32 } from "./random.ts";
import { PLAYER_SLOTS } from "./playerSlots.ts";
import { playerSequence, type PlayerStep } from "./playerWalk.ts";
import { oneSong } from "./playerSongs.ts";

/** A pattern holding no song, so what moves in a case below is the ground alone. */
const jumping = (fields: Partial<PlayerSpec>): PlayerSpec => ({
  seed: 11,
  ...PLAYER_DEFAULTS,
  ...fields,
});

/** And one holding the song it is handed, on the same seed. */
const spec = (song: readonly SongPart[]): PlayerSpec => jumping({ songs: oneSong(song) });

/**
 * A part, with the id every one carries and the spec a hand would have captured after pressing
 * that character's name (0176). Its own literal rather than the one src/lib/playerWalk.test.ts
 * declares, the way every test file in this instrument declares the fixture it is asking about.
 */
let minted = 0;
const part = (character: PlayerCharacter, length: number): SongPart => {
  minted++;
  return {
    id: `part-${minted}`,
    name: `part-${minted}`,
    skip: false,
    voice: partVoice(drawCharacter(character, mulberry32(minted))),
    length,
    steps: [],
  };
};

/**
 * What a step sounds as, apart from which part drew it: what a case comparing two whole streams
 * reads, so a ground that moved nothing is shown to have drawn nothing either (0134).
 */
const sounded = (steps: readonly PlayerStep[]) =>
  steps.map(({ part: _part, voice: _voice, song: _song, ...sounds }) => sounds);

describe("how far a buffer may be moved through", () => {
  it("counts the loop's own sixteenths either side of it, and the loop is offset zero", () => {
    // A ten-second file, a two-second loop starting at four: two whole beds behind it and two
    // ahead, which is thirty-two sixteenths of the loop each way since the crawl.
    expect(bedBounds(4, 2, 10)).toEqual({ from: -2 * PLAYER_SLOTS, to: 2 * PLAYER_SLOTS });
  });

  it("holds the sixteenths that fit even where no whole bed does", () => {
    // Six seconds of a ten-second file: not one whole bed ahead, and yet the ground may still
    // crawl ten sixteenths into it. This is the whole difference the crawl makes to the bounds —
    // before it, this loop answered a single bed and could not move at all.
    expect(bedBounds(0, 6, 10)).toEqual({ from: 0, to: 10 });
  });

  it("never answers a ground the loop is not one of, however the edges round", () => {
    // A loop on the very end of the file, and one on its very start: each still holds offset zero,
    // because the loop is inside the buffer by construction (src/audio/deck.ts).
    expect(bedBounds(8, 2, 10)).toEqual({ from: -4 * PLAYER_SLOTS, to: 0 });
    expect(bedBounds(0, 2, 10)).toEqual({ from: 0, to: 4 * PLAYER_SLOTS });
  });

  it("answers one bed for a span nothing can be measured in", () => {
    expect(bedBounds(0, 0, 10)).toEqual({ from: 0, to: 0 });
  });
});

describe("folding an offset onto them", () => {
  it("leaves an offset that already fits", () => {
    expect(bedWrap(1, -2, 2)).toBe(1);
    expect(bedWrap(-2, -2, 2)).toBe(-2);
  });

  it("wraps rather than clamping, so a leaning walk keeps walking", () => {
    // Five beds, −2…2: one past the top is the bottom again, and not the top a second time.
    expect(bedWrap(3, -2, 2)).toBe(-2);
    expect(bedWrap(-3, -2, 2)).toBe(2);
  });

  it("wraps however far out the index is, which is what lets the walk carry a raw one", () => {
    expect(bedWrap(PLAYER_BED_MAX * 4, -2, 2)).toBe(bedWrap(PLAYER_BED_MAX * 4 - 5, -2, 2));
    expect(bedWrap(PLAYER_BED_MIN * 4, -2, 2)).toBeGreaterThanOrEqual(-2);
    expect(bedWrap(PLAYER_BED_MIN * 4, -2, 2)).toBeLessThanOrEqual(2);
  });

  it("answers the one ground there is where a loop has no room either side", () => {
    for (const bed of [-9, 0, 9]) expect(bedWrap(bed, 0, 0)).toBe(0);
  });
});

/**
 * The two above composed, which is what every surface outside the transport asks for: the fold and
 * the buffer second it lands at (src/ui/Waveform.tsx draws it, src/ui/PlayerCard.tsx plants it).
 */
describe("where the ground a walk is standing on begins", () => {
  it("crawls a sixteenth of the loop at a time rather than hopping a whole one", () => {
    // A two-second file under a one-second loop at its start. Eight is half a bed in — a place no
    // index of loop lengths can name, and the whole of what the crawl is for.
    expect(bedGround(0, 1, 2, 8)).toEqual({ on: 8, in: 0.5 });
    expect(bedGround(0, 1, 2, 1)).toEqual({ on: 1, in: 1 / PLAYER_SLOTS });
    expect(bedGround(0, 1, 2, PLAYER_SLOTS)).toEqual({ on: PLAYER_SLOTS, in: 1 });
  });

  it("reads the loop itself as nothing to draw and nothing to plant", () => {
    expect(bedGround(0, 1, 2, 0)).toEqual({ on: 0, in: 0 });
    // And a raw offset one past the last sixteenth that fits folds back onto it.
    expect(bedGround(0, 1, 2, PLAYER_SLOTS + 1)).toEqual({ on: 0, in: 0 });
  });
});

/** Every bed a run of steps stood on, in order. */
const beds = (walked: PlayerSpec, steps = 24) => playerSequence(walked, steps).map((s) => s.bed);

/**
 * The ground the loop is read on, which is the one thing in the module that moves the *window*
 * rather than moving inside it (0183). Every case is about the index the walk carries: what a
 * buffer makes of one is `bedWrap`'s, and is proven in src/lib/playerBed.test.ts.
 */
// One case per index the walk may carry into a bed — none, one that wraps, one the crawl moved, one
// a kept ground claimed — and the length tracks how many of those there are. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("the bed each step is read in", () => {
  it("never moves the loop, and draws nothing at all, while the period is zero", () => {
    // The two halves of 0134's rule, on the field that is newest to obey it: a switched-on pattern
    // stands on one bed forever, and — the load-bearing half — every other field of every step is
    // exactly what it was before a bed could move, because no draw was taken.
    const still = jumping({ bedEvery: 0, bedDistance: 8, bedBias: 1, bedHome: 0.5 });
    expect(new Set(beds(still))).toEqual(new Set([0]));
    expect(sounded(playerSequence(still, 24))).toEqual(
      sounded(playerSequence(jumping({ bedEvery: 0 }), 24)),
    );
  });

  it("moves on the jump the period is up on and holds between two of them", () => {
    const walked = beds(jumping({ bedEvery: 4, bedDistance: 3, bedBias: 1 }), 13);
    // Four jumps on the bed it opened on, then a move, then four more — the period the dial says.
    expect(walked.slice(0, 4)).toEqual([0, 0, 0, 0]);
    expect(new Set(walked.slice(4, 8)).size).toBe(1);
    expect(new Set(walked.slice(8, 12)).size).toBe(1);
    expect(walked[4]).not.toBe(walked[0]);
    expect(walked[8]).not.toBe(walked[4]);
  });

  it("only ever goes on at a full lean, and only ever back at its negation", () => {
    const on = beds(jumping({ bedEvery: 1, bedDistance: 4, bedBias: PLAYER_BIAS_MAX }));
    const back = beds(jumping({ bedEvery: 1, bedDistance: 4, bedBias: -PLAYER_BIAS_MAX }));
    for (let step = 1; step < on.length; step++) {
      expect(on[step]).toBeGreaterThan(on[step - 1] ?? 0);
      expect(back[step]).toBeLessThan(back[step - 1] ?? 0);
    }
    // The same seed, mirrored: the lean is a side and the distance is drawn before it, so one walk
    // is the other's negation step for step (0162).
    expect(back).toEqual(on.map((bed) => (bed === 0 ? 0 : -bed)));
  });

  it("never leaves the song's own bed at a full home", () => {
    // Home is the song's *bed*, and the cursor counts sixteenths: coming home is three whole beds
    // of them and never the number the dial reads (src/lib/playerBed.ts).
    const walked = beds(jumping({ bed: 3, bedEvery: 1, bedDistance: 9, bedHome: 1 }));
    expect(new Set(walked)).toEqual(new Set([3 * PLAYER_SLOTS]));
  });

  it("counts one move in sixteenths of the loop, so the ground crawls rather than hops", () => {
    // A full lean and the shortest distance there is: every move is one sixteenth on, so after
    // sixteen of them the ground has travelled exactly one bed and stood on the fifteen places
    // between — none of which a walk over whole loop-lengths could reach (P139).
    const walked = beds(jumping({ bedEvery: 1, bedDistance: 1, bedBias: PLAYER_BIAS_MAX }), 18);
    expect(walked.slice(0, PLAYER_SLOTS + 1)).toEqual(
      Array.from({ length: PLAYER_SLOTS + 1 }, (_, step) => step),
    );
  });

  it("reaches the whole ground the bed dial does at the top of the distance dial, and no further", () => {
    // The ceiling is the Bed dial's own reach said in sixteenths, which is what "it can jump
    // anywhere" is (0193): a move at the top may cross the file, where the same walk at sixteen
    // may cross exactly one bed and no more.
    const legs = (bedDistance: number) => {
      const walked = beds(jumping({ bedEvery: 1, bedDistance, bedBias: PLAYER_BIAS_MAX }), 200);
      return walked.slice(1).map((bed, step) => bed - walked[step]!);
    };
    const far = legs(PLAYER_BED_DISTANCE_MAX);
    expect(Math.min(...far)).toBeGreaterThanOrEqual(1);
    expect(Math.max(...far)).toBeLessThanOrEqual(PLAYER_BED_DISTANCE_MAX);
    // Two hundred moves drawn flat over the reach: one of them lands in its top tenth, and none of
    // them could before the ceiling was more than a bed.
    expect(Math.max(...far)).toBeGreaterThan(PLAYER_BED_DISTANCE_MAX * 0.9);
    expect(Math.max(...legs(PLAYER_SLOTS))).toBe(PLAYER_SLOTS);
  });

  it("walks the ground straight through a part boundary rather than starting it again", () => {
    // The whole of 0184: under a full lean the walk only ever goes on, so a ground that started
    // again at each of the three boundaries would repeat a bed — and this one never does.
    const song = [part("plain", 3), part("plain", 3), part("plain", 3), part("plain", 3)];
    const walked = playerSequence(
      { ...spec(song), bedEvery: 1, bedDistance: 4, bedBias: PLAYER_BIAS_MAX },
      12,
    ).map((step) => step.bed);
    expect(new Set(walked).size).toBe(walked.length);
  });

  it("reads every part of a song on one ground, whatever the parts were captured from", () => {
    // Two characters, one still ground: no part carries a bed of its own, so neither can disagree.
    const song = [part("stutter", 2), part("breathe", 2)];
    const walked = playerSequence({ ...spec(song), bed: 6, bedEvery: 0 }, 8);
    expect(new Set(walked.map((step) => step.bed))).toEqual(new Set([6 * PLAYER_SLOTS]));
  });

  /**
   * The period on the song's own clock: a ground counted in parts moves *at* a part boundary and
   * nowhere else, so every part is read on one ground and the move is the thing a new part arrives
   * on (0192). Two parts of two jumps under a full lean, so a move is always a move on and the
   * beds can be read as pairs.
   */
  it("moves the ground at a part boundary and nowhere else, while the period counts parts", () => {
    const song = [part("plain", 2), part("plain", 2)];
    const walked = beds(
      { ...spec(song), bedPer: "part", bedEvery: 1, bedDistance: 4, bedBias: PLAYER_BIAS_MAX },
      8,
    );
    // The song's own bed for the whole of its first part — the pattern beginning is not a boundary
    // it crossed — and then one ground per part, each held for both of that part's jumps.
    const pairs = [0, 2, 4, 6].map((at) => walked.slice(at, at + 2));
    for (const pair of pairs) expect(new Set(pair).size).toBe(1);
    expect(walked[0]).toBe(0);
    expect(new Set(walked).size).toBe(4);
  });

  /**
   * And on the round: the same song, counted in whole rounds of itself, moves once every two parts
   * — at the part that begins the round and never at the one inside it (0192).
   */
  it("moves the ground once a round, while the period counts songs", () => {
    const song = [part("plain", 2), part("plain", 2)];
    const walked = beds(
      { ...spec(song), bedPer: "song", bedEvery: 1, bedDistance: 4, bedBias: PLAYER_BIAS_MAX },
      12,
    );
    const rounds = [0, 4, 8].map((at) => walked.slice(at, at + 4));
    for (const round of rounds) expect(new Set(round).size).toBe(1);
    expect(walked[0]).toBe(0);
    expect(new Set(walked).size).toBe(3);
  });

  /**
   * And a pattern with no song at all never moves on either of them, which is the honest answer
   * rather than a fall back to jumps: there is no part to begin and no round to come round, so
   * such a period never comes due (0192, P158, principle 5).
   */
  it("never moves the ground on an arrangement's clock while the pattern has no song", () => {
    for (const bedPer of ["part", "song"] as const) {
      const walked = beds(jumping({ bedPer, bedEvery: 1, bedDistance: 4, bedBias: 1 }));
      expect(new Set(walked)).toEqual(new Set([0]));
    }
  });
});

/**
 * The other author of where the ground is: a ground a hand kept, which comes round on a count of
 * its own and takes that move over from the wandering (0194). Every case reads the beds a run of
 * steps stood on, exactly as the crawl's own cases above do.
 */
// One case per way a kept ground takes a move over from the wandering, each reading the beds a run
// of steps stood on. The length is that list, not logic inside the block. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("a kept ground", () => {
  /**
   * The whole of it, on the clock the ground was counted on before it could be counted on
   * another: a ground kept for every fourth jump is stood on at the fourth, the eighth and the
   * twelfth, and the wandering has the jumps in between.
   */
  it("comes round on its own count, and the crawl has the jumps between", () => {
    const walked = beds(
      jumping({
        bedEvery: 1,
        bedDistance: 4,
        bedBias: PLAYER_BIAS_MAX,
        beds: [{ bed: 3, every: 4 }],
      }),
      13,
    );
    for (const at of [4, 8, 12]) expect(walked[at]).toBe(3 * PLAYER_SLOTS);
    for (const at of [1, 2, 3, 5, 6, 7]) expect(walked[at]).not.toBe(3 * PLAYER_SLOTS);
  });

  /**
   * Two of them on one count, and the rarer arrival wins: a ground kept for every fourth jump
   * against one kept for every second is the one a listener has waited for, and a pattern that
   * spent the fourth on the every-second ground would never sound it at all.
   */
  it("gives the count to the longest period where two are due at once", () => {
    const walked = beds(
      jumping({
        beds: [
          { bed: 1, every: 2 },
          { bed: 2, every: 4 },
        ],
      }),
      9,
    );
    expect(walked[2]).toBe(1 * PLAYER_SLOTS);
    expect(walked[4]).toBe(2 * PLAYER_SLOTS);
    expect(walked[6]).toBe(1 * PLAYER_SLOTS);
    expect(walked[8]).toBe(2 * PLAYER_SLOTS);
  });

  /**
   * And on the song's own clock, where the count is the parts and not the jumps: a ground kept for
   * every second part arrives at the beginning of the third and not a jump either side of it
   * (0192, the boundary the crawl's own period is counted on).
   */
  it("counts its period on whatever clock the ground is counted on", () => {
    const song = [part("plain", 2), part("plain", 2)];
    const walked = beds(
      { ...spec(song), bedPer: "part", bedEvery: 0, beds: [{ bed: 5, every: 2 }] },
      6,
    );
    expect(walked.slice(0, 4)).toEqual([0, 0, 0, 0]);
    expect(walked.slice(4)).toEqual([5 * PLAYER_SLOTS, 5 * PLAYER_SLOTS]);
  });

  /**
   * The load-bearing half, which is 0134's rule said for this field: an arrival is not a draw, so
   * a pattern that lands on a kept ground lays down every other number exactly as the same seed
   * laid it with nothing kept at all.
   */
  it("takes no draw, so every other field of every step is what it was", () => {
    const kept = { bedEvery: 1, bedDistance: 4, bedBias: PLAYER_BIAS_MAX };
    const wandering = playerSequence(jumping(kept), 16);
    const returning = playerSequence(jumping({ ...kept, beds: [{ bed: 3, every: 4 }] }), 16);
    // Every field but the ground itself, which is the only one a kept arrival is allowed to move.
    const ground = (steps: readonly PlayerStep[]) =>
      sounded(steps).map(({ bed: _bed, ...rest }) => rest);
    expect(ground(returning)).toEqual(ground(wandering));
    expect(beds(jumping({ ...kept, beds: [{ bed: 3, every: 4 }] }), 16)).not.toEqual(
      beds(jumping(kept), 16),
    );
  });
});

/**
 * And what a kept ground may *be*, checked where the module that says what a ground is checks its
 * clock: an empty list is the ordinary case, and everything else is loud — including two kept on
 * one ground, which would be two arrivals nothing could tell apart (principle 5, 0194).
 */
describe("a kept ground off the wire", () => {
  it("refuses anything that is not a list of them", () => {
    expect(() => bedsOf(4, "beds")).toThrow(/not an array/u);
    expect(() => bedsOf([{ bed: 1 }], "beds")).toThrow(/expected/u);
    expect(() => bedsOf([{ bed: 1, every: 0 }], "beds")).toThrow(/outside/u);
    expect(() => bedsOf([{ bed: 1.5, every: 4 }], "beds")).toThrow(/not whole/u);
    expect(() =>
      bedsOf(
        Array.from({ length: 9 }, (_, at) => ({ bed: at, every: 4 })),
        "beds",
      ),
    ).toThrow(/over/u);
  });

  it("refuses two kept on one ground, because a ground is which one it is", () => {
    expect(() =>
      bedsOf(
        [
          { bed: 1, every: 4 },
          { bed: 1, every: 8 },
        ],
        "beds",
      ),
    ).toThrow(/repeats the bed/u);
  });

  it("keeps a list that is one, and holds nothing as the ordinary case", () => {
    expect(bedsOf([], "beds")).toEqual([]);
    expect(bedsOf([{ bed: -2, every: 8 }], "beds")).toEqual([{ bed: -2, every: 8 }]);
  });

  /** And they are projected with the rest, so one list has one spelling in the session (0021). */
  it("is projected in its own declared order", () => {
    const walked = jumping({ beds: [{ bed: -2, every: 8 }] });
    expect(JSON.stringify(playerProjection(walked))).toContain('"beds":[{"bed":-2,"every":8}]');
  });
});
