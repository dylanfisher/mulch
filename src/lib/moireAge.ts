/**
 * @role How old a performance is, and the four things about the picture that widen with it: how far
 *   its ink may be carried between the two inks, how far the reference row's spacing may be
 *   drawn from rest, how much of the frame before it a standing run lays back in, and how far into
 *   its own structure the picture opens. One curve over
 *   one reach in seconds, and a named spend per band — an age
 *   multiplied into a term at the point of use would be a coefficient nobody declared (principle 1).
 * @instead The support the picture is cut through, which is the automator's own and no age's
 *   (0243, 0246) — an age widens how far the picture opens *into* that support and says nothing
 *   about its shape (0251) → src/lib/moireFractal.ts. What the *sound* does to either term
 *   here →
 *   src/lib/moireSound.ts. What is done with the share `runFeedback` asks for — the ghost, its aim
 *   and the ceiling it settles under → `feedbackAlpha` in src/lib/moire.ts and `feedFrame` in
 *   src/ui/moireCanvas.ts. Where the elapsed sounding is read → `DeckPeek.sounding` in
 *   src/audio/deckPeek.ts.
 */
import { DRIFT_REST, DRIFT_STEPS } from "./moire.ts";
import { FRACTAL_OPENING, fractalCut } from "./moireFractal.ts";
import { clamp, denormalize, snapToStep } from "./range.ts";

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
 * across every spend below**: two floors a hair apart would be two coefficients nobody could tell
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

/**
 * How much of the frame before it a run standing `FRACTAL_REACH` places asks the picture to lay
 * back in, on the oldest performance there is. **Half of the dimension and never the whole of it**:
 * a run may ask for as much of the picture's own history as a hand that turned a knob halfway, and
 * the rest of the travel stays something only a hand asks for — `boldestRow` takes the max and
 * never a sum, so a rack holding a delay wound past halfway still wins outright and neither says
 * the other's number (0139).
 */
export const DRIFT_RUN_FEEDBACK = 0.5;

/**
 * And how far the whole finished field is laid back into itself, for the run a rack is standing and
 * the age behind it. **This is the picture zooming into its own structure**, which is the thing a
 * fractal row on top of a field could not be: the ghost is the whole field turned and scaled about
 * its own centre (`feedFrame`, src/ui/moireCanvas.ts), so the structure the run cut is fed through
 * itself rather than laid beside itself.
 *
 * Exactly one parameter claims the dimension today (`delay.feedback`), so thirteen rows of a
 * fourteen-row picture can never reach it — the same hole 0244 found in octaves, and the same
 * answer: a floor under a picture-wide claim rather than the only way in.
 *
 * The run's own ramp and not a second one (`fractalCut`): what a rack is standing already fades a
 * place in and out, and a yard growing nothing lays nothing back and is exactly the picture it was
 * — an age widens a claim and may not invent one (0141).
 */
export const runFeedback = (standing: number, age: number): number =>
  fractalCut(standing, DRIFT_RUN_FEEDBACK * spent(age));

/**
 * And how far into its own structure the picture may open: the scale a fractal row's breath reaches
 * at the top of its cycle, handed to the breath rather than taken by it (`fractalZoom`,
 * src/lib/moireFractal.ts). The band is a scale and log-symmetric about one the way the reference
 * row's spacing is, so a share of it is a power and not a blend: a fresh picture breathes over half
 * the band and an old one over the whole of it, on the same side of one throughout, and neither end
 * of the *breath* can open past `FRACTAL_OPENING` — where the breath is taken from is the flight's,
 * and it is a second scale over this one (`fractalFlight`, 0261). A fresh picture still opens and
 * closes — an age widens what a
 * term may reach and may not invent one (0141) — over less of the room to do it in.
 *
 * **Stepped, where every other spend above is continuous**, for the reason `fractalZoom` gives for
 * stepping the phase it spends this on — and it is the harder case of the two: an age is a
 * saturating exponential and never comes to rest, so unstepped it asks for that bake at every
 * frame of a whole performance rather than at every frame of a breath. Eight stops is eight extra
 * bakes in a whole performance — five of them inside the first twenty minutes, where the curve
 * spends most of its rise (`DRIFT_AGE_REACH_SECS`). The ladder is `DRIFT_STEPS` and not a count of its own,
 * because a value rounded before it reaches a tile is rounded onto that one (principle 1);
 * `stepped` itself is the screen's (src/ui/moireScreen.ts) and a lib may not reach up for it.
 */
export const agedOpening = (age: number): number =>
  FRACTAL_OPENING ** spent(snapToStep(age, 0, 1, 1 / DRIFT_STEPS));
