import { describe, expect, it } from "vitest";

import { PLAYER_SLOTS } from "@/lib/playerSlots";
import {
  aheadIn,
  bedNamed,
  bedOf,
  bedSaid,
  groundAfter,
  groundMove,
  intoBed,
  SKETCH_COUNTED_SAID,
  SKETCH_EVERY_SAID,
  SKETCH_GROUND_CLOCK,
  SKETCH_GROUND_HOME,
  SKETCH_GROUND_MOVES,
  SKETCH_PER,
  SKETCH_SEQUENCE,
  thrownTo,
} from "@/ui/sketch/sketchGround";
import {
  SKETCH_GROUND,
  SKETCH_GROUND_CRAWL,
  SKETCH_GROUND_GONE,
  SKETCH_SOURCE_BEDS,
  SKETCH_WALK,
} from "@/ui/sketch/sketchWalk";

describe("the fourth clock", () => {
  /** The tick every one of the eight counts in: a sequence is the walk's own run of landings, so a
   *  picture that drew the clock and a picture that drew the walk are drawn off one measure. */
  it("counts in sequences of the walk itself", () => {
    expect(SKETCH_SEQUENCE).toBe(SKETCH_WALK.length);
  });

  /**
   * Standing part-way through a count and never on a boundary. A fixture that had just struck would
   * draw an empty ring, a ladder on its top rung and a queue with nothing between the playhead and
   * the next move — eight pictures of a clock that never goes round, which is the one thing this
   * bench exists to show.
   */
  it("stands part-way between two moves, with what it has counted and what is left", () => {
    expect(SKETCH_GROUND_CLOCK.since).not.toBe(0);
    expect(SKETCH_GROUND_CLOCK.since + SKETCH_GROUND_CLOCK.until).toBe(SKETCH_GROUND.every);
    expect(SKETCH_GROUND_CLOCK.gone).toBe(SKETCH_GROUND_GONE);
    // And part-way through a sequence as well as part-way through the count: the walk is somewhere
    // in its own run, which is what the lane and the clock light.
    expect(SKETCH_GROUND_CLOCK.into).toBeGreaterThan(0);
    expect(SKETCH_GROUND_CLOCK.into).toBeLessThan(SKETCH_SEQUENCE);
  });

  /** One word for the tick, in the phrase every picture prints and in the count under it: a
   *  legend reading "sequences" over a caption reading "laps" is two clocks to a reader. */
  it("says the period and the count one way for all eight", () => {
    expect(SKETCH_EVERY_SAID).toBe(`Every ${SKETCH_GROUND.every} ${SKETCH_PER}s`);
    expect(SKETCH_COUNTED_SAID).toBe(`${SKETCH_GROUND_CLOCK.since} of ${SKETCH_GROUND.every}`);
  });
});

describe("the crawl", () => {
  /** One move per completed period, each carrying the completion it fell on: the Nth shift is the
   *  Nth multiple of the period and not the Nth landing of a list somebody wrote out. */
  it("falls on every Nth completion, in order", () => {
    expect(SKETCH_GROUND_MOVES).toHaveLength(Math.floor(SKETCH_GROUND_GONE / SKETCH_GROUND.every));
    for (const move of SKETCH_GROUND_MOVES) {
      expect(move.after).toBe(move.nth * SKETCH_GROUND.every);
      expect(move.after).toBeLessThanOrEqual(SKETCH_GROUND_GONE);
    }
  });

  /**
   * Every move starts where the last one landed, and the last one lands where the readout says the
   * ground is standing. A run drawn from a crawl that ends anywhere else would light one ground in
   * eight pictures and name a different one underneath them.
   */
  it("walks from one landing to the next and ends where the ground is standing", () => {
    let from = SKETCH_GROUND_HOME;
    for (const move of SKETCH_GROUND_MOVES) {
      expect(move.from).toBe(from);
      from = move.to;
    }
    expect(from).toBe(SKETCH_GROUND.standing);
    expect(SKETCH_GROUND_CRAWL.at(-1)).toBe(SKETCH_GROUND.standing);
  });

  /** A move home is a move to the song's own bed, and it is the one that is not measured against
   *  the Distance dial — so the two readings of a move cannot be told apart by their length. */
  it("marks the move that came home rather than travelling", () => {
    const home = SKETCH_GROUND_MOVES.filter((move) => move.home);
    expect(home).not.toHaveLength(0);
    for (const move of home) expect(move.to).toBe(SKETCH_GROUND_HOME);
  });

  it("hands back the ground the Nth move landed on, and throws for one nobody wrote", () => {
    expect(groundMove(1).to).toBe(SKETCH_GROUND_CRAWL[0]);
    expect(groundMove(SKETCH_GROUND_MOVES.length).to).toBe(SKETCH_GROUND.standing);
    expect(() => groundMove(SKETCH_GROUND_MOVES.length + 1)).toThrow(/holds no move/u);
    expect(() => groundMove(0)).toThrow(/holds no move/u);
  });
});

describe("the words and the places the eight share", () => {
  /** The bed a crawl is standing in, and the word a picture writes on it. A crawl counted in
   *  sixteenths lands part-way into a bed, which is the whole reason it is not counted in beds. */
  it("reads a count of sixteenths as the bed it falls in, and how far into it", () => {
    expect(bedOf(SKETCH_GROUND.standing)).toBe(Math.floor(SKETCH_GROUND.standing / PLAYER_SLOTS));
    expect(bedSaid(PLAYER_SLOTS * 2)).toBe("Bed 2");
    expect(bedSaid(PLAYER_SLOTS * 2 + 1)).toBe("Bed 2");
    expect(bedNamed(2)).toBe("Bed 2");
    // The half a crawl exists for: the ground stands part-way into a bed, and a picture drawn in
    // whole beds cannot say how far.
    expect(intoBed(PLAYER_SLOTS * 2 + 1)).toBe(1);
    expect(intoBed(SKETCH_GROUND.standing)).not.toBe(0);
  });

  /** Where the crawl started, once: a picture spelling it out again is the third copy of one fact. */
  it("holds the song's own bed as the place a move comes home to", () => {
    expect(SKETCH_GROUND_HOME).toBe(SKETCH_GROUND.bed * PLAYER_SLOTS);
    for (const move of SKETCH_GROUND_MOVES) {
      if (move.home) expect(move.to).toBe(SKETCH_GROUND_HOME);
    }
  });
});

describe("counting forward from where the clock stands", () => {
  /** The next move is the one the count is part-way to, and every one after it is a whole period
   *  further off — so a queue, a ladder and a throw all say the same "in how many". */
  it("counts the next move from what is left, and the rest a period apart", () => {
    expect(aheadIn(1)).toBe(SKETCH_GROUND_CLOCK.until);
    expect(aheadIn(2)).toBe(SKETCH_GROUND_CLOCK.until + SKETCH_GROUND.every);
    expect(aheadIn(3) - aheadIn(2)).toBe(SKETCH_GROUND.every);
  });

  /**
   * And backwards: which ground was standing after a given count of sequences. Before the first
   * move it is the song's own bed — the crawl's starting place and not a nought — and after the
   * last it is where the ground is standing now.
   */
  it("reads back the ground standing after any count of sequences", () => {
    expect(groundAfter(0)).toBe(SKETCH_GROUND_HOME);
    expect(groundAfter(SKETCH_GROUND.every - 1)).toBe(SKETCH_GROUND_HOME);
    const first = groundMove(1);
    expect(groundAfter(first.after)).toBe(first.to);
    expect(groundAfter(SKETCH_GROUND_GONE)).toBe(SKETCH_GROUND.standing);
  });
});

describe("throwing the loop at a ground", () => {
  /**
   * The gesture a static render cannot make, so its two claims are proven here: a throw lands on a
   * whole bed — which is what it trades away against a crawl — and it lands at the next boundary
   * rather than under the hand, which is what the period is for.
   */
  it("lands on a whole bed, at the next boundary", () => {
    const thrown = thrownTo(2);
    expect(thrown.bed).toBe(2);
    expect(thrown.at).toBe(2 * PLAYER_SLOTS);
    expect(thrown.at % PLAYER_SLOTS).toBe(0);
    expect(thrown.after).toBe(SKETCH_GROUND_CLOCK.until);
  });

  /** And a throw past the end of the file is held to the file: a ground off the sample is a
   *  picture drawn of nothing, and the loop would be reading silence. */
  it("holds a throw past either end of the file to the file", () => {
    expect(thrownTo(SKETCH_SOURCE_BEDS + 4).bed).toBe(SKETCH_SOURCE_BEDS - 1);
    expect(thrownTo(-3).bed).toBe(0);
    expect(thrownTo(1.4).bed).toBe(1);
  });
});
