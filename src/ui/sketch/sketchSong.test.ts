import { describe, expect, it } from "vitest";

import {
  acrossRun,
  partOf,
  playsLeft,
  SKETCH_AT,
  SKETCH_NEXT,
  SKETCH_PLAYS_LEFT,
  SKETCH_PLAYS_SAID,
  SKETCH_RUN,
  SKETCH_RUN_BARS,
  SKETCH_RUN_SAID,
  SKETCH_SONG_AFTER,
  SKETCH_SPANS,
  SKETCH_STANDING_SAID,
  SKETCH_TURN,
  spentBy,
  turnsOf,
} from "@/ui/sketch/sketchSong";
import { SKETCH_SONG_STANDING, SKETCH_SONGS } from "@/ui/sketch/sketchWalk";

describe("the run the two tiers unfold into", () => {
  /** One turn per part per round: the length of the run is the arrangement's own arithmetic, so a
   *  picture drawn eighteen cells long and one drawn twelve cannot both be of this bench. */
  it("is every song's parts, once per round it plays", () => {
    expect(SKETCH_RUN).toHaveLength(SKETCH_SONGS.reduce((all, song) => all + turnsOf(song), 0));
    for (const [index, turn] of SKETCH_RUN.entries()) {
      expect(turn.index).toBe(index);
      expect(turn.song.parts[turn.partAt]).toBe(turn.part.name);
      expect(turn.play).toBeLessThan(turn.song.plays);
    }
  });

  /** And it is measured: every turn starts where the one before it ended, so the strip and the
   *  track are two drawings of one length rather than two scales. */
  it("lays every turn end to end in the fixture's own bars", () => {
    let bars = 0;
    for (const turn of SKETCH_RUN) {
      expect(turn.from).toBe(bars);
      bars += turn.part.bars;
    }
    expect(SKETCH_RUN_BARS).toBe(bars);
    expect(acrossRun(SKETCH_RUN_BARS)).toBe(1);
  });

  /** The spans the two end-to-end pictures bracket their songs with cover the run and nothing but
   *  the run: a gap between two of them is a stretch of strip belonging to no song. */
  it("brackets the songs across the whole run without a gap", () => {
    let from = 0;
    for (const span of SKETCH_SPANS) {
      expect(span.from).toBe(from);
      expect(span.turns).toBe(turnsOf(span.song));
      from = span.to;
    }
    expect(from).toBe(SKETCH_RUN_BARS);
  });
});

describe("where the cursor stands", () => {
  /**
   * Part-way into the run and part-way into a song's rounds. A cursor on the first turn would draw
   * a wheel with no tooth gone, a purse with no coin spent and a strip with the head at the left —
   * eight pictures of a run that has not started, which is the one thing this bench cannot say.
   */
  it("stands part-way into the run and part-way into its song", () => {
    expect(SKETCH_AT.standing).toBe(true);
    expect(SKETCH_AT.index).toBeGreaterThan(0);
    expect(SKETCH_AT.index).toBeLessThan(SKETCH_RUN.length - 1);
    expect(SKETCH_AT.play).toBeGreaterThan(0);
    expect(SKETCH_PLAYS_LEFT).toBeGreaterThan(0);
    // The one place, resolved off the fixture's own cursor rather than found a second time.
    expect(SKETCH_AT.song).toBe(SKETCH_SONG_STANDING.song);
    expect(SKETCH_AT.partAt).toBe(SKETCH_SONG_STANDING.part);
  });

  /** The next turn is the next turn and never the one after a wrap that skipped one: the grid arms
   *  it by name, so an off-by-one here is a picture promising the wrong part. */
  it("names the turn after it, and the song after that", () => {
    expect(SKETCH_NEXT.index).toBe(SKETCH_AT.index + 1);
    expect(SKETCH_SONG_AFTER).not.toBe(SKETCH_AT.song);
    expect(SKETCH_SONGS).toContain(SKETCH_SONG_AFTER);
  });

  /** One wording for the place and the count, in the words the card uses: a picture reading
   *  "Plays 3 of 4" over a caption reading "round 3" is two counts to a reader. */
  it("says the place and the count one way for all eight", () => {
    expect(SKETCH_PLAYS_SAID).toBe(`Plays ${SKETCH_AT.play + 1} of ${SKETCH_AT.song.plays}`);
    expect(SKETCH_STANDING_SAID).toContain(SKETCH_AT.song.name);
    expect(SKETCH_STANDING_SAID).toContain(SKETCH_AT.part.name);
    expect(SKETCH_RUN_SAID).toBe(`${SKETCH_TURN} ${SKETCH_AT.index + 1} of ${SKETCH_RUN.length}`);
  });
});

describe("what a song has left to play", () => {
  /**
   * The rule the purse is drawn off, pinned here rather than against the picture's own copy of it:
   * a song ahead of the cursor has all of its rounds, one behind it has none, and the one being
   * played has the round under way and the rest.
   */
  it("counts the round under way, all of a song not reached, and none of one left behind", () => {
    expect(spentBy(SKETCH_AT.song), "the song being played is already spent").toBe(false);
    expect(playsLeft(SKETCH_AT.song)).toBe(SKETCH_PLAYS_LEFT + 1);
    for (const song of SKETCH_SONGS) {
      if (song === SKETCH_AT.song) continue;
      expect(playsLeft(song)).toBe(spentBy(song) ? 0 : song.plays);
    }
    // And the run has both kinds on it, or the case is checking one branch twice.
    expect(SKETCH_SONGS.filter((song) => spentBy(song))).not.toHaveLength(0);
    expect(
      SKETCH_SONGS.filter((song) => song !== SKETCH_AT.song && !spentBy(song)),
    ).not.toHaveLength(0);
  });
});

describe("a part the arrangement never held", () => {
  /** A name nobody wrote is a throw and never a cell drawn of nothing: every picture here indexes
   *  the arrangement by name, so this is the one place the miss can be caught (principle 5). */
  it("throws rather than drawing an empty card", () => {
    expect(() => partOf("Nowhere")).toThrow('holds no part "Nowhere"');
  });
});
