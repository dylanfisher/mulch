/**
 * @role Where the picture's ink stands while it is travelling: that a claim moving carries the whole
 *   field's colour toward it at a rate rather than cutting to it, that the travel survives the set a
 *   knob touch rebuilds, and that a yard whose clock is not running arrives outright because a
 *   halted picture has no frames to travel in (0266).
 * @instead The travel's own arithmetic and the tile it is keyed into →
 *   src/ui/moireScreen.test.ts. The two rows the whole field owns beside this, and the ground's own
 *   travel → src/ui/moireRowsField.test.ts, which this was the tail of until these cases took it
 *   past the 800-line hard cap (0045). The picture's own structure travelling across its plane →
 *   src/ui/moireRowsFractal.test.ts.
 */
import { describe, expect, it } from "vitest";

import { DRIFT_REST } from "@/lib/moire";
import { fractalStopsRest } from "@/lib/moireFractal";
import { PLAIN_CUT } from "@/lib/moireSound";
import { emptyDeckPeek, type DeckPeek } from "@/audio/deckPeek";
import { emptyMasterPeek } from "@/audio/context";
import { NO_GROWN } from "@/ui/moireGrown";
import { carryInk } from "@/ui/moireCarry";
import { moireRows, NO_MASTER, refillRows as filledRows } from "@/ui/moireRows";
import { shapeRest } from "@/ui/moireShape";

/** An output with nothing in it: the picture drawn before there was anything to hear. */
const SILENT_MASTER = emptyMasterPeek();

/** A structure standing on its own rest, which is where a picture with no automator in it stands. */
const STOOD = fractalStopsRest();

/** And a performance that has just begun, which is where every case here reads it. */
const FRESH = 0;

/** A yard's picture, with one row of it saying the loudest thing in the picture about colour. */
const claiming = (hue: number): ReturnType<typeof moireRows> => {
  const set = moireRows([], [], 4, PLAIN_CUT, null, NO_GROWN, null, NO_MASTER);
  const loudest = set.rows[0];
  if (loudest === undefined) throw new Error("a picture drawn with no rows in it");
  loudest.hue = hue;
  return set;
};

// One flat list of the ink's own cases, each of them the same set read through the same per-frame
// read, so splitting it would separate two halves of one travel (0007).
// oxlint-disable-next-line max-lines-per-function
describe("the picture's own ink", () => {
  /**
   * And the picture's ink is the second accumulated number in it, so it has to survive a rebuild
   * too — and the rebuild it matters most for is one the ground never sees. A hand dragging the knob
   * that claims a colour rebuilds the set on every pointer move, so an ink that started at rest
   * would drop back to it and set off again on each of them, and the picture would never leave the
   * middle of the ladder.
   */
  it("carries a half-travelled ink onto the set that replaces it", () => {
    const was = claiming(1);
    // Sounding, because a yard whose clock is not running has nothing to travel against and its ink
    // arrives outright — which is the case below this one.
    filledRows(
      was.rows,
      was.reads,
      { ...emptyDeckPeek(), sounding: 1 },
      1,
      null,
      0,
      null,
      SILENT_MASTER,
      0.05,
      FRESH,
      STOOD,
      STOOD,
      was.ink,
      [],
      was.jolt,
      shapeRest(),
    );
    const halfway = was.ink.hue;
    expect(halfway).toBeGreaterThan(DRIFT_REST.hue);
    expect(halfway).toBeLessThan(1);

    const now = moireRows([], [], 4, PLAIN_CUT, null, NO_GROWN, null, NO_MASTER);
    expect(now.ink.hue).toBe(DRIFT_REST.hue);
    carryInk(was, now);
    expect(now.ink.hue).toBe(halfway);
  });

  /**
   * And a yard whose clock is not running has nothing to travel against, so its ink arrives — the
   * same answer the ground gives a yard that cannot jump (`easedCentre`). A halted picture is
   * painted on a commit and never on a frame (0144), so a travel timed against a clock that is not
   * running would strand the ink wherever the last commit left it and leave it there: a colour knob
   * dragged on a stopped yard would move the dial and not the picture.
   */
  it("arrives at the claim outright on a yard with no clock behind it", () => {
    const set = claiming(1);
    const read = (peek: Readonly<DeckPeek>): number => {
      filledRows(
        set.rows,
        set.reads,
        peek,
        1,
        null,
        0,
        null,
        SILENT_MASTER,
        0.05,
        FRESH,
        STOOD,
        STOOD,
        set.ink,
        [],
        set.jolt,
        shapeRest(),
      );
      return set.ink.hue;
    };
    // Nothing sounding: one read of a frame's worth of elapsed lands the whole claim.
    const stopped = read(emptyDeckPeek());
    expect(stopped).toBeGreaterThan(DRIFT_REST.hue);
    // And the same read on a sounding yard, from the same rest, travels a frame's worth instead.
    set.ink.hue = DRIFT_REST.hue;
    expect(read({ ...emptyDeckPeek(), sounding: 1 })).toBeLessThan(stopped);
  });
});
