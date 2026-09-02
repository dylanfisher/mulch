/**
 * @role Tests the last pass of a painting — the rows' finished product taken back out of the screen
 *   through slices: bent through a lens, broken by a scattering rack and warped by a swaying one —
 *   and that each costs draws of what is already drawn and no second pass over any row.
 * @instead Every other case the painter has → src/ui/moireCanvas.test.ts, which this split out of
 *   at the 800-line hard cap (0045). The pass itself → src/ui/moireCanvasField.ts.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { LENS_SLICES, LENS_SPAN, SHATTER_BANDS, SHATTER_CEILING } from "@/lib/moireGeometry";
import {
  BLOCK_HARDENINGS,
  BLOCK_PIXELS,
  BLOOM_CEILING,
  ECHO_CAP,
  ECHO_CEILING,
  ECHO_FADE,
  ECHO_SPACING,
  echoCount,
  GRAIN_CEILING,
  GRAIN_TILE,
  echoSpacing,
  LOOKS,
  SHARPEN_CEILING,
  SHARPEN_SCALE,
  WOBBLE_CEILING,
  wobbleSlide,
  type Look,
  type LookName,
  type LookTerms,
} from "@/lib/moireLook";
import { moireRow as row } from "@/lib/moireRow";
import { RACK_SHATTER_BAND } from "@/lib/moireSound";
import { warpShare } from "@/lib/moireWarp";
import { baked, painterOn, PRODUCT, WINDOW, type Painted } from "@/ui/moireCanvasPainted";
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
 * One look of a standing rack, arrived — the shape `rackLooks` answers with (src/ui/moireLooks.ts).
 * Built here rather than read off a rack of instances because what these cases are about is the
 * draw, and a knob's own range is the reading's case and not the painter's.
 */
const look = (name: LookName, terms: LookTerms = {}, key: string = name): MoireLook => ({
  key,
  look: name,
  presence: 1,
  at: 1,
  terms,
});

/**
 * The shatter looks whose reading is `share`: whole broken instances and a part of one, because the
 * reading is stated across a band of them and no single instance can reach the top of it.
 */
const shattering = (share: number): MoireLook[] => {
  const sum = RACK_SHATTER_BAND[0] + share * (RACK_SHATTER_BAND[1] - RACK_SHATTER_BAND[0]);
  const whole = Math.floor(sum);
  const looks = Array.from({ length: whole }, (_each, at) =>
    look("shatter", { share: 1 }, `whole ${at}`),
  );
  if (sum > whole) looks.push(look("shatter", { share: sum - whole }, "part"));
  return looks;
};

/** What a painting laid down that was not the rows' own product: the screen's own fills, in order. */
const fills = (painted: Painted): string[] =>
  painted.laid.filter((each) => each.ink !== PRODUCT).map((each) => each.over);

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
    expect(Math.max(...first)).toBeCloseTo(LENS_SPAN * 128, 6);
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
    const between = warped.surfaces.find(
      (surface) => surface.drew.length >= LENS_SLICES && surface.drew[0]?.over === "source-over",
    );
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
    expect(pieces.size).toBe(SHATTER_BANDS * SHATTER_CEILING);
    expect([...pieces].every((slid) => slid > 0 && slid < 128)).toBe(true);
    // Each piece is deep enough to see a straight row inside, and the broken ones are spread across
    // the picture rather than taken off one end of it.
    const eighth = LENS_SLICES / SHATTER_BANDS;
    expect(new Set(displaced.slice(0, eighth)).size).toBe(1);
    const halves = [0, SHATTER_BANDS / 2].map(
      (from) =>
        Array.from(
          { length: SHATTER_BANDS / 2 },
          (_each, piece) => displaced[(from + piece) * eighth] ?? 0,
        ).filter((slid) => slid !== 0).length,
    );
    expect(halves).toEqual([2, 2]);
    // Half the reading is half of that: a yard turning up its scatters breaks further, in pieces.
    const half = paintedOn(128, 64, [row({ period: 4 })], 2, WINDOW, { looks: shattering(0.5) });
    const halved = new Set(
      half.slices.filter((cut) => cut.slid > 0 && cut.slid < 128).map((cut) => cut.slid),
    );
    expect(halved.size).toBe((SHATTER_BANDS * SHATTER_CEILING) / 2);
    // And a reading too small to break a whole piece leaves the picture exactly as it was.
    expect(
      paintedOn(128, 64, [row({ period: 4 })], 2, WINDOW, { looks: shattering(0.1) }).slices,
    ).toEqual([]);
  });

  // P279: the chain the looks are drawn through, which every later pass arrives into.
  it("steps over every look that lands elsewhere, and draws the field once", () => {
    vi.stubGlobal("devicePixelRatio", 2);
    const plain = paintedOn(128, 64, [row({ period: 4 })]);
    vi.stubGlobal("devicePixelRatio", 2);
    // A rack whose looks all land somewhere other than the chain — the fold at the bake, the warp
    // and the shatter at the cut — takes no slot in it: no surface is made for a pass that does not
    // exist, and the field reaches the screen through exactly the draws it did before (0278, 0279).
    const looked = paintedOn(128, 64, [row({ period: 4 })], 2, WINDOW, {
      looks: [look("fold"), look("shatter", { share: 1 }), look("warp", { bend: 0, wander: 0 })],
    });
    expect(looked.elements).toHaveLength(plain.elements.length);
    expect(looked.slices).toEqual([]);
    expect(fills(looked)).toEqual(fills(plain));
    expect(looked.laid.length).toBe(plain.laid.length);
  });

  it("draws the passes that do take a slot in rack order, each off what the one before it left", () => {
    // A look's maths belongs to `LOOKS` and to nothing else, which is what makes a pass arrive by
    // declaration — so the only way to stand a pass up before its own effect's step is to lend one
    // to a look that has none, and take it back afterwards (0279).
    const drew: { look: string; source: unknown }[] = [];
    // `LOOKS` is written once and read everywhere, which is what makes a pass arrive by
    // declaration — so standing one up before its own effect's step means reaching around that on
    // purpose, at this one site. See docs/decisions/0007-reviewed-oversized-functions.md.
    // oxlint-disable-next-line no-unsafe-type-assertion
    const record = LOOKS as Record<LookName, Look>;
    const held = { shatter: LOOKS.shatter, warp: LOOKS.warp };
    const lend = (name: "shatter" | "warp") => {
      record[name] = {
        at: "pass",
        terms: held[name].terms,
        pass: (into, source) => {
          drew.push({ look: name, source });
          into.drawImage(source, 0, 0);
        },
      };
    };
    try {
      lend("shatter");
      lend("warp");
      vi.stubGlobal("devicePixelRatio", 2);
      const chained = paintedOn(128, 64, [row({ period: 4 })], 2, WINDOW, {
        // Rack order, and the order the sound goes through the rack: the shatter is ahead of the
        // warp here, and the chain must draw it first however `LOOKS` happens to list them.
        looks: [look("shatter", { share: 0 }), look("warp", { bend: 0, wander: 0 })],
      });
      expect(drew.map((each) => each.look)).toEqual(["shatter", "warp"]);
      // The first pass reads the field itself — the product's own surface, which is the first one a
      // painting makes — and the second reads what the first left, never the surface the first
      // read: a chain that read and wrote one surface would draw over itself.
      expect(drew[0]?.source).toBe(chained.elements[0]);
      expect(drew[1]?.source).not.toBe(chained.elements[0]);
      expect(drew[1]?.source).not.toBe(drew[0]?.source);
      // And the last one written is what the screen is cut with: two surfaces more than a picture
      // that took no pass, and the ink reaching the screen through them.
      expect(chained.elements.length).toBeGreaterThan(2);
      expect(chained.laid.length).toBeGreaterThan(0);
    } finally {
      record.shatter = held.shatter;
      record.warp = held.warp;
    }
  });

  // P280: reverb's bloom, and the first look whose pass the chain actually runs.
  it("blooms the field by drawing it, small and back up and under, and never by filling over it", () => {
    vi.stubGlobal("devicePixelRatio", 2);
    const plain = paintedOn(128, 64, [row({ period: 4 })]);
    vi.stubGlobal("devicePixelRatio", 2);
    const bloomed = paintedOn(128, 64, [row({ period: 4 })], 2, WINDOW, {
      looks: [look("bloom", { amount: 1, radius: 1 })],
    });
    // A pass takes the chain's own pair of surfaces, which a rack with no pass in it never makes,
    // and writes into the first of them.
    expect(bloomed.elements.length).toBe(plain.elements.length + 2);
    const at = plain.elements.length;
    const pass = bloomed.surfaces[at];
    const field = bloomed.elements[0];
    expect(pass).toBeDefined();
    // The bloom is three draws of what is already drawn: the field small, that copy back up over
    // the whole surface at the amount, and the field itself underneath it. No fill anywhere — a
    // fill over the field would haze every window in it evenly, which is the shatter's own rule
    // (0269) — and no pixel written.
    expect(pass?.fills).toEqual([]);
    expect(pass?.wrote).toEqual([]);
    expect(pass?.drew.map((each) => each.over)).toEqual([
      "source-over",
      "copy",
      "destination-over",
    ]);
    expect(pass?.drew.map((each) => each.tile)).toEqual([field, bloomed.elements[at], field]);
    // And the halo carries the amount while the field under it is laid whole.
    expect(pass?.drew[0]?.alpha).toBe(1);
    expect(pass?.drew[1]?.alpha).toBeCloseTo(BLOOM_CEILING, 10);
    expect(pass?.drew[2]?.alpha).toBe(1);
    // A room at no wet at all draws the field once and leaves the picture exactly where it was.
    vi.stubGlobal("devicePixelRatio", 2);
    const dry = paintedOn(128, 64, [row({ period: 4 })], 2, WINDOW, {
      looks: [look("bloom", { amount: 0, radius: 1 })],
    });
    expect(dry.surfaces[at]?.drew).toHaveLength(1);
    expect(fills(dry)).toEqual(fills(plain));
  });

  // P281: crush's blocks, and the first pass that draws with smoothing off.
  it("blocks the field by drawing it small and back up unsmoothed, and hands the next pass smoothing", () => {
    vi.stubGlobal("devicePixelRatio", 2);
    const plain = paintedOn(128, 64, [row({ period: 4 })]);
    const at = plain.elements.length;
    vi.stubGlobal("devicePixelRatio", 2);
    const blocked = paintedOn(128, 64, [row({ period: 4 })], 2, WINDOW, {
      looks: [look("blocks", { block: 0, levels: 0 })],
    });
    const pass = blocked.surfaces[at];
    const field = blocked.elements[0];
    // The field's own device size, read off the surface a painting made it on: a `?? 0` and not an
    // assertion, because the identity checks below are what say the surface is there at all.
    const wide = field?.width ?? 0;
    const deep = field?.height ?? 0;
    // Draws of what is already drawn and nothing else: no fill over the picture, which would haze
    // every window in it evenly (0269), and no pixel written.
    expect(pass?.fills).toEqual([]);
    expect(pass?.wrote).toEqual([]);
    // The field down onto its own grid, that grid back up over the whole surface, and the result
    // masked by itself once per lost bit — at one bit, the cap.
    const hardenings = Array.from({ length: BLOCK_HARDENINGS }, () => "destination-in");
    expect(pass?.drew.map((each) => each.over)).toEqual(["source-over", "copy", ...hardenings]);
    expect(pass?.drew[0]?.tile).toBe(field);
    expect(pass?.drew[1]?.tile).toBe(blocked.elements[at]);
    // The grid is the coarsest the band allows: enough cells to cover the field, taken back up at
    // exactly the block's own whole pixels a cell rather than stretched to the field's width, which
    // would land every cell on a fraction of one — and covering it, since a grid that stopped short
    // of the edge would leave the last cell of every row unwritten under `copy`.
    const cell = BLOCK_PIXELS[0];
    const across = Math.ceil(wide / cell);
    const down = Math.ceil(deep / cell);
    expect(pass?.drew[0]?.box).toEqual([0, 0, across, down]);
    expect(pass?.drew[1]?.box).toEqual([0, 0, across, down, 0, 0, across * cell, down * cell]);
    expect(across * cell).toBeGreaterThanOrEqual(wide);
    expect(down * cell).toBeGreaterThanOrEqual(deep);
    // And every draw of the pass is unsmoothed: a cell smoothed at either end is a blur, not a block.
    expect(pass?.drew.every((each) => !each.smooth)).toBe(true);
    // A crush the picture has not arrived at draws the field once and leaves it exactly as it was.
    vi.stubGlobal("devicePixelRatio", 2);
    const absent = paintedOn(128, 64, [row({ period: 4 })], 2, WINDOW, {
      looks: [{ ...look("blocks", { block: 0, levels: 1 }), at: 0 }],
    });
    expect(absent.surfaces[at]?.drew).toHaveLength(1);
    expect(fills(absent)).toEqual(fills(plain));
  });

  // P282: delay's echoes, and the first pass that displaces the field rather than resizing it.
  it("repeats the field by drawing it along the wind, and never by filling over it", () => {
    vi.stubGlobal("devicePixelRatio", 2);
    const plain = paintedOn(128, 64, [row({ period: 4 })]);
    const at = plain.elements.length;
    vi.stubGlobal("devicePixelRatio", 2);
    const echoed = paintedOn(128, 64, [row({ period: 4 })], 2, WINDOW, {
      looks: [look("echoes", { spacing: 1, count: 1, fade: 1 })],
      wind: { drift: 0, veer: 1 },
    });
    const pass = echoed.surfaces[at];
    const field = echoed.elements[0];
    const wide = field?.width ?? 0;
    // Draws of what is already drawn and nothing else: no fill over the picture, which would haze
    // every window in it evenly (0269), and no pixel written.
    expect(pass?.fills).toEqual([]);
    expect(pass?.wrote).toEqual([]);
    // The field itself, and then the field again once per repeat — every one of them the field's
    // own surface and never the pass's, because a repeat of a repeat is a smear.
    expect(pass?.drew).toHaveLength(1 + ECHO_CAP);
    expect(pass?.drew.every((each) => each.tile === field)).toBe(true);
    expect(pass?.drew.every((each) => each.over === "source-over")).toBe(true);
    // Spaced along the wind, one step further every repeat, and the whole ladder inside the field.
    const step = echoSpacing(1) * wide;
    expect(pass?.drew.map((each) => each.box)).toEqual([
      [0, 0],
      ...Array.from({ length: ECHO_CAP }, (_each, echo) => [step * (echo + 1), 0]),
    ]);
    expect(step * ECHO_CAP).toBeLessThan(wide);
    // And fading geometrically behind it: the picture at the whole of itself, and every repeat the
    // last one's share of what stood in front of it.
    expect(pass?.drew[0]?.alpha).toBe(1);
    for (let echo = 1; echo <= ECHO_CAP; echo++) {
      expect(pass?.drew[echo]?.alpha).toBeCloseTo(ECHO_CEILING * ECHO_FADE[1] ** (echo - 1), 10);
    }
    // The wind blowing the other way walks the same ladder the other way, which is one picture
    // turning round rather than two pictures.
    vi.stubGlobal("devicePixelRatio", 2);
    const back = paintedOn(128, 64, [row({ period: 4 })], 2, WINDOW, {
      looks: [look("echoes", { spacing: 1, count: 1, fade: 1 })],
      wind: { drift: 0, veer: -1 },
    });
    expect(back.surfaces[at]?.drew[1]?.box).toEqual([-step, 0]);
    // A delay the picture has not travelled to draws the field once and leaves it where it was.
    vi.stubGlobal("devicePixelRatio", 2);
    const absent = paintedOn(128, 64, [row({ period: 4 })], 2, WINDOW, {
      looks: [{ ...look("echoes", { spacing: 1, count: 1, fade: 1 }), at: 0 }],
      wind: { drift: 0, veer: 1 },
    });
    expect(absent.surfaces[at]?.drew).toHaveLength(1);
    expect(fills(absent)).toEqual(fills(plain));
    // And a delay at its own knobs' bottom is still a repeat, at the count and fade they state.
    vi.stubGlobal("devicePixelRatio", 2);
    const one = paintedOn(128, 64, [row({ period: 4 })], 2, WINDOW, {
      looks: [look("echoes", { spacing: 0, count: 0, fade: 0 })],
      wind: { drift: 0, veer: 1 },
    });
    expect(one.surfaces[at]?.drew).toHaveLength(1 + echoCount(0));
    expect(one.surfaces[at]?.drew[1]?.alpha).toBeCloseTo(ECHO_CEILING, 10);
    expect(one.surfaces[at]?.drew[1]?.box).toEqual([ECHO_SPACING[0] * wide, 0]);
    // And a wind standing still draws the field once and nothing behind it. The ladder is gathered
    // onto the field it came from at a veer of nought, and three copies of a hole mask laid exactly
    // over each other are the picture composed with itself — every window in it hazed evenly, which
    // is the one thing a pass may not do (0269). So the ladder fades by the same number that
    // gathers it, and this is the frame where that number is nought.
    vi.stubGlobal("devicePixelRatio", 2);
    const still = paintedOn(128, 64, [row({ period: 4 })], 2, WINDOW, {
      looks: [look("echoes", { spacing: 1, count: 1, fade: 1 })],
      wind: { drift: 0, veer: 0 },
    });
    expect(still.surfaces[at]?.drew).toHaveLength(1);
    expect(still.surfaces[at]?.drew[0]?.alpha).toBe(1);
    expect(fills(still)).toEqual(fills(plain));
    // And a wind halfway round is a ladder halfway out: the repeats stand closer to the field and
    // are fainter for it, rather than gathering onto it at the whole of their own alpha.
    vi.stubGlobal("devicePixelRatio", 2);
    const turning = paintedOn(128, 64, [row({ period: 4 })], 2, WINDOW, {
      looks: [look("echoes", { spacing: 1, count: 1, fade: 1 })],
      wind: { drift: 0, veer: 0.5 },
    });
    expect(turning.surfaces[at]?.drew[1]?.box).toEqual([step / 2, 0]);
    expect(turning.surfaces[at]?.drew[1]?.alpha).toBeCloseTo(ECHO_CEILING / 2, 10);
  });

  // P283: pop's sharpen, and the one pass whose second term is not drawn here at all.
  it("sharpens the field by taking its own blurred copy out of it, and never by filling over it", () => {
    vi.stubGlobal("devicePixelRatio", 2);
    const plain = paintedOn(128, 64, [row({ period: 4 })]);
    const at = plain.elements.length;
    vi.stubGlobal("devicePixelRatio", 2);
    const sharp = paintedOn(128, 64, [row({ period: 4 })], 2, WINDOW, {
      looks: [look("sharpen", { amount: 1, saturation: 1 })],
    });
    const pass = sharp.surfaces[at];
    const field = sharp.elements[0];
    // Draws of what is already drawn and nothing else: no fill over the picture, which would haze
    // every window in it evenly (0269), and no pixel written.
    expect(pass?.fills).toEqual([]);
    expect(pass?.wrote).toEqual([]);
    // The field small, that copy back up over the whole surface, the field taken through it at the
    // amount — which is the mask: the field wherever its own neighbourhood is not — and that mask
    // added back onto the field. Added, and not laid over it: the field is a hole mask, so where the
    // picture is darkest there is no headroom to sharpen into, and a share of what is left is a haze
    // over the whole picture rather than an edge (shot before this landed).
    expect(pass?.drew.map((each) => each.over)).toEqual([
      "source-over",
      "copy",
      "source-out",
      "lighter",
    ]);
    expect(pass?.drew.map((each) => each.tile)).toEqual([field, sharp.elements[at], field, field]);
    expect(pass?.drew[1]?.alpha).toBe(1);
    expect(pass?.drew[2]?.alpha).toBeCloseTo(SHARPEN_CEILING, 10);
    expect(pass?.drew[3]?.alpha).toBe(1);
    // The copy is taken at the mask's own working size, which is one number and not a term: pop
    // declares two terms and neither of them is a radius.
    const wide = field?.width ?? 0;
    expect(pass?.drew[1]?.box.slice(0, 2)).toEqual([0, 0]);
    expect(pass?.drew[0]?.box[2]).toBe(Math.round(wide * SHARPEN_SCALE));
    // A pop at no mix at all draws the field once and leaves the picture exactly where it was —
    // and its saturation is nowhere in this pass either way, because colour is the tile's (0266).
    vi.stubGlobal("devicePixelRatio", 2);
    const off = paintedOn(128, 64, [row({ period: 4 })], 2, WINDOW, {
      looks: [look("sharpen", { amount: 0, saturation: 1 })],
    });
    expect(off.surfaces[at]?.drew).toHaveLength(1);
    expect(fills(off)).toEqual(fills(plain));
  });

  // P285: tape's wobble, and the first pass that moves on the picture's own clock.
  it("swims the field in bands and grains it with a tile, and never by filling over it", () => {
    vi.stubGlobal("devicePixelRatio", 2);
    const plain = paintedOn(128, 64, [row({ period: 4 })]);
    const at = plain.elements.length;
    vi.stubGlobal("devicePixelRatio", 2);
    // A clock standing at nought, so the sine of it is where the case can read it.
    const taped = paintedOn(128, 64, [row({ period: 4 })], 2, WINDOW, {
      looks: [look("wobble", { wobble: 1, grain: 1 })],
      sounding: 0,
    });
    const pass = taped.surfaces[at];
    const field = taped.elements[0];
    // Draws of what is already drawn and nothing else: no fill over the picture, which would haze
    // every window in it evenly (0269), and no pixel written on this surface — the one pixel field
    // this pass writes is the noise tile's own, baked on a surface of its own before any draw.
    expect(pass?.fills).toEqual([]);
    expect(pass?.wrote).toEqual([]);
    // One band per slice the lens already cuts the field in, each drawn twice a width apart so the
    // column a slide leaves behind is covered by the copy on the far side of it (`cutAcross`).
    const deep = Math.floor((field?.height ?? 0) / LENS_SLICES);
    const bands = pass?.drew.filter((each) => each.over === "source-over") ?? [];
    expect(bands).toHaveLength(2 * LENS_SLICES);
    expect(bands.every((each) => each.tile === field)).toBe(true);
    const wide = field?.width ?? 0;
    const slid = WOBBLE_CEILING * wide * wobbleSlide(0, 0, LENS_SLICES);
    expect(bands[0]?.box).toEqual([0, 0, wide, deep, slid, 0, wide, deep]);
    expect(bands[1]?.box).toEqual([0, 0, wide, deep, slid - wide, 0, wide, deep]);
    // And the bands are not all slid the same way at once, which is what makes it a swim rather
    // than the whole field sliding sideways.
    expect(bands[2 * (LENS_SLICES / 2)]?.box[4]).not.toBeCloseTo(slid, 6);
    // Then the grain: the tile taken out of the ink at the bite, off a surface of its own that the
    // painting baked one pixel field into and never the field.
    const grained = pass?.drew.filter((each) => each.over === "destination-out") ?? [];
    expect(grained.length).toBeGreaterThan(0);
    // And the grain is taken out *after* the bands are laid, never before: bands drawn over it
    // would put back the ink the tile had just taken and the grain would be nowhere in the picture.
    expect(pass?.drew.findIndex((each) => each.over === "destination-out")).toBe(2 * LENS_SLICES);
    expect(grained.every((each) => each.tile !== field)).toBe(true);
    expect(grained[0]?.alpha).toBeCloseTo(GRAIN_CEILING, 10);
    // Off a tile of its own, baked once and never on a later painting: this run bakes it or an
    // earlier one did, and neither draws a second — the count is a ceiling and not an order.
    expect(grained[0]?.tile).toEqual(expect.objectContaining({ width: GRAIN_TILE }));
    expect(baked(taped, GRAIN_TILE)).toBeLessThanOrEqual(1);
    // A tape at no wow and no hiss draws the field once and leaves the picture where it was.
    vi.stubGlobal("devicePixelRatio", 2);
    const off = paintedOn(128, 64, [row({ period: 4 })], 2, WINDOW, {
      looks: [look("wobble", { wobble: 0, grain: 0 })],
    });
    expect(off.surfaces[at]?.drew).toHaveLength(1);
    expect(fills(off)).toEqual(fills(plain));
    // And one the picture has not travelled to yet is the same picture: presence weighs both terms.
    vi.stubGlobal("devicePixelRatio", 2);
    const arriving = paintedOn(128, 64, [row({ period: 4 })], 2, WINDOW, {
      looks: [{ ...look("wobble", { wobble: 1, grain: 1 }), at: 0 }],
    });
    expect(arriving.surfaces[at]?.drew).toHaveLength(1);
    expect(fills(arriving)).toEqual(fills(plain));
    // The clock moves the picture and nothing else does: the same rack a second later swims its
    // bands to somewhere else, and a yard whose deck is not sounding hands the same second twice.
    vi.stubGlobal("devicePixelRatio", 2);
    const later = paintedOn(128, 64, [row({ period: 4 })], 2, WINDOW, {
      looks: [look("wobble", { wobble: 1, grain: 0 })],
      sounding: 1,
    });
    expect(later.surfaces[at]?.drew[0]?.box[4]).not.toBeCloseTo(slid, 6);
  });

  // P281: and the chain's own half of that, which the blocks are the first pass to need.
  it("hands every pass a smoothing context, whichever pass wrote that surface before it", () => {
    vi.stubGlobal("devicePixelRatio", 2);
    const at = paintedOn(128, 64, [row({ period: 4 })]).elements.length;
    // The chain has two surfaces and hands each slot the one its own place lands on, so a rack of
    // `[crush, crush, reverb]` puts the bloom back on the surface the first crush unsmoothed. The
    // halo is blurred there and not drawn nearest-neighbour, which is the chain's reset and not the
    // bloom's business.
    vi.stubGlobal("devicePixelRatio", 2);
    const stacked = paintedOn(128, 64, [row({ period: 4 })], 2, WINDOW, {
      looks: [
        look("blocks", { block: 0, levels: 0 }),
        look("blocks", { block: 0, levels: 0 }, "second"),
        look("bloom", { amount: 1, radius: 1 }, "after"),
      ],
    });
    const shared = stacked.surfaces[at]?.drew ?? [];
    expect(shared).toHaveLength(BLOCK_HARDENINGS + 5);
    expect(shared.slice(-3).map((each) => each.smooth)).toEqual([true, true, true]);
  });

  // P104: the tile is where a harmonic-rich profile is actually sampled, and a profile whose mean
  // moved would make the picture's brightness say which effects a yard holds (0143).
});
