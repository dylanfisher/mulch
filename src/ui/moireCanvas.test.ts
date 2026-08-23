/**
 * @role Tests that the picture is one field of gratings rather than a stack of drawn rows: that
 *   every row is cut out of ink laid down exactly once, that a row's period is its pitch and its
 *   parameter its angle, that the reference is the axis the rest are read against, and that a
 *   canvas which cannot make the pattern lays down no ink at all.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { EFFECTS } from "@/audio/effects/registry";
import { DECK_AUTOMATION_PARAM_IDS, effectAutomationParamIds } from "@/audio/params";
import { fold } from "@/lib/copy";
import { FLAT_BEND, gratingDepth, gratingPitch, gratingTurns, type MoireRow } from "@/lib/moire";
import { drawnRows, paintMoire, TILE_PX } from "@/ui/moireCanvas";

const row = (over: Partial<MoireRow> = {}): MoireRow => ({
  period: 1,
  phase: 0,
  reference: false,
  shape: 0,
  bend: FLAT_BEND,
  ...over,
});

/** The window every painting in this file is drawn across, in seconds. */
const WINDOW = 20;

type Move = { a: number; b: number; c: number; d: number; e: number; f: number };

/**
 * The painter run against a canvas of `width` × `height`, recording every fill it made and where
 * it aimed the grating for each one. `patterns` is how many of the two the engine will hand back:
 * at one the screen goes without and the picture is cut out of flat ink, at none there is no
 * picture to draw and the painter must lay nothing down.
 */
function paintedOn(
  width: number,
  height: number,
  rows: readonly MoireRow[],
  patterns = 2,
  windowSecs = WINDOW,
) {
  // The rows' gratings are aimed on the surface their product is built on; the screen is made on
  // the canvas itself. `patterns` is how many the engine will hand back across both, the product's
  // first — a surface that cannot make one draws no picture and must lay no ink anywhere.
  const aims: Move[] = [];
  let handed = 0;
  const allowed = () => (handed += 1) <= patterns;
  // A context of its own per surface, never one shared: the painter creates four canvases in a
  // painting — the product, the grating's tile, the one pixel a colour is read back through, and
  // the screen's tile — and a single stub would file the colour probe's fills under the product's.
  const surfaces: { fills: { over: string; alpha: number }[] }[] = [];
  const surface = () => {
    const fills: { over: string; alpha: number }[] = [];
    surfaces.push({ fills });
    return {
      fillStyle: "" as unknown,
      globalAlpha: 1,
      globalCompositeOperation: "source-over",
      clearRect: () => {},
      setTransform: () => {},
      createPattern: () => (allowed() ? { setTransform: (m: Move) => aims.push({ ...m }) } : null),
      createImageData: (w: number, h: number) => ({
        width: w,
        height: h,
        data: new Uint8ClampedArray(w * h * 4),
      }),
      putImageData: () => {},
      getImageData: () => ({ data: Uint8ClampedArray.from([200, 120, 40, 255]) }),
      fillRect(): void {
        fills.push({ over: this.globalCompositeOperation, alpha: this.globalAlpha });
      },
    };
  };
  // What went onto the canvas itself: the screen, and then the product taken back out of it.
  const laid: { ink: unknown; over: string }[] = [];
  const context = {
    fillStyle: "" as unknown,
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    clearRect: () => {},
    setTransform: () => {},
    // The screen's, and it is placed after every row has been aimed, so it is the last of `aims`.
    createPattern: () => (allowed() ? { setTransform: () => {} } : null),
    drawImage(): void {
      laid.push({ ink: "the rows' own product", over: this.globalCompositeOperation });
    },
    fillRect(): void {
      laid.push({ ink: this.fillStyle, over: this.globalCompositeOperation });
    },
  };
  // oxlint-disable-next-line no-unsafe-type-assertion
  const canvas = { width, height, getContext: () => context } as unknown as HTMLCanvasElement;
  vi.stubGlobal("document", {
    createElement: () => {
      const made = surface();
      return { width: 0, height: 0, getContext: () => made };
    },
  });
  vi.stubGlobal("getComputedStyle", () => ({
    getPropertyValue: (token: string) => `the ${token} the theme resolved`,
  }));
  paintMoire(canvas, rows, windowSecs, "the token the theme resolved");
  // The product's own surface is the first one created.
  const product = surfaces[0]?.fills ?? [];
  return {
    aims,
    laid,
    // The cuts alone: the solid ground the product starts from is a `source-over` fill and is not
    // one of them.
    cuts: product.filter((cut) => cut.over === "destination-out"),
    ground: product.filter((cut) => cut.over === "source-over"),
    // How the painter left the canvas, which no fill can show: the last thing it did was cut the
    // product out, so one that did not hand `destination-out` back would erase whatever drew next.
    left: context.globalCompositeOperation,
  };
}

/** How far apart one aimed grating's fringes stand, back out of the matrix it was aimed with. */
const pitchOf = (move: Move | undefined): number =>
  Math.hypot(move?.a ?? 0, move?.b ?? 0) || Number.NaN;

/** Which way it leans, in turns of a circle. */
const turnsIn = (move: Move | undefined): number =>
  Math.atan2(move?.b ?? 0, move?.a ?? 0) / (2 * Math.PI);

afterEach(() => {
  vi.unstubAllGlobals();
});

// One flat list of the painter's cases (0007).
// oxlint-disable-next-line max-lines-per-function
describe("moireCanvas", () => {
  it("cuts one grating per row out of ink laid down exactly once", () => {
    // The whole shape of the picture: the screen goes down over the canvas once, and then every
    // row takes its own grating back out of it. `destination-out` leaves what is under it times
    // one minus the grating, so the field is the rows' product — which is what a stack of physical
    // gratings is, and what makes a pair of them beat.
    vi.stubGlobal("devicePixelRatio", 2);
    const rows = [row({ period: 3 }), row({ period: 4 }), row({ period: 5, reference: true })];
    const { laid, cuts, ground, left } = paintedOn(400, 128, rows);
    // One solid ground on the product's surface, then one cut per row out of it.
    expect(ground).toHaveLength(1);
    expect(cuts).toHaveLength(rows.length);
    // Every cut at the depth that holds the field's brightness where it belongs.
    for (const cut of cuts) expect(cut.alpha).toBeCloseTo(gratingDepth(rows.length), 10);
    // And on the canvas itself: the screen laid down once, and the whole product taken back out of
    // it in one stroke — so the picture is ink everywhere the gratings block and a window wherever
    // they agree, which is what a stack of gratings does to light.
    expect(laid).toHaveLength(2);
    expect(laid[0]?.over).toBe("source-over");
    expect(laid[1]).toEqual({ ink: "the rows' own product", over: "destination-out" });
    expect(left).toBe("source-over");
  });

  it("lays down no ink at all where the engine will not make the pattern", () => {
    // A canvas that cannot make a grating cannot draw this picture. An empty canvas says so; the
    // base fill on its own would be a solid rectangle claiming to be a yard's drift (principle 5).
    vi.stubGlobal("devicePixelRatio", 2);
    expect(paintedOn(400, 128, [row({ period: 3 })], 0).laid).toHaveLength(0);
    // And with only one to hand, the screen is what goes without: the picture is still the rows,
    // cut out of the flat ink the caller resolved.
    const { laid, cuts } = paintedOn(400, 128, [row({ period: 3 })], 1);
    expect(laid).toHaveLength(2);
    expect(cuts).toHaveLength(1);
  });

  it("draws nothing for a picture with no rows in it, or no window to draw them across", () => {
    vi.stubGlobal("devicePixelRatio", 2);
    expect(paintedOn(400, 128, []).laid).toHaveLength(0);
    expect(paintedOn(400, 128, [row({ period: 0 })]).laid).toHaveLength(0);
    expect(paintedOn(400, 128, [row({ period: 3 })], 2, 0).laid).toHaveLength(0);
    // A row with no period of its own is not a grating, and does not count toward the depth the
    // others are cut at — otherwise a lane that never moved would dim the whole picture.
    expect(drawnRows([row({ period: 3 }), row({ period: 0 })])).toBe(1);
  });

  it("orders the pitches by period, and keeps them all inside the band a lattice needs", () => {
    // Two gratings only beat into something slow when their pitches are close, so the window's own
    // spread — better than tenfold across a real yard — is pulled into a narrow band and clamped
    // there. What survives is the order: a row that comes round often is still drawn finer than a
    // slow one, and the ratio between them is now near enough one to be seen.
    vi.stubGlobal("devicePixelRatio", 2);
    const rows = [row({ period: 0.75 }), row({ period: 2.4 }), row({ period: 12 })];
    const { aims } = paintedOn(400, 128, rows);
    expect(aims).toHaveLength(3);
    const pitches = aims.map((aim) => pitchOf(aim) * TILE_PX);
    // Ordered, and every one of them the pitch the maths says.
    expect(pitches[0]).toBeLessThan(pitches[1] ?? 0);
    expect(pitches[1]).toBeLessThan(pitches[2] ?? 0);
    for (const [at, each] of rows.entries())
      expect(pitches[at]).toBeCloseTo(gratingPitch(each.period, WINDOW, 400, 2), 9);
    // And the whole spread inside a factor a lattice can carry: sixteenfold in periods comes out
    // under fourfold in pitches, which is the difference between a fringe and a second hatch.
    const spread = (pitches[2] ?? 0) / (pitches[0] ?? 1);
    expect(spread).toBeGreaterThan(1);
    expect(spread).toBeLessThan(4);
  });

  it("fans every parameter to its own angle, and leaves the reference on the axis", () => {
    // A row's angle is its parameter's identity, the way its waveform used to be. The reference is
    // not fanned: it is the axis the others are read against, which is the whole of what being the
    // reference means now that no row is drawn on top of another.
    expect(gratingTurns(row({ reference: true, shape: 2 ** 30 }))).toBe(0);
    vi.stubGlobal("devicePixelRatio", 2);
    const { aims } = paintedOn(400, 128, [
      row({ period: 3, shape: fold("deck.pan") }),
      row({ period: 3, reference: true }),
    ]);
    expect(turnsIn(aims[1])).toBeCloseTo(0, 9);
    expect(turnsIn(aims[0])).not.toBeCloseTo(0, 6);
    // Every automatable parameter in the real registry gets an angle no other one has: there are
    // far more parameters than there were ever waveforms, and the fold spreads all of them.
    const params = [
      ...DECK_AUTOMATION_PARAM_IDS,
      ...EFFECTS.flatMap((effect) => effectAutomationParamIds(effect.id)),
    ];
    const turns = params.map((param) => gratingTurns(row({ shape: fold(param) })));
    expect(new Set(turns.map((turn) => turn.toFixed(9))).size).toBe(params.length);
    // And the fan is a fan: every one of them near the axis, none of them on it, and to both sides
    // — a fan to one side only would lean the whole picture rather than crossing it.
    expect(Math.min(...turns)).toBeLessThan(0);
    expect(Math.max(...turns)).toBeGreaterThan(0);
    expect(Math.max(...turns.map(Math.abs))).toBeLessThan(0.05);
  });

  it("slides a grating along its own axis as the deck plays, and holds where it stops", () => {
    // 0040 for the picture: every motion is read off a row's phase and none off a clock, so a
    // halted yard is painted exactly where it stopped. Paint twice with nothing moved and the
    // matrices have to be the same matrices, cell for cell.
    vi.stubGlobal("devicePixelRatio", 2);
    const rows = [row({ period: 4, phase: 1 }), row({ period: 3, phase: 2, reference: true })];
    const first = paintedOn(400, 128, rows).aims;
    vi.stubGlobal("devicePixelRatio", 2);
    expect(paintedOn(400, 128, rows).aims).toEqual(first);
    // And it does move: a quarter of the way round is a quarter of a pitch along the axis.
    vi.stubGlobal("devicePixelRatio", 2);
    const still = paintedOn(400, 128, [row({ period: 4, phase: 0 })]).aims;
    vi.stubGlobal("devicePixelRatio", 2);
    const moved = paintedOn(400, 128, [row({ period: 4, phase: 1 })]).aims;
    expect(still[0]?.e).not.toBeCloseTo(moved[0]?.e ?? 0, 6);
    // A whole cycle on is the same picture again: the phase slides the field and nothing else.
    vi.stubGlobal("devicePixelRatio", 2);
    const round = paintedOn(400, 128, [row({ period: 4, phase: 4 })]).aims;
    expect(round[0]?.e).toBeCloseTo(still[0]?.e ?? 0, 9);
    expect(pitchOf(round[0])).toBeCloseTo(pitchOf(still[0]), 9);
  });

  it("never draws a grating finer than the pixels can carry, at any window", () => {
    // A grating finer than a few device pixels is not a fine picture but a shimmering one — it
    // moves when nothing is moving. The band's own floor is what prevents it, so unlike the ribbon
    // this replaces there is no separate bound to decline a tightening (0098 amended): nothing can
    // ask for a pitch outside the band in the first place.
    vi.stubGlobal("devicePixelRatio", 2);
    const fast = [row({ period: 0.05 }), row({ period: 900 })];
    for (const windowSecs of [8, 60, 400, 4000]) {
      const { aims } = paintedOn(720, 128, fast, 2, windowSecs);
      const pitches = aims.map((aim) => pitchOf(aim) * TILE_PX);
      expect(Math.min(...pitches)).toBeGreaterThan(6.9);
      expect(Math.max(...pitches)).toBeLessThan(28.1);
    }
    // And a picture with nothing to scale by falls to the middle of the band rather than to zero.
    expect(gratingPitch(3, 0, 400, 2)).toBe(14);
    expect(gratingPitch(0, 20, 400, 2)).toBe(14);
  });
});
