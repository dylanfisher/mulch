/**
 * @role The words a motion says: what the row of names under a knob's lane preview is called,
 *   and what each character draws. Out of src/lib/copy.ts because that file is at its cap (0045).
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

export const MOTION_CHARACTER_TOOLTIPS: Record<MotionCharacter, string> = {
  sporadic: `Quick jumps anywhere in the range, never on a beat. ${AGAIN}`,
  smooth: `One long slow glide into the next, never a step. ${AGAIN}`,
  restless: `Slow glides most of the time, and every few moves a fast judder on the way. ${AGAIN}`,
  creep: `Barely moving: a small drift you notice only later. ${AGAIN}`,
  pulse: `Regular steps at one rate, a rhythm you can count. ${AGAIN}`,
};
