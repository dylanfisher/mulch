/**
 * @role The words a motion says: what the corner mark and its menu are called, and what each
 *   character does to a knob. Out of src/lib/copy.ts because that file is at its cap (0045).
 * @instead Every other word the interface says → src/lib/copy.ts. What each character *is*, and
 *   the region a press draws inside → src/lib/motion.ts.
 */
import type { MotionCharacter } from "./motion.ts";

/** What the corner mark and the menu behind it are called: the thing a knob is being given. */
export const MOTION_LABEL = "Motion";

/** The eyebrow over the names while the knob holds none: what pressing one does. */
export const MOTION_OFFER = "Give this knob a motion of its own";

/** The name of the press that takes a held motion away. */
export const MOTION_OFF_LABEL = "Off";

/** Total over `MOTION_CHARACTERS`, checked in src/ui/tooltips.test.ts. */
export const MOTION_CHARACTER_LABELS: Record<MotionCharacter, string> = {
  sporadic: "Sporadic",
  smooth: "Smooth",
  restless: "Restless",
  creep: "Creep",
  pulse: "Pulse",
};

export const MOTION_CHARACTER_TOOLTIPS: Record<MotionCharacter, string> = {
  sporadic:
    "Quick jumps anywhere in the range, never on a beat. Each press deals a new performance of it.",
  smooth:
    "One long slow glide into the next, never a step. Each press deals a new performance of it.",
  restless:
    "Slow glides most of the time, and every few moves a fast judder on the way. Each press deals a new performance of it.",
  creep:
    "Barely moving: a small drift you notice only later. Each press deals a new performance of it.",
  pulse:
    "Regular steps at one rate, held for a stretch and then another rate. Each press deals a new performance of it.",
};
