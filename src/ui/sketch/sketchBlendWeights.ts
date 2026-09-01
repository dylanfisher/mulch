/**
 * @role What each of the four blends of the cast *is*, with no picture on it: a hand's place in
 *   the pad's own coordinates → six weights over one, in the module's declaration order. Four
 *   weighings, the triangle's mounts, and where each blend stands when the bench is opened.
 * @instead The four pictures these are drawn as → src/ui/sketch/sketchBlends.tsx. The square they
 *   are drawn in → src/ui/sketch/sketchBlendPad.tsx.
 */
import {
  around,
  CORNERS,
  MIDDLE,
  NAMES,
  normalise,
  RING,
  type Place,
  type Point,
} from "@/ui/sketch/sketchBlendPad";
import { SKETCH_CAST } from "@/ui/sketch/sketchWalk";

/** How much of each corner a puck on the hexagon is standing in: inverse square, normalised. */
export function weighHexagon(at: Point) {
  return normalise(
    CORNERS.map((corner) => 1 / (Math.hypot(corner.x - at.x, corner.y - at.y) ** 2 + 400)),
  );
}

export const HEXAGON_START = { x: MIDDLE + 26, y: MIDDLE - 18 };
/** Where the readout starts: whatever the control blend is already standing in when it mounts. */
export const BLEND_START = weighHexagon(HEXAGON_START);

/** Which three of the six the triangle is mounted with, and the three one swap reaches. */
export const MOUNTED: readonly number[] = [0, 2, 4];
export const SPARE: readonly number[] = [1, 3, 5];

/** The triangle stands on three of the hexagon's own places, so the two pads read at one scale. */
export const TRIANGLE = MOUNTED.map((index) => around(index, SKETCH_CAST.length, RING));
export const TRIANGLE_NAMES = MOUNTED.map((index) => around(index, SKETCH_CAST.length, NAMES));

/** The triangle's three places, read by corner: an absent one is a mount list that has drifted. */
export function cornerOf(places: readonly Place[], corner: number) {
  const place = places[corner];
  if (place === undefined) throw new Error(`The triangle has no corner ${corner} to draw on.`);
  return place;
}

/** A mounted character's own name, which is the module's and never an index. */
export function nameOf(index: number) {
  const name = SKETCH_CAST[index];
  if (name === undefined) throw new Error(`The cast has no ${index}th character to mount.`);
  return name;
}

/**
 * A point's share of one triangle corner: the true barycentric coordinate, clamped at nought so
 * a hand outside the triangle lands on its nearest edge rather than on a negative amount.
 */
function barycentric(at: Point, corner: number) {
  const a = cornerOf(TRIANGLE, corner);
  const b = cornerOf(TRIANGLE, (corner + 1) % 3);
  const c = cornerOf(TRIANGLE, (corner + 2) % 3);
  const whole = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
  const share = ((b.y - c.y) * (at.x - c.x) + (c.x - b.x) * (at.y - c.y)) / whole;
  return Math.max(0, share);
}

/** Three of the six, weighed barycentrically at the triangle's corners, and the rest at nothing. */
export function weighTriangle(mounted: readonly number[]) {
  return (at: Point) => {
    const held = SKETCH_CAST.map(() => 0);
    for (const [corner, index] of mounted.entries()) held[index] = barycentric(at, corner);
    return normalise(held);
  };
}

/** Where the six levers stand when the bench is opened: a mix, so the picture is not a flat row. */
export const LEVER_START = [0.9, 0.55, 0.3, 0.2, 0.12, 0.45];

/** How wide the sweep reaches, as a fraction of half a turn, at the rim and at the middle. */
const SWEEP_NARROW = 0.24;
const SWEEP_WIDE = 0.96;

/** How much of each of the six one sweep of the wheel is standing in, and how wide it stands. */
export function weighWheel(at: Point) {
  const angle = Math.atan2(at.y - MIDDLE, at.x - MIDDLE);
  const out = Math.min(1, Math.hypot(at.x - MIDDLE, at.y - MIDDLE) / RING);
  const spread = (SWEEP_NARROW + (1 - out) * (SWEEP_WIDE - SWEEP_NARROW)) * Math.PI;
  const held = CORNERS.map((corner) => {
    const apart = Math.abs(((corner.angle - angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    return Math.max(0, 1 - apart / spread);
  });
  return { angle, spread, weights: normalise(held) };
}

export const WHEEL_START = { x: MIDDLE + 40, y: MIDDLE - 30 };
/** The blend is the six; the sweep's own angle and width are the picture's and stay here. */
export const weighSweep = (at: Point) => weighWheel(at).weights;
