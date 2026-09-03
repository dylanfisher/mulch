/**
 * @role The patterns a painting fills the field through: the one cache of them per surface, which
 *   every straight row's tile is cut through — and the lattice, which is the one row that is
 *   nothing but a pattern: one baked cell, repeated, turned, scaled and slid by a matrix, so how
 *   tight the rack folds the picture and how it leans and breathes are free on a frame (0278).
 *   Split out of the painter at the 800-line hard cap (0045).
 * @instead The painter that fills through these, and every straight row's drawing →
 *   src/ui/moireCanvas.ts. The cell itself and every reading it is drawn with →
 *   src/lib/moireLattice.ts. When the cell is baked → src/ui/driftTiles.ts.
 */
import { halfCosine, TAU, turnedScale, type Aim, type MoireRow, type ScreenInk } from "@/lib/moire";
import { fractalRest } from "@/lib/moireFractal";
import { centreAcross } from "@/lib/moireGeometry";
import { LATTICE_CELL_PX } from "@/lib/moireGrating";
import {
  LATTICE_BREATH,
  LATTICE_GEOMETRY,
  LATTICE_QUARTERS,
  LATTICE_RIM,
  LATTICE_TILE_PX,
  latticeRim,
} from "@/lib/moireLattice";
import { PLAIN_PROFILE } from "@/lib/moireProfiles";
import { devicePx } from "@/lib/range";
import { curvedTileFor, heldStraight, type DriftOrder, type DriftTileImage } from "@/ui/driftTiles";
import { stepped } from "@/ui/moireScreenInk";
import type { MoireShape } from "@/ui/moireShape";

/**
 * How many straight tiles are kept. A straight row's is sixty-four pixels and a swept one is a
 * picture wide; the curved ones are a whole picture each and are held by their own shop
 * (src/ui/driftTiles.ts), rather than in one cache the cheap ones would evict the dear ones out of.
 *
 * **This number may not put a tile back on the frame path.** A cap under the rows one painting
 * actually asks for would not degrade — it would miss on every lookup of every frame, because the
 * rows are walked in the same order each time and the oldest entry is always the one asked for
 * next. So this is what a resting instrument holds rather than a promise about the worst case: a
 * rack of reverbs across two surfaces goes over it for as long as it is up and shrinks back after.
 */
export const TILE_CACHE = 12;

/**
 * The patterns each canvas cuts through, one per tile it has drawn — per canvas, because a pattern
 * belongs to a context.
 */
const gratings = new WeakMap<HTMLCanvasElement, Map<string, CanvasPattern>>();

/**
 * The pattern `surface` cuts one tile's gratings through, built once per surface per tile and held
 * against the surface.
 */
export function gratingOf(
  surface: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  key: string,
  tile: DriftTileImage | null,
): CanvasPattern | null {
  const held = gratings.get(surface) ?? new Map<string, CanvasPattern>();
  gratings.set(surface, held);
  const already = held.get(key);
  if (already !== undefined) return already;
  if (tile === null) return null;
  const pattern = context.createPattern(tile, "repeat");
  if (pattern === null) return null;
  return heldStraight(held, key, pattern, TILE_CACHE);
}

/**
 * The one order the lattice asks the shop with, refilled like the curved rows' own (0070). A cell
 * and not a place: the tile is `LATTICE_TILE_PX` square whatever the picture's size, its anchor
 * is its own middle and nothing about the picture reaches it but the rim — so every picture and
 * every size shares one cell per rim stop.
 */
const latticeOrder: DriftOrder = {
  key: "",
  slot: "",
  geometry: LATTICE_GEOMETRY,
  profile: PLAIN_PROFILE,
  width: LATTICE_TILE_PX,
  height: LATTICE_TILE_PX,
  ref: 1,
  place: {
    x: LATTICE_TILE_PX / 2,
    y: LATTICE_TILE_PX / 2,
    pitch: 1,
    cover: 1,
    rings: 1,
    spokes: 1,
    folds: 0,
    rim: 0,
    ...fractalRest(),
  },
};

/**
 * Cut the lattice over the whole field: one baked cell, laid as a repeating pattern — so how tight
 * it stands, which way it leans, how far it has turned and how it breathes are all a matrix and
 * cost a fill, and the one thing baked is the rim's width (0278). The rim is read off the ink's
 * own travelled disperse and stepped onto the ladder the ink already walks, so a lattice thickening
 * asks for the bakes the picture is paying for and never a ladder of its own (0266).
 *
 * A picture whose first cell is still being baked draws no lattice this painting, exactly as a
 * curved row draws nothing until its tile exists (0144); and the pattern is keyed on the cell the
 * shop actually handed back, so a fallback cell is never filed under the rim it is standing in for.
 */
export function cutLattice(
  field: HTMLCanvasElement,
  ink: CanvasRenderingContext2D,
  row: MoireRow,
  turns: number,
  cut: number,
  shape: Readonly<MoireShape>,
  tint: Readonly<ScreenInk>,
  dpr: number,
  aimed: Aim,
): boolean {
  const { height, width } = field;
  const order = latticeOrder;
  order.profile = row.profile;
  order.place.rim = stepped(latticeRim(tint.disperse), LATTICE_RIM[1]);
  order.key = `${LATTICE_GEOMETRY}|${row.profile}|${order.place.rim}|${LATTICE_TILE_PX}`;
  order.slot = `${LATTICE_GEOMETRY}|${row.shape}|${row.profile}`;
  const held = curvedTileFor(order);
  if (held === null) return true;
  const grating = gratingOf(
    field,
    ink,
    `${LATTICE_GEOMETRY}|${row.profile}|${held.place.rim}|${LATTICE_TILE_PX}`,
    held.tile,
  );
  if (grating === null) return false;
  aimLattice(row, turns, shape, dpr, width, height, aimed);
  grating.setTransform(aimed);
  ink.globalAlpha = cut;
  ink.fillStyle = grating;
  ink.fillRect(0, 0, width, height);
  return true;
}

/**
 * Point the lattice: one cell scaled to its own rest size in device pixels, tightened by the ratio
 * the shape says and breathing a few percent over the row's period — so the picture is folded into
 * `height / (LATTICE_CELL_PX · dpr)` cells at rest and that many times more as the rack fills, and
 * a cell is the same size on a thirty-two-pixel strip and a window fourteen hundred tall (0293).
 * Turned a whole number of quarter turns a period plus the lean
 * the output gives it; and slid one whole cell a period along its own axis, about the row's own
 * anchor. Every term comes back where it left at the wrap — a square lattice a quarter turn or a
 * cell on is the same lattice — so the phase wrapping is a symmetry and never a snap.
 */
function aimLattice(
  row: MoireRow,
  turns: number,
  shape: Readonly<MoireShape>,
  dpr: number,
  width: number,
  height: number,
  aimed: Aim,
): void {
  const cell = (LATTICE_CELL_PX * devicePx(dpr)) / Math.max(shape.cells, Number.EPSILON);
  const scale = (cell / LATTICE_TILE_PX) * (1 + LATTICE_BREATH * halfCosine(turns));
  const angle = TAU * ((LATTICE_QUARTERS * turns) / 4 + shape.lean);
  turnedScale(aimed, scale, angle);
  // The cell point pinned at the anchor walks one whole cell along the pattern's own axis a
  // period, which is the slide; the anchor is the ground's, so a jump travels the point the
  // lattice turns about.
  const along = turns * LATTICE_TILE_PX;
  aimed.e = centreAcross(row.centre, width) - aimed.a * along;
  aimed.f = centreAcross(row.centre, height) - aimed.b * along;
}
