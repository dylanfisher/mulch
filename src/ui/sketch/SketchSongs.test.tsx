/**
 * The playback bench's own half of the naming rule (0252, 0254, 0255): eight readings of the tier
 * over a part, each naming where the cursor stands and the round it is standing in inside its own
 * close, and every one of them lighting the same place off the one fixture. Out of
 * `SketchPage.test.tsx` in `SketchGrounds.test.tsx`'s shape — that file mounts the bench and checks
 * the lists are the bench, these two check what the lists draw. Plural in the name deliberately: a
 * `SketchSong.test.tsx` beside `sketchSong.ts` differs from it only in case, and on a
 * case-insensitive filesystem the type-aware linter then resolves neither — every import in the
 * file reads as an error type and every rule that needs a type goes quiet, which is a lint step
 * that passes by checking nothing.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SKETCH_PLAYS, SketchPage } from "@/ui/sketch/SketchPage";
import {
  barsSaid,
  SKETCH_AT,
  playsLeft,
  SKETCH_NEXT,
  SKETCH_PLAYS_SAID,
  SKETCH_RUN,
  SKETCH_RUN_SAID,
  SKETCH_SONG_AFTER,
  SKETCH_STANDING_SAID,
  SKETCH_TURN,
} from "@/ui/sketch/sketchSong";
import { SKETCH_PARTS, SKETCH_SONGS } from "@/ui/sketch/sketchWalk";

/** The whole bench, rendered once: every case here reads one picture out of the one markup. */
const markup = renderToStaticMarkup(<SketchPage />);

/**
 * One picture of the bench, bounded by its own close so a neighbour cannot answer for it. A picture
 * that drew nothing at all leaves `indexOf` at -1, and a slice from there is every later sketch's
 * markup rather than nothing — which is exactly how an unlabelled picture passes.
 */
function pictureOf(attribute: string): string {
  const opens = markup.indexOf(attribute);
  expect(opens, `${attribute} is not mounted`).not.toBe(-1);
  const closes = markup.indexOf("</svg>", opens);
  expect(closes, `${attribute} draws no picture`).toBeGreaterThan(opens);
  return markup.slice(opens, closes);
}

describe("SketchPage draws how a song is played, eight ways", () => {
  /**
   * The naming rule reaching the playback bench, over every entry the list holds rather than a list
   * of readings written out here: an entry added without a picture, or a picture that stopped
   * naming the round it is standing in, has to fail rather than pass because a table in a test was
   * not updated.
   */
  it("names the round and the place the cursor stands in every one of the eight", () => {
    expect(SKETCH_PLAYS).toHaveLength(8);
    for (const entry of SKETCH_PLAYS) {
      const picture = pictureOf(`data-song="${entry.id}"`);
      // In the card's own word for the count and at the fixture's own amount: a picture naming
      // Plays and drawing a different number of rounds is the legend the rule exists to stop.
      expect(picture, `${entry.id} draws no name for the round`).toMatch(
        new RegExp(`<text[^>]*>[^<]*${SKETCH_PLAYS_SAID}`, "u"),
      );
      expect(picture, `${entry.id} draws no name for the place the cursor stands`).toMatch(
        new RegExp(`<text[^>]*>[^<]*${SKETCH_STANDING_SAID}`, "u"),
      );
    }
  });

  /**
   * And all eight stand the cursor in one place off one fixture, which is the bench's whole claim:
   * a song is a run and a cursor over it, so a drawing of the run alone is the list the card
   * already has. Each mark is read out of its own picture, since one that drew its cursor in a
   * neighbour's markup would pass a slice of the page.
   */
  it("stands the cursor somewhere in every one of the eight, at the same turn of the run", () => {
    for (const entry of SKETCH_PLAYS) {
      const picture = pictureOf(`data-song="${entry.id}"`);
      expect(picture, `${entry.id} stands the cursor nowhere`).toContain(
        `data-standing="${entry.id}"`,
      );
      // The one amount that would drift first if any of them unfolded the run for itself.
      expect(picture, `${entry.id} does not say how far into the run it is`).toContain(
        SKETCH_RUN_SAID,
      );
    }
    // Part-way into a song and part-way into its round, or eight pictures of a run just started.
    expect(SKETCH_AT.index).toBeGreaterThan(0);
    expect(SKETCH_AT.index).toBeLessThan(SKETCH_RUN.length - 1);
    expect(SKETCH_AT.play).toBeGreaterThan(0);
  });
});

describe("each of the eight makes its own claim", () => {
  /** The track's and the strip's: both are the whole run drawn end to end, so both name every song
   *  of it — a stretch nobody labelled is a bar, and which one is Middle is then a count. */
  it("names every song of the run on the track and on the strip", () => {
    for (const reading of ["track", "strip"]) {
      const picture = pictureOf(`data-song="${reading}"`);
      for (const song of SKETCH_SONGS) {
        expect(picture, `the ${reading} draws no ${song.name}`).toMatch(
          new RegExp(`<text[^>]*>[^<]*${song.name}`, "u"),
        );
      }
    }
  });

  /** The hand's: every part of the arrangement is a card, and a card carries its own length —
   *  which is the half of a part the grid beside it deliberately gives up. */
  it("deals every part of the arrangement as a card, each with its own length", () => {
    const hand = pictureOf('data-song="hand"');
    for (const part of SKETCH_PARTS) {
      expect(hand, `the hand deals no ${part.name}`).toMatch(
        new RegExp(`<text[^>]*>${part.name}<`, "u"),
      );
      expect(hand, `${part.name} is dealt without its length`).toContain(`>${barsSaid(part)}<`);
    }
  });

  /** The wheel's: one tooth per round the song plays, and the song that follows it named — a wheel
   *  that handed on to nothing would be a picture of one song and not of a run. */
  it("cuts one tooth per round of the standing song and names what follows it", () => {
    const wheel = pictureOf('data-song="wheel"');
    // One tooth per round, counted out of the markup: a wheel whose teeth and whose legend
    // disagreed would be the drift the shared arithmetic exists to stop.
    expect([...wheel.matchAll(/<line/gu)], "the wheel is not a tooth per round").toHaveLength(
      SKETCH_AT.song.plays,
    );
    // And the round it is a run of, named beside it.
    expect(wheel).toContain(`>${SKETCH_AT.song.parts.join(" · ")}<`);
    expect(wheel).toContain(`then ${SKETCH_SONG_AFTER.name}<`);
  });
});

describe("what comes next, and where it is", () => {
  /** The grid's: the next turn of the run is the armed cell, said by name, because "what is
   *  coming" is the whole of what a launch grid is for. Its own describe with the map's, so no
   *  block on this bench outgrows the count a reader can hold (0007). */
  it("arms the next turn of the run by name on the grid", () => {
    expect(pictureOf('data-song="grid"')).toContain(
      `armed ${SKETCH_NEXT.part.name}, in at the next ${SKETCH_TURN}`,
    );
  });

  /** The route's: a place per part of the arrangement, since a map missing a place is a route that
   *  could not reach it. */
  it("gives every part of the arrangement a place on the map", () => {
    const route = pictureOf('data-song="route"');
    for (const part of SKETCH_PARTS) {
      expect(route, `the map holds no place for ${part.name}`).toMatch(
        new RegExp(`<text[^>]*>${part.name}<`, "u"),
      );
    }
  });
});

describe("the rounds counted out, and the parts taken off", () => {
  /**
   * The spend's: a coin per round of every song and not only of the one playing, and each row
   * saying how many it has left. A picture that counted only the song under the cursor would be
   * the readout it is drawn instead of.
   */
  it("draws a coin per round of every song and says what each has left", () => {
    const spend = pictureOf('data-song="spend"');
    const coins = SKETCH_SONGS.reduce((all, song) => all + song.plays, 0);
    expect([...spend.matchAll(/<circle/gu)], "the purse is not a coin per round").toHaveLength(
      coins,
    );
    for (const song of SKETCH_SONGS) {
      expect(spend, `${song.name} does not say what it has left`).toContain(
        `>${playsLeft(song)} left<`,
      );
    }
  });

  /**
   * The spindle's: the part being played is off the pile, so its slot is drawn empty and the other
   * parts of the round are still named on it. A spindle drawn full is a list stood on its end.
   */
  it("leaves a hole in the spindle where the part being played was", () => {
    const spindle = pictureOf('data-song="spindle"');
    expect(spindle, "the spindle is drawn full").toContain(">— out —<");
    for (const [partAt, name] of SKETCH_AT.song.parts.entries()) {
      if (partAt === SKETCH_AT.partAt) {
        expect(spindle, `${name} is both out and on the spindle`).not.toContain(`>${name}<`);
      } else {
        expect(spindle, `the spindle holds no ${name}`).toContain(`>${name}<`);
      }
    }
  });
});
