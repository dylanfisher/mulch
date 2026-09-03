/**
 * @role The ramp the picture's ink is read along, and the orbit its rest runs on while the yard
 *   sounds: one colour as the four channels a pixel is written in, a value read through a list of
 *   those the way a shader reads a scalar through a palette, and where on that ramp a picture with
 *   nothing claiming its colour is drawn at a given second of sounding. Pure maths, no canvas, no
 *   clock of its own: the second it is handed is the deck's (0126).
 * @instead Which stops the ramp is made of — token names, never colours → `INK_RAMP_TOKENS` in
 *   src/ui/moireScreen.ts, the one file that resolves them. What an age does to a claim made
 *   against the orbit → `agedHue` in src/lib/moireAge.ts. The travel toward the result, and the
 *   ladder it is rounded onto → src/ui/moireScreenInk.ts.
 */
import { DRIFT_REST, TAU } from "./moire.ts";
import { tunable } from "./moireTuning.ts";
import { clamp } from "./range.ts";

/** One colour the theme resolved, as the four channels a pixel is written in. */
export type Ink = [number, number, number, number];

/**
 * A value read through a ramp of inks, the way a shader reads a scalar through a palette: nought is
 * the first stop, one the last, and between two stops the channels are mixed straight. Two stops
 * was the picture the instrument drew before 0301 — its ink and one token either side — and five
 * is what it draws now, with the caller's own ink at the middle stop.
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
 * How long the picture's resting ink takes to swing once along the ramp and back, in seconds of
 * sounding. **Four minutes**: a yard left playing goes somewhere the eye notices only when it
 * looks back, and a whole side of a record (`DRIFT_AGE_REACH_SECS`) sees it come and go five
 * times. Shorter and the picture reads as cycling; longer and nobody sees it move at all.
 */
export const INK_ORBIT_SECS = tunable("colour.orbitSecs", 240, { min: 10, max: 1200, step: 10 });

/**
 * How far either side of the middle stop the rest swings, in units of the ramp. At nothing the
 * rest is the caller's ink and the picture is what it drew before 0301; at a half it reaches both
 * ends of the ramp, which is as far as there is. A little over a third reaches past the two stops
 * beside the caller's ink and short of the ramp's ends, so an effect still has room to claim
 * either end over the orbit.
 */
export const INK_WANDER = tunable("colour.wander", 0.35, { min: 0, max: 0.5, step: 0.05 });

/**
 * Where on the ramp a picture nobody has claimed a colour for rests, at `sounding` seconds of
 * unbroken sounding. **Rest exactly at nothing**, so a yard that is not sounding — or one that has
 * just begun — rests where every yard rested before 0301, and a halted picture is painted on a
 * commit in the caller's own ink (0144). One sine over the orbit's own seconds: it passes back
 * through the middle stop every half orbit, so the picture is never parked at either end.
 */
export const orbitHue = (sounding: number): number =>
  sounding > 0
    ? DRIFT_REST.hue + INK_WANDER.value * Math.sin((TAU * sounding) / INK_ORBIT_SECS.value)
    : DRIFT_REST.hue;
