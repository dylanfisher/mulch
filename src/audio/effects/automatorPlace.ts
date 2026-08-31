/**
 * @role One place an automator is holding, and the ramps it rides: its presence's arrival and
 *   departure, and one per knob the arrival was drawn at. Read rather than stored — where a fade
 *   has got to is derived at the instant it is asked for, so it answers the same offline, where
 *   there is no live AudioParam to ask (0202, 0204).
 * @instead The run that lays these places and takes them away → ./automator.ts. What the
 *   population *is*, as pure maths → src/lib/effectGrowth.ts.
 */
import { clamp, normalize } from "@/lib/range";
import type { EffectInstanceId, ParamDeclaration } from "./contract";

/** One ramp on a place's presence: where it starts, where it ends, and over what. */
export type Fade = { at: number; over: number; from: number; to: number };

/**
 * One place the automator is holding, and the two ramps it rides. Two rather than one, because the
 * run is laid ahead across the pump's horizon: a place's departure is often scheduled while its
 * arrival is still in the future, and a single record of "the last fade" would forget the arrival
 * and report a place as fully in from the moment it was drawn.
 */
export type Standing = {
  id: EffectInstanceId;
  effect: string;
  born: number;
  /**
   * When it first begins to sound. Its own field rather than the arrival's `at`, so that reading
   * it is never confused by a departure that has already been written.
   */
  arrived: number;
  arrival: Fade;
  departure: Fade | null;
  /**
   * Where every knob this arrival had drawn for it stands, as a fraction of that knob's own range
   * — the picture a row paints of what the automator did to this effect. Held per place and never
   * rebuilt, so a frame reading it allocates nothing (0070).
   */
  values: number[];
  /**
   * Each of those values' own ramp, in that parameter's own units and in the `Fade` shape a
   * presence already rides: where it started, where it is headed, when, and over what. A wander is
   * a ramp, so where the dial stands is derived off this at every read the way `reach` derives a
   * presence — a value written straight to its destination would draw the dial a whole ramp ahead
   * of the sound (0202, 0204).
   */
  fades: Fade[];
  /**
   * The declaration each of those is of, so a wander can rewrite the one it moved and a read can
   * put its ramp back into the knob's own space (0208).
   */
  specs: ParamDeclaration[];
  /**
   * How long this place has stood under a hold, in seconds. Its life is what it has left to run
   * and not what the wall clock has taken off it, so a held run's rows count down to where they
   * were and stop rather than draining to nothing while nothing leaves (0215). Nought for every
   * place laid by a run nobody has held.
   */
  waited: number;
  /** Set when it is on its way out: the context time past which its nodes may go. */
  goneAt: number | null;
};

/**
 * Where each of a place's drawn knobs stands at `when`, as a fraction of its own range, written
 * back into the array the row shares. Derived off each value's own ramp the way `reach` is derived
 * off the presence's, and written in place: a row is read sixty times a second and may allocate
 * nothing (0070, 0202).
 */
export function drawnAt(place: Standing, when: number): void {
  for (const [at, ramp] of place.fades.entries()) {
    const spec = place.specs[at];
    if (spec === undefined) continue;
    place.values[at] = clamp(normalize(fadeAt(ramp, when), spec.min, spec.max, spec.curve), 0, 1);
  }
}

/**
 * Whether a place's own fade out has already begun — the one state nothing may ask for twice, and
 * the one that is not the same as having a departure written. Read rather than stored, so `goneAt`
 * goes on meaning only when the nodes may go.
 */
export function departing(place: Standing, when: number): boolean {
  return place.departure !== null && place.departure.at <= when;
}

/**
 * When a place begins to leave: the departure it has already been given, or — while that tick is
 * still ahead — the life it was laid for. Read rather than stored, so a row can say how long
 * something has left before anything has been scheduled to take it away.
 */
export function leavesAt(place: Standing, life: number): number {
  return place.departure?.at ?? place.arrived + life + place.waited;
}

/** Where one ramp has got to at `when`. */
export function fadeAt(fade: Fade, when: number): number {
  if (when <= fade.at) return fade.from;
  if (when >= fade.at + fade.over) return fade.to;
  return fade.from + (fade.to - fade.from) * ((when - fade.at) / fade.over);
}

/**
 * Where a place's presence stands at `when`, read off its ramps rather than out of the graph — so
 * it answers the same offline, where there is no live AudioParam to ask.
 */
export function presenceAt(place: Standing, when: number): number {
  const leaving = place.departure;
  if (leaving !== null && when >= leaving.at) return fadeAt(leaving, when);
  return fadeAt(place.arrival, when);
}

/**
 * How long after a fade has finished the nodes may go. One ordinary re-arm, so a removal always
 * lands on a later pump than the fade it is waiting on however the two cadences fall.
 */
export const LEAVE_GRACE_SECS = 0.25;
