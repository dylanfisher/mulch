/**
 * @role Where a curved row stands and how its tile is aimed: the one order the tile shop is asked
 *   with, the stepped place every field of it is keyed by, and the transform that points the tile
 *   the shop hands back — about the row's own anchor, zoomed by the fraction its phase has reached.
 *   Split out of the painter at the 800-line hard cap (0045), and pure of the canvas: it fills
 *   records and reads none of the DOM.
 * @instead The painter that asks, and every straight row's drawing → src/ui/moireCanvas.ts. The
 *   maths a place is made of → src/lib/moireGeometry.ts; the seed a fractal row is cut through →
 *   src/lib/moireFractal.ts. When a tile is baked → src/ui/driftTiles.ts.
 */
import { DRIFT_CENTRE_REACH, LINEAR_GEOMETRY, type MoireRow } from "@/lib/moire";
import {
  fractalKeyed,
  fractalRest,
  fractalSeedInto,
  fractalStopsRest,
  type FractalStops,
} from "@/lib/moireFractal";
import {
  centreAcross,
  geometryCover,
  geometrySlideX,
  geometrySlideY,
  geometryZoom,
  gratingRings,
  gratingSpokes,
  steppedRings,
  type DriftPlace,
} from "@/lib/moireGeometry";
import { steppedFolds } from "@/lib/moireFold";
import { PLAIN_PROFILE } from "@/lib/moireProfiles";
import type { DriftOrder } from "@/ui/driftTiles";
import { stepped } from "@/ui/moireScreen";

/** A 2D transform as `setTransform` takes it, refilled in place by the painter (0070). */
export type Aim = { a: number; b: number; c: number; d: number; e: number; f: number };

/**
 * What the shop is asked for, one object refilled per curved row for the same reason. Everything a
 * tile is baked from is stepped into `order.place` and read back out of it, so the key and the bake
 * cannot say two different things about one row.
 */
const order: DriftOrder = {
  key: "",
  slot: "",
  geometry: LINEAR_GEOMETRY,
  profile: PLAIN_PROFILE,
  width: 1,
  height: 1,
  ref: 1,
  place: {
    x: 0,
    y: 0,
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
 * And where the picture's structure is standing, stepped onto the ladder every tile in the picture
 * is keyed through — one object refilled beside the order, for the same reason. `DRIFT_STEPS` and
 * not a stop count of its own: the stops travel continuously and a tile is picture-sized, so what
 * may reach a bake is the one fact `stepped` already is (0142, 0248, principle 1).
 */
const stepping: FractalStops = fractalStopsRest();

/**
 * Where a curved row stands, filled into the one order the shop is asked with — its key, the row it
 * belongs to, and the place its tile is baked at.
 */
// Every line is one field of the place and the key it makes: the fold is the seventh of them, and
// a helper for one field would have one caller. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function placeCurved(
  row: MoireRow,
  asking: number,
  pitch: number,
  width: number,
  height: number,
  ref: number,
  seed: Readonly<FractalStops>,
  zoom: number,
  fly: number,
  folds: number,
): DriftOrder {
  const place = order.place;
  const centre = stepped(row.centre, DRIFT_CENTRE_REACH);
  place.rings = steppedRings(gratingRings(pitch, ref));
  place.pitch = ref / place.rings;
  place.spokes = gratingSpokes(place.pitch, ref);
  place.x = centreAcross(centre, width);
  place.y = centreAcross(centre, height);
  place.cover = geometryCover(row.geometry, place.pitch, width, height);
  // And the structure a fractal row is cut through: where the picture's travel has got to on the
  // plane — the field's own and no row's (0248). Stepped, like everything else here, and for the
  // same reason: it is baked, so stops that moved on every frame would ask for a picture-sized tile
  // on every frame (0142, 0246). Every row fills it and only the two fractal geometries read it.
  stepping.cx = stepped(seed.cx, DRIFT_CENTRE_REACH);
  stepping.cy = stepped(seed.cy, DRIFT_CENTRE_REACH);
  stepping.ratio = stepped(seed.ratio, DRIFT_CENTRE_REACH);
  stepping.turn = stepped(seed.turn, DRIFT_CENTRE_REACH);
  // And the opening and the flight, both of which the caller resolved: a scale and a travel, each
  // already on the one ladder every other key here is on (`cutGratings`, `fractalFlight`).
  fractalSeedInto(place, stepping, zoom, fly);
  // And how many times the plane is folded before the row is cut: the automators standing,
  // travelled, on the fold's own ladder — baked, so it is stepped for the seed's reason, and in
  // every curved key because every curved geometry reads it (`foldPlane`, 0278).
  place.folds = steppedFolds(folds);
  place.rim = 0;
  order.geometry = row.geometry;
  order.profile = row.profile;
  order.width = width;
  order.height = height;
  order.ref = ref;
  // And the seed into the key for the two geometries that read it, and never for the four that do
  // not: a ring family's tile is shared by every row that would bake the identical one, and folding
  // a seed no bake reads into every key would give each of them a tile of its own. Per coordinate
  // and not per fractal row, because an escape row reads four of the six (`fractalKeyed`).
  const cut = fractalKeyed(row.geometry, place);
  order.key = `${row.geometry}|${row.profile}|${place.rings}|${centre}${cut}|${place.folds}|${width}x${height}`;
  // Which row is asking, and not what it is asking for: the fallback is this row's own last tile,
  // so the slot has to survive every step of the knob that changes the key (0144). Where it stands
  // in the order is part of that and not decoration — a row's shape is folded off its *parameter*,
  // so two lanes on the same knob of two instances of one effect are one shape, one geometry and
  // one profile, and would otherwise share a slot and hand each other's tiles back
  // (src/ui/moireRows.ts). Which order it is counted in is the caller's, because the picture's own
  // structure is counted among its own rows (0262).
  order.slot = `${asking}|${row.shape}|${row.geometry}|${row.profile}|${width}x${height}`;
  return order;
}

/**
 * Point one curved row's tile: about that row's own anchor, zoomed by the fraction of a percent its
 * phase has reached — a ring family cut on a logarithm moves by being scaled — and, for the one
 * geometry a scale does nothing to, with its apex walked round a circle a pitch across instead.
 */
export function aimCurved(row: MoireRow, turns: number, place: DriftPlace, aimed: Aim): void {
  const scale = place.cover * geometryZoom(row.geometry, turns, place.rings);
  aimed.a = scale;
  aimed.b = 0;
  aimed.c = 0;
  aimed.d = scale;
  aimed.e = place.x * (1 - scale) + geometrySlideX(row.geometry, turns, place.pitch);
  aimed.f = place.y * (1 - scale) + geometrySlideY(row.geometry, turns, place.pitch);
}
