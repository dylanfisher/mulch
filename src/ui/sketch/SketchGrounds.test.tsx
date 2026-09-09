/**
 * The ground bench's own half of the naming rule (0252, 0254, 0255): eight readings of one seam,
 * each naming the period and the ground it is counting down on inside its own close, and every one
 * of them lighting the same standing ground off the one fixture. Out of `SketchPage.test.tsx` in the
 * shape `SketchParts.test.tsx` had — that file mounts the bench and checks the list is the bench,
 * this one checks what the list draws. Plural in the name deliberately: a `SketchGround.test.tsx`
 * beside `sketchGround.ts` differs from it only in case, and on a case-insensitive filesystem the
 * type-aware linter then resolves neither — every import in the file reads as an error type and
 * every rule that needs a type goes quiet, which is a lint step that passes by checking nothing.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SKETCH_GROUNDS } from "@/ui/sketch/sketchEntries";
import { SketchPage } from "@/ui/sketch/SketchPage";
import {
  aheadIn,
  bedNamed,
  bedSaid,
  SKETCH_COUNTED_SAID,
  SKETCH_EVERY_SAID,
  SKETCH_GROUND_CLOCK,
  SKETCH_GROUND_MOVES,
  SKETCH_PER,
  SKETCH_SEQUENCE,
  thrownTo,
} from "@/ui/sketch/sketchGround";
import { SKETCH_BEDS, SKETCH_GROUND, SKETCH_SOURCE_BEDS } from "@/ui/sketch/sketchWalk";

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

describe("SketchPage draws when the ground moves, eight ways", () => {
  /**
   * The naming rule reaching the ground bench, over every entry the list holds rather than a list
   * of readings written out here: an entry added without a picture, or a picture that stopped
   * naming its period, has to fail rather than pass because a table in a test was not updated.
   */
  it("names the period and the standing ground inside every one of the eight pictures", () => {
    expect(SKETCH_GROUNDS).toHaveLength(8);
    for (const entry of SKETCH_GROUNDS) {
      const picture = pictureOf(`data-ground="${entry.id}"`);
      // In the card's own word for the period and at the fixture's own amount: a picture naming
      // Every and drawing a different number of laps is the legend the rule exists to stop.
      expect(picture, `${entry.id} draws no name for the period`).toMatch(
        new RegExp(`<text[^>]*>[^<]*${SKETCH_EVERY_SAID}`, "u"),
      );
      expect(picture, `${entry.id} draws no name for the standing ground`).toMatch(
        new RegExp(`<text[^>]*>[^<]*${bedSaid(SKETCH_GROUND.standing)}`, "u"),
      );
    }
  });

  /**
   * And all eight light one ground off one fixture, which is the bench's whole claim: eight
   * readings of one seam, not eight seams. Each lit mark is read out of its own picture, since a
   * picture that drew its mark in a neighbour's markup would pass a slice of the page.
   */
  it("lights the same standing ground in every one of the eight, and counts the same laps", () => {
    for (const entry of SKETCH_GROUNDS) {
      const picture = pictureOf(`data-ground="${entry.id}"`);
      expect(picture, `${entry.id} lights no ground`).toContain(`data-standing="${entry.id}"`);
      // The one amount that would drift first if any of them derived it for itself.
      expect(picture, `${entry.id} does not say what the count stands at`).toContain(
        SKETCH_COUNTED_SAID,
      );
    }
    // Part-way through the count, or eight pictures of a clock that has just struck.
    expect(SKETCH_GROUND_CLOCK.since).toBeGreaterThan(0);
    expect(SKETCH_GROUND_CLOCK.until).toBeGreaterThan(0);
  });
});

describe("each of the eight makes its own claim", () => {
  /** The clock's own half: the walk's sequence is the face, so all of it is on the picture and the
   *  hand stands on one landing of it. */
  it("draws the walk's whole sequence on the clock, with the hand on one landing of it", () => {
    expect(pictureOf('data-ground="clock"')).toContain(
      `${SKETCH_PER} ${SKETCH_GROUND_CLOCK.gone + 1}, landing ${SKETCH_GROUND_CLOCK.into + 1} of ${SKETCH_SEQUENCE}`,
    );
  });

  /** The queue's: every planted ground named with how many laps until it arrives, and each arrival
   *  a whole period after the one before — the same count the clock is running. */
  it("names every queued ground with the laps until it arrives", () => {
    const queue = pictureOf('data-ground="queue"');
    for (const [index, bed] of SKETCH_BEDS.entries()) {
      expect(queue, `the queue draws no ${bed.name}`).toMatch(
        new RegExp(`<text[^>]*>[^<]*${bed.name}`, "u"),
      );
      expect(queue, `${bed.name} arrives at no lap`).toContain(`>in ${aheadIn(index + 1)}<`);
    }
  });

  /** The ratchet's and the cut's: both are drawn in whole beds, so both name every bed of the file
   *  — a notch or a card nobody labelled is a wedge, and which one is Bed 2 is then a count. */
  it("names every bed of the file on the ratchet and on the deck", () => {
    for (const reading of ["ring", "cut"]) {
      const picture = pictureOf(`data-ground="${reading}"`);
      for (let bed = 0; bed < SKETCH_SOURCE_BEDS; bed += 1) {
        expect(picture, `the ${reading} draws no ${bedNamed(bed)}`).toMatch(
          new RegExp(`<text[^>]*>${bedNamed(bed)}<`, "u"),
        );
      }
    }
  });
});

describe("the marks and the pips are the count itself", () => {
  /**
   * The lane's and the ladder's: a mark is a move, so there is one mark per move of the crawl and
   * each states the lap it fell on. A picture that marked a lap no move fell on would be drawing a
   * period of its own.
   */
  it("marks every move of the crawl at the lap it fell on, and no other", () => {
    const lane = pictureOf('data-ground="lane"');
    for (const move of SKETCH_GROUND_MOVES) {
      expect(lane, `the lane marks no move at ${SKETCH_PER} ${move.after}`).toContain(
        `>${SKETCH_PER} ${move.after}<`,
      );
      expect(lane, `the lane does not name the ground move ${move.nth} landed on`).toContain(
        `>${bedSaid(move.to)}<`,
      );
    }
    expect([...lane.matchAll(new RegExp(`>${SKETCH_PER} [0-9]+<`, "gu"))]).toHaveLength(
      SKETCH_GROUND_MOVES.length,
    );
  });

  /**
   * The count's: the pips are the period itself, so there are exactly as many as the period and
   * exactly as many filled as have gone. Counted out of the markup, because a picture that drew its
   * label one way and its pips another is the one thing this reading can get wrong.
   */
  it("draws one pip per lap of the period and fills the ones that have gone", () => {
    const pips = pictureOf('data-ground="pips"');
    expect([...pips.matchAll(/<circle/gu)], "the count is not a pip per lap").toHaveLength(
      SKETCH_GROUND.every,
    );
    expect([...pips.matchAll(/class="fill-primary stroke-foreground"/gu)]).toHaveLength(
      SKETCH_GROUND_CLOCK.since,
    );
  });
});

describe("the one gesture on the bench", () => {
  /**
   * The throw's: the one gesture on the bench, so the picture states both halves of what its
   * arithmetic promises — the whole bed it lands on, and the wait before it gets there — and offers
   * the control that makes it a gesture rather than a diagram of one.
   */
  it("states where a throw lands and how long the wait is, over a control a hand works", () => {
    const thrown = thrownTo(SKETCH_SOURCE_BEDS - 1);
    expect(pictureOf('data-ground="throw"')).toContain(
      `>lands ${bedSaid(thrown.at)} in ${thrown.after}<`,
    );
    // The bench is unwired (0247), so the control drives this picture and nothing else — but it is
    // the instrument's own control, which is what makes the sketch a reading of the real surface.
    const opens = markup.indexOf('data-ground="throw"');
    const closes = markup.indexOf('id="pips"');
    expect(closes, "the throw is not followed by the count").toBeGreaterThan(opens);
    expect(markup.slice(opens, closes)).toContain('data-slot="slider"');
  });
});
