/**
 * @role The words a motion says: what the row of names under a knob's lane preview is called,
 *   what each character draws, and what the row under it that draws a lane again says. Out of
 *   src/lib/copy.ts because that file is at its cap (0045).
 * @instead Every other word the interface says → src/lib/copy.ts. What each character *is*, and
 *   the region a press draws inside → src/lib/motion.ts.
 */
import type { MotionCharacter } from "./motion.ts";

/** The eyebrow over the names: what pressing one does. */
export const MOTION_OFFER = "Draw a lane";

/** Total over `MOTION_CHARACTERS`, checked in src/ui/tooltips.test.ts. */
export const MOTION_CHARACTER_LABELS: Record<MotionCharacter, string> = {
  sporadic: "Sporadic",
  smooth: "Smooth",
  restless: "Restless",
  creep: "Creep",
  pulse: "Pulse",
};

/** What every press has in common, said once at the end of each sentence. */
const AGAIN = "Each press draws a new one, at the span the dial holds.";

/** The eyebrow over the counts: how many passes a drawn lane plays before it is drawn again. */
export const MOTION_REDRAW_OFFER = "Redraw every";

/** The count that is no count: the lane stays as it was drawn. */
export const MOTION_REDRAW_OFF = "Off";

export const MOTION_REDRAW_SAYS =
  "How many passes the drawn lane plays before a new one is drawn in its place, in the same character at the same length. Off keeps the lane as it was drawn. A lane you rode by hand is not redrawn.";

/** The count as a press's name, so "Redraw every 1 pass" and "Redraw every 4 passes" both read. */
export const redrawPassesLabel = (passes: number): string =>
  `${MOTION_REDRAW_OFFER} ${passes} ${passes === 1 ? "pass" : "passes"}`;

/** The two presses under the rows: a motion taken off this knob, and the one carried put on it. */
export const MOTION_COPY = "Copy";
export const MOTION_PASTE = "Paste";

export const MOTION_COPY_SAYS =
  "Take this lane, the range it was drawn in and what drew it. It is carried until you copy another one, and is gone when the tab closes.";

export const MOTION_PASTE_SAYS =
  "Put the copied lane on this knob, scaled from the range it was drawn in onto this one. It is drawn again here as often as it was there.";

export const MOTION_CHARACTER_TOOLTIPS: Record<MotionCharacter, string> = {
  sporadic: `Quick jumps anywhere in the range, never on a beat. ${AGAIN}`,
  smooth: `One long slow glide into the next, never a step. ${AGAIN}`,
  restless: `Slow glides most of the time, and every few moves a fast judder on the way. ${AGAIN}`,
  creep: `Barely moving: a small drift you notice only later. ${AGAIN}`,
  pulse: `Regular steps at one rate, a rhythm you can count. ${AGAIN}`,
};
