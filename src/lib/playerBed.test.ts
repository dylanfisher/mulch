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
  bedMove,
  bedsOf,
  bedWrap,
  PLAYER_BED_MAX,
  PLAYER_BED_MIN,
  PLAYER_BED_DISTANCE_MAX,
  PLAYER_BED_REACH_SLOTS,
  type PlayerBedReach,
} from "./playerBed.ts";
import { drawCharacter, PLAYER_DEFAULTS } from "./playerCharacter.ts";
import type { PlayerCharacter } from "./playerCast.ts";
import type { SongPart } from "./playerSong.ts";
import { mulberry32 } from "./random.ts";
import { PLAYER_SCOPE_LANDINGS } from "./playerScope.ts";
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
    expect(bedBounds(4, 2, 10, null)).toEqual({ from: -2 * PLAYER_SLOTS, to: 2 * PLAYER_SLOTS });
  });

  it("holds the sixteenths that fit even where no whole bed does", () => {
    // Six seconds of a ten-second file: not one whole bed ahead, and yet the ground may still
    // crawl ten sixteenths into it. This is the whole difference the crawl makes to the bounds —
    // before it, this loop answered a single bed and could not move at all.
    expect(bedBounds(0, 6, 10, null)).toEqual({ from: 0, to: 10 });
  });

  it("never answers a ground the loop is not one of, however the edges round", () => {
    // A loop on the very end of the file, and one on its very start: each still holds offset zero,
    // because the loop is inside the buffer by construction (src/audio/deck.ts).
    expect(bedBounds(8, 2, 10, null)).toEqual({ from: -4 * PLAYER_SLOTS, to: 0 });
    expect(bedBounds(0, 2, 10, null)).toEqual({ from: 0, to: 4 * PLAYER_SLOTS });
  });

  it("answers one bed for a span nothing can be measured in", () => {
    expect(bedBounds(0, 0, 10, null)).toEqual({ from: 0, to: 0 });
  });

  /**
   * And the zone a hand marked narrows that and never widens it: the room the buffer answers for
   * is the outer bound whatever was marked, so a zone reaching past the file is the file (0318).
   */
  it("narrows the bounds to a zone, and never past the room the file holds", () => {
    // Six seconds of a ten-second file: the ground may crawl ten sixteenths into it unbounded.
    expect(bedBounds(0, 6, 10, { from: 2, to: 6 })).toEqual({ from: 2, to: 6 });
    // A zone the file cannot hold is the file, at each end and at both.
    expect(bedBounds(0, 6, 10, { from: -40, to: 400 })).toEqual({ from: 0, to: 10 });
    expect(bedBounds(0, 6, 10, { from: 4, to: 400 })).toEqual({ from: 4, to: 10 });
    // And one wholly past its end is the nearest ground the file does hold, rather than a pair
    // nothing could be folded onto.
    expect(bedBounds(0, 6, 10, { from: 40, to: 80 })).toEqual({ from: 10, to: 10 });
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
    expect(bedGround(0, 1, 2, 8, null)).toEqual({ on: 8, in: 0.5 });
    expect(bedGround(0, 1, 2, 1, null)).toEqual({ on: 1, in: 1 / PLAYER_SLOTS });
    expect(bedGround(0, 1, 2, PLAYER_SLOTS, null)).toEqual({ on: PLAYER_SLOTS, in: 1 });
  });

  it("reads the loop itself as nothing to draw and nothing to plant", () => {
    expect(bedGround(0, 1, 2, 0, null)).toEqual({ on: 0, in: 0 });
    // And a raw offset one past the last sixteenth that fits folds back onto it.
    expect(bedGround(0, 1, 2, PLAYER_SLOTS + 1, null)).toEqual({ on: 0, in: 0 });
  });

  /**
   * And every offset lands inside a zone through that same fold: the crawl's own raw index, a bed
   * a hand planted outside it, and the home roll of zero the shared ground comes back to. Zero is
   * no longer promised — a zone at the far end of a file does not contain the loop, and coming
   * home there means the nearest home inside the zone (0318 amending `bedBounds`' own claim).
   */
  it("folds every offset into a zone, planted bed and home roll alike", () => {
    // A ten-second file under a one-second loop at its start: sixteenths 0…144 exist unbounded,
    // and this hand said only 32…47.
    const zone = { from: 32, to: 47 };
    for (const offset of [0, 8, 31, 48, PLAYER_SLOTS * 5, -100]) {
      const stood = bedGround(0, 1, 10, offset, zone);
      expect(stood.on).toBeGreaterThanOrEqual(32);
      expect(stood.on).toBeLessThanOrEqual(47);
      expect(stood.in).toBeCloseTo(stood.on / PLAYER_SLOTS, 12);
    }
    // A planted bed two loop-lengths in is outside it and folds in, and the home roll of zero
    // does the same rather than escaping the zone.
    expect(bedGround(0, 1, 10, 2 * PLAYER_SLOTS, zone).on).toBe(32);
    expect(bedGround(0, 1, 10, 0, zone).on).toBe(32);
    // Unbounded, that same home roll is the loop itself — which is what the zone took away.
    expect(bedGround(0, 1, 10, 0, null).on).toBe(0);
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
    const still = jumping({ bedEvery: 0, bedReach: "bed", bedWay: "on", bedWanders: false });
    expect(new Set(beds(still))).toEqual(new Set([0]));
    expect(sounded(playerSequence(still, 24))).toEqual(
      sounded(playerSequence(jumping({ bedEvery: 0 }), 24)),
    );
  });

  it("moves on the jump the period is up on and holds between two of them", () => {
    const walked = beds(jumping({ bedEvery: 4, bedReach: "nudge", bedWay: "on" }), 13);
    // Four jumps on the bed it opened on, then a move, then four more — the period the dial says.
    expect(walked.slice(0, 4)).toEqual([0, 0, 0, 0]);
    expect(new Set(walked.slice(4, 8)).size).toBe(1);
    expect(new Set(walked.slice(8, 12)).size).toBe(1);
    expect(walked[4]).not.toBe(walked[0]);
    expect(walked[8]).not.toBe(walked[4]);
  });

  it("only ever goes on when the way is on, and only ever back when it is back", () => {
    const on = beds(jumping({ bedEvery: 1, bedReach: "nudge", bedWay: "on" }));
    const back = beds(jumping({ bedEvery: 1, bedReach: "nudge", bedWay: "back" }));
    for (let step = 1; step < on.length; step++) {
      expect(on[step]).toBeGreaterThan(on[step - 1] ?? 0);
      expect(back[step]).toBeLessThan(back[step - 1] ?? 0);
    }
    // The same seed, mirrored: the lean is a side and the distance is drawn before it, so one walk
    // is the other's negation step for step (0162).
    expect(back).toEqual(on.map((bed) => (bed === 0 ? 0 : -bed)));
  });

  it("never leaves the song's own bed while it stays put", () => {
    // Home is the song's *bed*, and the cursor counts sixteenths: coming home is three whole beds
    // of them and never a reach (src/lib/playerBed.ts).
    const walked = beds(jumping({ bed: 3, bedEvery: 1, bedReach: "bed", bedWanders: false }));
    expect(new Set(walked)).toEqual(new Set([3 * PLAYER_SLOTS]));
  });

  it("counts one move in sixteenths of the loop, so the ground crawls rather than hops", () => {
    // Always on and the shortest reach there is: every move is at most a quarter of a bed, so the
    // ground stands on places between the source's own bed boundaries — none of which a walk over
    // whole loop-lengths could reach (P139, 0185).
    const walked = beds(jumping({ bedEvery: 1, bedReach: "nudge", bedWay: "on" }), 40);
    const legs = walked.slice(1).map((bed, step) => bed - walked[step]!);
    for (const leg of legs) {
      expect(leg).toBeGreaterThanOrEqual(1);
      expect(leg).toBeLessThanOrEqual(PLAYER_SLOTS / 4);
    }
    expect(walked.some((bed) => bed % PLAYER_SLOTS !== 0)).toBe(true);
  });

  it("reaches the whole ground the bed dial does at anywhere, one bed at a bed, and no further", () => {
    // The far reach is the Bed dial's own reach said in sixteenths, which is what "anywhere" is
    // (0193, 0277): a move there may cross the file, where the same walk at a bed may cross
    // exactly one bed and no more, and at a nudge a quarter of one.
    const legs = (bedReach: PlayerBedReach) => {
      const walked = beds(jumping({ bedEvery: 1, bedReach, bedWay: "on" }), 200);
      return walked.slice(1).map((bed, step) => bed - walked[step]!);
    };
    const far = legs("anywhere");
    expect(Math.min(...far)).toBeGreaterThanOrEqual(1);
    expect(Math.max(...far)).toBeLessThanOrEqual(PLAYER_BED_DISTANCE_MAX);
    // Two hundred moves drawn flat over the reach: one of them lands in its top tenth, and none of
    // them could before the ceiling was more than a bed.
    expect(Math.max(...far)).toBeGreaterThan(PLAYER_BED_DISTANCE_MAX * 0.9);
    expect(Math.max(...legs("bed"))).toBe(PLAYER_SLOTS);
    expect(Math.max(...legs("nudge"))).toBe(PLAYER_SLOTS / 4);
  });

  /**
   * The three words as the three amounts the draw is handed, said once (0277): a reach is its
   * sixteenths, a way is its lean, and staying put is the home roll certain. And the middle way
   * really is either: a walk on it goes both sides of the bed it opened on.
   */
  it("says each word as the one number the draw is handed", () => {
    expect(
      bedMove({ ...PLAYER_DEFAULTS, bedReach: "anywhere", bedWay: "on", bedWanders: true }),
    ).toEqual({
      distance: PLAYER_BED_DISTANCE_MAX,
      bias: 1,
      home: 0,
    });
    expect(
      bedMove({ ...PLAYER_DEFAULTS, bedReach: "bed", bedWay: "back", bedWanders: false }),
    ).toEqual({
      distance: PLAYER_SLOTS,
      bias: -1,
      home: 1,
    });
    expect(bedMove({ ...PLAYER_DEFAULTS, bedReach: "nudge", bedWay: "either" }).bias).toBe(0);
    expect(PLAYER_BED_REACH_SLOTS.nudge).toBe(PLAYER_SLOTS / 4);
    const either = beds(jumping({ bedEvery: 1, bedReach: "bed", bedWay: "either" }), 64);
    expect(either.some((bed) => bed > 0)).toBe(true);
    expect(either.some((bed) => bed < 0)).toBe(true);
  });

  it("walks the ground straight through a part boundary rather than starting it again", () => {
    // The whole of 0184: under a full lean the walk only ever goes on, so a ground that started
    // again at each of the three boundaries would repeat a bed — and this one never does.
    const song = [part("plain", 3), part("plain", 3), part("plain", 3), part("plain", 3)];
    const walked = playerSequence(
      { ...spec(song), bedEvery: 1, bedReach: "nudge", bedWay: "on" },
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
      { ...spec(song), bedPer: "part", bedEvery: 1, bedReach: "nudge", bedWay: "on" },
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
      { ...spec(song), bedPer: "song", bedEvery: 1, bedReach: "nudge", bedWay: "on" },
      12,
    );
    const rounds = [0, 4, 8].map((at) => walked.slice(at, at + 4));
    for (const round of rounds) expect(new Set(round).size).toBe(1);
    expect(walked[0]).toBe(0);
    expect(new Set(walked).size).toBe(3);
  });

  /**
   * And a pattern with nothing arranged counts both of them on one whole row of the scope: there
   * is no part to begin and no round to come round, so the row the picture draws is the boundary
   * such a pattern has — a ground asked to move on parts moves, rather than being a control that
   * does nothing (0192, P158). Two rows walked, so the first row is the pattern beginning and the
   * second is the one boundary in the run.
   */
  it("counts an arrangement's clock on one row of the walk while the pattern has no song", () => {
    for (const bedPer of ["part", "song"] as const) {
      const walked = beds(
        jumping({ bedPer, bedEvery: 1, bedReach: "nudge", bedWay: "on" }),
        PLAYER_SCOPE_LANDINGS * 2,
      );
      // One ground for the whole of the first row, and one for the whole of the second.
      expect(new Set(walked.slice(0, PLAYER_SCOPE_LANDINGS)).size).toBe(1);
      expect(new Set(walked.slice(PLAYER_SCOPE_LANDINGS)).size).toBe(1);
      expect(walked[0]).toBe(0);
      expect(new Set(walked).size).toBe(2);
    }
  });

  /**
   * And a pattern that *is* arranged does not read that fallback at all: the row is what the two
   * clocks count where there is no arrangement to count, so a song of two-jump parts still moves
   * at its own boundaries and nowhere near the twenty-fourth jump (0192).
   */
  it("counts the parts and not the row once a song is entered", () => {
    const song = [part("plain", 2), part("plain", 2)];
    const walked = beds(
      { ...spec(song), bedPer: "part", bedEvery: 1, bedReach: "nudge", bedWay: "on" },
      PLAYER_SCOPE_LANDINGS,
    );
    expect(new Set(walked).size).toBe(PLAYER_SCOPE_LANDINGS / 2);
  });

  /**
   * And the row says so on the step itself, on every unarranged pattern and whatever this yard's
   * own period is counted in: a yard leading the session's shared ground is asked for its
   * boundaries and its own `bedPer` is about where *its* loop goes, so the flag is a fact about
   * the walk rather than about the clock asking for it (0313).
   */
  it("says on the step where a whole row of an unarranged walk turned over", () => {
    const rowed = playerSequence(jumping({ bedPer: "jump" }), PLAYER_SCOPE_LANDINGS * 2 + 1)
      .map((step, at) => (step.rows ? at : -1))
      .filter((at) => at >= 0);
    expect(rowed).toEqual([PLAYER_SCOPE_LANDINGS, PLAYER_SCOPE_LANDINGS * 2]);
  });

  /** And it never says so on a pattern that is arranged: the row is what those clocks count where
   *  there is no arrangement to count, and never a boundary beside the ones a song keeps (0192). */
  it("says nothing on any step once a song is entered", () => {
    const song = [part("plain", 2), part("plain", 2)];
    const steps = playerSequence(spec(song), PLAYER_SCOPE_LANDINGS * 2 + 1);
    expect(steps.some((step) => step.rows)).toBe(false);
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
        bedReach: "nudge",
        bedWay: "on",
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
    const kept: Partial<PlayerSpec> = { bedEvery: 1, bedReach: "nudge", bedWay: "on" };
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
