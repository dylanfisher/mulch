/**
 * @role The grid a jumping pattern lands on: how many divisions the loop is cut into, how far one
 *   jump may travel over them, and how long a figure of them may be. Pure maths: no clock, no PRNG
 *   and no analysis. Every slot of the grid is a slot a pattern may land on — which of them it may
 *   use was a durable mask once and is not one now (0169).
 * @instead Every number one jump is drawn from, and where the grid is walked →
 *   src/lib/playerWalk.ts. The rest of the spec these bounds are part of, and the one validator →
 *   src/lib/player.ts.
 */
/**
 * How many divisions the loop is cut into. Sixteen, so the grid is the loop's own sixteenths —
 * which is what "beat-aware where the loop is" means for a loop that was snapped to a bar: the
 * player has no tempo of its own and never needs one, because every position it can name is a
 * fraction of the loop the performer already set.
 *
 * Here rather than in src/lib/player.ts since 0165: the bounds below are each derived from it, so
 * the grid is a family of the spec's numbers and sits in a module of its own beside what reads it,
 * the way the travel's and the rest's do (0045, P119, P120).
 */
export const PLAYER_SLOTS = 16;

/** How far a jump may travel, in slots. One is the next slot along; the whole grid is anywhere. */
export const PLAYER_DISTANCE_MIN = 1;
export const PLAYER_DISTANCE_MAX = PLAYER_SLOTS;

/**
 * How many slots make one figure — the run the walk lays down and then reads back, so a pattern
 * says something twice before it says anything new (0151). Zero is off, and off is the memoryless
 * walk this module was until it could keep a figure: every knob it had shaped the draw of the next
 * slot and none of them made the pattern repeat itself.
 *
 * The ceiling is the whole grid. A figure longer than the loop has slots would be a run repeating
 * over a thing shorter than itself, which is a loop and not a figure.
 */
export const PLAYER_PHRASE_MIN = 0;
export const PLAYER_PHRASE_MAX = PLAYER_SLOTS;
