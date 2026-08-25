/**
 * @role The second, quieter landing one landing may throw: the odds it throws one, how loud that
 *   one is against it, and how far into the landing it begins. Declared here rather than in
 *   src/lib/player.ts because that file is at the hard cap and each family of the spec's numbers
 *   now sits in a module of its own beside what reads it (0045, P119, P123).
 * @instead Where the spark actually lands, which is one ordinary jump from the landing and so is
 *   drawn by the walk's own travel → `travelFrom` in src/lib/playerWalk.ts. What a sparking
 *   landing becomes in sound — a second source through a level gain into the landing's own fader →
 *   src/audio/player.ts, the one thing that may move a read position. The dial each is turned on →
 *   src/lib/playerKnobs.ts.
 */

/**
 * The odds one landing throws a spark, 0…1. Zero is one region of the loop sounding at a time,
 * which is what the module was before a landing could throw one; one throws a companion at every
 * landing, so two regions sound at once and in rhythm for the whole pattern.
 *
 * A chance rather than a switch, and rolled per landing the way the drop and the reverse are, so a
 * pattern that sparks nothing rolls nothing and lays down the stream it laid before this field
 * existed (0160, P87, P121). What it adds is a second read and never a second rhythm: the spark
 * takes the landing's own window, its count and its seams, and the only thing it has of its own is
 * where it reads from.
 */
export const PLAYER_SPARK_MIN = 0;
export const PLAYER_SPARK_MAX = 1;

/**
 * How loud a spark is against the landing that threw it, 0…1 — a fraction of the landing's own
 * level and not a decibel, because every other fraction this module declares is one and a range
 * that could not hold a zero would be a level with no way to say silent.
 *
 * One is a spark as loud as its landing, which is two equal reads of the loop at once; the default
 * is half of it, so the first spark a person hears is a shadow under the landing rather than a
 * second voice beside it, which is what "a second, quieter one" means.
 */
export const PLAYER_SPARK_LEVEL_MIN = 0;
export const PLAYER_SPARK_LEVEL_MAX = 1;

/**
 * How far into the landing its spark begins, as a fraction of the landing's own window, 0…1.
 *
 * A fraction of that window and never a duration, and that is the bound rather than a clamp
 * written somewhere downstream: a spark rides the landing's queue entry and is stopped by the
 * landing's own stop, so a delay said in seconds would be a spark that outlives the entry it rides
 * on every landing shorter than the dial — the one thing 0166 forbids. Said as a fraction, no
 * value of this knob can put the spark outside the landing, on any burst, at any count, at any
 * rate, and nothing has to check that it did (0175).
 *
 * Zero sounds the two together, which is what a spark was before it could be held back. One is the
 * landing's window less a single seam, so the top of the dial is a flick at the very end of the
 * landing rather than a spark that starts at its own stop: the window it is a fraction of is
 * `PLAYER_FADE_SECS` shorter than the landing for exactly that reason (src/audio/player.ts).
 */
export const PLAYER_SPARK_DELAY_MIN = 0;
export const PLAYER_SPARK_DELAY_MAX = 1;

/**
 * The three fields of a `PlayerSpec` that say what a landing throws, arranged as the travel's four
 * and the wait's five are: a family declared where its numbers are (src/lib/playerTravel.ts).
 */
export type SparkSpec = {
  /** The odds one landing throws a second, quieter landing at another slot, 0…1. */
  spark: number;
  /** How loud that one is against the landing that threw it, 0…1. */
  sparkLevel: number;
  /** How far into the landing that one begins, as a fraction of the landing's own window, 0…1. */
  sparkDelay: number;
};
