/**
 * @role Tests the chain the looks are drawn through: every standing look that takes a slot, in rack
 *   order, each pass reading one surface and writing the other — and, per look, that its one draw is
 *   a draw of the field and never a fill over it (0269, 0279).
 * @instead The cut the chain hands its picture to — the lens, the shatter and the warp →
 *   src/ui/moireCanvasField.test.ts, which this split out of at the 800-line hard cap (0045, 0289)
 *   and whose file this one tests the other half of. What each look's terms answer →
 *   src/lib/moireLook.test.ts. The chain itself → `passLooks` in src/ui/moireCanvasField.ts.
 */
// One flat list of the chain's cases, one per look plus the two the chain itself owes (0007).
// oxlint-disable max-lines
// And the same waiver for the count of its imports: a case per look reaches whichever module that
// look is declared in, and the looks that stand in files of their own are four of thirteen now
// (0287, 0288, 0289, 0294). Shedding an import here would mean testing a pass away from the chain
// that runs it. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ECHO_CAP,
  ECHO_CEILING,
  ECHO_FADE,
  ECHO_SPACING,
  echoCeiling,
  echoCount,
  echoSpacing,
} from "@/lib/moireEchoes";
import {
  BLOCK_HARDENINGS,
  BLOCK_PIXELS,
  BLOOM_CEILING,
  GRAIN_CEILING,
  LOOKS,
  SHARPEN_CEILING,
  SHARPEN_SCALE,
  WOBBLE_CEILING,
  wobbleSlide,
  type Look,
  type LookName,
  type LookTerms,
} from "@/lib/moireLook";
import { LENS_SLICES } from "@/lib/moireGeometry";
import { BAND_CEILING, BAND_EDGES } from "@/lib/moireBand";
import { DOUBLE_CEILING, doubleAmount, doubleZoom } from "@/lib/moireDouble";
import { squashCeiling, squashFloor } from "@/lib/moireSquash";
import { GRAIN_TILE } from "@/lib/moireGrain";
import { moireRow as row } from "@/lib/moireRow";
import { painterOn, PRODUCT, WINDOW, type Painted } from "@/ui/moireCanvasPainted";
import { baked, look } from "@/ui/moireCanvasReadings";

/** The recorder, bound to this file's own way of stubbing a global (src/ui/moireCanvasPainted.ts). */
const paintedOn = painterOn((name, value) => {
  vi.stubGlobal(name, value);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * One painting of the standard field whose screen tile is already in hand: the first painting is
 * what bakes it and the second is what the case reads. **A look that declares a pass over the cells
 * is part of what a tile is *of*** (0349), so a rack holding a delay or a reverb bakes a tile of its
 * own — and a case that counts the canvases a chain makes cannot be handed a painting that is also
 * building one. Every other case here stands a look that declares no such pass and needs none of
 * this.
 */
const settled = (options: Parameters<typeof paintedOn>[5] = {}): Painted => {
  vi.stubGlobal("devicePixelRatio", 2);
  paintedOn(128, 64, [row({ period: 4 })], 2, WINDOW, options);
  vi.stubGlobal("devicePixelRatio", 2);
  return paintedOn(128, 64, [row({ period: 4 })], 2, WINDOW, options);
};

/** What a painting laid down that was not the rows' own product: the screen's own fills, in order. */
const fills = (painted: Painted): string[] =>
  painted.laid.filter((each) => each.ink !== PRODUCT).map((each) => each.over);

// One flat list of the chain's cases (0007).
// oxlint-disable-next-line max-lines-per-function
describe("the chain of passes", () => {
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
    const plain = settled();
    const bloomed = settled({ looks: [look("bloom", { amount: 1, radius: 1 })] });
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
    expect(pass?.drew[1]?.alpha).toBeCloseTo(BLOOM_CEILING.value, 10);
    expect(pass?.drew[2]?.alpha).toBe(1);
    // A room at no wet at all draws the field once and leaves the picture exactly where it was.
    const dry = settled({
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
    // Draws of what is already drawn: no fill over the picture (0269) and no pixel written.
    expect(pass?.fills).toEqual([]);
    expect(pass?.wrote).toEqual([]);
    // The field down onto its own grid, that grid back up over the whole surface, and the result
    // masked by itself once per lost bit — at one bit, the cap.
    const hardenings = Array.from({ length: BLOCK_HARDENINGS.value }, () => "destination-in");
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
    const plain = settled();
    const at = plain.elements.length;
    const echoed = settled({
      looks: [look("echoes", { spacing: 1, count: 1, fade: 1 })],
      wind: { blown: 1, lean: 0, veer: 1 },
    });
    const pass = echoed.surfaces[at];
    const field = echoed.elements[0];
    const wide = field?.width ?? 0;
    // Draws of what is already drawn: no fill over the picture (0269) and no pixel written.
    expect(pass?.fills).toEqual([]);
    expect(pass?.wrote).toEqual([]);
    // The field itself, and then the field again once per repeat — every one of them the field's
    // own surface and never the pass's, because a repeat of a repeat is a smear.
    expect(pass?.drew).toHaveLength(1 + ECHO_CAP.value);
    expect(pass?.drew.every((each) => each.tile === field)).toBe(true);
    expect(pass?.drew.every((each) => each.over === "source-over")).toBe(true);
    // Spaced along the wind, one step further every repeat, and the whole ladder inside the field.
    const step = echoSpacing(1) * wide;
    expect(pass?.drew.map((each) => each.box)).toEqual([
      [0, 0],
      ...Array.from({ length: ECHO_CAP.value }, (_each, echo) => [step * (echo + 1), 0]),
    ]);
    expect(step * ECHO_CAP.value).toBeLessThan(wide);
    // And fading geometrically behind it: the picture at the whole of itself, and every repeat the
    // last one's share of what stood in front of it.
    expect(pass?.drew[0]?.alpha).toBe(1);
    for (let echo = 1; echo <= ECHO_CAP.value; echo++) {
      expect(pass?.drew[echo]?.alpha).toBeCloseTo(
        ECHO_CEILING.value * ECHO_FADE[1] ** (echo - 1),
        10,
      );
    }
    // The wind blowing the other way walks the same ladder the other way, which is one picture
    // turning round rather than two pictures.
    const back = settled({
      looks: [look("echoes", { spacing: 1, count: 1, fade: 1 })],
      wind: { blown: 1, lean: 0, veer: -1 },
    });
    expect(back.surfaces[at]?.drew[1]?.box).toEqual([-step, 0]);
    // A delay the picture has not travelled to draws the field once and leaves it where it was.
    const absent = settled({
      looks: [{ ...look("echoes", { spacing: 1, count: 1, fade: 1 }), at: 0 }],
      wind: { blown: 1, lean: 0, veer: 1 },
    });
    expect(absent.surfaces[at]?.drew).toHaveLength(1);
    expect(fills(absent)).toEqual(fills(plain));
    // And a delay at its own knobs' bottom is still a repeat, at the count and fade they state.
    const one = settled({
      looks: [look("echoes", { spacing: 0, count: 0, fade: 0 })],
      wind: { blown: 1, lean: 0, veer: 1 },
    });
    expect(one.surfaces[at]?.drew).toHaveLength(1 + echoCount(0));
    expect(one.surfaces[at]?.drew[1]?.alpha).toBeCloseTo(ECHO_CEILING.value, 10);
    expect(one.surfaces[at]?.drew[1]?.box).toEqual([ECHO_SPACING[0] * wide, 0]);
    // And a wind standing still draws the field once and nothing behind it. The ladder is gathered
    // onto the field it came from at a veer of nought, and three copies of a hole mask laid exactly
    // over each other are the picture composed with itself — every window in it hazed evenly, which
    // is the one thing a pass may not do (0269). So the ladder fades by the same number that
    // gathers it, and this is the frame where that number is nought.
    const still = settled({
      looks: [look("echoes", { spacing: 1, count: 1, fade: 1 })],
      wind: { blown: 1, lean: 0, veer: 0 },
    });
    expect(still.surfaces[at]?.drew).toHaveLength(1);
    expect(still.surfaces[at]?.drew[0]?.alpha).toBe(1);
    expect(fills(still)).toEqual(fills(plain));
    // And a wind halfway round is a ladder halfway out: the repeats stand closer to the field and
    // are fainter for it, rather than gathering onto it at the whole of their own alpha.
    const turning = settled({
      looks: [look("echoes", { spacing: 1, count: 1, fade: 1 })],
      wind: { blown: 1, lean: 0, veer: 0.5 },
    });
    expect(turning.surfaces[at]?.drew[1]?.box).toEqual([step / 2, 0]);
    expect(turning.surfaces[at]?.drew[1]?.alpha).toBeCloseTo(ECHO_CEILING.value / 2, 10);
    // P294: and two delays are two ladders in two slots, sharing one ceiling's worth of ink. Each
    // pass still draws its own repeats — 0279's rule, and what makes two of a kind twice as much of
    // the thing — but each first rung stands at the share that leaves the same picture untouched
    // once both of them have been laid over it, so a second delay is more repeats and never a
    // paler strip.
    const two = settled({
      looks: [
        look("echoes", { spacing: 1, count: 1, fade: 1 }, 1, "one"),
        look("echoes", { spacing: 1, count: 1, fade: 1 }, 1, "two"),
      ],
      wind: { blown: 1, lean: 0, veer: 1 },
    });
    const rungs = [
      two.surfaces[at]?.drew[1]?.alpha ?? 0,
      two.surfaces[at + 1]?.drew[1]?.alpha ?? 0,
    ];
    expect(two.surfaces[at]?.drew).toHaveLength(1 + ECHO_CAP.value);
    expect(two.surfaces[at + 1]?.drew).toHaveLength(1 + ECHO_CAP.value);
    for (const rung of rungs) expect(rung).toBeCloseTo(echoCeiling(2), 10);
    expect(1 - (1 - rungs[0]!) * (1 - rungs[1]!)).toBeCloseTo(ECHO_CEILING.value, 10);
    expect(rungs[0]).toBeLessThan(ECHO_CEILING.value);
    // And neither of them fills over the picture on the way: the bound is on a number the passes are
    // handed, not on a wash laid across what they drew (0129, 0269).
    expect(two.surfaces[at]?.fills).toEqual([]);
    expect(two.surfaces[at + 1]?.fills).toEqual([]);
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
    // Draws of what is already drawn: no fill over the picture (0269) and no pixel written.
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
    expect(pass?.drew[2]?.alpha).toBeCloseTo(SHARPEN_CEILING.value, 10);
    expect(pass?.drew[3]?.alpha).toBe(1);
    // The copy is taken at the mask's own working size, which is one number and not a term: pop
    // declares two terms and neither of them is a radius.
    const wide = field?.width ?? 0;
    expect(pass?.drew[1]?.box.slice(0, 2)).toEqual([0, 0]);
    expect(pass?.drew[0]?.box[2]).toBe(Math.round(wide * SHARPEN_SCALE.value));
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
    const slid = WOBBLE_CEILING.value * wide * wobbleSlide(0, 0, LENS_SLICES);
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
    expect(grained[0]?.alpha).toBeCloseTo(GRAIN_CEILING.value, 10);
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

  // P287: eq's band, and the one pass whose two composites are one pair — the shot's way round.
  it("stands one slice of the field over itself, lit or quieted, and never fills over it", () => {
    vi.stubGlobal("devicePixelRatio", 2);
    const plain = paintedOn(128, 64, [row({ period: 4 })]);
    const at = plain.elements.length;
    vi.stubGlobal("devicePixelRatio", 2);
    const terms = { position: 0.5, lift: 1, width: 0 };
    const lit = paintedOn(128, 64, [row({ period: 4 })], 2, WINDOW, {
      looks: [look("band", terms)],
    });
    const pass = lit.surfaces[at];
    const field = lit.elements[0];
    // Draws of what is already drawn and nothing else: no fill over the picture, which would haze
    // every window in it evenly (0269), and no pixel written. **A band that is a fill is the thing
    // 0269 refuses**, so both ways round are draws of the field's own slice.
    expect(pass?.fills).toEqual([]);
    expect(pass?.wrote).toEqual([]);
    // The field itself, and then its own slice once per step of the taper — every draw off the
    // field and none off the surface being written, and every one of the taper's steps drawn.
    const drew = pass?.drew ?? [];
    expect(drew).toHaveLength(1 + BAND_EDGES.value);
    expect(drew.map((each) => each.tile)).toEqual(Array.from(drew, () => field));
    expect(drew.map((each) => each.over)).toEqual([
      "source-over",
      ...Array.from({ length: BAND_EDGES.value }, () => "destination-out"),
    ]);
    expect(drew[0]?.alpha).toBe(1);
    for (const step of drew.slice(1)) {
      expect(step.alpha).toBeCloseTo(BAND_CEILING.value / BAND_EDGES.value, 10);
    }
    // Each slice is taken from exactly where it is laid, which is what makes the band the field's
    // own rows rather than a bar over them, and each is shallower than the one before it and never
    // thinner than a row — a band under its own taper is one row at the whole of the alpha.
    let last = Number.POSITIVE_INFINITY;
    for (const step of drew.slice(1)) {
      expect(step.box.slice(0, 4)).toEqual([0, step.box[5], field?.width, step.box[7]]);
      expect(step.box[3]).toBe(step.box[7]);
      expect(step.box[3]).toBeGreaterThanOrEqual(1);
      expect(step.box[3]).toBeLessThanOrEqual(last);
      last = step.box[3] ?? 0;
    }
    // And a cut is the same pass the other way round: the same slices at the same alpha, drawn with
    // the composite that closes the mask instead of the one that opens it (0287).
    vi.stubGlobal("devicePixelRatio", 2);
    const quiet = paintedOn(128, 64, [row({ period: 4 })], 2, WINDOW, {
      looks: [look("band", { ...terms, lift: 0 })],
    });
    const cut = quiet.surfaces[at]?.drew ?? [];
    expect(cut.map((each) => each.over)).toEqual(Array.from(cut, () => "source-over"));
    expect(cut.map((each) => each.box)).toEqual(drew.map((each) => each.box));
    expect(cut.map((each) => each.alpha)).toEqual(drew.map((each) => each.alpha));
    // On a field shorter than its own taper — the strip is thirty-two rows, and the narrow end of
    // the Q is a twenty-fourth of that — every step still draws, one row deep, so how hard a band
    // is drawn never depends on where its own frequency happened to round (0287).
    // A tile is held by what it is of, and since 0335 that includes the canvas's own height — the
    // shade a yard's place noun casts is placed in what is *shown* of a tile rather than in the
    // whole of it. So the first painting at a new height builds a tile and the next one does not,
    // and the two paintings below have to be counted from the same cache: this one warms it, so
    // that `flat` and `thin` create the same surfaces and the index into them still lines up.
    vi.stubGlobal("devicePixelRatio", 2);
    paintedOn(128, 16, [row({ period: 4 })]);
    vi.stubGlobal("devicePixelRatio", 2);
    const flat = paintedOn(128, 16, [row({ period: 4 })]);
    vi.stubGlobal("devicePixelRatio", 2);
    const thin = paintedOn(128, 16, [row({ period: 4 })], 2, WINDOW, {
      looks: [look("band", { ...terms, width: 1 })],
    });
    const steps = thin.surfaces[flat.elements.length]?.drew ?? [];
    expect(steps).toHaveLength(1 + BAND_EDGES.value);
    for (const step of steps.slice(1)) expect(step.box[3]).toBe(1);
    // A band standing at flat, and one the picture has not travelled to yet, are both the field it
    // came from — and one draw is what says so.
    vi.stubGlobal("devicePixelRatio", 2);
    const arriving = paintedOn(128, 64, [row({ period: 4 })], 2, WINDOW, {
      looks: [{ ...look("band", terms), at: 0 }],
    });
    expect(arriving.surfaces[at]?.drew).toHaveLength(1);
    expect(fills(arriving)).toEqual(fills(plain));
  });

  // P288: compressor's squash, whose floor is the chain's one fill — a level laid where the mask has
  // none, which is where the picture's deepest ink stands, and which no draw of the field can be
  // (0269, 0288). Its ceiling is a draw like every other pass's.
  it("squashes the field's own alpha between a floor and a ceiling, the floor its one fill", () => {
    vi.stubGlobal("devicePixelRatio", 2);
    const plain = paintedOn(128, 64, [row({ period: 4 })]);
    const at = plain.elements.length;
    vi.stubGlobal("devicePixelRatio", 2);
    const terms = { floor: 1, ceiling: 0 };
    const squashed = paintedOn(128, 64, [row({ period: 4 })], 2, WINDOW, {
      looks: [look("squash", terms)],
    });
    const pass = squashed.surfaces[at];
    const field = squashed.elements[0];
    // The ceiling half is a draw of the field and not a fill, at the share that lands the top of
    // the range where the ceiling says once the floor is under it — off the field and not off the
    // surface being written, and drawn once.
    const top = squashCeiling(1, terms.ceiling);
    const floor = squashFloor(1, terms.floor);
    const drew = pass?.drew ?? [];
    expect(drew).toHaveLength(1);
    expect(drew[0]?.tile).toBe(field);
    expect(drew[0]?.over).toBe("source-over");
    expect(drew[0]?.alpha).toBeCloseTo((top - floor) / (1 - floor), 10);
    expect(pass?.wrote).toEqual([]);
    // And the floor is the one fill, laid under what that draw left. **This is the whole of the
    // exception this pass takes out of 0269** — one composite wide, and only for the half that
    // reaches the mask's own blank, which is where the picture's deepest ink stands.
    expect(pass?.fills.map((each) => each.over)).toEqual(["destination-over"]);
    expect(pass?.fills[0]?.alpha).toBeCloseTo(floor, 10);
    // A softer ratio lays a lower floor, and a higher threshold leaves more of the range: the draw
    // carries more of the field and the fill lays less under it.
    vi.stubGlobal("devicePixelRatio", 2);
    const gentle = paintedOn(128, 64, [row({ period: 4 })], 2, WINDOW, {
      looks: [look("squash", { floor: 0.25, ceiling: 0.75 })],
    });
    expect(gentle.surfaces[at]?.fills[0]?.alpha).toBeLessThan(pass?.fills[0]?.alpha ?? 0);
    expect(gentle.surfaces[at]?.drew[0]?.alpha).toBeGreaterThan(drew[0]?.alpha ?? 1);
    // A compressor at one to one, and one the picture has not travelled to yet, are both the field
    // it came from — the field at the whole of itself, and no fill over the picture at all.
    vi.stubGlobal("devicePixelRatio", 2);
    const arriving = paintedOn(128, 64, [row({ period: 4 })], 2, WINDOW, {
      looks: [{ ...look("squash", terms), at: 0 }],
    });
    expect(arriving.surfaces[at]?.drew).toHaveLength(1);
    expect(arriving.surfaces[at]?.drew[0]?.alpha).toBe(1);
    expect(arriving.surfaces[at]?.fills).toEqual([]);
    expect(fills(arriving)).toEqual(fills(plain));
  });

  // P289: shift's double, and the one pass that draws the field at a size other than its own.
  it("stands the field over itself at the interval's ratio about the centre, and never fills over it", () => {
    vi.stubGlobal("devicePixelRatio", 2);
    const plain = paintedOn(128, 64, [row({ period: 4 })]);
    const at = plain.elements.length;
    vi.stubGlobal("devicePixelRatio", 2);
    const terms = { zoom: 12, amount: 1 };
    const doubled = paintedOn(128, 64, [row({ period: 4 })], 2, WINDOW, {
      looks: [look("double", terms)],
    });
    const pass = doubled.surfaces[at];
    const field = doubled.elements[0];
    // Draws of what is already drawn: no fill over the picture (0269) and no pixel written.
    expect(pass?.fills).toEqual([]);
    expect(pass?.wrote).toEqual([]);
    // The field itself, and the field again over it — both draws off the field and neither off the
    // surface being written, the second at the amount and `source-over`.
    const drew = pass?.drew ?? [];
    expect(drew).toHaveLength(2);
    expect(drew.map((each) => each.tile)).toEqual([field, field]);
    expect(drew.map((each) => each.over)).toEqual(["source-over", "source-over"]);
    expect(drew[0]?.alpha).toBe(1);
    expect(drew[1]?.alpha).toBeCloseTo(doubleAmount(1, terms.amount), 10);
    expect(drew[1]?.alpha).toBeLessThanOrEqual(DOUBLE_CEILING.value);
    // At the ratio the interval states and **about the centre of the field**: a pass is handed the
    // finished picture and has no row's anchor to bake about (0278), so an octave up is twice the
    // size with a quarter of the picture hanging off each edge.
    const wide = field?.width ?? 0;
    const deep = field?.height ?? 0;
    expect(doubleZoom(terms.zoom)).toBe(2);
    expect(drew[1]?.box).toEqual([-wide / 2, -deep / 2, wide * 2, deep * 2]);
    // And a downward interval is the same draw the other way: a smaller picture inside the one it
    // doubles, at the same centre.
    vi.stubGlobal("devicePixelRatio", 2);
    const under = paintedOn(128, 64, [row({ period: 4 })], 2, WINDOW, {
      looks: [look("double", { ...terms, zoom: -12 })],
    });
    const inner = under.surfaces[at]?.drew[1];
    expect(inner?.box).toEqual([wide / 4, deep / 4, wide / 2, deep / 2]);
    // A shift at no mix, and one the picture has not travelled to yet, are both the field it came
    // from — one draw at the whole of itself, and nothing laid over the picture.
    vi.stubGlobal("devicePixelRatio", 2);
    const arriving = paintedOn(128, 64, [row({ period: 4 })], 2, WINDOW, {
      looks: [{ ...look("double", terms), at: 0 }],
    });
    expect(arriving.surfaces[at]?.drew).toHaveLength(1);
    expect(arriving.surfaces[at]?.drew[0]?.alpha).toBe(1);
    expect(fills(arriving)).toEqual(fills(plain));
  });

  // P285: every pass's own "at nothing it is the field it came from", said once over `LOOKS`
  // rather than once per case — so a pass landing after this one cannot forget it.
  // One case's length *is* the population it walks: nine passes at both ends of every term, and
  // splitting it would state one pass's zero away from the walk that finds it. Waived here and not
  // raised for the file. See docs/decisions/0007-reviewed-oversized-functions.md.
  // oxlint-disable-next-line max-lines-per-function
  it("draws the field once and leaves it exactly as it was, for every pass at no presence", () => {
    vi.stubGlobal("devicePixelRatio", 2);
    const plain = paintedOn(128, 64, [row({ period: 4 })]);
    const at = plain.elements.length;
    const passes = Object.entries(LOOKS).filter(([, each]) => each.at === "pass");
    // The chain's own population, and not a list written beside it: a look that takes a slot is a
    // look this case covers, which is what makes the property a registry-wide one (0279).
    expect(passes.length).toBeGreaterThan(0);
    // A pass drawn with `terms`, at the presence given — the chain's own surface, whatever it left.
    const drawnAt = (name: string, terms: LookTerms, presence: number) => {
      vi.stubGlobal("devicePixelRatio", 2);
      const painted = paintedOn(128, 64, [row({ period: 4 })], 2, WINDOW, {
        // oxlint-disable-next-line no-unsafe-type-assertion
        looks: [{ ...look(name as LookName, terms), at: presence }],
        // A wind the echoes would ride, so a pass that ignored its presence would have somewhere
        // to put its repeats.
        wind: { blown: 1, lean: 0, veer: 1 },
      });
      return { painted, pass: painted.surfaces[at] };
    };
    for (const [name, each] of passes) {
      // Both ends of every term the look declares, because a band is not the same way round for
      // all of them: the band's own width is widest at nought, where the bloom's amount is the
      // other way about. A pass is asserted at both, and what says
      // the presence is doing the work is that it is *active* at one of them (below) — otherwise a
      // pass that ignored its presence entirely would pass this case on the term's own rest.
      const ends = [0, 1].map((end) =>
        Object.fromEntries(Object.keys(each.terms).map((term) => [term, end])),
      );
      for (const terms of ends) {
        const { painted, pass } = drawnAt(name, terms, 0);
        const drew = pass?.drew ?? [];
        expect({ name, terms, drew: drew.length }).toEqual({ name, terms, drew: 1 });
        expect({ name, terms, alpha: drew[0]?.alpha }).toEqual({ name, terms, alpha: 1 });
        expect({ name, terms, over: drew[0]?.over }).toEqual({ name, terms, over: "source-over" });
        // And that one draw is the field itself, whole and where it stands: a pass that answered a
        // presence of nothing with a resized or displaced copy would draw once and still have
        // moved the picture.
        expect({ name, terms, field: drew[0]?.tile === painted.elements[0] }).toEqual({
          name,
          terms,
          field: true,
        });
        expect({ name, terms, box: drew[0]?.box }).toEqual({ name, terms, box: [0, 0] });
        // No pixel written, no fill laid — the squash's floor included, which is the one fill the
        // chain has and is a fill of nothing here (0288).
        expect({ name, terms, wrote: pass?.wrote }).toEqual({ name, terms, wrote: [] });
        expect({ name, terms, fills: pass?.fills }).toEqual({ name, terms, fills: [] });
        expect({ name, terms, fills: fills(painted) }).toEqual({
          name,
          terms,
          fills: fills(plain),
        });
      }
      // And the same look arrived, at whichever end its own band is open at, is more than the field
      // it came from: without this the case above is satisfied by a pass that never draws at all.
      // More draws, or the squash's own floor under them — which is one draw and one fill (0288).
      const standing = ends.map((terms) => {
        const { pass } = drawnAt(name, terms, 1);
        return (pass?.drew.length ?? 0) > 1 || (pass?.fills.length ?? 0) > 0;
      });
      expect({ name, standing: standing.some(Boolean) }).toEqual({ name, standing: true });
    }
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
        look("blocks", { block: 0, levels: 0 }, 1, "second"),
        look("bloom", { amount: 1, radius: 1 }, 1, "after"),
      ],
    });
    const shared = stacked.surfaces[at]?.drew ?? [];
    expect(shared).toHaveLength(BLOCK_HARDENINGS.value + 5);
    expect(shared.slice(-3).map((each) => each.smooth)).toEqual([true, true, true]);
  });
});
