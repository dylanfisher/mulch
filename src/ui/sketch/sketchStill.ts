/**
 * @role What a still is on this bench: the four of them by name, the scale their marks are stated
 *   at, the five stops each is read along, the one dial each is turned under, and the print every
 *   one of them is drawn through — a deterministic grain and a vignette, which is the half of a
 *   film still that belongs to the film rather than to the field. The vocabulary the four fields
 *   share, written once so no two of them can disagree about what a grain is (principle 1).
 * @instead The four fields themselves → src/ui/sketch/sketchStillField.ts. The nine drift fields
 *   these stand beside, and the scale they borrow → src/ui/sketch/sketchDrift.ts. The canvas one is
 *   written through, and the ramp it is read through → src/ui/sketch/SketchDriftStage.tsx. The four
 *   grounds that ship, which these push past → src/ui/scene/.
 */
import { clamp } from "@/lib/range";
import type { SketchDial } from "@/ui/sketch/sketchDrift";
import { SCENE_BENCH_PX } from "@/ui/sketch/sketchDrift";
import { FIELD_ASPECT } from "@/ui/sketch/sketchField";
import type { SketchStop } from "@/ui/sketch/SketchDriftStage";

/** The four film stills the bench answers, one name each. */
export const STILL_NAMES = ["poppies", "glint", "seedheads", "skylight"] as const;

export type StillName = (typeof STILL_NAMES)[number];

/**
 * The scale a still's marks are stated at — the same device pixels a scene's ground is written in,
 * borrowed rather than restated so a mark that reads at 1:1 here reads at 1:1 in a tile (0329).
 */
export const STILL_PX = SCENE_BENCH_PX;

/** The picture's own size at that scale, in those pixels: what a mark is measured against. */
export const STILL_WIDE = FIELD_ASPECT * STILL_PX;

/**
 * The five stops each still is read along, as the classes its legend chips are drawn in — every one
 * an existing token of src/ui/tokens.css, in an order no scene declares. Ordered by where the still
 * puts them and not by how light they are: the canopy's haze sits above its lit break because a
 * speck of sky rises through the gold before it reaches the blue, which is the order the picture
 * needs and the order a lightness ramp would forbid.
 *
 * **The tan of a grass field is between two stops and not one of them.** Nothing in
 * src/ui/tokens.css is amber; what makes amber is the ember stop mixed with the straw stop, so the
 * seed heads' mass is read at about two thirds of its ramp rather than at a stop. A ramp is read
 * between its stops as readily as at them, and a still that needed a colour the theme does not hold
 * gets it that way or not at all — never by minting one (0236).
 *
 * **And a stop the picture must never reach is a stop it must not hold.** The seed heads carried
 * `--screen-green` for a draft, because the still has green stalks; every value the mass passed
 * through on its way to tan came out that vivid green, and the picture read as flames. Its ramp is
 * warm end to end now, and its stalks are the dark olive its first stop mixes toward — the colours a
 * still does not use cost it as much as the ones it does.
 *
 * **Five, and none of them the caller's own ink.** A shipped scene's middle stop is `null`, which
 * is whatever ink its caller resolved (`sceneStops`, src/ui/moireScreen.ts); a bench picture has no
 * caller, and drawing that stop as the box's own foreground would flip the middle of every ramp
 * with the scheme. So a still names all five, which is also what lets four pictures on one page
 * hold four palettes rather than four settings of one.
 */
export const STILL_STOPS: Readonly<Record<StillName, readonly SketchStop[]>> = {
  poppies: [
    { name: "shade", chip: "bg-(--scene-canopy-dark)" },
    { name: "stem", chip: "bg-(--screen-green)" },
    { name: "throat", chip: "bg-(--drift-hot)" },
    { name: "petal", chip: "bg-(--screen-red)" },
    { name: "edge", chip: "bg-(--scene-canopy-lit)" },
  ],
  glint: [
    { name: "deep", chip: "bg-(--scene-water-deep)" },
    { name: "swell", chip: "bg-(--drift-cool)" },
    { name: "water", chip: "bg-(--screen-blue)" },
    { name: "blade", chip: "bg-(--screen-green)" },
    { name: "glint", chip: "bg-(--scene-water-lit)" },
  ],
  seedheads: [
    { name: "root", chip: "bg-(--scene-canopy-dark)" },
    { name: "shadow", chip: "bg-(--drift-hot)" },
    { name: "ember", chip: "bg-(--screen-red)" },
    { name: "straw", chip: "bg-(--scene-canopy-lit)" },
    { name: "spark", chip: "bg-(--scene-water-lit)" },
  ],
  skylight: [
    { name: "mass", chip: "bg-(--scene-canopy-dark)" },
    { name: "leaf", chip: "bg-(--screen-green)" },
    { name: "break", chip: "bg-(--scene-canopy-lit)" },
    { name: "haze", chip: "bg-(--drift-cool)" },
    { name: "sky", chip: "bg-(--scene-water-lit)" },
  ],
};

/**
 * The one dial each still is turned under. Every one of them is a **phase**, nought to one and back
 * to where it started, because that is the only motion the real painter has: the screen carries no
 * clock and every term in it rides a row's own phase (0126). What differs is where each rests, so
 * four pictures on one page do not all open at the same moment of their own gust.
 */
export const STILL_DIALS: Readonly<Record<StillName, SketchDial>> = {
  poppies: { min: 0, max: 1, step: 0.02, rest: 0.3 },
  glint: { min: 0, max: 1, step: 0.02, rest: 0.44 },
  seedheads: { min: 0, max: 1, step: 0.02, rest: 0.16 },
  skylight: { min: 0, max: 1, step: 0.02, rest: 0.6 },
};

/**
 * A value in nought to one from two whole numbers — the stand-in for a seed, so a head bobs out of
 * phase with its neighbour and a seed catches the light where the one beside it does not. Written
 * rather than drawn from a generator for the fake walk's reason: two shots of one still have to be
 * the same picture (0247).
 */
export function hash2(a: number, b: number): number {
  const mixed = Math.sin(a * 127.1 + b * 311.7) * 43_758.545_3;
  return mixed - Math.floor(mixed);
}

/**
 * Smooth value noise, sampled anisotropically: one cell is `wide` of the scale's pixels across and
 * `tall` of them down, so a field of it reads as **fibres lying one way** rather than as blobs.
 * Four hashed corners with a smooth step between them — the cheapest thing that is soft everywhere,
 * has an edge nowhere, and repeats nowhere.
 *
 * **Two of the four stills need this and no product of gratings can give it.** A mass of grass and a
 * wall of leaf are textures with no spacing in them; two gratings crossed always have one, and what
 * comes out is a comb, a herringbone or a moiré — which this bench already has nine pictures of.
 * The other two stills stay on gratings, because a ripple and a lattice of poppies do have a pitch.
 */
export function streakAt(across: number, down: number, wide: number, tall: number): number {
  const gx = across / wide;
  const gy = down / tall;
  const ix = Math.floor(gx);
  const iy = Math.floor(gy);
  const fx = gx - ix;
  const fy = gy - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/**
 * The print: how much grain is laid over a still, how far the corners fall away, and how many grains
 * stand in one of the scale's own pixels.
 *
 * **The grain is half what it was, and the vignette a third**, because both were louder than the
 * grounds under them. At 0.07 peak to peak the grain stood exactly as tall as the water's swell, the
 * poppy stems and the canopy's fall to its foot were stated at, and all three read as noise; at a
 * third of the ramp the vignette dragged the corners of a picture whose mass sits at two thirds all
 * the way back to its own middle stop, so the seed heads had a scarlet border. A vignette **scales**
 * a ramp position, so what it costs is proportional to where the picture sits on its ramp — which
 * means a still whose mass is high pays several times what one resting near its floor does. A print
 * is the thing you notice second; a print you notice first is a fault.
 */
const PRINT = { grain: 0.035, fall: 0.13, per: 2 };

/**
 * One still's ramp position, printed: dimmed toward the corners and shaken by a grain. **This is
 * the film and not the field** — a vignette is the lens and a grain is the stock, and neither is
 * anything a meadow or a canopy does — so it is one term the four share and the one thing on these
 * pictures that would not land in `build` (src/ui/moireScreen.ts) with the rest of them.
 *
 * Laid on the ramp position rather than on the finished pixel, which is what makes it cheap: a
 * grain that darkened a pixel would have to know the ink, and a grain that slides the read along the
 * ramp changes the hue with the value, the way an underexposed frame does. Toward the still's own
 * first stop, which is warm in two of the four and cold in the other two — a corner goes to
 * whatever that picture calls its darkest, not to black and not to warm.
 */
export function printed(x: number, y: number, value: number): number {
  const dx = x / FIELD_ASPECT - 0.5;
  const dy = y - 0.5;
  const fall = 1 - PRINT.fall * clamp((dx * dx + dy * dy) * 3.2, 0, 1);
  const grain =
    hash2(Math.floor(x * STILL_PX * PRINT.per), Math.floor(y * STILL_PX * PRINT.per)) - 0.5;
  return clamp(value * fall + PRINT.grain * grain, 0, 1);
}
