/**
 * @role Tests the one thing in the picture that compounds: that the frame before this one is laid
 *   back into the field and never past the ceiling, that a standing run lays the whole field back
 *   into itself at the share the run earned, that the stack deepens once per frame of the deck's
 *   own clock and never once per repaint, and that the kept frame is forgotten the moment the
 *   picture stops being drawn.
 * @instead Everything else the painter draws → src/ui/moireCanvas.test.ts, which this was split out
 *   of at the 800-line hard cap (0045). What a share comes to → src/lib/moireAge.ts. The harness
 *   these paint through → src/ui/moireCanvasPainted.ts, read back through
 *   src/ui/moireCanvasReadings.ts.
 */
// Over the dependency cap, and what is over it is the session's own row builder: a case that
// paints what a standing run paints has to reach the picture the way a yard does rather than
// through a second copy of the walk from a grown instance to a row (principle 1).
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import { afterEach, describe, expect, it, vi } from "vitest";
import { type EffectId } from "@/audio/effects/registry";
import { DRIFT_FEEDBACK_CEILING, feedbackAlpha, type MoireRow } from "@/lib/moire";
import { runFeedback } from "@/lib/moireAge";
import { PLAIN_CUT } from "@/lib/moireSound";
import { emptyDeckPeek } from "@/audio/deckPeek";
import { resetTuning } from "@/lib/moireTuning";
import { moireRows, NO_MASTER, refillRows } from "@/ui/moireRows";
import type { EffectInstanceId, GrownEffect } from "@/audio/effects/contract";
import { painterOn, WINDOW, type Painted } from "@/ui/moireCanvasPainted";
import { ARRIVED, pitchOf, SILENT_MASTER, turnsIn } from "@/ui/moireCanvasReadings";
import { shapeRest } from "@/ui/moireShape";
import type { Aim } from "@/lib/moire";
import { moireRow as row } from "@/lib/moireRow";
/** A row asking for the whole of the frame feedback — a fresh one each time, since a painting
 * moves the phase of every row it is handed. */
const fedRow = () => row({ period: 3, feedback: 1 });
/** How many places one automator is standing in the run below, which is past `FRACTAL_REACH`. */
const RUN_PLACES = 4;
/** The run one automator is holding, keyed the way `DeckPeek.grown` keys it (src/ui/moireRows.ts). */
const RUN: Map<EffectInstanceId, GrownEffect[]> = new Map([
  [
    "auto" as EffectInstanceId,
    Array.from({ length: RUN_PLACES }, (_, at) => ({
      effect: "delay" as EffectId,
      instance: `g${at}`,
      presence: 1,
      remain: 30,
      life: 30,
      values: [],
    })),
  ],
]);
/**
 * The rows a yard standing that run draws — through the one builder and the one per-frame read, so
 * what the picture is fed back at here is what a rack standing an automator actually asks for and
 * never a fixture's number. A fresh set each time, since a painting moves the phase of every row.
 * The loop is four seconds, which is a period and not a place count — the two are separate facts
 * that happen to read the same here.
 */
const runRows = (): MoireRow[] => {
  const set = moireRows([], [], 4, PLAIN_CUT, null, RUN, null, NO_MASTER);
  refillRows(
    set.rows,
    set.reads,
    { ...emptyDeckPeek(), grown: RUN },
    1,
    null,
    0,
    null,
    SILENT_MASTER,
    ARRIVED,
    0,
    set.seed,
    set.toward,
    set.ink,
    [],
    set.jolt,
    shapeRest(),
  );
  return set.rows;
};
/**
 * The lays that are a ghost of the frame before, out of one painting's field: a curved row places
 * its baked tile with the same call, and does it cutting (`destination-out`) rather than laying on.
 */
const laysOf = (painted: Painted): { alpha: number; move: Aim }[] =>
  (painted.surfaces[0]?.frame ?? []).filter((drew) => drew.over === "source-over");

/** The recorder, bound to this file's own way of stubbing a global (src/ui/moireCanvasPainted.ts). */
const paintedOn = painterOn((name, value) => {
  vi.stubGlobal(name, value);
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetTuning();
});
// One flat list of the frame's cases (0007).
// oxlint-disable-next-line max-lines-per-function
describe("the frame the picture carries back into itself", () => {
  // P104: the one thing in the picture that compounds. Everything else is read off the frame it is
  // drawn in; this carries the frame before it, which is why the share is bounded (0143).
  it("lays the frame before this one back into the field, and never past the ceiling", () => {
    vi.stubGlobal("devicePixelRatio", 1);

    // Nothing to feed back on the first frame, and nothing kept where no row asks for it.
    expect(paintedOn(400, 128, [fedRow()]).surfaces[0]?.frame).toEqual([]);
    expect(
      paintedOn(400, 128, [row({ period: 3 })], 2, WINDOW, { frames: 4 }).surfaces[0]?.frame,
    ).toEqual([]);
    // And from the second frame on, the last one laid back onto the field — onto it, because the
    // field is what the gratings let through and a ghost fills its own fringes back in.
    const twice =
      paintedOn(400, 128, [fedRow()], 2, WINDOW, { frames: 2 }).surfaces[0]?.frame ?? [];
    expect(twice).toHaveLength(1);
    expect(twice[0]?.over).toBe("source-over");
    expect(twice[0]?.alpha).toBe(DRIFT_FEEDBACK_CEILING);
    // And a quarter of it at most, read off the lay itself and written out rather than taken from
    // the constant the line above pins it to — a bound phrased against `DRIFT_FEEDBACK_CEILING`
    // says nothing about where the ceiling rests. What the ghost doubles is a solid field since
    // 0340, and half of one laid back over itself, turned and enlarged, is a blur across every
    // head in it where half of a comb was a spiral of its own fringes (0341).
    expect(twice[0]?.alpha).toBeLessThanOrEqual(0.25);
    // However many frames run, and whatever a row asks for: the share is the ceiling's, not the
    // row's, so the field settles instead of filling to opaque a few seconds after a knob moved.
    const many =
      paintedOn(400, 128, [fedRow()], 2, WINDOW, { frames: 20 }).surfaces[0]?.frame ?? [];
    expect(many).toHaveLength(19);
    for (const drew of many) expect(drew.alpha).toBeLessThanOrEqual(DRIFT_FEEDBACK_CEILING);
    // A little larger and a little turned each time, or the ghost is a second copy of the picture
    // exactly on top of the first and nothing reads as feedback at all.
    expect(pitchOf(many[0]?.move)).toBeGreaterThan(1);
    expect(turnsIn(many[0]?.move)).not.toBe(0);
  });

  // 0250: the picture zooming into its own structure rather than a structure laid on top of one.
  // The share is a row's like any other, and this is the row that carries a claim no knob on
  // thirteen of the fourteen could make — so the whole path from a standing run to a laid ghost is
  // read here through the builder a yard's picture is actually made with.
  it("lays the whole field back into itself for the run the yard is standing", () => {
    vi.stubGlobal("devicePixelRatio", 1);
    const share = runFeedback(RUN_PLACES, 0);
    // Nothing to feed back on the first frame, whatever the run is standing.
    expect(laysOf(paintedOn(400, 128, runRows()))).toEqual([]);
    // And from the second frame on, at the share the run earned and not at the ceiling: a hand on a
    // knob is still deeper than anything a population can ask for (`boldestRow` takes the max).
    const many = laysOf(paintedOn(400, 128, runRows(), 2, WINDOW, { frames: 6 }));
    expect(many).toHaveLength(5);
    for (const drew of many) expect(drew.alpha).toBeCloseTo(feedbackAlpha(share), 9);
    expect(feedbackAlpha(share)).toBeGreaterThan(0);
    expect(feedbackAlpha(share)).toBeLessThan(DRIFT_FEEDBACK_CEILING);
    // Laid in a little larger and a little turned, or the picture is a copy of itself exactly on
    // top of itself and nothing reads as zooming into anything.
    expect(pitchOf(many[0]?.move)).toBeGreaterThan(1);
    expect(turnsIn(many[0]?.move)).not.toBe(0);
    // And the stack still deepens on the row's own turn and never on the repaint: a halted yard
    // standing a whole run is a picture of one frame, however many times React commits it.
    const held = paintedOn(400, 128, runRows(), 2, WINDOW, { frames: 6, advance: 0 });
    expect(laysOf(held)).toEqual([]);
  });

  // A canvas is painted on every commit as well as on every frame, and a halted yard is painted
  // and not animated (0040) — so a stack that deepened per painting would make a stopped picture a
  // function of how often React committed rather than of where the deck has read to (0126).
  it("deepens the stack once per frame of the deck's own clock, and never once per repaint", () => {
    vi.stubGlobal("devicePixelRatio", 1);
    const held = paintedOn(400, 128, [fedRow()], 2, WINDOW, {
      frames: 30,
      advance: 0,
    });
    expect(held.surfaces[0]?.frame).toEqual([]);
    // Thirty repaints of one halted yard are thirty of the picture one painting draws, cut for cut
    // and matrix for matrix — the same pixels again, which is what a commit-driven repaint is.
    const once = paintedOn(400, 128, [fedRow()]);
    expect(held.cuts).toEqual(Array.from({ length: 30 }, () => once.cuts).flat());
    expect(held.aims).toEqual(Array.from({ length: 30 }, () => once.aims).flat());
    // The screen's own pattern is a fresh object per painting, so what is compared of what went
    // onto the canvas is the order the ink and the product were laid in.
    expect(held.laid.map(({ over }) => over)).toEqual(
      Array.from({ length: 30 }, () => once.laid.map(({ over }) => over)).flat(),
    );
  });

  // The copy is a canvas-sized bitmap held against a canvas that may stop drawing at any moment —
  // and a field kept across that gap is a frame of a picture the yard has since stopped drawing.
  it("forgets the frame it kept the moment the picture stops being drawn at all", () => {
    vi.stubGlobal("devicePixelRatio", 1);
    const fed = fedRow();
    const rows = [fed];
    // Four paintings of one canvas: two with the row, one with the rack emptied — every instance
    // bypassed and no loop, which is a picture with no gratings in it at all — and one after it
    // comes back. The lay in the second painting is the only one there is: the painting after the
    // gap has nothing kept to lay, where a frame kept across it would be an older picture's.
    const painted = paintedOn(400, 128, rows, 2, WINDOW, {
      frames: 4,
      between: (frame) => {
        if (frame === 1) rows.length = 0;
        if (frame === 2) rows.push(fed);
      },
    });
    expect(painted.surfaces[0]?.frame).toHaveLength(1);
  });
});
