/**
 * @role Tests the bands of the ramp washed across the picture: that they travel up with the output
 *   and the standing rack's saturation and never past their own strength however many of them
 *   compose, that a halted yard washes nothing, that one band is lit per coloured row standing and
 *   none for a row claiming nothing, and that the fill each costs lands where its row stands, in
 *   that row's own ink, through the ink the cut left, handing the context back as it was found
 *   (0302, 0229, 0368).
 */
import { YARD_SCENE_REST } from "@/lib/yardScene";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DRIFT_DISPERSE_REACH, type MoireRow } from "@/lib/moire";
import { GLYPH_COUNT } from "@/lib/moireAlphabets";
import { centreAcross } from "@/lib/moireGeometry";
import { moireRow as row } from "@/lib/moireRow";
import { resetTuning, setTuning } from "@/lib/moireTuning";
import { painterOn } from "@/ui/moireCanvasPainted";
import { DRIFT_INK_SECS, screenInkRest } from "@/ui/moireScreenInk";
import {
  PICTURE_FILL_COVER,
  TINT_BAND,
  TINT_BANDS,
  TINT_LEVEL,
  TINT_PULSE,
  TINT_SPREAD,
  TINT_STRENGTH,
  tintRest,
  tintThrough,
  tintTravelInto,
  type MoireTint,
  type MoireTintBand,
} from "@/ui/moireTint";

const paintedOn = painterOn((name, value) => {
  vi.stubGlobal(name, value);
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetTuning();
});

/** A picture whose rows claim nothing — every travel case but the one about the bands. */
const NO_ROWS: readonly MoireRow[] = [];

/** The colour the wash is asked in, which no case here varies. */
const WASH_TOKEN = "the token the wash was asked in";

/** A field washing at a third of the way, with half a picture to one span of the ramp. */
const washing = (...bands: MoireTintBand[]): MoireTint => ({
  strength: 0.3,
  spread: 0.5,
  bands,
  lit: bands.length,
});

/**
 * How much of a picture of `wide` × `deep` one painting filled, counted in pictures: every fill the
 * recorder kept on the canvas itself, by the box it covered. What the frame's own budget is read
 * off (`PICTURE_FILL_COVER`).
 */
const cover = (painted: ReturnType<typeof paintedOn>, wide: number, deep: number): number =>
  painted.laid.reduce((sum, fill) => {
    // Clipped to the picture, because what a fill costs is the pixels it composites: a band twice
    // the picture wide hangs half of itself off the canvas and the rasteriser pays for none of it.
    const [left = 0, top = 0, across = 0, down = 0] = fill.box ?? [];
    const over = Math.max(0, Math.min(left + across, wide) - Math.max(left, 0));
    const under = Math.max(0, Math.min(top + down, deep) - Math.max(top, 0));
    return sum + (over * under) / (wide * deep);
  }, 0);

/** One band of a picture, wholly arrived and standing where it is told. */
const banded = (centre: number, hue: number, pulse: number, share = 1): MoireTintBand => ({
  centre,
  pulse,
  hue,
  share,
});

/**
 * The stubbed page a band is laid on: what was filled and where, how the pattern was moved, and how
 * many tiles were written. One rig rather than a stub per case, the two that assert on a fill
 * needing the same one (principle 3).
 */
function washRig() {
  const fills: { over: string; alpha: number; style: unknown; x: number; width: number }[] = [];
  const moves: { a: number; e: number }[] = [];
  const pattern = { setTransform: (m: { a: number; e: number }) => moves.push({ ...m }) };
  const wrote: number[] = [];
  vi.stubGlobal("document", {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ({
        fillStyle: "",
        clearRect: () => {},
        fillRect: () => {},
        getImageData: () => ({ data: Uint8ClampedArray.from([200, 120, 40, 255]) }),
        createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
        putImageData: (field: { data: Uint8ClampedArray }) => wrote.push(field.data.length),
      }),
    }),
  });
  vi.stubGlobal("getComputedStyle", () => ({ getPropertyValue: (token: string) => token }));
  const context = {
    fillStyle: "" as unknown,
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    createPattern: () => pattern,
    fillRect(x: number, _y: number, width: number): void {
      fills.push({
        over: this.globalCompositeOperation,
        alpha: this.globalAlpha,
        style: this.fillStyle,
        x,
        width,
      });
    },
  };
  return {
    fills,
    moves,
    wrote,
    pattern,
    context,
    // oxlint-disable-next-line no-unsafe-type-assertion
    canvas: { width: 400, height: 32 } as unknown as HTMLCanvasElement,
    // oxlint-disable-next-line no-unsafe-type-assertion
    ink: context as unknown as CanvasRenderingContext2D,
  };
}

// One flat list of what the band is and how it moves (0007).
// oxlint-disable-next-line max-lines-per-function
describe("the band washed across the picture", () => {
  it("swells with the output on the ink's own rate, and never past its own strength", () => {
    const tint = tintRest();
    expect(tint.strength).toBe(0);
    const ink = screenInkRest();
    // A quiet, sounding yard is washed at the floor the level leaves — and it travels there.
    tintTravelInto(tint, ink, NO_ROWS, 0, 10, 1 / 60, DRIFT_INK_SECS.value);
    expect(tint.strength).toBeCloseTo(1 / (60 * DRIFT_INK_SECS.value), 10);
    tintTravelInto(tint, ink, NO_ROWS, 0, 10, DRIFT_INK_SECS.value, DRIFT_INK_SECS.value);
    const quiet = tint.strength;
    expect(quiet).toBeCloseTo(TINT_STRENGTH.value * (1 - TINT_LEVEL.value), 10);
    // A loud one brings it up to the strength, and no louder than that.
    tintTravelInto(tint, ink, NO_ROWS, 1, 10, DRIFT_INK_SECS.value, DRIFT_INK_SECS.value);
    expect(tint.strength).toBeCloseTo(TINT_STRENGTH.value, 10);
    tintTravelInto(tint, ink, NO_ROWS, 4, 10, DRIFT_INK_SECS.value, DRIFT_INK_SECS.value);
    expect(tint.strength).toBeCloseTo(TINT_STRENGTH.value, 10);
    // And a standing rack's saturation brings a quiet yard up the same way (0283).
    const saturated = { ...screenInkRest(), saturate: 1 };
    tintTravelInto(tint, saturated, NO_ROWS, 0, 10, DRIFT_INK_SECS.value, DRIFT_INK_SECS.value);
    expect(tint.strength).toBeCloseTo(TINT_STRENGTH.value, 10);
  });

  it("widens one span of the ramp on a yard whose channels have dispersed", () => {
    const tint = tintRest();
    const ink = screenInkRest();
    tintTravelInto(tint, ink, NO_ROWS, 1, 3, 1, DRIFT_INK_SECS.value);
    // Wider on a dispersed yard, so a washed picture holds more of one stop at once.
    expect(tint.spread).toBeCloseTo(TINT_SPREAD.value, 10);
    tintTravelInto(
      tint,
      { ...screenInkRest(), disperse: DRIFT_DISPERSE_REACH },
      NO_ROWS,
      1,
      1,
      1,
      DRIFT_INK_SECS.value,
    );
    expect(tint.spread).toBeCloseTo(2 * TINT_SPREAD.value, 10);
  });

  it("washes nothing over a halted yard", () => {
    const tint = tintRest();
    const ink = screenInkRest();
    tintTravelInto(tint, ink, NO_ROWS, 1, 6, DRIFT_INK_SECS.value, DRIFT_INK_SECS.value);
    expect(tint.strength).toBeGreaterThan(0);
    // The deck stops: no clock to travel against, so the strength arrives at nothing outright and
    // a halted picture is painted on a commit in the screen's own ink (0144, 0266).
    tintTravelInto(tint, ink, NO_ROWS, 1, 0, 1 / 60, 0);
    expect(tint.strength).toBe(0);
  });

  it("lays one fill per coloured row through the ink the cut left, and hands the context back", () => {
    const rig = washRig();
    // A band at nothing lays nothing and builds nothing, which is every halted yard — and so does a
    // picture no row has claimed a colour in, which is a rested rack at any strength.
    tintThrough(rig.canvas, rig.ink, WASH_TOKEN, tintRest(), YARD_SCENE_REST);
    expect(rig.fills).toEqual([]);
    expect(rig.wrote).toEqual([]);
    tintThrough(rig.canvas, rig.ink, WASH_TOKEN, washing(), YARD_SCENE_REST);
    expect(rig.fills, "a picture nobody coloured is washed anyway").toEqual([]);
    // One fill per coloured row, atop the ink, and the context handed back.
    const warm = banded(0.25, 0.8, 1);
    const cool = banded(0.75, 0.2, 0);
    tintThrough(rig.canvas, rig.ink, WASH_TOKEN, washing(warm, cool), YARD_SCENE_REST);
    expect(rig.fills.map((fill) => fill.over)).toEqual(["source-atop", "source-atop"]);
    expect(rig.fills.every((fill) => fill.style === rig.pattern)).toBe(true);
    expect(rig.context.globalCompositeOperation).toBe("source-over");
    expect(rig.context.globalAlpha).toBe(1);
    // Each stands where its own row stands, a band wide (0229).
    for (const [at, band] of [warm, cool].entries()) {
      const centre = centreAcross(band.centre, 400);
      expect(rig.fills[at]?.x).toBeCloseTo(centre - (TINT_BAND.value * 400) / 2, 10);
      expect(rig.fills[at]?.width).toBeCloseTo(TINT_BAND.value * 400, 10);
      // And the row's own hue lands on that centre — `hue / 2` into the tile, the ramp being read
      // forward over its first half.
      expect(rig.moves[at]?.e).toBeCloseTo(centre - (band.hue / 2) * 0.5 * 400, 10);
      expect(rig.moves[at]?.a).toBeCloseTo(((0.5 * 400) / (rig.wrote[0] ?? 0)) * 4, 10);
    }
    // A row working brings its own band up from the floor a resting one washes at — and two bands
    // each lay the share that composites back to the one strength, never twice it (0130).
    const two = 1 - (1 - 0.3) ** (1 / 2);
    expect(rig.fills[0]?.alpha).toBeCloseTo(two, 10);
    expect(rig.fills[1]?.alpha).toBeCloseTo(two * (1 - TINT_PULSE.value), 10);
    expect(1 - (1 - two) ** 2).toBeCloseTo(0.3, 10);
    // And the tile is written once a colour however many bands are laid through it (0129).
    expect(rig.wrote.length).toBe(1);
    tintThrough(rig.canvas, rig.ink, WASH_TOKEN, washing(warm), YARD_SCENE_REST);
    expect(rig.wrote.length).toBe(1);
    expect(rig.fills.length).toBe(3);
    // One band alone lays the whole strength, and a row half arrived lays half of what it will.
    expect(rig.fills[2]?.alpha).toBeCloseTo(0.3, 10);
    tintThrough(
      rig.canvas,
      rig.ink,
      WASH_TOKEN,
      washing(banded(0.25, 0.8, 1, 0.5)),
      YARD_SCENE_REST,
    );
    expect(rig.fills[3]?.alpha).toBeCloseTo(0.15, 10);
  });

  it("lights a band for every coloured row standing, and none for a row that claims nothing", () => {
    const tint = tintRest();
    const ink = screenInkRest();
    const coloured = [
      row({ period: 2, hue: 0.9, centre: 0.2, pulse: 0.4 }),
      // A row in the picture's own ink claims nothing, so it washes nothing.
      row({ period: 2 }),
      // Half arrived, so its colour joins the picture with the grating it names and leaves with it.
      row({ period: 3, hue: 0.1, centre: 0.8, arrival: 0.5 }),
      // Not drawn, and wholly left: neither is in the picture, so neither votes.
      row({ period: 0, hue: 0.9 }),
      row({ period: 2, hue: 0.9, arrival: 0 }),
    ];
    tintTravelInto(tint, ink, coloured, 1, 10, DRIFT_INK_SECS.value, DRIFT_INK_SECS.value);
    expect(tint.lit).toBe(2);
    expect(tint.bands.slice(0, 2)).toEqual([
      { centre: 0.2, pulse: 0.4, hue: 0.9, share: 1 },
      { centre: 0.8, pulse: 0, hue: 0.1, share: 0.5 },
    ]);
    // And no more of them than the picture may pay fills for, refilled in place (0070).
    const many = Array.from({ length: TINT_BANDS + 3 }, () => row({ period: 2, hue: 0.9 }));
    const held = tint.bands;
    tintTravelInto(tint, ink, many, 1, 10, DRIFT_INK_SECS.value, DRIFT_INK_SECS.value);
    expect(tint.lit).toBe(TINT_BANDS);
    expect(tint.bands).toBe(held);
    // A rack going back to rest takes its bands with it.
    tintTravelInto(tint, ink, NO_ROWS, 1, 10, DRIFT_INK_SECS.value, DRIFT_INK_SECS.value);
    expect(tint.lit).toBe(0);
  });

  it("builds its own band for a light that falls through the field and one that washes it", () => {
    // The band is read off the tile's own five stops (`sceneStops`), and since 0336 those stops
    // depend on how the yard's air spreads: a wash mixes every one of them toward the light's token
    // and a fall mixes none. Two yards under one light in one colour therefore read two ramps — and
    // the band is held in a map shared by every canvas, so a key that could not tell them apart
    // would hand whichever painted second the first one's band and leave the band and the tile
    // under it disagreeing about what the ramp is.
    const wrote: string[] = [];
    vi.stubGlobal("document", {
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => ({
          fillStyle: "" as unknown,
          clearRect: () => {},
          fillRect: () => {},
          getImageData: () => ({ data: Uint8ClampedArray.from([200, 120, 40, 255]) }),
          createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
          putImageData: (field: { data: Uint8ClampedArray }) => wrote.push(field.data.join(",")),
        }),
      }),
    });
    vi.stubGlobal("getComputedStyle", () => ({ getPropertyValue: (token: string) => token }));
    const context = {
      fillStyle: "" as unknown,
      globalAlpha: 1,
      globalCompositeOperation: "source-over",
      createPattern: () => ({ setTransform: () => {} }),
      fillRect: () => {},
    };
    // oxlint-disable-next-line no-unsafe-type-assertion
    const ink = context as unknown as CanvasRenderingContext2D;
    const tint = washing(banded(0.5, 0.9, 1));
    const moon = { ...YARD_SCENE_REST, light: "moon" } as const;
    for (const spread of ["wash", "fall"] as const) {
      // oxlint-disable-next-line no-unsafe-type-assertion
      const canvas = { width: 400, height: 32 } as unknown as HTMLCanvasElement;
      tintThrough(canvas, ink, "one colour for both", tint, { ...moon, spread });
    }
    // Two bands and not one: the second yard reads a ramp the first one's band was not written
    // from, so a band answered out of the map for it is a band of the wrong stops. Counted rather
    // than compared pixel for pixel, because the swatch every token is resolved through is one
    // canvas held for the life of the module (`inkOf`) and a stub cannot give two tokens two inks
    // once another case has built it.
    expect(wrote, "a fall is washed through the band a wash built").toHaveLength(2);
  });

  it("is laid by the painter after the cut, so it colours the picture and not the ground", () => {
    // Three patterns: the grating, the screen, and the band — and one per mark the stamp fills
    // the sound's own rows through on its way past (0350), which are asked for before the band's.
    const tinted = paintedOn(200, 64, [row({ period: 3 })], 3 + GLYPH_COUNT, undefined, {
      tinting: { ...washing(banded(0.5, 0.9, 1)), strength: 0.4, spread: 0.6 },
    });
    // The screen, the product cut back out, and then the band atop what is left — in that order.
    const overs = tinted.laid.map((fill) => fill.over);
    expect(overs.at(-1)).toBe("source-atop");
    expect(overs.indexOf("destination-out")).toBeLessThan(overs.lastIndexOf("source-atop"));
    expect(tinted.left).toBe("source-over");
    // And none of it on a yard whose band stands at nothing.
    const plain = paintedOn(200, 64, [row({ period: 3 })]);
    expect(plain.laid.some((fill) => fill.over === "source-atop")).toBe(false);
  });

  it("fills no more of the picture a frame than the budget, however many rows are coloured", () => {
    // The block's last checkpoint (docs/plan.md §1). Every checkpoint in the block leaves one
    // stable boolean behind, and this is the last one's: how much of the picture one frame fills,
    // counted off the recorder, against one declared ceiling. Checkpoint A bounded the stamp's own
    // picture-sized draws at one (0353) after thirty of them stopped the frame loop of a window
    // 2560 × 1440 at two device pixels; 0368 then put one fill per coloured row on the frame, and
    // `colour.band` reaches twice the picture's width, so eight coloured rows are the one place
    // left where what a frame fills grows with what a rack holds.
    const lit = Array.from({ length: TINT_BANDS }, (_, at) => banded(at / TINT_BANDS, 0.5, 1));
    const tinting = { ...washing(...lit), strength: 0.4, spread: 0.6 };
    // At or under the budget, never past it, and the budget pinned in one place: a step that fills
    // another picture a frame — or widens the dial that says how much of one a band is — has to
    // raise the constant where it is argued, and the pin is what makes that a decision rather than
    // an edit. What the budget is worth is asserted here and never restated: an expectation
    // spelling `1 + TINT_BANDS * TINT_BAND.max` out again would pass whatever the constant said.
    // The same shape checkpoint A's own count is asserted in (src/ui/moireCanvasMarks.test.ts).
    expect(PICTURE_FILL_COVER, "raising the budget is a decision, not an edit").toBe(9);
    setTuning("colour.band", TINT_BAND.max);
    const widest = paintedOn(200, 64, [row({ period: 3 })], 3 + GLYPH_COUNT, undefined, {
      tinting,
    });
    expect(cover(widest, 200, 64)).toBeLessThanOrEqual(PICTURE_FILL_COVER);
    expect(cover(widest, 200, 64), "and every band does reach the picture").toBeGreaterThan(1);
    // At the rest the same eight rows fill under half of that, the screen's own ink included, and
    // every band lies wholly on the picture there so nothing is clipped away.
    resetTuning();
    const resting = paintedOn(200, 64, [row({ period: 3 })], 3 + GLYPH_COUNT, undefined, {
      tinting,
    });
    expect(cover(resting, 200, 64)).toBeCloseTo(1 + TINT_BANDS * TINT_BAND.value, 10);
    expect(cover(resting, 200, 64)).toBeLessThan(cover(widest, 200, 64));
    // And a picture no row has claimed a colour in fills the screen's own ink and nothing else, at
    // any setting of the dial: the band is what the rack buys, not what the picture costs.
    setTuning("colour.band", TINT_BAND.max);
    expect(cover(paintedOn(200, 64, [row({ period: 3 })]), 200, 64)).toBeCloseTo(1, 10);
  });
});
