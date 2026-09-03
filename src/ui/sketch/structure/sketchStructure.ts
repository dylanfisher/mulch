/**
 * @role The seven fields the structure bench draws — one per way the automator's mark on the
 *   picture could be made plain: the escape field cut at a depth of its own, beaten against a copy
 *   of itself at a held ratio, the folded plane folded about its own centre, the whole field folded
 *   into mirrored sectors, the field's slices thrown by the structure, the structure read through
 *   the ramp of five, and its count cut into contours — and the one dial each is drawn under. Every
 *   field answers how much ink is at a point of the picture, nought to one, for one amount of its
 *   dial, and nothing else: the real kernels over the drift bench's stand-in weave, no canvas, no
 *   clock, no context, so each is provable here and painted there.
 * @instead The kernels themselves, which these read and never restate → src/lib/moireFractal.ts
 *   and src/lib/moireFold.ts. The weave and the moves → src/ui/sketch/sketchField.ts. The canvas
 *   one is written through → src/ui/sketch/SketchDriftStage.tsx. What the picture does with the
 *   structure today → src/ui/moireRowsField.ts and src/ui/moireCanvas.ts, which this never reads.
 */
import { cosTurn } from "@/lib/moire";
import { FOLD_CAP, type Folded, foldPlane } from "@/lib/moireFold";
import {
  escapeTurns,
  FRACTAL_BITE,
  FRACTAL_RATIO_BAND,
  fractalRest,
  nestedTurns,
} from "@/lib/moireFractal";
import { geometryRef, LENS_SLICES } from "@/lib/moireGeometry";
import { gratingDepth } from "@/lib/moireGrating";
import { clamp } from "@/lib/range";
import {
  FIELD_CENTRE,
  type SketchDial,
  type SketchDriftField,
  TERRACE_EDGE,
} from "@/ui/sketch/sketchDrift";
import { FIELD_ASPECT, FIELD_DEPTH, lit, terrace, through, weave } from "@/ui/sketch/sketchField";

/**
 * The radius the real kernel reads a point against, on the bench's own box: the same quarter of
 * the diagonal the painter uses (`geometryRef`), so a bench picture and the real picture stand the
 * same distance into the plane.
 */
export const FIELD_REF = geometryRef(FIELD_ASPECT, 1);

/** Where the structure rests on the plane, as the painter rests it — the seahorse valley. */
const REST = fractalRest();

/**
 * How many rows a picture with an automator in it is about, which is the count the picture's
 * weight is shared out over (`DRIFT_SCALES_BUDGET`, src/lib/moireOctaves.ts) — and so what a
 * fractal row is cut at today: its share of `gratingDepth`, under a dull sound. The number every
 * dial on this bench is read against.
 */
export const TODAY_ROWS = 14;
export const TODAY_BITE = gratingDepth(TODAY_ROWS) * FRACTAL_BITE;

/** A point of the picture as the kernel reads it: its offset from the middle, in reference radii. */
export const toRef = (x: number, y: number): [number, number] => [
  (x - FIELD_CENTRE[0]) / FIELD_REF,
  (y - FIELD_CENTRE[1]) / FIELD_REF,
];

/** And the way back, for a point the fold has moved. */
const fromRef = (u: number, v: number): [number, number] => [
  FIELD_CENTRE[0] + u * FIELD_REF,
  FIELD_CENTRE[1] + v * FIELD_REF,
];

/** The escape count at a point of the picture, `zoom` deep, in cycles — the real kernel at rest. */
export function escapeAt(x: number, y: number, zoom = 1): number {
  const [u, v] = toRef(x, y);
  return escapeTurns(u, v, REST.cx, REST.cy, zoom, 0);
}

/**
 * How many cycles of the count one pass of a ramp, a staircase or a throw is worth. The count runs
 * over a hundred cycles across the picture and climbs fastest at the boundary, so one pass every
 * sixteen is a handful of slow passes over the open plane and filigree at the edge.
 */
export const STRUCTURE_TURN = 16;

/** The count as one slow wave, nought to one, which is what a ramp or a staircase is read off. */
const wave = (count: number): number => 0.5 - 0.5 * cosTurn(count / STRUCTURE_TURN);

/**
 * 01 — the structure cut at a depth of its own, the way the lattice is, and not at the share the
 * row count solves for. The dial is that depth; at nought it is the picture with no structure in
 * it, and at `TODAY_BITE` it is the picture today.
 */
export const BITE_DIAL: SketchDial = { min: 0, max: 1, step: 0.05, rest: 1 };
export const biteField: SketchDriftField = (x, y, depth) =>
  lit(weave(x, y) * through(escapeAt(x, y), depth));

/**
 * 02 — two copies of the structure held a ratio apart in scale, so they beat against each other
 * everywhere rather than on the rungs their two breaths happen to differ on. The dial is the
 * ratio; at one the two are the one tile drawn twice, which is the picture today for a fifth of
 * every window.
 */
export const BEAT_DIAL: SketchDial = { min: 1, max: 2, step: 0.05, rest: 1.5 };
export const beatField: SketchDriftField = (x, y, ratio) =>
  lit(
    weave(x, y) *
      through(escapeAt(x, y), FIELD_DEPTH) *
      through(escapeAt(x, y, ratio), FIELD_DEPTH),
  );

/** The contraction the boxes are folded at: the middle of the band the painter draws from. */
export const BOX_RATIO = (FRACTAL_RATIO_BAND[0] + FRACTAL_RATIO_BAND[1]) / 2;

/**
 * 03 — the folded plane folded about nought rather than about the escape field's own centre,
 * which it borrows today and which flattens it to stripes. The dial is the turn each fold takes;
 * at nought the levels are squares in squares, and off it each level is turned inside the last.
 */
export const BOXES_DIAL: SketchDial = { min: -0.25, max: 0.25, step: 0.025, rest: -0.125 };
export const boxesField: SketchDriftField = (x, y, turn) => {
  const [u, v] = toRef(x, y);
  return lit(weave(x, y) * through(nestedTurns(u, v, 0, 0, BOX_RATIO, turn, 1, 0), 1));
};

/** The one folded point the kaleidoscope writes into, a pixel at a time, as the kernel does. */
const folded: Folded = { u: 0, v: 0 };

/**
 * 04 — the whole finished field folded into mirrored sectors about the middle, straight rows and
 * all, where today only a curved row's coordinate is folded and the weave stands unmirrored over
 * it. The dial is how many automators are standing, which is how many folds.
 */
export const KALEIDO_DIAL: SketchDial = { min: 0, max: FOLD_CAP, step: 1, rest: 2 };
export const kaleidoField: SketchDriftField = (x, y, folds) => {
  const [u, v] = toRef(x, y);
  foldPlane(folded, u, v, Math.round(folds));
  const [fx, fy] = fromRef(folded.u, folded.v);
  return biteField(fx, fy, BITE_DIAL.rest);
};

/**
 * How many slices the bench tears the picture into each way: the lens's own count scaled to the
 * bench, whose box stands a quarter the height of the popped-out picture the lens reads. At the
 * lens's own count a slice here is two pixels, and two-pixel slices thrown apart are noise.
 */
export const SHARD_SLICES = LENS_SLICES / 4;

/**
 * 05 — the field's own slices thrown by the structure: every band the lens already reads the
 * picture back in slides by the escape count at its middle, across and then down, so the picture
 * is torn along the structure's own cross-section. The dial is how far a slice may be thrown, as a
 * share of the height. Under it is the structure at its own depth (`BITE_DIAL`), because a tear
 * through a weave is noise and a tear through the filigree is a tear.
 */
export const SHARDS_DIAL: SketchDial = { min: 0, max: 0.3, step: 0.01, rest: 0.08 };
export const shardsField: SketchDriftField = (x, y, reach) => {
  const row = Math.floor(clamp(y, 0, 1 - Number.EPSILON) * SHARD_SLICES);
  const across =
    reach * cosTurn(escapeAt(FIELD_CENTRE[0], (row + 0.5) / SHARD_SLICES) / STRUCTURE_TURN);
  const column = Math.floor(clamp(x / FIELD_ASPECT, 0, 1 - Number.EPSILON) * SHARD_SLICES);
  const down =
    reach *
    cosTurn(
      escapeAt(((column + 0.5) / SHARD_SLICES) * FIELD_ASPECT, FIELD_CENTRE[1]) / STRUCTURE_TURN -
        0.25,
    );
  return biteField(x + across, y + down, BITE_DIAL.rest);
};

/**
 * 06 — the structure read through the ramp of five inks while every straight row stays in the one
 * ink, so the fractal is the only coloured thing on the page. The dial is how far along the ramp
 * the structure may reach, from one flat hue at nought to the whole ramp at one.
 */
export const COLOUR_DIAL: SketchDial = { min: 0, max: 1, step: 0.05, rest: 0.7 };
export const colourField: SketchDriftField = (x, y, reach) => {
  const value = wave(escapeAt(x, y)) * (0.55 + 0.45 * lit(weave(x, y)));
  return clamp(0.5 + (value - 0.5) * (0.15 + 1.7 * reach), 0, 1);
};

/**
 * 07 — the escape count cut into flat contours with every riser lit, so the structure is drawn as
 * a map's height lines rather than as fringes the weave has to beat against. The dial is how many
 * contours one pass of the count is cut into.
 */
export const CONTOUR_DIAL: SketchDial = { min: 2, max: 12, step: 1, rest: 6 };
export const contourField: SketchDriftField = (x, y, steps) => {
  const stepped = terrace(wave(escapeAt(x, y)), Math.round(steps), TERRACE_EDGE);
  return clamp(stepped * (0.7 + 0.3 * lit(weave(x, y))), 0, 1);
};
