/**
 * @role Tests the last pass of a painting — the rows' finished product taken back out of the screen
 *   through slices: bent through a lens, broken by a scattering rack, warped by a swaying one and
 *   torn by an automator — and that each costs draws of what is already drawn and no second pass
 *   over any row.
 * @instead Every other case the painter has → src/ui/moireCanvas.test.ts, which this split out of
 *   at the 800-line hard cap (0045) — and the chain of passes the cut is handed its picture by,
 *   which split out of *this* file at the same cap (src/ui/moireCanvasChain.test.ts, 0289). The pass
 *   itself → src/ui/moireCanvasField.ts.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { LENS_SLICES, LENS_SPAN, shatterBands, SHATTER_CEILING } from "@/lib/moireGeometry";
import { SHARD_REACH } from "@/lib/moireShards";
import { moireRow as row } from "@/lib/moireRow";
import { RACK_SHATTER_BAND } from "@/lib/moireSound";
import { warpShare } from "@/lib/moireWarp";
import { painterOn, PRODUCT, WINDOW, type Painted } from "@/ui/moireCanvasPainted";
import { look } from "@/ui/moireCanvasReadings";
import type { MoireLook } from "@/ui/moireLooks";
import { shapeRest } from "@/ui/moireShape";

/** The recorder, bound to this file's own way of stubbing a global (src/ui/moireCanvasPainted.ts). */
const paintedOn = painterOn((name, value) => {
  vi.stubGlobal(name, value);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * The shatter looks whose reading is `share`: whole broken instances and a part of one, because the
 * reading is stated across a band of them and no single instance can reach the top of it.
 */
const shattering = (share: number, size = 0): MoireLook[] => {
  const sum = RACK_SHATTER_BAND[0] + share * (RACK_SHATTER_BAND[1] - RACK_SHATTER_BAND[0]);
  const whole = Math.floor(sum);
  const looks = Array.from({ length: whole }, (_each, at) =>
    look("shatter", { share: 1, size }, 1, `whole ${at}`),
  );
  if (sum > whole) looks.push(look("shatter", { share: sum - whole, size }, 1, "part"));
  return looks;
};

/** Where each slice of a broken picture was drawn from, of the ones drawn from somewhere else. */
const elsewhere = (painted: Painted): number[] =>
  painted.slices.filter((cut) => cut.slid > 0 && cut.slid < 128).map((cut) => cut.slid);

/** What a painting laid down that was not the rows' own product: the screen's own fills, in order. */
const fills = (painted: Painted): string[] =>
  painted.laid.filter((each) => each.ink !== PRODUCT).map((each) => each.over);

/** Where each whole column cut out to the screen was laid down, in the order they were drawn. */
const screenOf = (painted: Painted): number[] =>
  painted.slices.filter((slice) => slice.top === 0 && slice.deep === 64).map((slice) => slice.down);

/** The surface between the two slice passes, where the first pass laid a band per slice. */
const betweenOf = (painted: Painted): Painted["surfaces"][number] | undefined =>
  painted.surfaces.find(
    (surface) => surface.drew.length >= LENS_SLICES && surface.drew[0]?.over === "source-over",
  );

/**
 * How far each band laid into that surface was thrown, by the band's top: each is laid twice, where
 * the throw carries it and a picture over, so its throw is the nearer of its two draws.
 */
function thrownOf(between: ReturnType<typeof betweenOf>): Map<number, number> {
  const thrown = new Map<number, number>();
  for (const { box } of between?.drew ?? []) {
    const [, top, , , slid] = box;
    if (top === undefined || slid === undefined) continue;
    const near = Math.min(Math.abs(slid), Math.abs(slid - 128));
    thrown.set(top, Math.min(thrown.get(top) ?? Infinity, near));
  }
  return thrown;
}

// One flat list of the pass's cases (0007).
// oxlint-disable-next-line max-lines-per-function
describe("cutField", () => {
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
    expect(Math.max(...first)).toBeCloseTo(LENS_SPAN.value * 128, 6);
  });

  it("bends the field through the sway's two sines in slices, and takes no second pass unbent", () => {
    // A warp is the lens's own slices twice: every band slid across by a sine of where it stands,
    // then every column of what that left slid down by a sine of where it stands, through one
    // surface between — draws of what is already drawn, no bake and no key (0278).
    vi.stubGlobal("devicePixelRatio", 2);
    const flat = paintedOn(128, 64, [row({ period: 4 })]);
    expect(flat.slices).toEqual([]);
    vi.stubGlobal("devicePixelRatio", 2);
    const warped = paintedOn(128, 64, [row({ period: 4 })], 2, WINDOW, {
      looks: [look("warp", { bend: 1, wander: 0 })],
      shape: { ...shapeRest(), sway: 0.3 },
    });
    // One more surface than an unbent picture makes: the one between the two passes.
    expect(warped.elements).toHaveLength(flat.elements.length + 1);
    // The first pass went into it, a band per slice and its wrap, laid rather than cut.
    const between = betweenOf(warped);
    expect(between).toBeDefined();
    // The second pass reached the screen: a column per slice, the whole height of it, cut.
    const columns = warped.slices.filter((slice) => slice.top === 0 && slice.deep === 64);
    expect(new Set(columns.map((slice) => slice.slid)).size).toBe(LENS_SLICES);
    for (const slice of warped.slices) expect(slice.alpha).toBe(1);
    // Slid down by no more than the ceiling, and by different amounts — a bend, not a shift. Each
    // column is drawn twice, where the slide carries it and a picture over, so the slide is the
    // nearer of its two draws.
    const down = new Map<number, number>();
    for (const slice of columns) {
      down.set(slice.slid, Math.min(down.get(slice.slid) ?? Infinity, Math.abs(slice.down)));
    }
    expect(Math.max(...down.values())).toBeLessThanOrEqual(warpShare(1) * 64 + 1e-9);
    expect(Math.max(...down.values())).toBeGreaterThan(0);
    expect(new Set(down.values()).size).toBeGreaterThan(8);
    // And the phase is the sway's own: a wander on is a different bend of the same picture.
    vi.stubGlobal("devicePixelRatio", 2);
    const later = paintedOn(128, 64, [row({ period: 4 })], 2, WINDOW, {
      looks: [look("warp", { bend: 1, wander: 0 })],
      shape: { ...shapeRest(), sway: 0.55 },
    });
    expect(later.slices.map((slice) => slice.down)).not.toEqual(
      warped.slices.map((slice) => slice.down),
    );
  });

  // P269: the one thing the picture had never done — the field read back through itself displaced,
  // so a share of it is drawn from somewhere else in the picture (0269).
  it("draws a share of the picture from elsewhere in it, and never past the ceiling", () => {
    vi.stubGlobal("devicePixelRatio", 2);
    const plain = paintedOn(128, 64, [row({ period: 4 })]);
    expect(plain.slices).toEqual([]);
    vi.stubGlobal("devicePixelRatio", 2);
    // A scattering rack with no row asking for a lens: the unbroken pieces stand where they were.
    const broken = paintedOn(128, 64, [row({ period: 4 })], 2, WINDOW, { looks: shattering(1) });
    const bands = new Map<number, typeof broken.slices>();
    for (const slice of broken.slices) {
      bands.set(slice.top, [...(bands.get(slice.top) ?? []), slice]);
    }
    expect(bands.size).toBe(LENS_SLICES);
    // It is a slice of the field and never a second fill over it: a shattered picture lays exactly
    // the ink an unshattered one does, in the same two passes — and every band is cut once wherever
    // it lands, at the one alpha the painting cuts at, two cuts of one band being a product that
    // hazes every window in the picture evenly.
    expect(fills(broken)).toEqual(fills(plain));
    for (const band of bands.values()) {
      expect(new Set(band.map((cut) => cut.alpha))).toEqual(new Set([1]));
      expect(new Set(band.map((cut) => cut.top)).size).toBe(1);
    }
    // The share is bounded at the ceiling the record states: half the picture in eighths is four
    // pieces of eight drawn from elsewhere, whatever the reading asks for.
    const displaced = [...bands.values()].map((band) => band[0]?.slid ?? 0);
    const pieces = new Set(displaced.filter((slid) => slid !== 0));
    expect(pieces.size).toBe(shatterBands(0) * SHATTER_CEILING.value);
    expect([...pieces].every((slid) => slid > 0 && slid < 128)).toBe(true);
    // Each piece is deep enough to see a straight row inside, and the broken ones are spread across
    // the picture rather than taken off one end of it.
    const eighth = LENS_SLICES / shatterBands(0);
    expect(new Set(displaced.slice(0, eighth)).size).toBe(1);
    const halves = [0, shatterBands(0) / 2].map(
      (from) =>
        Array.from(
          { length: shatterBands(0) / 2 },
          (_each, piece) => displaced[(from + piece) * eighth] ?? 0,
        ).filter((slid) => slid !== 0).length,
    );
    expect(halves).toEqual([2, 2]);
    // Half the reading is half of that: a yard turning up its scatters breaks further, in pieces.
    const half = paintedOn(128, 64, [row({ period: 4 })], 2, WINDOW, { looks: shattering(0.5) });
    const halved = new Set(elsewhere(half));
    expect(halved.size).toBe((shatterBands(0) * SHATTER_CEILING.value) / 2);
    // And a reading too small to break a whole piece leaves the picture exactly as it was.
    expect(
      paintedOn(128, 64, [row({ period: 4 })], 2, WINDOW, { looks: shattering(0.1) }).slices,
    ).toEqual([]);
  });

  // P290: and how big each of those pieces is, which is the scatter's own Span (0290).
  it("breaks the field into fewer and bigger pieces as the span opens, and draws every one", () => {
    vi.stubGlobal("devicePixelRatio", 2);
    const plain = paintedOn(128, 64, [row({ period: 4 })]);
    vi.stubGlobal("devicePixelRatio", 2);
    const fine = paintedOn(128, 64, [row({ period: 4 })], 2, WINDOW, { looks: shattering(1, 0) });
    vi.stubGlobal("devicePixelRatio", 2);
    const wide = paintedOn(128, 64, [row({ period: 4 })], 2, WINDOW, { looks: shattering(1, 1) });
    // A whole span breaks the field into fewer pieces than a shut one does, and every piece it does
    // break is a bigger run of the picture: how many slices break together is how big a piece is.
    expect(new Set(elsewhere(wide)).size).toBeGreaterThan(0);
    expect(new Set(elsewhere(wide)).size).toBeLessThan(new Set(elsewhere(fine)).size);
    expect(elsewhere(wide).length).toBeGreaterThan(elsewhere(fine).length / 2);
    expect(elsewhere(wide).length / new Set(elsewhere(wide)).size).toBeGreaterThan(
      elsewhere(fine).length / new Set(elsewhere(fine)).size,
    );
    // And a bigger piece is still a piece of the field and never a fill over it: the same ink an
    // unshattered picture lays, cut once at the one alpha every cut here is made at (0269).
    expect(fills(wide)).toEqual(fills(plain));
    expect(new Set(wide.slices.map((cut) => cut.alpha))).toEqual(new Set([1]));
    expect(new Set(wide.slices.map((cut) => cut.top)).size).toBe(LENS_SLICES);
  });

  // P279: the chain the looks are drawn through, which every later pass arrives into.
  it("steps over every look that lands elsewhere, and draws the field once", () => {
    vi.stubGlobal("devicePixelRatio", 2);
    const plain = paintedOn(128, 64, [row({ period: 4 })]);
    vi.stubGlobal("devicePixelRatio", 2);
    // A rack whose looks all land somewhere other than the chain — the warp and the shatter at the
    // cut — takes no slot in it: no surface is made for a pass that does not exist, and the field
    // reaches the screen through exactly the draws it did before (0278, 0279).
    const looked = paintedOn(128, 64, [row({ period: 4 })], 2, WINDOW, {
      looks: [look("shatter", { share: 1 }), look("warp", { bend: 0, wander: 0 })],
    });
    expect(looked.elements).toHaveLength(plain.elements.length);
    expect(looked.slices).toEqual([]);
    expect(fills(looked)).toEqual(fills(plain));
    expect(looked.laid.length).toBe(plain.laid.length);
  });

  // P296: the automator's own look — the field torn along the structure's cross-section, through
  // the same slices, and never a bake (0296).
  it("tears the field along the structure's own cross-section, in slices cut once", () => {
    vi.stubGlobal("devicePixelRatio", 2);
    const plain = paintedOn(128, 64, [row({ period: 4 })]);
    // No automator standing: the field is drawn once, whole.
    expect(plain.slices).toEqual([]);
    vi.stubGlobal("devicePixelRatio", 2);
    const torn = paintedOn(128, 64, [row({ period: 4 })], 2, WINDOW, { looks: [look("shards")] });
    // The column pass is taken, as for the warp: one surface between, a band per slice laid into
    // it, and a column per slice cut out to the screen.
    expect(torn.elements).toHaveLength(plain.elements.length + 1);
    const between = betweenOf(torn);
    expect(between).toBeDefined();
    const columns = torn.slices.filter((slice) => slice.top === 0 && slice.deep === 64);
    expect(new Set(columns.map((slice) => slice.slid)).size).toBe(LENS_SLICES);
    // Every band is slid by a different amount — a tear and not a shift — and no band further than
    // the reach in shares of the height. Each band is laid twice, where the throw carries it and a
    // picture over, so its throw is the nearer of its two draws.
    const thrown = thrownOf(between);
    expect(thrown.size).toBe(LENS_SLICES);
    expect(Math.max(...thrown.values())).toBeLessThanOrEqual(SHARD_REACH.value * 64 + 1e-9);
    expect(Math.max(...thrown.values())).toBeGreaterThan(0);
    expect(
      new Set([...thrown.values()].map((near) => Math.round(near * 100))).size,
    ).toBeGreaterThan(8);
    // Cut once at the one alpha every cut here is made at, and never a fill over the field.
    expect(fills(torn)).toEqual(fills(plain));
    for (const draw of between?.drew ?? []) expect(draw.alpha).toBe(1);
    for (const slice of torn.slices) expect(slice.alpha).toBe(1);
    // Two automators are two layers, the second tearing what the first left (0298): a second
    // surface between, the first surface's bands laid twice over — once a layer — and the columns
    // that reach the screen thrown by the second automator's own table, which is not the first's.
    vi.stubGlobal("devicePixelRatio", 2);
    const twice = paintedOn(128, 64, [row({ period: 4 })], 2, WINDOW, {
      looks: [look("shards", {}, 1, "x"), look("shards", {}, 1, "y")],
    });
    expect(twice.elements).toHaveLength(plain.elements.length + 2);
    expect(betweenOf(twice)?.drew.length).toBe((between?.drew.length ?? 0) * 2);
    expect(screenOf(twice)).not.toEqual(screenOf(torn));
    expect(new Set(screenOf(twice).map((down) => Math.round(down * 100))).size).toBeGreaterThan(8);
    for (const slice of twice.slices) expect(slice.alpha).toBe(1);
  });

  // P104: the tile is where a harmonic-rich profile is actually sampled, and a profile whose mean
  // moved would make the picture's brightness say which effects a yard holds (0143).
});
