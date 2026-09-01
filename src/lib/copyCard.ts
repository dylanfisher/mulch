/**
 * @role The words the mulcher card's own two registers wear: the front a hand meets first — its
 *   picture and the gesture across it — and the fine tune under it. Their own file because src/lib/copy.ts is at the hard cap and a word added
 *   there would have to push another out (0045, `docs/plan.md` §"What a step costs").
 * @instead Every other word the card says → src/lib/copy.ts. The words under a dial →
 *   src/lib/copyKnobs.ts. What the two registers are → src/ui/PlayerFront.tsx and
 *   docs/decisions/0197-the-card-has-a-front.md.
 */

/**
 * The eyebrow over the boxes of dials, which is what makes them the card's *second* register
 * rather than the whole of it. Without it the front reads as one more box in the stack and the
 * forty dials under it read as the card itself, which is the reading 0197 is about.
 *
 * "Fine Tune" and not "Advanced": nothing under it is harder than what is above it, and nothing is
 * gated — every number the module has is drawn here at all times (0195). What separates the two is
 * how big a change one gesture makes, not who is allowed to make it.
 */
export const PLAYER_FINE_LABEL = "Fine Tune";

/**
 * What the info press beside a picture is called, where the picture's own name is what it explains.
 * One word, because the button is an icon and its whole job is to be the thing a hand presses when
 * it cannot tell what it is looking at.
 */
export const EXPLAIN_LABEL = "About";

/**
 * What the press beside the Burst dial is called — the one that sets that dial from the interval
 * between presses rather than from a turn. Icon-only like the Plant it is shaped after, so this is
 * the word its label reads out rather than a word drawn anywhere (0059, 0195).
 */
export const PLAYER_TAP_LABEL = "Tap";

/**
 * And what pressing it costs, in the grammar every other gesture's sentence is written in. It says
 * two, because nought presses and one set nothing: an interval needs two, and a hand that pressed
 * once and saw nothing move would be reading a broken control rather than an unfinished gesture.
 */
export const PLAYER_TAP_TOOLTIP =
  "Set the burst from the interval between presses. Two or more; the last few are averaged.";

/**
 * What the toggle beside that press is called. Not "Hold", which is what this card already calls
 * the dial counting how many jumps keep one draw (`PLAYER_KNOB_LABELS.hold`): two controls in one
 * box under one word is two things a hand cannot name apart, whatever either of them does (0055,
 * 0195).
 */
export const PLAYER_BEAT_LABEL = "Beat";

/**
 * And what it does to whatever is written next. It names the tempo it rounds against as the one
 * being *heard*, because that is the figure the yard's waveform reads out and the only one a burst
 * in wall seconds could be held to: the sample is played at a rate, so the unscaled tempo is a
 * beat nobody in the room can count (0031).
 */
export const PLAYER_BEAT_TOOLTIP =
  "Round the burst to the nearest whole division of the beat you are hearing, from a whole beat down to a thirty-second of one.";

/**
 * The eyebrow over the numbers of the landing a hand pressed on the picture. Singular and
 * demonstrative, because it is about one block and never about the pattern: everything else on the
 * card says what the walk *tends* to do, and this is the one place that says what one landing did.
 */
export const PLAYER_LANDING_LABEL = "This Landing";

/**
 * What a picked landing says about itself, in the order a hand reads a block: where it opens, how
 * long it holds, how often it is struck, and which of the loop's own sixteenths it reads. The
 * fourth is the one the picture no longer draws — the score's height is the count, so where a jump
 * lands is a number here rather than a band there (0258).
 *
 * Lower case and not Titlecase: these are the terms of a readout and never labels of controls, and
 * 0059's rule is about what a hand can press.
 */
export const PLAYER_LANDING_TERMS = {
  at: "lands at",
  span: "holds for",
  repeats: "struck",
  slot: "reads slot",
} as const;

/**
 * The two things a landing can be that are not a number: a hole, which is scheduled and never
 * opened, and a landing read backwards. Said in words because the picture says them in a hollow
 * outline and a mirrored gate, neither of which is legible on a block a few pixels wide.
 */
export const PLAYER_LANDING_DROPPED = "a hole — placed and never opened";
export const PLAYER_LANDING_REVERSED = "read backwards";

/** What the picture says where nothing has been pressed on it yet: the gesture, and not an empty box. */
export const PLAYER_LANDING_NONE = "Press a landing to read it";
