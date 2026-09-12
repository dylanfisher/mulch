/**
 * @role Tests checkpoint C's own boolean (docs/plan.md §1, 0365): what a knob turned costs **the
 *   screen's own tile**. A claim that tile is keyed through is rounded onto a ladder before it may
 *   reach the key, so two claims landing on one stop of it are one bake and the next stop is one
 *   more; a claim the frame reads bakes nothing at any distance, however far it is dragged. Its own
 *   file beside the alphabet's and the crawl's, because src/ui/moireScreen.test.ts stands at the
 *   line cap (0045).
 * @instead The ladder itself, and how the picture travels onto it → src/ui/moireScreenInk.test.ts.
 *   Where the key is written → `screenOf`, src/ui/moireScreen.ts. The alphabet's own half of that
 *   key → src/ui/moireScreenAlphabet.test.ts, which this file stands beside. **The other tile shop**
 *   — the picture-sized one a curved row is drawn through, whose key holds a row's stepped `centre`,
 *   `period` and `pitch` — and its own ladder → src/ui/moireCanvasTiles.test.ts. The frame-side
 *   terms already proved to bake nothing, one case each → src/ui/moireScreenCrawl.test.ts (a
 *   reversed landing, the ground's walk) and src/ui/moireScreen.test.ts (the tail's lean, the
 *   master's two sides).
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DRIFT_CENTRE_REACH,
  DRIFT_DISPERSE_REACH,
  DRIFT_FRINGE_REACH,
  DRIFT_HUE_REACH,
  DRIFT_REST,
  DRIFT_STEPS,
  type MoireRow,
} from "@/lib/moire";
import { moireRow as row } from "@/lib/moireRow";
import { beatPx, gridPitchPx } from "@/lib/moireScreenFilm";
import { arrivedInk, installHereScreenPort, painterOn } from "@/ui/moireCanvasPainted";
import { baked } from "@/ui/moireCanvasReadings";
import { HUE_STEPS, stepped, steppedHue } from "@/ui/moireScreenInk";

/** The recorder, bound to this file's own way of stubbing a global (src/ui/moireCanvasPainted.ts). */
const paintedOn = painterOn((name, value) => {
  vi.stubGlobal(name, value);
});

afterEach(() => {
  vi.unstubAllGlobals();
  installHereScreenPort();
});

/** The width of the tile every painting here writes, at the one display these cases paint on. */
const WIDE = beatPx(gridPitchPx(2));

/** What one row claiming `over` says about colour, arrived — the ink the painting is drawn through. */
const inkOf = (over: Partial<MoireRow>) => arrivedInk([row(over)]);

/**
 * How many tiles one painting of a yard whose only row claims `over` baked. `deep` is the canvas's
 * own height, which the tile is keyed through: a case wanting tiles of its own rather than the ones
 * another case left in the shop asks at a height no other case here paints at (`screenOf`).
 */
function bakesFor(deep: number, over: Partial<MoireRow>): number {
  vi.stubGlobal("devicePixelRatio", 2);
  return baked(paintedOn(200, deep, [row(over)], 2, 20), WIDE);
}

// One flat list of the three prices a claim can carry, in the order the decision names them: the
// ink's ladder, the hue's finer one, and the frame's own claims that carry no price at all. Cutting
// it in two would separate halves of one answer. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("what a knob turned costs the tile", () => {
  it("bakes a stop of the ink's ladder and never a stop of the hand's own travel", () => {
    // The rung the ink's own three terms are rounded onto before they may key a tile: a reach over
    // `DRIFT_STEPS` stops (`stepped`, src/ui/moireScreenInk.ts). A hand on a knob passes through
    // hundreds of values crossing one of these, and the tile is baked at the stops and nowhere
    // between. The rungs below are asserted on the *ink* and not on the knob's own distance,
    // because a row's colour claim reaches the ink part of the way (`inkTravelInto`) — so a case
    // whose arithmetic assumption stopped holding says so before it reads a bake count.
    const rung = DRIFT_FRINGE_REACH / DRIFT_STEPS;
    const deep = 88;
    const from = { fringe: DRIFT_REST.fringe + rung };
    const inside = { fringe: DRIFT_REST.fringe + rung * 1.4 };
    const across = { fringe: DRIFT_REST.fringe + rung * 3 };
    const stopOf = (over: Partial<MoireRow>) => stepped(inkOf(over).fringe, DRIFT_FRINGE_REACH);
    expect(stopOf(inside), "the move inside a rung crossed one").toBe(stopOf(from));
    expect(stopOf(across), "the move across a rung crossed none").not.toBe(stopOf(from));
    expect(bakesFor(deep, from), "the first painting baked nothing").toBe(1);
    expect(bakesFor(deep, inside), "a move inside a rung baked").toBe(0);
    expect(bakesFor(deep, across), "a whole rung baked nothing").toBe(1);

    // The same ladder under the other claim a row makes on the ink's key.
    const spread = DRIFT_DISPERSE_REACH / DRIFT_STEPS;
    const held = { disperse: spread * 2 };
    const nudged = { disperse: spread * 2.4 };
    const moved = { disperse: spread * 6 };
    const disperseAt = (over: Partial<MoireRow>) =>
      stepped(inkOf(over).disperse, DRIFT_DISPERSE_REACH);
    expect(disperseAt(nudged), "the disperse nudge crossed a rung").toBe(disperseAt(held));
    expect(disperseAt(moved), "the disperse move crossed none").not.toBe(disperseAt(held));
    expect(bakesFor(deep, held)).toBe(1);
    expect(bakesFor(deep, nudged), "a disperse inside a rung baked").toBe(0);
    expect(bakesFor(deep, moved), "a whole rung of disperse baked nothing").toBe(1);
  });

  it("bakes the hue on the finer ladder its own ramp asks for", () => {
    // **The hue is the one claim on a finer ladder than the rest**, and the exception is the point:
    // it is read along a ramp of five stops (0301), so a move the other terms would hold is a bake
    // here. That `HUE_STEPS` is the finer of the two ladders is asserted where the ladders are,
    // in src/ui/moireScreenInk.test.ts; what is read here is what it costs.
    const deep = 90;
    const hue = DRIFT_HUE_REACH / HUE_STEPS;
    const tinted = { hue: DRIFT_REST.hue + hue };
    const leant = { hue: DRIFT_REST.hue + hue * 1.4 };
    const turned = { hue: DRIFT_REST.hue + hue * 3 };
    expect(steppedHue(inkOf(leant).hue), "the hue nudge crossed a rung").toBe(
      steppedHue(inkOf(tinted).hue),
    );
    expect(steppedHue(inkOf(turned).hue), "the hue move crossed none").not.toBe(
      steppedHue(inkOf(tinted).hue),
    );
    expect(bakesFor(deep, tinted)).toBe(1);
    expect(bakesFor(deep, leant), "a hue inside its rung baked").toBe(0);
    expect(bakesFor(deep, turned), "a rung of hue baked nothing").toBe(1);
  });

  it("bakes no screen tile for a claim the frame reads, however far the hand drags it", () => {
    // The other half of checkpoint C's price: a panner's pan, a compressor's makeup and an
    // automator's wait reach the picture as a row's place, a look's term or a term on the screen's
    // own transform — none of which is a field of the screen tile's key — so the whole range of one
    // is a fill and never a bake here (0129, 0359, 0360, 0361, 0364). `depth` is one of them by
    // name: it is what the walk's own `rest` claims (`PLAYER_REACH`, 0362).
    // **Scoped to the screen's tile on purpose.** A row's `centre`, `period` and `pitch` are stepped
    // into the *other* shop's key — the picture-sized tile a curved row is drawn through — so the
    // same drag on a row whose geometry is not linear bakes there, which is what
    // src/ui/moireCanvasTiles.test.ts already walks stop by stop. Every row here is linear
    // (`moireRow`), which is the case that makes both tiles free.
    const deep = 92;
    expect(bakesFor(deep, { centre: DRIFT_REST.centre }), "the first painting baked nothing").toBe(
      1,
    );
    // A drag from one end of the reach to the other, in twenty places, so every one of the ladder's
    // `DRIFT_STEPS` rungs is crossed and several are crossed twice — and the shop is never asked.
    for (let step = 1; step <= 20; step += 1) {
      const at = (step / 20) * DRIFT_CENTRE_REACH;
      expect(bakesFor(deep, { centre: at }), `a centre at ${at} baked`).toBe(0);
    }
    // And the same for what the walk's own step claims on the frame's side (0362).
    for (let step = 1; step <= 20; step += 1) {
      expect(bakesFor(deep, { depth: step / 20, pulse: step / 20 }), "a depth baked").toBe(0);
    }
  });
});
