/**
 * @role The picture folded into square cells: a rounded box in each with its gutter and its rim lit,
 *   and the field showing through the inside. The one geometry that is a pattern rather than a
 *   place — a cell is baked once and the whole lattice is that cell repeated, turned, scaled and
 *   slid — so how tight it is, which way it leans and how it breathes are all free on a frame, and
 *   only the rim's width is baked. Pure maths on cell units, and the one place a cell is a number.
 * @instead Where the cell is baked, beside every other geometry → src/lib/moireGeometry.ts. Where
 *   the lattice is drawn through a pattern → `cutLattice` in src/ui/moireCanvas.ts. How many cells
 *   the rack standing asks for, and the lean and breath the output gives it → src/ui/moireShape.ts.
 *   The bench picture this came off → src/ui/sketch/sketchDrift.ts.
 */
import { type DriftGeometry, DRIFT_DISPERSE_REACH } from "./moire";
import { FRACTAL_GEOMETRIES, isFractalGeometry } from "./moireFractal";
import { profileBlock, type DriftProfile } from "./moireProfiles";
import { clamp } from "./range";

/** The coordinate a lattice row is cut along: a cell, repeated. */
export const LATTICE_GEOMETRY: DriftGeometry = "lattice";

/**
 * The coordinates no effect claims and none may: the two a fractal has, which are a picture of a
 * run, and the lattice, which is a picture of how much rack is standing. A row cut along any of
 * them is the field's own, built beside the wash and the session's (src/ui/moireRowsField.ts).
 */
export const FIELD_GEOMETRIES: readonly DriftGeometry[] = [...FRACTAL_GEOMETRIES, LATTICE_GEOMETRY];

export const isFieldGeometry = (geometry: DriftGeometry): boolean =>
  isFractalGeometry(geometry) || geometry === LATTICE_GEOMETRY;

/** Where a point falls once the picture is folded into `per` square cells per unit of height. */
export function cellFold(
  x: number,
  y: number,
  per: number,
): { cx: number; cy: number; qx: number; qy: number } {
  if (per <= 0) throw new Error(`A picture folded into ${per} cells is not folded.`);
  const cx = Math.floor(x * per);
  const cy = Math.floor(y * per);
  return { cx, cy, qx: x * per - cx - 0.5, qy: y * per - cy - 0.5 };
}

/**
 * The signed distance to a rounded box centred on nought — negative inside, nought on the rim,
 * positive outside — which is what every cell in the reference is: a rounded square whose rim is
 * where the ramp turns hot.
 */
export function roundedBox(qx: number, qy: number, half: number, round: number): number {
  const dx = Math.abs(qx) - (half - round);
  const dy = Math.abs(qy) - (half - round);
  const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
  return outside + Math.min(Math.max(dx, dy), 0) - round;
}

/** How lit a rim is at a distance from it: one on the line, falling off over `width` either side. */
export const rim = (distance: number, width: number): number =>
  Math.exp(-((distance / width) ** 2));

/** One cell, in units of its own side: how far its box reaches from the middle, and how round. */
export const CELL = { half: 0.45, round: 0.09 } as const;

/**
 * How wide the lit rim is, in cell units, at either end of the ink's own disperse: a picture
 * whose ink is not dispersed draws a hairline gutter, and a fully dispersed one a broad one. Read
 * off the ink because the ink is already travelled and already stepped (0266), so the rim walks
 * the ladder the picture is paying for and never a second one.
 */
export const LATTICE_RIM: readonly [number, number] = [0.02, 0.08];

export const latticeRim = (disperse: number): number =>
  LATTICE_RIM[0] + (LATTICE_RIM[1] - LATTICE_RIM[0]) * clamp(disperse / DRIFT_DISPERSE_REACH, 0, 1);

/**
 * Where a point of one cell stands in the profile's cycle: on the crest — the half turn, where the
 * plain wave blocks everything — on the gutter and on the rim, and at the trough deep inside, so
 * the field shows through the box. The rim is a ramp `rim` wide inside the box's edge and never a
 * step, so the strip's thirty-two pixels do not alias it.
 */
export function latticeTurns(qx: number, qy: number, rimWidth: number): number {
  const edge = roundedBox(qx, qy, CELL.half, CELL.round);
  if (edge >= 0) return 0.5;
  return 0.5 * clamp(1 + edge / rimWidth, 0, 1);
}

/** How many pixels across one baked cell is. Enough that a cell drawn a hundred wide has no stair. */
export const LATTICE_TILE_PX = 256;

/**
 * One cell, written as alpha into an RGBA field `size` square — only the fourth byte of each pixel,
 * the way `curvedField` writes a tile, and cut to the row's own profile. Every edge pixel is
 * gutter, which is what lets the cell be laid as a repeating pattern with no seam.
 */
export function latticeTile(
  alpha: Uint8ClampedArray,
  size: number,
  profile: DriftProfile,
  rimWidth: number,
): void {
  if (!(rimWidth > 0)) throw new Error(`A rim ${rimWidth} wide lights nothing.`);
  for (let y = 0; y < size; y++) {
    const qy = (y + 0.5) / size - 0.5;
    for (let x = 0; x < size; x++) {
      const qx = (x + 0.5) / size - 0.5;
      alpha[(y * size + x) * 4 + 3] = Math.round(
        255 * profileBlock(profile, latticeTurns(qx, qy, rimWidth)),
      );
    }
  }
}

/**
 * How many cells stand in the picture's height, from the loosest lattice a rack of one draws to
 * the tightest, which `LATTICE_REACH` entries standing earn. Presence-weighted, so an entry fading
 * in tightens the lattice as it arrives and never in one step.
 */
export const LATTICE_CELLS: readonly [number, number] = [1, 4];
export const LATTICE_REACH = 6;

export const latticeCells = (standing: number): number =>
  LATTICE_CELLS[0] +
  (LATTICE_CELLS[1] - LATTICE_CELLS[0]) * clamp((standing - 1) / (LATTICE_REACH - 1), 0, 1);

/**
 * How hard the lattice cuts, off how loud the output is: a floor, so a lattice is there whenever a
 * rack is, and the rest of the way up with the level, which is the gutter thickening on a hit.
 */
export const LATTICE_CUT: readonly [number, number] = [0.35, 0.9];

export const latticeCut = (loud: number): number =>
  LATTICE_CUT[0] + (LATTICE_CUT[1] - LATTICE_CUT[0]) * clamp(loud, 0, 1);

/**
 * How far the lattice leans off the axis with the output's own tilt, in turns: an eighth either
 * way, so a dark output leans one way and a bright one the other and neither is square.
 */
export const LATTICE_LEAN = 0.125;

export const latticeLean = (tilt: number): number => LATTICE_LEAN * (clamp(tilt, 0, 1) - 0.5);

/**
 * How many quarter turns the lattice turns in one period of its row. A whole number, because a
 * square lattice a quarter turn on is the same lattice, so the phase wrapping is a symmetry and
 * never a snap.
 */
export const LATTICE_QUARTERS = 1;

/** How far the lattice breathes about its own scale over a period: a few percent, and back. */
export const LATTICE_BREATH = 0.06;
