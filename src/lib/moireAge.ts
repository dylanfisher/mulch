/**
 * @role How old a performance is, and the two things about the picture that widen with it: how far
 *   its ink may be carried between the two inks, and how far the reference row's spacing may be
 *   drawn from rest. One curve over one reach in seconds, and a named spend per band — an age
 *   multiplied into a term at the point of use would be a coefficient nobody declared (principle 1).
 * @instead How deep the picture folds, which an age has not reached since the fold became the
 *   automator's own (0243) → src/lib/moireFractal.ts. What the *sound* does to either term here →
 *   src/lib/moireSound.ts. Where the elapsed sounding is read → `DeckPeek.sounding` in
 *   src/audio/deckPeek.ts.
 */
import { DRIFT_REST } from "./moire.ts";
import { clamp, denormalize } from "./range.ts";

/**
 * How long a deck has to sound before the picture is most of the way to as old as it gets, in
 * seconds. **Twenty minutes**, which is a side of a record: long enough that the whole of an
 * ordinary sit-down at the instrument is spent somewhere on the curve rather than at the end of
 * it, short enough that a performance which went somewhere has visibly gone there. The curve
 * saturates rather than stopping, so an hour is nearly there and nothing past it is anywhere new.
 */
export const DRIFT_AGE_REACH_SECS = 20 * 60;

/**
 * How old a picture is, on 0..1, from how long its deck has been sounding without a break
 * (`DeckPeek.sounding`). Nothing at nothing, monotone, and saturating: one exponential over the
 * reach above, so the first minutes move it most and the curve approaches one without arriving —
 * only the double's own resolution ever puts it exactly there, half a day of unbroken sounding in,
 * and every spend below is bounded at one either way.
 *
 * **Elapsed sounding and not wall time**, because a paused instrument is not a maturing one and a
 * session left open overnight has not been anywhere — which is a fact about the reading and stated
 * where the reading is taken (src/audio/deck.ts), not here.
 */
export const driftAge = (secs: number): number =>
  secs > 0 ? 1 - Math.exp(-secs / DRIFT_AGE_REACH_SECS) : 0;

/**
 * How much of each band a picture with nothing behind it is drawn in. **Half, and one number
 * across both spends below**: two floors a hair apart would be two coefficients nobody could tell
 * apart in the picture, and the age is meant to widen what a term may reach rather than to change
 * what it means — a fresh picture still says everything an old one says, over less of the room to
 * say it in.
 */
export const DRIFT_AGE_FLOOR = 0.5;

/** How much of a band an age of `age` spends: the floor above at nothing, the whole of it at one. */
const spent = (age: number): number => denormalize(clamp(age, 0, 1), DRIFT_AGE_FLOOR, 1);

/**
 * And how far the picture's own ink is carried between the cool token and the hot one: the claim a
 * row made, drawn back toward the ink the caller resolved by however fresh the picture is. At rest
 * it is rest at either age — an age may widen a claim and may not invent one (0141).
 */
export const agedHue = (hue: number, age: number): number =>
  DRIFT_REST.hue + (hue - DRIFT_REST.hue) * spent(age);

/**
 * And how far the reference row's spacing stands from the pitch its period sets. The band is a
 * ratio and log-symmetric about rest (`densityPitch`, src/lib/moireSound.ts), so a share of it is
 * a power and not a blend: a fresh picture draws the row at the floor's share of the spacing the
 * sound asked for and an old one draws it wherever the sound put it, on the same side of rest
 * throughout, and neither end can leave `DRIFT_PITCH_REACH`.
 */
export const agedPitch = (pitch: number, age: number): number =>
  pitch > 0 ? pitch ** spent(age) : DRIFT_REST.pitch;
