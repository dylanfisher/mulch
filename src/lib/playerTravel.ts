/**
 * @role What one jump of a pattern is shaped by, beyond how far it may go: which way the walk
 *   leans, how often it takes the whole distance rather than a drawn one, and how often it comes
 *   home to the top of the loop instead. The three amounts behind the Distance dial's own framed
 *   plus (0124), declared here for the reason the figure's three are declared beside the figure —
 *   the spec in src/lib/player.ts is this and the rest of the pattern's amounts, so each is said
 *   once (principle 1).
 * @instead How far a jump may travel, which is a fact about the grid and so is declared with it →
 *   src/lib/playerSlots.ts (`PLAYER_DISTANCE_MIN`, `PLAYER_DISTANCE_MAX`, `PLAYER_SLOTS`). The draw
 *   these four shape, which needs the grid and so cannot live here → `travelFrom` in
 *   src/lib/playerWalk.ts. The dial each is turned on → src/lib/playerKnobs.ts.
 */

/**
 * Which way the walk leans, −1…1. Zero is as likely to go back as on, which is the wandering walk
 * this module did before it could lean; one only ever moves on through the loop, wrapping at the
 * end, and minus one only ever moves back.
 *
 * An amount rather than a choice between two named walks, and it replaced that choice rather than
 * standing beside it: a bias of +1 *is* "forward", so a spec holding both would be one instruction
 * arriving from two fields (0162, principle 1).
 */
export const PLAYER_BIAS_MIN = -1;
export const PLAYER_BIAS_MAX = 1;

/**
 * The odds one jump travels the whole distance rather than a number drawn inside it, 0…1. Zero
 * draws every jump, which is the walk this module was before it could stride. One takes the
 * distance every time, so the walk turns by a fixed number of slots at every jump — a rotation of
 * the grid, and at a lean of ±1 the cheapest rhythm the module could not otherwise say.
 *
 * Rolled only where it is above zero, the way the vary and the rest are, so a pattern that never
 * strides lays down the stream it laid before striding existed (0134, P87).
 */
export const PLAYER_STRIDE_MIN = 0;
export const PLAYER_STRIDE_MAX = 1;

/**
 * The odds one jump goes to the top of the loop instead of travelling, 0…1. Zero never comes home,
 * which is the walk this module was; one reads that one slot forever, which is a deck not jumping
 * at all. The top of the loop is snapped onto the pattern's mask like every other landing, so under
 * a mask that excludes slot 0 home is the nearest slot the mask permits (0165).
 * Between them is what the field is for: a pattern that keeps returning to one place and leaves it
 * again, which is a chorus said in slots rather than in parts.
 *
 * Read before the distance is drawn and short-circuiting it, the way a refused wait is zero rather
 * than a shorter one: coming home is instead of travelling and not a travel of its own (P87).
 */
export const PLAYER_HOME_MIN = 0;
export const PLAYER_HOME_MAX = 1;

/**
 * The four fields of a `PlayerSpec` one jump is shaped by, declared here because this is what a
 * jump is — the same arrangement `FigureSpec` has, and for the same reason (src/lib/playerFigure.ts).
 */
export type TravelSpec = {
  /** Slots a jump may travel, PLAYER_DISTANCE_MIN…PLAYER_DISTANCE_MAX. Whole. */
  distance: number;
  /** Which way it leans, PLAYER_BIAS_MIN…PLAYER_BIAS_MAX. Zero wanders, ±1 only ever goes one way. */
  bias: number;
  /** The odds it travels the whole distance rather than a drawn one, 0…1. */
  stride: number;
  /** The odds it comes home to the top of the loop instead of travelling, 0…1. */
  home: number;
};
