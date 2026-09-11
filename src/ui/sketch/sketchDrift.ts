/**
 * @role The six fields the drift bench still draws — one per direction the picture could yet be
 *   pushed in, the lattice, the warp and the fold having been taken (0278) — and the one dial each
 *   is drawn under. Every field answers how much ink is at a point of the
 *   picture, nought to one, for one amount of its dial, and nothing else: no canvas, no clock, no
 *   context, so each is provable here and painted there. Beside the pictures rather than in them,
 *   the way src/ui/sketch/sketchGround.ts holds the ground eight's count (principle 1).
 * @instead The moves each field is built out of → src/ui/sketch/sketchField.ts. The canvas one is
 *   written through, and the ramp it is read through → src/ui/sketch/SketchDriftStage.tsx. The
 *   real picture these argue about → src/lib/moireFractal.ts, src/ui/moireCanvas.ts and
 *   src/ui/moireScreen.ts, none of which this reads.
 */
import { GLYPH_COUNT, GLYPH_PHASE, markAt, markCoverage } from "@/lib/moireGlyph";
import { cellFold, rim, roundedBox } from "@/lib/moireLattice";
import { type SceneName, SCENE_REACH_TERMS, sceneCells, sceneRepeat } from "@/lib/moireScene";
import { clamp } from "@/lib/range";
import {
  beatPx,
  FILM_SHARE,
  filmStand,
  GLYPH_FLAT,
  gridPitchPx,
  rowPitchPx,
  screenKeep,
} from "@/ui/moireScreenTile";
import { sceneOf } from "@/ui/scene/scenes";
import {
  FIELD_ASPECT,
  FIELD_DEPTH,
  lit,
  lobes,
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

/** The middle of the picture, where the tunnel is centred. */
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
 * 02 — the same picture read through a ramp of five inks rather than laid down in one. The field
 * is the lobes over the weave; the dial is how far across the ramp the picture is allowed to reach,
 * from one flat hue at nought to the whole ramp at one.
 */
export const RAMP_DIAL: SketchDial = { min: 0, max: 1, step: 0.05, rest: 0.7 };
export const rampField: SketchDriftField = (x, y, amount) => {
  const value = lobes(x, y) * (0.55 + 0.45 * lit(weave(x, y)));
  return clamp(0.5 + (value - 0.5) * (0.15 + 1.7 * amount), 0, 1);
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

/**
 * The display every picture on this bench is read at, and the one the shots are judged on (0329):
 * a scene's marks and the film's pitches are both stated in device pixels, so a bench that read
 * them at one ratio and a hand that judged them at another would argue about a picture nobody
 * sees.
 */
export const BENCH_DPR = 2;

/**
 * How tall one scene's ground is drawn on this bench, in those pixels. The bench's picture is one
 * unit high, and a scene's marks are stated in the pixels of a screen tile — so this is the one
 * number that says how much of a real tile a bench picture is, and it is **a whole beat cell of
 * the film's own columns**, derived and not written down, so that the lattice closes across the
 * picture however the pitch moves (0329).
 */
export const SCENE_BENCH_PX = beatPx(gridPitchPx(BENCH_DPR));

/** The dial every scene is drawn under: how far the yard's own wind leans the field. */
export const SCENE_DIAL: SketchDial = { min: 0, max: 1, step: 0.05, rest: 0.5 };

/**
 * One scene's own ground, drawn at the bench's scale: the same function the screen writes its tile
 * with, read at this picture's pixels rather than a tile's, so what is judged here is the ground
 * that lands and never a drawing of it (principle 1). The dial is the lean, which is the one term
 * of the reading a hand can move without renaming the yard.
 */
export const sceneField = (name: SceneName): SketchDriftField => {
  const scene = sceneOf(name);
  return (x, y, amount) =>
    clamp(
      scene.ground(x * SCENE_BENCH_PX, y * SCENE_BENCH_PX, {
        width: FIELD_ASPECT * SCENE_BENCH_PX,
        height: SCENE_BENCH_PX,
        seen: SCENE_BENCH_PX,
        lean: amount,
        // At the reach that scales nothing and under a stand no ground reads: what the bench
        // judges is the field a plant stands in, and a place is a shadow spent over it (0335).
        reach: SCENE_REACH_TERMS.middle,
        stand: "wall",
      }),
      0,
      1,
    );
};

/**
 * The film's two pitches at the bench's own display. The picture is a whole beat cell of the
 * columns across and one band cycle down, which is a lattice that closes left to right and half a
 * cell of the rows' own beat — the film reads the same either way, and what a hand judges here is
 * the depth of the beat and not how many cells fit.
 */
const FILM_PITCH = gridPitchPx(BENCH_DPR);
const FILM_ROW_PITCH = rowPitchPx(BENCH_DPR);

/**
 * What the film keeps at one pixel of the bench picture: the shipped four terms — the two
 * gratings, the lattice they beat into and the rolling band — read at the bench's own pitch out of
 * src/ui/moireScreenTile.ts and never restated here (principle 1).
 */
export const filmKeep = (px: number, py: number): number =>
  screenKeep(px, py, FILM_PITCH, FILM_ROW_PITCH, SCENE_BENCH_PX);

/**
 * The mean of those four over one whole bench picture, which is what the readout's share is taken
 * off: how much of the field's lightness stands is a fact about the film and not about the pixel
 * under the cursor. Summed once at load over the pixels the picture is actually drawn at, because
 * a closed form for four terms multiplied is a second statement of the film (principle 1).
 */
const FILM_MEAN_KEEP = ((): number => {
  const wide = Math.round(FIELD_ASPECT * SCENE_BENCH_PX);
  let total = 0;
  for (let py = 0; py < SCENE_BENCH_PX; py += 1) {
    for (let px = 0; px < wide; px += 1) total += filmKeep(px, py);
  }
  return total / (wide * SCENE_BENCH_PX);
})();

/** How much of the field's lightness stands, over the whole picture, at one setting of the share. */
export const filmStanding = (share: number): number => filmStand(FILM_MEAN_KEEP, share);

/**
 * 10 — the shipped film over the shipped bloom, and the dial is `film.share` itself: its own
 * range and its own rest, read off the handle the painter reads, so the bench opens at the
 * picture the app ships and a rest moved in one place moves in both (principle 1). The scene's
 * own read is pulled toward the scene's own first stop by whatever the film leaves standing: at
 * one the bloom is the deepest shade the dial admits and at nought it stands at full strength. **A fade along the palette and not a composite in colour** — which is what the
 * painter itself now does, the film being a shade on the read and no longer a window cut in the
 * alpha (0340), so the bench and the app spend the share the same way and cannot drift.
 */
export const FILM_DIAL: SketchDial = {
  min: FILM_SHARE.min,
  max: FILM_SHARE.max,
  step: FILM_SHARE.step,
  rest: FILM_SHARE.rest,
};

/**
 * Where the scene's own read starts on the film's palette: the page's ground holds the first of
 * six stops, so the scene runs from a fifth of the way along and the share is spent **inside**
 * that fifth-to-one stretch, which is what makes the bench's shade the painter's. A pixel the
 * film takes all of lands on the scene's own first stop and never on the ground under it — the
 * same relation the app has to the page its opaque tile is composited over (0340). The palette
 * the legend draws is assembled against this number and throws if the two ever disagree
 * (src/ui/sketch/drift/SketchDriftFilm.tsx).
 */
export const FILM_GROUND_STOP = 1 / 5;

const filmScene = sceneField("bloom");
export const filmField: SketchDriftField = (x, y, share) =>
  FILM_GROUND_STOP +
  (1 - FILM_GROUND_STOP) *
    (filmStand(filmKeep(x * SCENE_BENCH_PX, y * SCENE_BENCH_PX), share) *
      filmScene(x, y, SCENE_DIAL.rest));

/**
 * 11 — the lattice of marks over the shipped water under the shipped film, and the dial is
 * `glyph.flat` itself, read off the handle the painter reads (principle 1): how far every mark's
 * colour is pulled toward the ramp's middle stop, nought leaving the bloom's own five stops and
 * one the single ink the reference this lattice was drawn against is printed in (0345).
 */
export const GLYPH_DIAL: SketchDial = {
  min: GLYPH_FLAT.min,
  max: GLYPH_FLAT.max,
  step: GLYPH_FLAT.step,
  rest: GLYPH_FLAT.rest,
};

/** The cell of marks at the bench's own display, and how many span the bench picture each way. */
const GLYPH_CELL = FILM_PITCH;
const GLYPH_WIDE = Math.round(FIELD_ASPECT * SCENE_BENCH_PX);
const GLYPH_ACROSS = sceneRepeat(GLYPH_WIDE, GLYPH_CELL);
const GLYPH_DOWN = sceneRepeat(SCENE_BENCH_PX, GLYPH_CELL);
const GLYPH_COLS = sceneCells(GLYPH_WIDE, GLYPH_CELL);

/**
 * Where on the water's ramp one cell of the bench picture stands: the film's shade over the scene's
 * own read, averaged over every pixel of the cell, which is how the tile reads a cell (0345). Held
 * per cell, because the stage asks a pixel at a time and a cell is forty-nine of them: a mean
 * recomputed at every pixel is the scene run fifty times over per paint.
 */
const cells = new Map<number, number>();
const glyphScene = sceneField("water");
function glyphCell(col: number, row: number): number {
  const key = row * GLYPH_COLS + col;
  const held = cells.get(key);
  if (held !== undefined) return held;
  const x0 = Math.floor(col * GLYPH_ACROSS);
  const x1 = Math.min(GLYPH_WIDE, Math.ceil((col + 1) * GLYPH_ACROSS));
  const y0 = Math.floor(row * GLYPH_DOWN);
  const y1 = Math.min(SCENE_BENCH_PX, Math.ceil((row + 1) * GLYPH_DOWN));
  let sum = 0;
  for (let py = y0; py < y1; py += 1) {
    for (let px = x0; px < x1; px += 1) {
      sum +=
        filmStand(filmKeep(px, py), FILM_SHARE.rest) *
        glyphScene((px + 0.5) / SCENE_BENCH_PX, (py + 0.5) / SCENE_BENCH_PX, SCENE_DIAL.rest);
    }
  }
  const mean = sum / Math.max(1, (y1 - y0) * (x1 - x0));
  cells.set(key, mean);
  return mean;
}

/**
 * The lattice as the stage draws it: a pixel a mark covers stands where its cell stands on the
 * water's ramp, pulled toward the ramp's middle by the dial, above the page's ground the way the
 * film's palette is laid; a pixel it leaves uncovered is the page. The water and not the film's
 * bloom, because the reference is glints on black water in one ink, and because the bench reads
 * every palette once (SketchDrifts.test.tsx). The mark is the tile's own
 * (`markAt`, `markCoverage`), read hard rather than soft, because the bench is read at its own
 * pixels and a soft edge is the painter's business.
 */
export const glyphField: SketchDriftField = (x, y, flat) => {
  const px = Math.floor(x * SCENE_BENCH_PX);
  const py = Math.floor(y * SCENE_BENCH_PX);
  const col = Math.min(GLYPH_COLS - 1, Math.floor(px / GLYPH_ACROSS));
  const row = Math.floor(py / GLYPH_DOWN);
  const stood = glyphCell(col, row);
  const mark = markAt(stood, GLYPH_COUNT, GLYPH_PHASE.rest);
  const u = (px - Math.floor(px / GLYPH_ACROSS) * GLYPH_ACROSS) / GLYPH_ACROSS;
  const v = (py - row * GLYPH_DOWN) / GLYPH_DOWN;
  if (markCoverage(mark, u, v, 0) < 0.5) return 0;
  return FILM_GROUND_STOP + (1 - FILM_GROUND_STOP) * (stood + (0.5 - stood) * flat);
};
