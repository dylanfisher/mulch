/**
 * @role The words the header's readout of the whole session says: what each count is called, the
 *   ladder of words that grades how deep the mulch is, and the sentence the readout says at rest.
 *   Beside src/lib/copy.ts rather than in it because that file is at the hard cap (0045, the
 *   reason src/lib/copyLoop.ts and src/lib/copyCard.ts are where they are).
 * @instead The nouns the counts are counting — a yard, a rack's heading — → `YARD` and
 *   `EFFECTS_LABEL` in src/lib/copy.ts, which this file reads rather than spelling a second time.
 *   What is counted → src/state/mulchTally.ts. Where it is drawn → src/ui/MulchTally.tsx.
 */
import { EFFECTS_LABEL, YARD } from "./copy.ts";

/**
 * The caption over each number, in the order the readout draws them. Titlecase like every label
 * (0059). The first two are the instrument's own nouns read back rather than retyped, so a
 * session that renames a yard renames this too; the second two are this readout's own words,
 * because nothing else on the instrument counts a moving parameter or a chain's depth.
 */
export const MULCH_TALLY_LABELS = {
  yards: `${YARD}s`,
  effects: EFFECTS_LABEL,
  moving: "Moving",
  deepest: "Deep",
} as const;

/**
 * How mulched it is, in words, indexed by the deepest chain one yard's sound crosses — nothing
 * through nothing at the start, and the last word standing for that depth and anything past it.
 * A ladder rather than a number, because the point of the readout is that a hand reads at a
 * glance how hard the instrument is working the sound over, and "5" does not say that. Drafted
 * plainly and left for a hand to tune: these are the only words here nobody else says.
 */
export const MULCH_GRADES = [
  "Untouched",
  "Chopped",
  "Turned",
  "Mulched",
  "Well Mulched",
  "Pulverized",
] as const;

/** What the readout says at rest: what is counted, and over what. */
export const MULCH_TALLY_TOOLTIP = `What the session is putting the sound through: how many ${YARD.toLowerCase()}s are standing, how many effects sit on all their racks and the master's together, how many parameters are moving on their own, and the longest chain one ${YARD.toLowerCase()}'s sound crosses on its way out.`;
