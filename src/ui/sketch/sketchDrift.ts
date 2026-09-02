/**
 * @role The eight fields the drift bench draws — one per direction the picture could be pushed in
 *   — and the one dial each is drawn under. Every field answers how much ink is at a point of the
 *   picture, nought to one, for one amount of its dial, and nothing else: no canvas, no clock, no
 *   context, so each is provable here and painted there. Beside the pictures rather than in them,
 *   the way src/ui/sketch/sketchGround.ts holds the ground eight's count (principle 1).
 * @instead The moves each field is built out of → src/ui/sketch/sketchField.ts. The canvas one is
 *   written through, and the ramp it is read through → src/ui/sketch/SketchDriftStage.tsx. The
 *   real picture these argue about → src/lib/moireFractal.ts, src/ui/moireCanvas.ts and
 *   src/ui/moireScreen.ts, none of which this reads.
 */
import { clamp } from "@/lib/range";
import {
  cellFold,
  FIELD_ASPECT,
  FIELD_DEPTH,
  kaleido,
  lit,
  lobes,
  rim,
  roundedBox,
  smin,
  terrace,
  through,
  tunnel,
  warp,
  weave,
} from "@/ui/sketch/sketchField";

/** How much ink is at a point of the picture, for one setting of the picture's own dial. */
export type SketchDriftField = (x: number, y: number, amount: number) => number;

/** The one dial a picture is drawn under: its band, its step and where it rests when the bench opens. */
export type SketchDial = { min: number; max: number; step: number; rest: number };

/** The middle of the picture, where a fold, a tunnel or a rosette is centred. */
export const FIELD_CENTRE: readonly [number, number] = [FIELD_ASPECT / 2, 0.5];

/** A reference cell: how much of its square it fills, and how round its corners are. */
export const CELL = { half: 0.45, round: 0.09, rim: 0.035 };

/** How much ink the gutter between cells carries — the lit contour the reference draws. */
export const CELL_GUTTER = 0.9;

/** How far one cell's lobes are slid from its neighbour's, so no two cells are the one picture. */
const CELL_SLIDE: readonly [number, number] = [0.37, 0.61];

/**
 * What a cell's interior is inked, from its own lens and the weave under it: mostly the lens, so
 * a cell reads as a smooth value the way the reference's do, with the weave laid faintly through
 * it — the fringe is still there and is no longer the visible unit.
 */
const cellInk = (lens: number, fringe: number): number => lens * (0.55 + 0.45 * fringe);

/** The lit value inside one cell, before any grating: a lens of its own, slid by which cell it is. */
function cellLobes(cx: number, cy: number, qx: number, qy: number, phase = 0): number {
  return lobes(qx + 0.5 + cx * CELL_SLIDE[0], qy + 0.5 + cy * CELL_SLIDE[1], phase);
}

/**
 * 01 — the reference straight: the picture folded into square cells, every cell a rounded box
 * holding its own lens of the field, and the gutter and rim lit. The dial is how many cells stand
 * in the height.
 */
export const LATTICE_DIAL: SketchDial = { min: 1, max: 4, step: 0.5, rest: 2 };
export const latticeField: SketchDriftField = (x, y, amount) => {
  const { cx, cy, qx, qy } = cellFold(x, y, amount);
  const edge = roundedBox(qx, qy, CELL.half, CELL.round);
  if (edge > 0) return CELL_GUTTER;
  const inside = cellInk(cellLobes(cx, cy, qx, qy), lit(weave(x, y)));
  const lip = rim(edge, CELL.rim);
  return clamp(inside * (1 - lip) + lip, 0, 1);
};

/**
 * 02 — the same picture read through a ramp of five inks rather than laid down in one. The field
 * is the lobes over the weave; the dial is how far across the ramp the picture is allowed to reach,
 * from one flat hue at nought to the whole ramp at one.
 */
export const RAMP_DIAL: SketchDial = { min: 0, max: 1, step: 0.05, rest: 0.7 };
export const rampField: SketchDriftField = (x, y, amount) => {
  const value = lobes(x, y) * (0.55 + 0.45 * lit(weave(x, y)));
  return clamp(0.5 + (value - 0.5) * (0.15 + 1.7 * amount), 0, 1);
};

/**
 * 03 — the coordinate warped by itself before the gratings are cut along it. The dial is how far
 * the warp bends, in units of the picture's height.
 */
export const WARP_DIAL: SketchDial = { min: 0, max: 0.4, step: 0.02, rest: 0.16 };
export const warpField: SketchDriftField = (x, y, amount) => {
  const [wx, wy] = warp(x, y, amount);
  return lit(weave(wx, wy)) * (0.45 + 0.55 * lobes(wx, wy));
};

/**
 * 04 — the plane folded into mirrored sectors about the middle, so one row's structure is a
 * rosette. The dial is how many sectors, and a whole number of them.
 */
export const FOLD_DIAL: SketchDial = { min: 2, max: 12, step: 1, rest: 6 };
export const foldField: SketchDriftField = (x, y, amount) => {
  const [fx, fy] = kaleido(x - FIELD_CENTRE[0], y - FIELD_CENTRE[1], Math.round(amount));
  const [wx, wy] = warp(fx + FIELD_CENTRE[0], fy + FIELD_CENTRE[1], 0.1);
  return lit(weave(wx, wy)) * (0.4 + 0.6 * lobes(wx, wy));
};

/** How wide a lit riser is, as a share of one terrace. */
export const TERRACE_EDGE = 0.12;

/**
 * 06 — the smooth field cut into terraces with every riser lit, so the picture is contour lines
 * rather than fringes. The dial is how many terraces.
 */
export const TERRACE_DIAL: SketchDial = { min: 2, max: 12, step: 1, rest: 5 };
export const terraceField: SketchDriftField = (x, y, amount) => {
  const [wx, wy] = warp(x, y, 0.08);
  const stepped = terrace(lobes(wx, wy), Math.round(amount), TERRACE_EDGE);
  return clamp(stepped * (0.7 + 0.3 * lit(weave(x, y))), 0, 1);
};

/** The three shapes the blobs merge: a disc, a box and a bar, each a distance of its own. */
export const BLOBS = {
  disc: { at: [0.75, 0.5] as const, radius: 0.28 },
  box: { at: [2.2, 0.5] as const, half: 0.24, round: 0.06 },
  bar: { from: 1.05, to: 1.95, y: 0.5, half: 0.06 },
};

/** How many fringes wrap one unit of distance from the merged shape. */
export const BLOB_RINGS = 11;

/** The signed distance to the merged shape, rounded over `k` at every join. */
export function blobDistance(x: number, y: number, k: number): number {
  const disc = Math.hypot(x - BLOBS.disc.at[0], y - BLOBS.disc.at[1]) - BLOBS.disc.radius;
  const box = roundedBox(x - BLOBS.box.at[0], y - BLOBS.box.at[1], BLOBS.box.half, BLOBS.box.round);
  const alongBar = clamp(x, BLOBS.bar.from, BLOBS.bar.to);
  const bar = Math.hypot(x - alongBar, y - BLOBS.bar.y) - BLOBS.bar.half;
  return smin(smin(disc, box, k), bar, k);
}

/**
 * 07 — rows as distances merged with a smooth minimum, and one grating cut along the merged
 * distance, so the fringes wrap the union. The dial is how far the join is rounded.
 */
export const BLOBS_DIAL: SketchDial = { min: 0, max: 0.5, step: 0.025, rest: 0.2 };
export const blobsField: SketchDriftField = (x, y, amount) => {
  const distance = blobDistance(x, y, amount);
  const fringes = lit(through(distance * BLOB_RINGS, FIELD_DEPTH));
  const fill = distance < 0 ? 0.35 : 0;
  return clamp((fringes + fill) * Math.exp(-Math.max(distance, 0) * 1.6), 0, 1);
};

/**
 * How many frames of ghost the tunnel sums, and how much of each survives into the next. Fewer
 * and brighter than the painter's own ghost would be at its ceiling, because what the picture has
 * to show is the nesting, and a hundred copies at half strength each is the smear the trade names.
 */
export const TUNNEL = { copies: 7, keep: 0.72 };

/**
 * 05 — the picture fed back into itself through a zoom: what the ghost the painter already lays
 * back would settle to if each frame were drawn a little larger about the middle. The dial is the
 * zoom per frame.
 */
export const TUNNEL_DIAL: SketchDial = { min: 0.05, max: 0.8, step: 0.05, rest: 0.35 };
export const tunnelField: SketchDriftField = (x, y, amount) =>
  tunnel(
    (px, py) => blobsField(px, py, BLOBS_DIAL.rest),
    x,
    y,
    FIELD_CENTRE,
    1 + amount,
    TUNNEL.keep,
    TUNNEL.copies,
  );

/** How many cells stand in the height when the cells hear, so the strip is two rows of them. */
export const BANDS_PER = 2;

/** How many cells that makes across the whole picture, which is how many bands are read. */
export const BANDS_ACROSS = Math.ceil(FIELD_ASPECT * BANDS_PER);

/**
 * The made-up spectrum the cells hear, one level per cell reading left to right and top to bottom.
 * Written by hand for the walk's reason (src/ui/sketch/sketchWalk.ts): the shape is the argument
 * — a loud low end, a hole, and a hot top — and a spectrum nobody can recognise is a texture.
 */
export const SKETCH_BANDS: readonly number[] = [
  0.95, 0.8, 0.55, 0.3, 0.15, 0.4, 0.7, 0.25, 0.05, 0.35, 0.6, 0.85,
];

/** The level the cell at a place hears, or a throw naming the cell the fixture never wrote. */
export function bandOf(cx: number, cy: number): number {
  const level = SKETCH_BANDS[cy * BANDS_ACROSS + cx];
  if (level === undefined) throw new Error(`No band was written for the cell ${cx},${cy}.`);
  return level;
}

/**
 * 08 — the lattice with every cell lit by its own band of the spectrum: the interior slides by
 * its band's level and brightens with it, and the gutter stays. The dial is how loud the whole
 * spectrum is, nought to one.
 */
export const BANDS_DIAL: SketchDial = { min: 0, max: 1, step: 0.05, rest: 0.75 };
export const bandsField: SketchDriftField = (x, y, amount) => {
  const { cx, cy, qx, qy } = cellFold(x, y, BANDS_PER);
  const edge = roundedBox(qx, qy, CELL.half, CELL.round);
  if (edge > 0) return CELL_GUTTER;
  const level = bandOf(cx, cy) * amount;
  const inside = cellInk(cellLobes(cx, cy, qx, qy, level * 0.5), lit(weave(x, y)));
  const lip = rim(edge, CELL.rim);
  return clamp((0.08 + 0.92 * level) * inside * (1 - lip) + lip, 0, 1);
};
