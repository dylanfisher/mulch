/**
 * @role The arithmetic the drift bench's eight pictures are drawn off: the stand-in weave every one
 *   of them starts from, and the handful of shader-side moves — a cell fold, a rounded box, a
 *   domain warp, a smooth minimum, a terrace, a ramp — each written once so the pictures cannot
 *   disagree about what a warp or a terrace is. The cell, the rim and the mirror fold live in
 *   src/lib now, with the picture that took them (0278). Pure maths on picture units: the
 *   picture is `FIELD_ASPECT` wide and one high, no canvas, no clock, no context.
 * @instead The eight fields built out of these → src/ui/sketch/sketchDrift.ts. The canvas that
 *   writes one → src/ui/sketch/SketchDriftStage.tsx. The real picture's own arithmetic, which
 *   these stand in for and never read → src/lib/moire.ts and the files beside it.
 */
import { cosTurn, halfCosine, TAU } from "@/lib/moire";
import { rim } from "@/lib/moireLattice";
import { WARP_ACROSS, WARP_DOWN } from "@/lib/moireWarp";
import { clamp } from "@/lib/range";
import type { Ink } from "@/ui/moireScreen";
import { SKETCH_VIEW } from "@/ui/sketch/SketchFrame";

/** How many units wide the picture is, at one unit high — the bench's own box, said as a ratio. */
export const FIELD_ASPECT = SKETCH_VIEW.wide / SKETCH_VIEW.high;

/** How deep the stand-in gratings cut, so a fringe is a fringe and not a stain. */
export const FIELD_DEPTH = 0.6;

/**
 * The bench's stand-in for the real picture: two straight gratings a little apart in pitch and a
 * little apart in angle, cut as a product the way the real field is cut (`destination-out`,
 * src/ui/moireCanvas.ts). In cycles per unit of height — at a 160-pixel stage that is a seven-ish
 * pixel lattice, which is the pitch two gratings have to share before they beat at all.
 */
export const WEAVE: readonly { cycles: number; turn: number }[] = [
  { cycles: 23, turn: 0 },
  { cycles: 21, turn: 0.04 },
];

/** How much light one grating lets through at a phase, at a depth — the real `through`'s shape. */
export const through = (turns: number, depth = FIELD_DEPTH): number =>
  1 - depth * halfCosine(turns);

/** The stand-in weave at a point: what is left of the light once every grating has cut it. */
export function weave(x: number, y: number, phase = 0): number {
  let light = 1;
  for (const grating of WEAVE) {
    const along = x * cosTurn(grating.turn) + y * Math.sin(TAU * grating.turn);
    light *= through(along * grating.cycles + phase);
  }
  return light;
}

/** How much ink is on the picture where that much light is left: the picture is one minus the field. */
export const lit = (light: number): number => clamp(1 - light, 0, 1);

/**
 * A broad, smooth field with a few lobes in it — what the inside of a reference cell looks like
 * before any grating touches it: a lens of value, not a texture. Nought to one, with a phase that
 * slides the lobes so a picture can be moved without being rebuilt.
 */
export function lobes(x: number, y: number, phase = 0): number {
  const a = Math.sin(TAU * (0.55 * x + 0.3 * Math.sin(TAU * (0.7 * y + phase))));
  const b = Math.cos(TAU * (0.6 * y + 0.25 * Math.sin(TAU * (0.45 * x - phase))));
  return 0.5 + 0.5 * a * b;
}

/**
 * The coordinate bent by itself, twice over — the swirl inside a reference cell is nothing but
 * this: the two sines the real warp slides the field's slices by (src/lib/moireWarp.ts), and a
 * second pair at half the amount fed back through the first. At no amount it is the identity, so a
 * warp of nought is the unwarped picture and not a near one.
 */
export function warp(x: number, y: number, amount: number, phase = 0): [number, number] {
  if (amount === 0) return [x, y];
  const x1 = x + amount * Math.sin(TAU * (WARP_DOWN * y + phase));
  const y1 = y + amount * Math.sin(TAU * (WARP_ACROSS * x1 - phase));
  const x2 = x1 + amount * 0.5 * Math.sin(TAU * (2.1 * y1 + 0.3 + phase));
  const y2 = y1 + amount * 0.5 * Math.sin(TAU * (1.7 * x2 - 0.2 - phase));
  return [x2, y2];
}

/**
 * The smooth minimum of two distances: the union of two shapes with the join between them rounded
 * over `k`, which is how two blobs merge instead of overlapping. At `k` nought it is the minimum.
 */
export function smin(a: number, b: number, k: number): number {
  if (k <= 0) return Math.min(a, b);
  const h = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1);
  return b + (a - b) * h - k * h * (1 - h);
}

/**
 * A smooth value cut into `steps` flat terraces with each riser lit — the banding an escape count
 * has by nature, put back onto a field that does not. The riser is lit over `edge` of a step.
 */
export function terrace(value: number, steps: number, edge: number): number {
  if (!Number.isInteger(steps) || steps < 1) {
    throw new Error(`A field cut into ${steps} terraces is not cut.`);
  }
  const at = clamp(value, 0, 1) * steps;
  const step = Math.min(Math.floor(at), steps - 1);
  const riser = at - step;
  const flat = step / Math.max(steps - 1, 1);
  return clamp(flat + rim(Math.min(riser, 1 - riser), edge) * (1 - flat), 0, 1);
}

/**
 * A value read through a ramp of inks, the way a shader reads a scalar through a palette: nought is
 * the first stop, one the last, and between two stops the channels are mixed straight. Two stops
 * is the picture the instrument draws today — its ground and its ink — and five is the reference.
 */
export function ramp(stops: readonly Ink[], value: number): Ink {
  const first = stops[0];
  if (first === undefined) throw new Error("A ramp of no inks reads nothing.");
  if (stops.length === 1) return first;
  const at = clamp(value, 0, 1) * (stops.length - 1);
  const low = Math.min(Math.floor(at), stops.length - 2);
  const from = stops[low];
  const to = stops[low + 1];
  if (from === undefined || to === undefined) throw new Error(`The ramp has no stop ${low}.`);
  const share = at - low;
  return [
    from[0] + (to[0] - from[0]) * share,
    from[1] + (to[1] - from[1]) * share,
    from[2] + (to[2] - from[2]) * share,
    from[3] + (to[3] - from[3]) * share,
  ];
}

/**
 * What a picture fed back into itself through a zoom settles to: the sum of its own copies, each
 * scaled about the centre by one more `zoom` and each `keep` as bright as the one before, over
 * `copies` frames — the closed form of what `feedFrame` (src/ui/moireCanvas.ts) accumulates one
 * frame at a time. Normalised, so what is summed is a picture and not a glare.
 */
export function tunnel(
  base: (x: number, y: number) => number,
  x: number,
  y: number,
  centre: readonly [number, number],
  zoom: number,
  keep: number,
  copies: number,
): number {
  if (zoom <= 0) throw new Error(`A tunnel scaled by ${zoom} draws nothing.`);
  let sum = 0;
  let weight = 0;
  let scale = 1;
  let bright = 1;
  for (let copy = 0; copy < copies; copy += 1) {
    sum += bright * base(centre[0] + (x - centre[0]) / scale, centre[1] + (y - centre[1]) / scale);
    weight += bright;
    scale *= zoom;
    bright *= keep;
  }
  return weight === 0 ? 0 : sum / weight;
}
