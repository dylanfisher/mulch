/**
 * @role The automator's own words: what its run of grown effects is called, and what the card says
 *   while it is holding nothing.
 * @instead What each of its knobs is → src/lib/copyParams.ts, keyed by parameter id like every
 *   other dial's sentence.
 */

/**
 * The eyebrow over the rows, and the accessible name of the box holding them. It says what the
 * box holds rather than what the entry is doing: the rows are the effects this automator has put
 * in the path right now, and "growing" named the gardening and not the list.
 */
export const AUTOMATOR_RUN_LABEL = "Effects playing now";

/** What the box says with nothing in it — a run that has not started rather than a fault. */
export const AUTOMATOR_EMPTY = "No effects yet. Play the yard and the run fills in.";

/**
 * The name of the hourglass at the head of the run: pressing it asks for the wait the knob is
 * already set to all over again, which is the whole of what "hold this" means here (0215).
 */
export const AUTOMATOR_HOLD_LABEL = "Hold the run";

/** The eyebrow and the accessible name of the row of windows a hand puts on what a run may draw. */
export const BOUNDS_MENU = "Bounds";

/** What one window says when it is the parameter's whole declared range — which is no window. */
export const BOUNDS_ANY = "any";

/** One window as its two ends, at the precision the parameter it bounds is read at. */
export function boundsLabel(min: number, max: number, precision: number): string {
  // Rounded first, then re-signed, exactly as a dial's own readout is: an end just under zero —
  // an EQ cut of -0.01 — reads "-0.0" through `toFixed` alone, a minus sign on nothing (0064).
  const said = (at: number): string => {
    const rounded = Number(at.toFixed(precision));
    return (rounded === 0 ? 0 : rounded).toFixed(precision);
  };
  return `${said(min)}–${said(max)}`;
}

/**
 * How long a grown effect has left, said the way a stopwatch says it. Coarse where there is plenty
 * — nobody reads the seconds off half an hour — and to the second once the going is near, because
 * that is when a row is worth watching.
 */
export function growthLeft(secs: number): string {
  const whole = Math.max(Math.ceil(secs), 0);
  const mins = Math.floor(whole / 60);
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m left`;
  if (mins >= 1) return `${mins}m ${String(whole % 60).padStart(2, "0")}s left`;
  return `${whole}s left`;
}

/**
 * How long a hold has left, in the same words a row's own countdown is said in — and its two ends
 * said as what they are rather than as numbers: a run that is not held is running, and a hold with
 * no end is one no clock can count down.
 */
export function holdLeft(secs: number): string {
  if (!Number.isFinite(secs)) return "held";
  return secs <= 0 ? "running" : growthLeft(secs);
}
