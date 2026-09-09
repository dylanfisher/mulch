/**
 * @role The quieter landings one landing may throw: the odds it throws any, how many that is, how
 *   loud each is against it, and how far into the landing they begin. Declared here rather than in
 *   src/lib/player.ts because that file is at the hard cap and each family of the spec's numbers
 *   now sits in a module of its own beside what reads it (0045, P119, P123).
 * @instead Where the spark actually lands, which is one ordinary jump from the landing and so is
 *   drawn by the walk's own travel → `travelFrom` in src/lib/playerWalk.ts. What a sparking
 *   landing becomes in sound — one more source through a level gain into the landing's own fader
 *   each → src/audio/playerSparks.ts, under the transport that may move a read position
 *   (src/audio/player.ts). The dial each is turned on →
 *   src/lib/playerKnobs.ts.
 */

/**
 * The odds one landing throws a spark, 0…1. Zero is one region of the loop sounding at a time,
 * which is what the module was before a landing could throw one; one throws companions at every
 * landing, so several regions sound at once and in rhythm for the whole pattern. How many is the
 * count below: this dial says only whether.
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
 * One is a spark as loud as its landing, which at the count's own floor is two equal reads of the
 * loop at once and above it a stack of them; the default is half, so the first spark a person
 * hears is a shadow under the landing rather than a second voice beside it, which is what "a
 * second, quieter one" means.
 */
export const PLAYER_SPARK_LEVEL_MIN = 0;
export const PLAYER_SPARK_LEVEL_MAX = 1;

/**
 * How far into the landing the last of its sparks begins, as a fraction of the landing's own
 * window, 0…1 — the rest stand evenly between it and the landing's start (`sparkStartOf` below).
 *
 * A fraction of that window and never a duration, and that is the bound rather than a clamp
 * written somewhere downstream: a spark rides the landing's queue entry and is stopped by the
 * landing's own stop, so a delay said in seconds would be a spark that outlives the entry it rides
 * on every landing shorter than the dial — the one thing 0166 forbids. Said as a fraction, no
 * value of this knob can put the spark outside the landing, on any burst, at any count, at any
 * rate, and nothing has to check that it did (0175).
 *
 * Zero sounds them all with the landing, which is what a spark was before it could be held back. One is the
 * landing's window less a single seam, so the top of the dial is a flick at the very end of the
 * landing rather than a spark that starts at its own stop: the window it is a fraction of is
 * `PLAYER_FADE_SECS` shorter than the landing for exactly that reason (src/audio/player.ts).
 */
export const PLAYER_SPARK_DELAY_MIN = 0;
export const PLAYER_SPARK_DELAY_MAX = 1;

/**
 * How many companions one sparking landing throws, a whole number 1…4.
 *
 * A count and never a chance: whether a landing sparks at all is the Spark dial, rolled once per
 * landing, and this says how many that one roll is worth. Which is why its floor is one rather
 * than nought — a count of nought would be a second way to say "no spark", and two dials saying
 * the same thing is the one thing a hand cannot resolve.
 *
 * Four at the top because every companion is one more source through one more gain into the
 * landing's own fader, and a landing already reads once for itself: five reads of one loop at
 * once is a wall rather than a rhythm, and the ceiling is the count at which the ear still hears
 * them as separate reads of the same material.
 */
export const PLAYER_SPARK_COUNT_MIN = 1;
export const PLAYER_SPARK_COUNT_MAX = 4;

/**
 * Where the `index`th of `count` sparks begins, as a fraction of the landing's own window — the
 * one arithmetic that turns one delay into a rhythm, so the transport and the picture of the walk
 * cannot disagree about where a companion opens (principle 1, src/audio/player.ts,
 * src/lib/playerScope.ts).
 *
 * The delay is the *last* spark's, and the rest stand evenly between the landing's start and it:
 * at a delay of nought every one of them sounds with the landing, a chord of regions; at a delay
 * of one they are a ratchet evenly across the window, the landing itself the first read of it.
 * That keeps the one bound the dial has — no reading of it can put a spark at or past its own stop
 * (0175) — and gives the count a rhythm rather than a pile.
 *
 * At a count of one this is the delay itself, which is what makes a pattern at the floor sound
 * exactly as it did before the count existed.
 */
export const sparkStartOf = (index: number, count: number, delay: number): number =>
  (delay * (index + 1)) / count;

/**
 * The four fields of a `PlayerSpec` that say what a landing throws, arranged as the travel's four
 * and the wait's five are: a family declared where its numbers are (src/lib/playerTravel.ts).
 */
export type SparkSpec = {
  /** The odds one landing throws a second, quieter landing at another slot, 0…1. */
  spark: number;
  /** How loud that one is against the landing that threw it, 0…1. */
  sparkLevel: number;
  /** How far into the landing that one begins, as a fraction of the landing's own window, 0…1. */
  sparkDelay: number;
  /** How many companions a landing that sparks throws, 1…`PLAYER_SPARK_COUNT_MAX`. */
  sparkCount: number;
};
