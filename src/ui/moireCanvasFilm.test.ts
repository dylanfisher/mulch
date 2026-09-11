/**
 * @role Tests that the screen is a shade laid over the scene and no longer a window cut in it
 *   (0340, amending 0332): that the tile's alpha is the marks' coverage of the caller's own
 *   whatever `film.share` says (0345), that what the four keep terms take they take off the scene's own read
 *   toward its first stop, and that `SCREEN_FLOOR` — re-aimed at the lightness it now guards —
 *   still holds for every scene under the deepest shade the dial admits.
 * @instead Everything else the scene reads through the painter → src/ui/moireCanvasScene.test.ts,
 *   which this stands beside for the reason that one stands beside src/ui/moireCanvas.test.ts:
 *   the file it would go in has no room left under the line cap (0045). The terms themselves and
 *   the ease over them → src/lib/moireScreenFilm.ts. The bench that argues the share → entry 10,
 *   src/ui/sketch/drift/SketchDriftFilm.tsx.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { MOIRE_TUNE_GROUPS } from "@/lib/copyDriftGroups";
import { DRIFT_DISPERSE_REACH, DRIFT_FRINGE_REACH } from "@/lib/moire";
import { SCENE_NAMES, sceneRepeat } from "@/lib/moireScene";
import { moireRow as row } from "@/lib/moireRow";
import { resetTuning, setTuning, tunings } from "@/lib/moireTuning";
import { type YardScene, yardScene, YARD_SCENE_REST } from "@/lib/yardScene";
import { painterOn, type Painted, resolvedInk, tileOf as tileFrom } from "@/ui/moireCanvasPainted";
import { screenInkRest } from "@/ui/moireScreenInk";
import { sceneOf } from "@/lib/scene/scenes";
import {
  beatPx,
  filmStand,
  FILM_SHARE,
  gridPitchPx,
  rowPitchPx,
  screenKeep,
  SCREEN_FLOOR,
} from "@/lib/moireScreenFilm";

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

/** The screen's own tile out of one painting: the one surface a beat cell wide (`beatPx`). */
const tileOf = (painted: Painted): Uint8ClampedArray => tileFrom(painted, beatPx(gridPitchPx(2)));

/** One painting of a yard reading as `yard`, on a display of two device pixels to the CSS one. */
function paintingOf(yard: Readonly<YardScene>): Painted {
  vi.stubGlobal("devicePixelRatio", 2);
  return paintedOn(200, 128, ROWS, 2, 20, { yard });
}

/** How bright one pixel of a tile is read, ink alone — which is where the shade is now spent. */
const brightOf = (pixels: Uint8ClampedArray, at: number): number =>
  ((pixels[at] ?? 0) + (pixels[at + 1] ?? 0) + (pixels[at + 2] ?? 0)) / 3;

/** And the mean of that over a whole tile. */
function meanOf(pixels: Uint8ClampedArray): number {
  let total = 0;
  for (let at = 0; at < pixels.length; at += 4) total += brightOf(pixels, at);
  return total / (pixels.length / 4);
}

/** How much of the picture's ink a tile leaves standing, averaged over its pixels. */
const keptOf = (pixels: Uint8ClampedArray): number => {
  let total = 0;
  for (let at = 3; at < pixels.length; at += 4) total += (pixels[at] ?? 0) / 255;
  return total / (pixels.length / 4);
};

/** The centre pixel of the cell of `span` that `at` stands in, on an axis `limit` long. */
const centre = (at: number, span: number, limit: number): number =>
  Math.min(limit - 1, Math.floor((Math.floor(at / span) + 0.5) * span));

/**
 * Every pixel of a tile against how much of it the film's four terms leave standing there, taken
 * off the terms themselves rather than off the picture: a trough guessed from the pixels would be
 * whichever pixel the argument already believes (principle 1, `columnKeep` and its three). Sorted
 * shallowest first, so a tenth off either end is the tenth the terms cross deepest under and the
 * tenth they crest under.
 */
function keepsOf(pixels: Uint8ClampedArray): readonly { at: number; keep: number }[] {
  const pitch = gridPitchPx(2);
  const rowPitch = rowPitchPx(2);
  const wide = beatPx(pitch);
  const deep = pixels.length / 4 / wide;
  // Read at the centre of the cell of marks a pixel stands in and not at the pixel itself, because
  // that is where the tile reads it (0345, `build`).
  const cell = pitch;
  const across = sceneRepeat(wide, cell);
  const down = sceneRepeat(deep, cell);
  const keeps: { at: number; keep: number }[] = [];
  for (let y = 0; y < deep; y++) {
    for (let x = 0; x < wide; x++) {
      keeps.push({
        at: (y * wide + x) * 4,
        keep: screenKeep(centre(x, across, wide), centre(y, down, deep), pitch, rowPitch, deep),
      });
    }
  }
  // ES2022 has no toSorted; this is a fresh array, so sorting cannot mutate a caller's value.
  // oxlint-disable-next-line unicorn/no-array-sort
  return keeps.sort((one, two) => one.keep - two.keep);
}

/**
 * The water, because it is the one field read low enough on its own ramp that a shade stays inside
 * the first stretch of it, where the ramp is a straight line between two stops and a read pulled
 * down is a colour pulled toward the black the ramp opens at. A yard no other case here paints, so
 * the first tile is baked rather than answered out of the shop's own cache (`tiles`,
 * src/ui/moireScreenShop.ts).
 */
const REED = yardScene("Quiet Reed by the Old Wall");

/** That yard's tile, baked under one setting of the share. */
function shot(share: number): Uint8ClampedArray {
  setTuning("film.share", share);
  return tileOf(paintingOf(REED));
}

// One flat list of the film's cases, all painted through the one stand-in canvas (0007).
// oxlint-disable-next-line max-lines-per-function
describe("the screen shades the field and no longer cuts a window in it", () => {
  it("writes every pixel's alpha as the mark's coverage of the caller's own, and the film's share moves none of it", () => {
    // Step 2 of the film block (0340), amending 0332: the four keep terms leave the alpha and
    // enter the read. Since 0345 the tile is written a mark at a time and a mark's coverage is the
    // alpha, so what holds now is that the share moves none of it: the same alphas, in the same
    // places, at every setting — and among them the caller's whole and the bare page. The three
    // settings are read rather than one because the rest is 0.15 and neither end of the dial
    // (0339).
    // The film's share reaches the lattice as *which* mark a cell gets — it is a shade on the read,
    // and a mark is read off the read — and never as how solid a mark stands: at every setting an
    // alpha is one of the five a mark's four soft reads can make, among them the caller's whole
    // and the bare page.
    const levels = [0, 64, 128, 191, 255];
    for (const pixels of [shot(1), shot(0.5), shot(0)]) {
      const alphas = new Set<number>();
      for (let at = 3; at < pixels.length; at += 4) alphas.add(pixels[at] ?? -1);
      for (const alpha of alphas) expect(levels, "the screen cuts the alpha").toContain(alpha);
      expect(alphas.has(255), "no mark stands at the caller's whole").toBe(true);
      expect(alphas.has(0), "no page shows between the marks").toBe(true);
    }
  });

  it("prints every mark in one ink at a flat of one, and in the scene's own stops at nought", () => {
    // The third step of the marks block (0345): `glyph.flat` pulls every cell's colour toward the
    // ramp's middle stop, so at one the tile is one ink under the channels' own lattice and at
    // nought it is the scene's five stops. Read as how many inks the tile holds, because the
    // channel gain and fringe stand between a pixel and the stop it was read at.
    const inksOf = (flat: number): number => {
      setTuning("glyph.flat", flat);
      const pixels = tileOf(paintingOf(REED));
      const inks = new Set<string>();
      for (let at = 0; at < pixels.length; at += 4) {
        if ((pixels[at + 3] ?? 0) === 0) continue;
        inks.add(`${pixels[at]},${pixels[at + 1]},${pixels[at + 2]}`);
      }
      return inks.size;
    };
    const five = inksOf(0);
    const one = inksOf(1);
    expect(one, "one ink is as many as five stops").toBeLessThan(five / 2);
    expect(one, "one ink is no ink").toBeGreaterThan(0);
  });

  it("lays the lattice on whole cells of the marks at every phase of the crawl and the roll", () => {
    // The fourth step of the marks block (0346): the lattice is fixed to the screen and what moves
    // through it steps a cell at a time, so the pattern's two translations are whole multiples of
    // the cell — which is the column pitch — whatever the rows' phases say.
    const pitch = gridPitchPx(2);
    for (const phase of [0.1, 0.37, 0.5, 0.83]) {
      vi.stubGlobal("devicePixelRatio", 2);
      const rows = [
        row({ period: 4, phase }),
        row({ period: 3, phase: 1 - phase, reference: true }),
      ];
      const [placed] = paintedOn(200, 128, rows, 2, 20).screened;
      expect(placed, `phase ${phase} placed nothing`).toBeDefined();
      expect((placed?.e ?? 0) % pitch, `phase ${phase} crawls by a fraction`).toBeCloseTo(0, 10);
      expect((placed?.f ?? 0) % pitch, `phase ${phase} rolls by a fraction`).toBeCloseTo(0, 10);
    }
  });

  it("keeps SCREEN_FLOOR across the widest fringe and the whole of disperse", () => {
    // What stops a screen becoming a grille is the floor, and neither dimension that is colour may
    // spend it: they divide the ink the row was already drawn in among the three channels it is
    // made of and never reach the alpha. Read off the tile the painter actually wrote. Here and
    // not beside the screen's own cases since 0346, that file standing at the cap.
    const chromatic = [
      row({ period: 3, fringe: DRIFT_FRINGE_REACH, disperse: DRIFT_DISPERSE_REACH }),
      row({ period: 4, phase: 1, reference: true }),
    ];
    const plain = [row({ period: 3 }), row({ period: 4, phase: 1, reference: true })];
    vi.stubGlobal("devicePixelRatio", 2);
    const chromaticPixels = tileOf(paintedOn(200, 640, chromatic));
    vi.stubGlobal("devicePixelRatio", 2);
    const plainPixels = tileOf(paintedOn(200, 640, plain));
    // The floor is guarded on the read (src/ui/moireCanvasFilm.test.ts); the alpha is the same.
    expect(keptOf(chromaticPixels)).toBeGreaterThan(0);
    expect(keptOf(chromaticPixels)).toBeCloseTo(keptOf(plainPixels), 12);
    // And the two are still different screens, or the floor above would be holding across a
    // dimension that reached nothing: what the widest fringe spends is the ink, never the alpha.
    expect(chromaticPixels).not.toEqual(plainPixels);
  });

  it("spends the film's share as a shade on the scene's own read", () => {
    // Read in the scene's own stops: the picture rests at one ink since 0346 (`GLYPH_FLAT`).
    setTuning("glyph.flat", 0);
    const full = shot(1);
    const half = shot(0.5);
    const none = shot(0);
    const ranked = keepsOf(none);
    const trough = ranked[0] ?? { at: 0, keep: 1 };
    const crest = ranked.at(-1) ?? { at: 0, keep: 1 };
    expect(trough.keep, "the film's terms never cross").toBeLessThan(0.7);
    // The shade is a walk back down the ramp toward the black the water opens on (0335's own
    // mechanism, spent by the film), and under the deepest trough of the four terms it is a long
    // walk: darker at a whole share than at a half, and darker at a half than with the film off.
    // Read as brightness and not as a distance to the resolved stop, because the three channels'
    // own gains stand between a pixel and the ink its stop was named in (`channelGain`), and the
    // water's ramp is the one that only rises.
    const black = resolvedInk("--scene-water-black");
    const foot = (black[0] + black[1] + black[2]) / 3;
    expect(brightOf(none, trough.at), "the trough is off the water's floor").toBeLessThan(4 * foot);
    expect(brightOf(full, trough.at)).toBeLessThan(brightOf(half, trough.at));
    expect(brightOf(half, trough.at)).toBeLessThan(brightOf(none, trough.at));
    // And how deep the shade goes is the depth of the film there: over the tenth of the tile the
    // terms cross deepest under, a smaller share of the scene's own read stands than over the
    // tenth they crest under. As a share of each pixel's own read and never as two brightnesses,
    // because a crest pixel high on the ramp walks further in bytes than a trough pixel low on it
    // while giving up less of itself — and by tenths, because no pixel of a tile has all four
    // terms at their crest at once (0.84 is the most of itself the film ever leaves standing), so
    // "the same colour at a crest" is a limit the tile approaches and not a pixel it holds.
    expect(crest.keep, "the four terms crest together").toBeLessThan(1);
    const tenth = Math.floor(ranked.length / 10);
    const standing = (band: readonly { at: number; keep: number }[]): number =>
      band.reduce((sum, { at }) => sum + brightOf(full, at) / brightOf(none, at), 0) / band.length;
    const under = standing(ranked.slice(0, tenth));
    const over = standing(ranked.slice(-tenth));
    expect(under, "the trough keeps as much of its read as the crest").toBeLessThan(over);
    expect(over, "the crest gives up nothing").toBeLessThan(1);
    // And the ease itself is unmoved by the amendment: a share of one is the four terms whole and
    // a share of nought leaves the read where the scene put it, which is what the two ends are.
    for (const keep of [0, 0.37, 0.6, 1]) {
      expect(filmStand(keep, 1), `keep ${keep}`).toBe(keep);
      expect(filmStand(keep, 0), `keep ${keep}`).toBe(1);
    }
  });

  it("re-reads the scene's body on a step of the ink rather than running the scene again", () => {
    // The hue, the fringe, the dispersion and the saturation all walk while a yard sounds
    // (`inkTravelInto`, 0266, 0301), and every step of any of them is a new tile. Measured on a
    // playing rack, a whole pass over the scene's maths at each of those steps was twenty to
    // forty-six milliseconds, three times a second, on the thread the hand is on — the long tasks
    // the hand felt. So the scene's own body is baked once per what it is of, and a step reads it.
    // A yard no other case paints, so its body is certainly built here and not answered from the
    // cache the tunings clear.
    const moss = yardScene("Low Moss by the Steps");
    const ground = vi.spyOn(sceneOf(moss.scene), "ground");
    const rest = screenInkRest();
    const shotAt = (hue: number, fringe: number): Uint8ClampedArray => {
      vi.stubGlobal("devicePixelRatio", 2);
      return tileOf(
        paintedOn(200, 128, ROWS, 2, 20, { yard: moss, tint: { ...rest, hue, fringe } }),
      );
    };
    const first = shotAt(0.25, rest.fringe);
    const pixels = first.length / 4;
    expect(pixels).toBeGreaterThan(0);
    expect(ground).toHaveBeenCalledTimes(pixels);
    // Two more steps of the ink: two more tiles, and no more of the scene.
    const second = shotAt(0.75, rest.fringe);
    const third = shotAt(0.75, rest.fringe + 0.5);
    expect(ground).toHaveBeenCalledTimes(pixels);
    expect(second).not.toEqual(first);
    expect(third).not.toEqual(second);
    ground.mockRestore();
  });

  it("leaves SCREEN_FLOOR of every scene's lightness standing under the deepest shade", () => {
    // Read in the scene's own stops: the picture rests at one ink since 0346 (`GLYPH_FLAT`).
    setTuning("glyph.flat", 0);
    // The floor re-aimed at what it now guards (0340): it was the least of the tile's alpha the
    // screen could leave, and with the screen out of the alpha it is the least of the tile's
    // lightness the shade may leave on average — the same number, asserted on the read. Against
    // the same tile with the film off, because a scene's own darkness is not the film's spending
    // (0332) and a canopy is under this floor before the screen touches it.
    // Every Grating and Film knob at the wild end its own row names, read off the panel rather
    // than listed again here (principle 1) — and then the share pushed to the top of its travel,
    // which is the deepest shade the dial admits and the reading the floor is about.
    const wild = MOIRE_TUNE_GROUPS.filter(({ title }) => title === "Grating" || title === "Film");
    expect(wild.map(({ title }) => title)).toEqual(["Grating", "Film"]);
    const ends = new Map(tunings().map((handle) => [handle.id, handle]));
    for (const scene of SCENE_NAMES) {
      const yard = { ...YARD_SCENE_REST, scene };
      resetTuning();
      // The film off outright and not merely at rest: `resetTuning` puts the share back to 0.15,
      // and a yardstick that already carries the shipped shade divides that shade out of both
      // sides and hides a term deep enough to grille the field at the setting the app ships.
      setTuning("film.share", 0);
      // And in the scene's own stops, `resetTuning` having put the picture back to one ink (0346).
      setTuning("glyph.flat", 0);
      const whole = meanOf(tileOf(paintingOf(yard)));
      for (const { entries } of wild) {
        for (const { id, wild: end } of entries) {
          const handle = ends.get(id);
          if (handle === undefined) throw new Error(`The panel names ${id} and no tunable does.`);
          setTuning(id, end === "min" ? handle.min : handle.max);
        }
      }
      setTuning("film.share", FILM_SHARE.max);
      const stood = meanOf(tileOf(paintingOf(yard)));
      expect(stood / whole, `${scene} is under the floor`).toBeGreaterThan(SCREEN_FLOOR);
      // And under it and not beside it: a screen whose terms reached the alpha and not the read
      // would leave every scene's lightness exactly where it found it, which is this assertion.
      expect(stood / whole, `${scene} keeps its whole lightness`).toBeLessThan(1);
    }
  });
});
