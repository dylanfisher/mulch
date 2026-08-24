/**
 * @role Tests that the picture is one field of gratings rather than a stack of drawn rows: that
 *   every row is cut out of ink laid down exactly once, that a row's period is its pitch and its
 *   parameter its angle, that the reference is the axis the rest are read against, and that a
 *   canvas which cannot make the pattern lays down no ink at all.
 */
// Every case here paints through the one harness below, so splitting the file would separate the
// painter's cases from the stand-in canvas they are all made against. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
import { afterEach, describe, expect, it, vi } from "vitest";

import { EFFECTS } from "@/audio/effects/registry";
import { DECK_AUTOMATION_PARAM_IDS, effectAutomationParamIds } from "@/audio/params";
import { fold } from "@/lib/copy";
import {
  gratingDepth,
  gratingPitch,
  gratingTurns,
  PLAIN_PROFILE,
  profileBlock,
  type MoireRow,
} from "@/lib/moire";
import { LENS_SLICES, LENS_SPAN } from "@/lib/moireGeometry";
import { drawnRows, paintMoire, TILE_PX } from "@/ui/moireCanvas";

import { moireRow as row } from "@/lib/moireRow";

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
  const surfaces: {
    fills: { over: string; alpha: number }[];
    wrote: { width: number; height: number; data: Uint8ClampedArray }[];
    drew: { over: string; alpha: number; move: Move }[];
  }[] = [];
  const surface = () => {
    const fills: { over: string; alpha: number }[] = [];
    const wrote: { width: number; height: number; data: Uint8ClampedArray }[] = [];
    const drew: { over: string; alpha: number; move: Move }[] = [];
    // What a curved row is drawn with: the tile it was baked into, placed by a matrix rather than
    // rebuilt. One object refilled by the painter, so the recorder keeps a copy of each.
    let move: Move = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
    surfaces.push({ fills, wrote, drew });
    return {
      fillStyle: "" as unknown,
      globalAlpha: 1,
      globalCompositeOperation: "source-over",
      clearRect: () => {},
      setTransform: (matrix: Move | number) => {
        move = typeof matrix === "number" ? { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } : { ...matrix };
      },
      drawImage(): void {
        drew.push({ over: this.globalCompositeOperation, alpha: this.globalAlpha, move });
      },
      createPattern: () => (allowed() ? { setTransform: (m: Move) => aims.push({ ...m }) } : null),
      createImageData: (w: number, h: number) => ({
        width: w,
        height: h,
        data: new Uint8ClampedArray(w * h * 4),
      }),
      putImageData: (field: { width: number; height: number; data: Uint8ClampedArray }) => {
        wrote.push(field);
      },
      getImageData: () => ({ data: Uint8ClampedArray.from([200, 120, 40, 255]) }),
      fillRect(): void {
        fills.push({ over: this.globalCompositeOperation, alpha: this.globalAlpha });
      },
    };
  };
  // What went onto the canvas itself: the screen, and then the product taken back out of it —
  // whole, or in the slices a lens bends it through.
  const laid: { ink: unknown; over: string }[] = [];
  const slices: { top: number; deep: number; slid: number }[] = [];
  const context = {
    fillStyle: "" as unknown,
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    clearRect: () => {},
    setTransform: () => {},
    // The screen's, and it is placed after every row has been aimed, so it is the last of `aims`.
    createPattern: () => (allowed() ? { setTransform: () => {} } : null),
    drawImage(
      _field: unknown,
      _left?: number,
      top?: number,
      _wide?: number,
      deep?: number,
      slid?: number,
    ): void {
      laid.push({ ink: "the rows' own product", over: this.globalCompositeOperation });
      if (top !== undefined && deep !== undefined && slid !== undefined) {
        slices.push({ top, deep, slid });
      }
    },
    fillRect(): void {
      laid.push({ ink: this.fillStyle, over: this.globalCompositeOperation });
    },
  };
  // oxlint-disable-next-line no-unsafe-type-assertion
  const canvas = { width, height, getContext: () => context } as unknown as HTMLCanvasElement;
  const elements: { width: number; height: number }[] = [];
  vi.stubGlobal("document", {
    createElement: () => {
      const made = surface();
      const element = { width: 0, height: 0, getContext: () => made };
      elements.push(element);
      return element;
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
    slices,
    elements,
    surfaces,
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

/**
 * What one aimed grating keeps at a point of the canvas, cutting `depth`: the tile the painter
 * built, read back through the matrix it aimed that tile with. The field is these multiplied,
 * because `destination-out` leaves what is under it times one minus the grating.
 */
const keptAt = (move: Move | undefined, depth: number, x: number, y: number): number => {
  if (move === undefined) return Number.NaN;
  const det = move.a * move.d - move.b * move.c;
  const along = ((x - move.e) * move.d - (y - move.f) * move.c) / det;
  return 1 - depth * profileBlock(PLAIN_PROFILE, along / TILE_PX);
};

/** How many tiles `wide` device pixels across one painting wrote a pixel field into. */
const baked = (painted: ReturnType<typeof paintedOn>, wide: number): number =>
  painted.surfaces.filter(
    (surface, at) => surface.wrote.length > 0 && painted.elements[at]?.width === wide,
  ).length;

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
  it("makes a field of two centres that is neither of the two rows in it alone", () => {
    // A row is measured from somewhere now, and two rows measured from two places cross into a
    // field neither of them holds — which is what a delay set to two times is (0142).
    const near = row({ period: 4, centre: 0 });
    const far = row({ period: 4, centre: 1 });
    vi.stubGlobal("devicePixelRatio", 2);
    const apart = paintedOn(120, 60, [near, far]).aims;
    vi.stubGlobal("devicePixelRatio", 2);
    const together = paintedOn(120, 60, [near, { ...far, centre: near.centre }]).aims;
    // One pitch and one lean either way: an anchor is where a row is read from, not how fine it is.
    expect(pitchOf(apart[0])).toBeCloseTo(pitchOf(apart[1]), 9);
    expect(turnsIn(apart[0])).toBeCloseTo(turnsIn(apart[1]), 9);
    const depth = gratingDepth(2);
    const swing = (aims: (Move | undefined)[], pick: (near: number, far: number) => number) => {
      let most = 0;
      for (let x = 4; x < 120; x += 8) {
        for (let y = 4; y < 60; y += 8) {
          const one = keptAt(aims[0], depth, x, y);
          const two = keptAt(aims[1], depth, x, y);
          most = Math.max(most, Math.abs(one * two - pick(one, two)));
        }
      }
      return most;
    };
    // The field of the two is neither of the two: it is dark wherever either of them blocks.
    expect(swing(apart, (one) => one)).toBeGreaterThan(0.05);
    expect(swing(apart, (_one, two) => two)).toBeGreaterThan(0.05);
    // And the two centres are the reason: the same pair anchored alike is a different picture.
    let moved = 0;
    for (let x = 4; x < 120; x += 8) {
      for (let y = 4; y < 60; y += 8) {
        const two = keptAt(apart[0], depth, x, y) * keptAt(apart[1], depth, x, y);
        const one = keptAt(together[0], depth, x, y) * keptAt(together[1], depth, x, y);
        moved = Math.max(moved, Math.abs(two - one));
      }
    }
    expect(moved).toBeGreaterThan(0.05);
  });

  it("bakes a curved row once and moves it with a matrix after that", () => {
    // The cost a curved row is worth stating: its tile is the picture's own size and is written a
    // pixel at a time, so it is written on a rebuild and never on a frame (0129, 0142). Every
    // frame after the first is the same tile placed by a scale.
    const rings = row({ period: 3, phase: 0, geometry: "radial" });
    vi.stubGlobal("devicePixelRatio", 2);
    const first = paintedOn(96, 48, [rings]);
    const written = first.surfaces.findIndex(
      (surface, at) =>
        surface.wrote.length > 0 &&
        first.elements[at]?.width === 96 &&
        first.elements[at].height === 48,
    );
    expect(written).toBeGreaterThan(-1);
    // A ring family, not a comb: what it cuts moves down a column as well as along a row.
    const field = first.surfaces[written]?.wrote[0];
    const alpha = (x: number, y: number): number => field?.data[(y * 96 + x) * 4 + 3] ?? -1;
    expect(alpha(8, 4)).not.toBe(alpha(8, 40));
    // Cut into the product like every other row, and by drawing rather than by filling.
    const drew = first.surfaces[0]?.drew ?? [];
    expect(drew).toHaveLength(1);
    expect(drew[0]?.over).toBe("destination-out");
    // Painted again a third of the way round its cycle, the tile is the one already baked and only
    // the matrix is new — which is the whole claim a picture-sized tile rests on.
    vi.stubGlobal("devicePixelRatio", 2);
    const later = paintedOn(96, 48, [{ ...rings, phase: 1 }]);
    expect(
      later.surfaces.some(
        (surface, at) => surface.wrote.length > 0 && later.elements[at]?.width === 96,
      ),
    ).toBe(false);
    expect(later.surfaces[0]?.drew[0]?.move.a).not.toBeCloseTo(drew[0]?.move.a ?? 0, 9);
  });

  it("bakes no curved tile at all on a second painting, however many rows ask for one", () => {
    // The claim a picture-sized tile rests on, at the size that breaks a cache: more curved rows
    // than the cache holds must not degrade into a miss on every lookup of every frame, which is
    // what an eviction by age alone does when the rows are walked in the same order each time.
    const many = [0, 0.2, 0.4, 0.6, 0.8].flatMap((centre) =>
      [3, 11].map((period) => row({ period, geometry: "radial", centre })),
    );
    vi.stubGlobal("devicePixelRatio", 2);
    const cut = paintedOn(100, 50, many);
    expect(baked(cut, 100)).toBe(many.length);
    vi.stubGlobal("devicePixelRatio", 2);
    expect(baked(paintedOn(100, 50, many), 100)).toBe(0);
  });

  it("draws the field back through a lens in slices, and whole where no row asks for one", () => {
    // A lens bends the picture once it is built, so it costs a draw per slice of what is already
    // drawn and no second pass over any row.
    vi.stubGlobal("devicePixelRatio", 2);
    const plain = paintedOn(128, 64, [row({ period: 4 })]);
    expect(plain.slices).toEqual([]);
    vi.stubGlobal("devicePixelRatio", 2);
    const bent = paintedOn(128, 64, [row({ period: 4, lens: 1 })]);
    // One band per slice, tiling the height exactly, top to bottom.
    const bands = new Map<number, number[]>();
    for (const slice of bent.slices) {
      bands.set(slice.top, [...(bands.get(slice.top) ?? []), slice.slid]);
    }
    expect(bands.size).toBe(LENS_SLICES);
    expect(bent.slices[0]?.top).toBe(0);
    const deep = new Map(bent.slices.map((slice) => [slice.top, slice.deep]));
    expect([...deep.values()].reduce((sum, each) => sum + each, 0)).toBe(64);
    // Every band is cut across the whole width: the field is drawn where the slide carries it and
    // again a picture over, or the columns the slide left behind would keep the screen at full
    // opacity — a bar of uncut ink down the edge, which is not a picture bent.
    for (const slid of bands.values()) {
      expect(Math.min(...slid)).toBeLessThanOrEqual(0);
      expect(Math.max(...slid)).toBeGreaterThanOrEqual(0);
    }
    // And the bands are slid one against the next rather than all by one amount, which would be a
    // picture moved sideways rather than a picture bent.
    expect(new Set([...bands.keys()].map((top) => bands.get(top)?.[0])).size).toBeGreaterThan(8);
    const first = [...bands.values()].map((slid) => Math.abs(slid[0] ?? 0));
    expect(Math.max(...first)).toBeCloseTo(LENS_SPAN * 128, 6);
  });
});
