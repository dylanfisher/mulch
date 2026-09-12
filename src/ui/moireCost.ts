/**
 * @role What a picture costs, span by span: every handle src/lib/measure.ts accumulates into,
 *   declared together so the names ./scripts/measure prints are one list and not a search. A
 *   checkpoint that wants a sixth span adds it here and times it where it is spent — which is what
 *   makes the harness something to extend rather than to fork (0375).
 * @instead The accumulator itself, and what a span costs while nobody is measuring →
 *   src/lib/measure.ts. What one frame of the loop costs, which the debug console reads →
 *   src/ui/frame.ts.
 */
import { cost } from "@/lib/measure";

// Re-exported so a painter reaches the clock and the handles it fills through one import: the pair
// and the names it spends are one thing to read and one thing to add to.
export { costEnd, costSpend, costStart } from "@/lib/measure";

/**
 * One live painting, summed over **every** canvas the opener draws (src/ui/MoireStrip.tsx): a yard's
 * strip goes on painting beside a window that covers nothing, so at the budget's setting this counts
 * the popped picture and two strips together and its mean is a mean over all three. The picture's
 * own count is the popped realm's clears, which ./scripts/measure reads instead for a per-painting
 * rate (0358 corrected the same claim once already).
 */
export const PAINT_COST = cost("paintMoire");

/**
 * The four spans inside one, in the order `paintMoire` runs them: the reading the marks are cut
 * from, the tear, the stamp and the wash. Each is timed where it is asked rather than inside itself,
 * because a function with its own early returns would otherwise carry a clock at each of them.
 */
export const READ_COST = cost("readMarks");
export const CUT_COST = cost("cutField");
export const STAMP_COST = cost("stampMarks");
export const TINT_COST = cost("tintThrough");

/**
 * One screen tile's loop, wherever it ran. The worker times its own and sends the span back with
 * the reply (src/workers/screen.ts), because a cost declared in that realm is one nothing on this
 * side could read; the sliced fallback is not timed into it, its loop being spread over as many
 * frames as the budget takes and so not the same number.
 */
export const BAKE_COST = cost("screenBake");
