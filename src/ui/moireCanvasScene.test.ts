/**
 * @role Tests that the picture is the field its yard's name says: that two yards named for
 *   different plants lay down different tiles, that two differing only in the thing they stand by
 *   do too (0335), that every row still cuts a grating whatever the scene, and that a scene's
 *   ground is written on a rebuild and never on a frame (0329).
 * @instead Every other case the painter has → src/ui/moireCanvas.test.ts, which this stands beside
 *   rather than inside because that file is within forty lines of the 800-line hard cap (0045).
 *   The reading these paint through → src/lib/yardScene.ts. The grounds themselves →
 *   src/ui/scene/.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { TAU } from "@/lib/moire";
import { SCENE_NAMES, SCENE_REACHES, SCENE_STANDS, SCENE_WIND_TERMS } from "@/lib/moireScene";
import { moireRow as row } from "@/lib/moireRow";
import { resetTuning, setTuning } from "@/lib/moireTuning";
import { type YardScene, yardScene, YARD_SCENE_REST } from "@/lib/yardScene";
import { painterOn, type Painted } from "@/ui/moireCanvasPainted";
import { termTurns } from "@/ui/moireScreen";
import { beatPx, filmStand, gridPitchPx, rowPitchPx, SCREEN_FLOOR } from "@/ui/moireScreenTile";

/**
 * How many islands of lifted pixels a tile holds: a flood fill four ways over the marks, which is
 * what tells one kept thing from a flock of the scene's own — a count of lit pixels cannot, two
 * pictures being able to light the same number of them in one patch or in fifty.
 */
function countIslands(marks: readonly boolean[], wide: number): number {
  const seen = new Set<number>();
  let islands = 0;
  for (const [at, lit] of marks.entries()) {
    if (!lit || seen.has(at)) continue;
    islands += 1;
    const open = [at];
    while (open.length > 0) {
      const here = open.pop() ?? 0;
      if (seen.has(here) || marks[here] !== true) continue;
      seen.add(here);
      if (here % wide > 0) open.push(here - 1);
      if (here % wide < wide - 1) open.push(here + 1);
      open.push(here - wide, here + wide);
    }
  }
  return islands;
}

/** The recorder, bound to this file's own way of stubbing a global (src/ui/moireCanvasPainted.ts). */
const paintedOn = painterOn((name, value) => {
  vi.stubGlobal(name, value);
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetTuning();
});

/** The rows every painting here is made of: one claiming row, and the deck's own reference. */
const ROWS = [row({ period: 3 }), row({ period: 4, phase: 1, reference: true })];

/**
 * The screen's own tile out of one painting: the surface a beat cell wide, which is the only one
 * the screen writes a pixel field into (`beatPx`, src/ui/moireScreenTile.ts). Exactly one write, which
 * is the rule the third case below is about — the loop over a tile's pixels runs on a rebuild and
 * never on a frame (0129).
 */
function tileOf(painted: Painted): Uint8ClampedArray {
  const wide = beatPx(gridPitchPx(2));
  const written = painted.surfaces.flatMap((surface, at) =>
    painted.elements[at]?.width === wide ? surface.wrote : [],
  );
  expect(written).toHaveLength(1);
  return written[0]?.data ?? new Uint8ClampedArray();
}

/** One painting of a yard reading as `yard`, on a display of two device pixels to the CSS one. */
function paintingOf(yard: Readonly<YardScene>, high = 128): Painted {
  vi.stubGlobal("devicePixelRatio", 2);
  return paintedOn(200, high, ROWS, 2, 20, { yard });
}

/**
 * A canvas exactly one row beat cell tall: the one height at which the tile written is the tile
 * shown, so a stand's own field is the whole of it and the thing standing in it stands once
 * (`standDown`, 0335). A shorter strip holds a fraction of a tile and the shade repeats inside it,
 * which is a picture with two walls in it and no way to count one thing.
 */
const WHOLE_TILE = beatPx(rowPitchPx(2));

/** How bright one pixel of a tile is read, ink alone: the alpha is the film's and never the scene's. */
const brightOf = (pixels: Uint8ClampedArray, at: number): number =>
  ((pixels[at] ?? 0) + (pixels[at + 1] ?? 0) + (pixels[at + 2] ?? 0)) / 3;

/** The mean ink of the rows from `top` to `foot` of a tile `wide` device pixels across. */
function bandOf(pixels: Uint8ClampedArray, wide: number, top: number, foot: number): number {
  let total = 0;
  for (let at = top * wide * 4; at < foot * wide * 4; at += 4) total += brightOf(pixels, at);
  return total / ((foot - top) * wide);
}

// One flat list of the scene's cases, all painted through the one stand-in canvas (0007).
// oxlint-disable-next-line max-lines-per-function
describe("the picture is the field its name says", () => {
  it("lays down a different tile for every plant a yard could be named for", () => {
    // The whole of the step: a rack of yards is a rack of fields, and which field is read off the
    // name and nothing else (0329). Four names, one plant per field, drawn through the reading itself and never through a scene
    // handed in: what the step claims is that a *name* picks the picture.
    const named = ["Heather", "Foxglove", "Reed", "Willow"].map((plant) =>
      yardScene(`Quiet ${plant} by the Shed`),
    );
    expect(named.map((yard) => yard.scene)).toEqual([...SCENE_NAMES]);
    // Every one against every other, and never one against the rest: two scenes that happened to
    // agree would hide inside a set comparison of four.
    const tiles = named.map((yard) => tileOf(paintingOf(yard)));
    for (const [at, tile] of tiles.entries()) {
      for (const other of tiles.slice(at + 1)) expect(tile).not.toEqual(other);
    }
  });

  it("lays a different tile for every thing a yard could stand by, and for every reach", () => {
    // The place reads (0335): the noun is one large thing drawn as the shade it casts on whichever
    // field the plant named, and the joining word is how close the frame stands to it. Two yards
    // differing only in their noun are two pictures, so both halves are part of what a tile is
    // *of* — a key that carried neither would hand the second yard the first one's tile
    // (`screenOf`, src/ui/moireScreen.ts). Written here rather than beside the screen's own cases
    // because that file stands at the 800-line hard cap, which is what this file is for (0045).
    const stood = SCENE_STANDS.map((stand) => tileOf(paintingOf({ ...YARD_SCENE_REST, stand })));
    for (const [at, tile] of stood.entries()) {
      for (const other of stood.slice(at + 1)) expect(tile).not.toEqual(other);
    }
    // Through a picture no other case here paints, because the painter holds its tiles by what
    // they are of: a reading already drawn is answered out of that cache and writes no tile at all.
    const reached = SCENE_REACHES.map((reach) =>
      tileOf(paintingOf({ ...YARD_SCENE_REST, scene: "bloom", stand: "steps", reach })),
    );
    for (const [at, tile] of reached.entries()) {
      for (const other of reached.slice(at + 1)) expect(tile).not.toEqual(other);
    }
    // And the shade is spent on the ramp and never on the alpha, like everything else a name says
    // (0332): a yard standing by a wall keeps exactly the ink a yard standing by a grille does.
    const keeps = stood.map((pixels) => {
      let total = 0;
      for (let at = 3; at < pixels.length; at += 4) total += (pixels[at] ?? 0) / 255;
      return total / (pixels.length / 4);
    });
    for (const [at, keep] of keeps.entries()) {
      expect(keep, `${SCENE_STANDS[at]} spends the film's own alpha`).toBeCloseTo(
        keeps[0] ?? 0,
        12,
      );
      expect(keep, `${SCENE_STANDS[at]} takes the picture under the floor`).toBeGreaterThan(
        SCREEN_FLOOR,
      );
    }
  });

  it("still aims one grating per row whatever the scene, and lays the screen down once", () => {
    // A scene is a ground and a ramp and never a second painter: the rows, the looks and the
    // lattice reach it untouched, so what a painting is made of cannot move with the name.
    // In one strip, so this counts the scenes and not the strips the yard's own gust travels
    // across, which is the case below.
    setTuning("wind.strips", 1);
    for (const scene of SCENE_NAMES) {
      const painted = paintingOf({ ...YARD_SCENE_REST, scene });
      expect(painted.aims, scene).toHaveLength(ROWS.length);
      expect(
        painted.laid.filter((each) => each.over === "source-over"),
        scene,
      ).toHaveLength(1);
    }
  });

  it("cuts the fill into a strip per turn of the gust, and fills once where there is no wind in it", () => {
    // The gust travels: the lean is one number for the whole tile, so the only place it can vary
    // across the picture is between one fill and the next (0331 — a pattern transform is affine).
    // A wind with nothing to gust is the one fill every frame made before this.
    const strips = 5;
    setTuning("wind.strips", strips);
    setTuning("screen.shear", 0.03);
    const still = paintingOf({ ...YARD_SCENE_REST, wind: "still" });
    expect(still.laid.filter((each) => each.over === "source-over")).toHaveLength(1);
    const wild = paintingOf({ ...YARD_SCENE_REST, wind: "wild" });
    expect(wild.laid.filter((each) => each.over === "source-over")).toHaveLength(strips);
    // And each strip is one strip of the wave further on than the one beside it, the wave coming
    // round exactly once across the picture: the shear the sway writes is what every strip stands
    // on, and the gust is what it is leaned by on top of that.
    // Read against the still yard's one placement, which cancels the turn the same rows write into
    // the same term: what is left is the sway the wind was widened by, plus the gust on top of it.
    // Counted before it is walked: a loop over an empty list asserts nothing, and the shear per
    // strip is the half of this case the step names (principle 5).
    expect(wild.screened).toHaveLength(strips);
    expect(still.screened).toHaveLength(1);
    const shear = TAU * 0.03;
    const turns = termTurns(ROWS, "shear");
    const [placed] = still.screened;
    if (placed === undefined) throw new Error("the still yard placed no screen to read against");
    const stood = placed.c;
    const swung =
      (SCENE_WIND_TERMS.wild.sway - SCENE_WIND_TERMS.still.sway) * Math.sin(TAU * turns);
    // How far the wave swings is read off the strip standing furthest from rest rather than pinned
    // at the wind's own amount: on a tall picture the swing is bounded by the tile's own beat cell
    // so that a boundary stays a lean and never becomes a line. What this case is about is that the
    // strips sample one wave, one strip of it apart, and that the swing is real and no wider than
    // the yard asked for.
    const bows = wild.screened.map((move) => move.c - stood - swung * shear);
    const lead = bows.reduce(
      (most, bow, at) => (Math.abs(bow) > Math.abs(bows[most] ?? 0) ? at : most),
      0,
    );
    const swing = (bows[lead] ?? 0) / Math.sin(TAU * (turns + lead / strips));
    expect(Math.abs(swing)).toBeGreaterThan(0);
    expect(Math.abs(swing)).toBeLessThanOrEqual(SCENE_WIND_TERMS.wild.gust * shear);
    for (const [at, bow] of bows.entries()) {
      expect(bow, `strip ${at}`).toBeCloseTo(swing * Math.sin(TAU * (turns + at / strips)), 10);
    }
  });

  it("bakes the ground again when the number it was baked under moves", () => {
    // A scene's constants are tunables argued on the bench (0247), and they are read *inside* the
    // build — so the tile they are baked into has to stop being the tile the cache answers with the
    // moment one of them moves, or the slider is inert everywhere but the bench
    // (src/lib/moireTuning.ts @instead: a number a tile is baked under). One counter in the key,
    // bumped on every tuning, is what says so.
    // A reading no other case here paints, so the first tile is built rather than answered out of
    // the cache and only the second one is about the counter.
    const yard = yardScene("Quiet Heather by the Gate in Frost");
    const first = tileOf(paintingOf(yard));
    setTuning("meadow.fibre", 4);
    expect(tileOf(paintingOf(yard))).not.toEqual(first);
    resetTuning();
    expect(tileOf(paintingOf(yard))).toEqual(first);
  });

  it("spends the film's own share of the tile's alpha and no more", () => {
    // Step 1 of the film block (0339): the four keep terms are eased toward one by `film.share`,
    // once over their product, so at nought the film spends nothing and the scene stands solid at
    // the caller's own alpha, and at one the tile is exactly what 0332 baked. Every reading here
    // names its own share, because the rest is 0.15 and neither end of the dial.
    // A yard no other case here paints, so the first tile is built rather than answered out of
    // the cache the tunings clear (`tiles`, src/ui/moireScreenTile.ts).
    const yard = yardScene("Quiet Foxglove by the Old Wall");
    // At a share of one, which is what 0332 baked before the dial: the film cuts, so the tile's
    // alpha is not one number.
    setTuning("film.share", 1);
    const full = tileOf(paintingOf(yard));
    setTuning("film.share", 0);
    const none = tileOf(paintingOf(yard));
    const alphas = new Set<number>();
    for (let at = 3; at < none.length; at += 4) alphas.add(none[at] ?? -1);
    expect([...alphas], "the film still spends alpha at a share of nought").toHaveLength(1);
    const solid = [...alphas][0] ?? 0;
    expect(solid, "the scene stands at no alpha at all").toBeGreaterThan(0);
    expect(
      new Set(full.filter((_, at) => at % 4 === 3)).size,
      "the film cuts nothing",
    ).toBeGreaterThan(1);
    // And between: more of every pixel the film cuts stands, and exactly as much of every pixel it
    // does not. The strict half is asked of a cut of two levels and up, because a cut of one level
    // is a rounding of the byte and not a reading of the share.
    setTuning("film.share", 0.5);
    const half = tileOf(paintingOf(yard));
    for (let at = 3; at < full.length; at += 4) {
      const stood = full[at] ?? 0;
      const cut = solid - stood;
      if (cut === 0) expect(half[at], `pixel ${at}`).toBe(stood);
      else if (cut >= 2) expect(half[at] ?? 0, `pixel ${at}`).toBeGreaterThan(stood);
      else expect(half[at] ?? 0, `pixel ${at}`).toBeGreaterThanOrEqual(stood);
    }
    // And a share of one is what the tile was before the dial: the ease is the identity there,
    // and at nought it leaves the whole pixel, which is what the two ends above are ends of.
    for (const keep of [0, 0.37, 0.6, 1]) {
      expect(filmStand(keep, 1), `keep ${keep}`).toBe(keep);
      expect(filmStand(keep, 0), `keep ${keep}`).toBe(1);
    }
    // The colour is the scene's and the share is the film's: what a share moves is the alpha alone.
    for (let at = 0; at < full.length; at += 4) {
      expect([none[at], none[at + 1], none[at + 2]], `pixel ${at}`).toEqual([
        full[at],
        full[at + 1],
        full[at + 2],
      ]);
    }
  });

  it("lays down a bloom whose pixels span more than one of its own stops", () => {
    // The whole of 0332 through the painter: the bloom's ramp is read per pixel, so one tile holds
    // a scarlet head and a green stem at full strength — and not one ink the ground dimmed. The
    // stops are src/ui/scene/bloom.ts's own, resolved by the recorder (`resolvedInk`).
    const pixels = tileOf(paintingOf(yardScene("Quiet Foxglove by the Shed")));
    let heads = 0;
    let stems = 0;
    for (let at = 0; at < pixels.length; at += 4) {
      const red = pixels[at] ?? 0;
      const green = pixels[at + 1] ?? 0;
      if (red > green + 60) heads += 1;
      if (green > red + 60) stems += 1;
    }
    // A twentieth of the tile each way: a picture with a handful of red pixels in it is a fringe,
    // and what this claims is a field of heads standing in a field of stems.
    const share = pixels.length / 4 / 20;
    expect(heads, "the bloom has no heads").toBeGreaterThan(share);
    expect(stems, "the bloom has no stems").toBeGreaterThan(share);
    // And the meadow, painted through the same recorder, is not that picture: the two grounds read
    // their own ramps and neither is the other's.
    const meadow = tileOf(paintingOf(yardScene("Quiet Heather by the Shed")));
    expect(meadow).not.toEqual(pixels);
  });

  it("lets a light fall through the field from the tile's top edge and washes one alike", () => {
    // The air's joining word (0324): a field stood *in* its light is washed by it, and a field seen
    // *through* one has that light fall through it — strongest where the field is thinnest, which
    // is the tile's top edge, and nought at the foot of the fall. The foot is the tile's own middle
    // rather than its bottom row, because a fall down a picture that never repeats is a bright line
    // at every join (0334) — and the fall is spent on where the read stands rather than on the ink,
    // so it is read along the scene's own five stops and no second interpolation is paid.
    const wide = beatPx(gridPitchPx(2));
    const read = (word: string): { top: number; middle: number } => {
      const pixels = tileOf(
        paintingOf(yardScene(`Quiet Heather by the Shed ${word} Falling Dusk`)),
      );
      const high = pixels.length / 4 / wide;
      return {
        top: bandOf(pixels, wide, 0, Math.round(high / 8)),
        middle: bandOf(pixels, wide, Math.round(high * 0.44), Math.round(high * 0.56)),
      };
    };
    const fall = read("through");
    const wash = read("in");
    expect(fall.top, "a fall does not light the tile's top edge").toBeGreaterThan(fall.middle);
    // Against the same field washed, and not against a bar of its own: every ground already falls
    // back at its own middle, so what is claimed is the *further* fall the air brought.
    expect(fall.top - fall.middle, "the fall is the ground's own").toBeGreaterThan(
      (wash.top - wash.middle) * 1.5,
    );
  });

  it("stands one kept thing in a tile and a flock of the scene's own all over it", () => {
    // The detail (0335's step after it): a creature fills the field with the bright points the
    // scene already has, and an object is one of them — larger, sharper, and at the foot of the
    // shade whatever the yard stands by casts. Painted on a canvas exactly one tile tall, so the
    // shade's field is the whole tile and there is one wall to stand a thing at the foot of.
    const wide = beatPx(gridPitchPx(2));
    const of = (detail: string): Uint8ClampedArray =>
      tileOf(paintingOf(yardScene(`Quiet Heather by the Old Wall${detail}`), WHOLE_TILE));
    const own = of("");
    const lifted = (pixels: Uint8ClampedArray): boolean[] => {
      const marks: boolean[] = [];
      for (let at = 0; at < pixels.length; at += 4) {
        marks.push(brightOf(pixels, at) > brightOf(own, at) + 20);
      }
      return marks;
    };
    const kept = lifted(of(" with a Bell"));
    const flock = lifted(of(" with Sparrows"));
    // One island: every lifted pixel reached from any other of them, four ways, and none left over.
    const islands = countIslands(kept, wide);
    expect(kept.filter(Boolean).length, "a kept thing stands nowhere").toBeGreaterThan(4);
    expect(islands, "a kept thing is not one island").toBe(1);
    // And a flock is the opposite picture: many points, spread over the tile.
    expect(countIslands(flock, wide), "a flock is one island").toBeGreaterThan(islands * 4);
    expect(
      flock.filter(Boolean).length,
      "a flock stands on no more than one kept thing",
    ).toBeGreaterThan(kept.filter(Boolean).length);
  });

  it("writes the ground on a rebuild and never on a frame", () => {
    // The one rule a per-pixel pass in this picture lives under (0129): the loop over the tile's
    // pixels runs when what the tile is *of* moves, and four frames of a playing deck move the
    // screen on its transform instead. A scene is part of what the tile is of, so it is keyed and
    // not drawn again.
    vi.stubGlobal("devicePixelRatio", 2);
    const rows = ROWS.map((each) => Object.assign({}, each));
    const painted = paintedOn(200, 128, rows, 2, 20, {
      frames: 4,
      advance: 0.05,
      yard: yardScene("Wild Willow past the Gate in Falling Dusk"),
    });
    expect(tileOf(painted)).not.toHaveLength(0);
  });
});
