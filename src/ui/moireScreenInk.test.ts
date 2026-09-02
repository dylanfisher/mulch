/**
 * @role Tests the ink the screen is filmed through: what the rows claim about colour, how saturated
 *   the standing rack's own looks ask the picture to be drawn, and how the picture travels toward
 *   both rather than cutting to either (0266, 0283).
 * @instead The screen those inks are laid in — its two grids, its three channels and its motions —
 *   and every case that reads the tile the painter actually wrote → src/ui/moireScreen.test.ts,
 *   which this split out of at the 800-line hard cap (0045), as its subject split from
 *   src/ui/moireScreen.ts. The reading of a standing rack into looks, and the saturation one of
 *   them asks for → src/ui/moireLooks.test.ts.
 */
import { describe, expect, it } from "vitest";

import {
  DRIFT_DISPERSE_REACH,
  DRIFT_FRINGE_REACH,
  DRIFT_HUE_REACH,
  DRIFT_REST,
  DRIFT_STEPS,
} from "@/lib/moire";
import { moireRow as row } from "@/lib/moireRow";
import {
  DRIFT_INK_SECS,
  inkTravelInto,
  SCREEN_SATURATE_REACH,
  screenDisperse,
  screenFringe,
  screenHue,
  screenInkRest,
  stepped,
} from "@/ui/moireScreenInk";

// One flat list of what the picture's ink is and how it moves (0007).
// oxlint-disable-next-line max-lines-per-function
describe("the picture's ink", () => {
  it("travels the picture's ink to a claim that moved rather than cutting to it", () => {
    // Every claim below is the *boldest* row's, so an automator retiring the place that held one
    // hands the picture another ink between two frames. The travel is rated and it arrives: a whole
    // reach in `DRIFT_INK_SECS`, which is what makes the eight stops `stepped` rounds onto a
    // staircase the picture walks up rather than one it jumps.
    const claim = [
      row({
        period: 3,
        hue: 1,
        fringe: DRIFT_FRINGE_REACH,
        disperse: DRIFT_DISPERSE_REACH,
      }),
    ];
    const ink = screenInkRest();
    // At an age of one, because how far a claim is spent is the performance's own age and this case
    // is about the travel rather than about that band (`agedHue`, src/lib/moireAge.ts).
    // One frame of a picture drawn at sixty a second: a hundred-and-twentieth of each reach.
    inkTravelInto(ink, claim, 0, 1, 0, 1 / 60, DRIFT_INK_SECS);
    expect(ink.hue).toBeCloseTo(DRIFT_REST.hue + DRIFT_HUE_REACH / (60 * DRIFT_INK_SECS), 10);
    expect(ink.fringe).toBeCloseTo(
      DRIFT_REST.fringe + DRIFT_FRINGE_REACH / (60 * DRIFT_INK_SECS),
      10,
    );
    // And it is nowhere near the claim on that frame, or on the next one either.
    expect(ink.hue).toBeLessThan(1);
    inkTravelInto(ink, claim, 0, 1, 0, 1 / 60, DRIFT_INK_SECS);
    expect(ink.hue).toBeLessThan(1);
    // A whole reach of travel arrives, and the three arrive together: each is rated in its own
    // dimension's units, so `fringe` reaching twice as far does not take twice as long.
    inkTravelInto(ink, claim, 0, 1, 0, DRIFT_INK_SECS, DRIFT_INK_SECS);
    expect(ink).toEqual({
      hue: 1,
      fringe: DRIFT_FRINGE_REACH,
      disperse: DRIFT_DISPERSE_REACH,
      // And the fourth term where a picture with nothing in its rack leaves it: no row claims this
      // one, so a travel handed no look leaves it exactly where it rests (0283).
      saturate: 0,
    });
  });

  it("turns toward a claim that moved again mid-travel, and overshoots neither", () => {
    const hot = [row({ period: 3, hue: 1 })];
    const cool = [row({ period: 3, hue: 0 })];
    const ink = screenInkRest();
    inkTravelInto(ink, hot, 0, 1, 0, DRIFT_INK_SECS / 4, DRIFT_INK_SECS);
    const partway = ink.hue;
    expect(partway).toBeGreaterThan(DRIFT_REST.hue);
    expect(partway).toBeLessThan(1);
    // The claim moves again before the first travel is over: the picture turns round from where it
    // has got to rather than resuming from where it set off, and it never passes the new claim.
    inkTravelInto(ink, cool, 0, 1, 0, DRIFT_INK_SECS / 4, DRIFT_INK_SECS);
    expect(ink.hue).toBeLessThan(partway);
    expect(ink.hue).toBeGreaterThan(0);
    // And a step longer than what is left lands on the claim exactly rather than beyond it, which
    // is the whole of why the travel arrives.
    inkTravelInto(ink, cool, 0, 1, 0, 10 * DRIFT_INK_SECS, DRIFT_INK_SECS);
    expect(ink.hue).toBe(0);
  });

  it("travels a look's saturation on the ink's own rate, and steps it onto the ink's own ladder", () => {
    // No row claims this one: it is what the standing rack's looks make of the whole field
    // (`looksSaturate`, src/ui/moireLooks.ts), and it reaches the tile the way the other three do —
    // eased toward, then rounded onto the ladder a tile may be keyed through, so a Sheen dragged
    // across its range walks the picture up its stops rather than baking a tile a pointer move.
    const resting = [row({ period: 3 })];
    const ink = screenInkRest();
    expect(ink.saturate).toBe(0);
    inkTravelInto(ink, resting, 0, 0, 1, 1 / 60, DRIFT_INK_SECS);
    expect(ink.saturate).toBeCloseTo(SCREEN_SATURATE_REACH / (60 * DRIFT_INK_SECS), 10);
    // Nowhere near the claim on that frame, and arrived when a whole reach of travel has run.
    expect(ink.saturate).toBeLessThan(1);
    inkTravelInto(ink, resting, 0, 0, 1, DRIFT_INK_SECS, DRIFT_INK_SECS);
    expect(ink.saturate).toBe(SCREEN_SATURATE_REACH);
    // And a pop leaving drains it back out at the same rate rather than between two frames.
    inkTravelInto(ink, resting, 0, 0, 0, DRIFT_INK_SECS / 4, DRIFT_INK_SECS);
    expect(ink.saturate).toBeLessThan(1);
    expect(ink.saturate).toBeGreaterThan(0);
    // The ladder is the same eight stops the rest of the ink walks, so the travel visits them one
    // at a time and a tile is keyed by where it has got to and never by where it is going.
    const stops = new Set<number>();
    const walking = screenInkRest();
    for (let frame = 0; frame < 120; frame++) {
      inkTravelInto(walking, resting, 0, 0, 1, 1 / 60, DRIFT_INK_SECS);
      stops.add(stepped(walking.saturate, SCREEN_SATURATE_REACH));
    }
    expect(stops.size).toBe(DRIFT_STEPS + 1);
  });

  it("leaves a resting yard's ink and the key it is filmed through exactly where they are", () => {
    // The travelled value is what `stepped` rounds, and a key that moved would be a picture-sized
    // bake (0129, 0142). A yard claiming nothing moves neither, however long it is left running.
    const resting = [row({ period: 3 })];
    const ink = screenInkRest();
    const keyed = (): number[] => [
      stepped(ink.fringe, DRIFT_FRINGE_REACH),
      stepped(ink.disperse, DRIFT_DISPERSE_REACH),
      stepped(ink.hue, DRIFT_HUE_REACH),
    ];
    const first = keyed();
    for (let frame = 0; frame < 120; frame++)
      inkTravelInto(ink, resting, 0, 0, 0, 1 / 60, DRIFT_INK_SECS);
    expect(ink).toEqual(screenInkRest());
    expect(keyed()).toEqual(first);
  });

  it("reads each thing a row says about colour off the row that says it loudest", () => {
    // One tile is one screen, so unlike a pitch or a depth these cannot be per row. The boldest
    // claim wins rather than the mean: an effect that says nothing about colour leaves the picture
    // where it rests, and a mean would let it dilute the knob whose travel this is.
    const quiet = row({ period: 3 });
    const loud = row({
      period: 5,
      fringe: DRIFT_FRINGE_REACH,
      disperse: DRIFT_DISPERSE_REACH,
      hue: 1,
    });
    expect(screenFringe([quiet])).toBe(DRIFT_REST.fringe);
    expect(screenFringe([quiet, loud])).toBe(DRIFT_FRINGE_REACH);
    expect(screenDisperse([quiet, loud], 0)).toBe(DRIFT_DISPERSE_REACH);
    expect(screenHue([quiet, loud])).toBe(1);
    // Loud is either way round rest: a knob at nothing takes the picture monochrome as surely as
    // one at the top takes it chromatic.
    expect(screenFringe([quiet, row({ period: 5, fringe: 0 })])).toBe(0);
    // A row with no period of its own is not drawn, so it does not vote — and a picture with no
    // rows in it at all is the one every yard drew before an effect could turn any of this.
    expect(screenHue([quiet, row({ period: 0, hue: 1 })])).toBe(DRIFT_REST.hue);
    expect(screenFringe([])).toBe(DRIFT_REST.fringe);
  });
});
