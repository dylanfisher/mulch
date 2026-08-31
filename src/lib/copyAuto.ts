/**
 * @role The automator's own words: what its run of grown effects is called, and what the card says
 *   while it is holding nothing.
 * @instead What each of its knobs is → src/lib/copyParams.ts, keyed by parameter id like every
 *   other dial's sentence — including `readAt`, which is how any value of one reads.
 */
import { readAt } from "./copyParams.ts";

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

/**
 * The name of the × at the end of one row: what pressing it does to the place that row is holding.
 * One function rather than a constant and a per-row string, because the row is mounted before it
 * holds anything and named again on the frames it does — and two spellings of one control's name
 * is the one the keyboard reaches and the one nobody updated (principle 1, 0070).
 */
export function dismissLabel(name: string | null): string {
  return `Let ${name ?? "this one"} go`;
}

/**
 * The word over the sliders that put a window on what a run may draw, inside the popover one pool
 * entry's own button opens.
 */
export const BOUNDS_MENU = "Bounds";

/**
 * What a weight is, said as what it does rather than as the arithmetic it is: the slider at the
 * head of one entry's popover, and the name a keyboard reaches it by. One spelling for the word
 * and the label, because a weight is reached in exactly one place now (P172).
 */
export const WEIGHT_LABEL = "How Often";

/** What one window says when it is the parameter's whole declared range — which is no window. */
export const BOUNDS_ANY = "any";

/** One window as its two ends, each read the way that parameter's own dial reads it. */
export function boundsLabel(min: number, max: number, precision: number): string {
  return `${readAt(min, precision)}–${readAt(max, precision)}`;
}

/**
 * What a countdown column is, said once at mount rather than in every string a frame writes: the
 * clock itself is a number and the word for what it counts is here (P162, `growthLeft`). One
 * spelling for the automator's own rows and the two arrangement rows, which count the same
 * thing (principle 1). Worn as a `title` and never as an `aria-label`: the element carrying it is
 * the one the frame writes the clock into, and a constant name on that element is a countdown that
 * no longer says the count.
 */
export const GROWTH_LEFT_LABEL = "Time left";

/**
 * How long a grown effect has left, said the way a stopwatch says it. Coarse where there is plenty
 * — nobody reads the seconds off half an hour — and to the second once the going is near, because
 * that is when a row is worth watching.
 *
 * A clock and nothing else: "left" is what the slot's own label says (`GROWTH_LEFT_LABEL`), and
 * carried on the number instead it wrapped the arrangement rows' column onto a second line, which
 * moves the buttons beside it (P162, `ROW_LEFT`, src/ui/PlayerPart.tsx). Where a sentence wants
 * the word, the sentence says it around this (`waitLeftSaid`, src/lib/copy.ts).
 */
export function growthLeft(secs: number): string {
  const whole = Math.max(Math.ceil(secs), 0);
  const mins = Math.floor(whole / 60);
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
  if (mins >= 1) return `${mins}m ${String(whole % 60).padStart(2, "0")}s`;
  return `${whole}s`;
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
