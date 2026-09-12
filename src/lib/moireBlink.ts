/**
 * @role The lull's look, whole: how often the finished field goes dark, for how much of each
 *   period, how deep, and the one draw that does it — the field drawn at less than itself for the
 *   rest's share of a cycle on the deck's own clock. A whole look in a file of its own, for
 *   `doubleLook`'s reason (0289): src/lib/moireLook.ts stands past its caps, so what lands here is
 *   a whole look and never half of one.
 * @instead What a look is at all — the names, the terms, where each lands → src/lib/moireLook.ts.
 *   How a term is read off the entry's own knob → src/ui/moireLooks.ts. The declaration itself →
 *   `look` and `lookFrom` on src/audio/effects/lull.ts. What a rest does to a *sound* → the
 *   transport it holds, src/audio/deck.ts (0371).
 */
import { cosTurn, wrap } from "@/lib/moire";
import type { Look, LookPass } from "@/lib/moireLook";
import { tunable } from "@/lib/moireTuning";
import { weighed } from "@/lib/moireWeigh";
import { clamp, denormalize } from "@/lib/range";

/**
 * The shortest and the longest a blink's period is ever drawn at, in seconds of the deck's clock.
 * Stated here rather than read off the entry's gap dials, because a look never knows which entry
 * wears it (0279): the term is the Gap's turn, and a picture blinking once a minute is a picture
 * nobody sees blink, however long the yard is set to play between two rests.
 */
export const BLINK_PERIOD: readonly [number, number] = [0.5, 8];

/**
 * The most of a period the field may stand dark for, as the width of the pulse that darkens it.
 * Half, so a lull at every chance still shows the picture as much as it hides it: what the look
 * says is that the thing stops and goes, and a field dark for most of its time says only that it
 * stopped.
 */
export const BLINK_DUTY = tunable("look.blinkDuty", 0.5, { min: 0, max: 1, step: 0.01 });

/**
 * How much of the field a blink takes away at the most. Short of the whole of it, for the double's
 * reason (0289): a field gone entirely is a picture of nothing, and what a rest leaves is the tails
 * — the delay and the room still sounding behind a source that stopped.
 */
export const BLINK_CEILING = tunable("look.blink", 0.85, { min: 0, max: 1, step: 0.01 });

/** How long one blink's cycle is, off the Gap's turn: logarithmic, because that dial is. */
export const blinkPeriod = (spacing: number): number =>
  denormalize(clamp(spacing, 0, 1), BLINK_PERIOD[0], BLINK_PERIOD[1], "log");

/** How much of each cycle is dark, off the Chance's turn, under the duty's ceiling. */
export const blinkDuty = (share: number): number => clamp(share, 0, 1) * BLINK_DUTY.value;

/** The narrowest a pulse is ever drawn: a duty under this is the pulse at this width. */
const DUTY_FLOOR = 0.01;

/**
 * How much of the field goes when it does: the Chance's turn, weighed by how present the picture
 * has travelled the instance to, under the ceiling. **The Chance is read twice and both readings
 * stand at nought in the same place** (0202, 0289): this entry's presence is the Chance's own
 * distance from nothing, so a lull that never rests blinks nothing whichever number is asked.
 */
export const blinkDepth = (presence: number, share: number): number =>
  weighed(presence, share, BLINK_CEILING.value);

/**
 * Where in its own cycle a blink stands at the instant the deck began to sound, off the Seed's
 * own value: the golden turn of it, so two seeds a step apart stand well apart and no seed stands
 * where another does for a long while. A value and not a turn, because a seed's range is the
 * whole of thirty-two bits and a turn of it is a number nobody set.
 */
export const blinkPhase = (seed: number): number => wrap(seed * GOLDEN_TURN, 1);

/** The golden ratio's fractional part: the turn that spreads a count of things most evenly. */
const GOLDEN_TURN = 0.618_033_988_749_895;

/**
 * How dark the field is at `clock`, on 0..1: a pulse once a period, whole at the top of the cycle
 * and gone half way round, sharpened as the duty narrows — a raised cosine to a power, so the
 * pulse is a shape and never a step, and the field is never exactly untouched but at one instant
 * of the cycle. Counted from the instant the deck began to sound and from where the seed stands
 * the cycle, off the deck's clock and never off a count of frames (0126) — and a halted yard hands
 * nought, so where the seed stands the cycle is what a resting deck is drawn at.
 */
export const blinkDark = (clock: number, spacing: number, share: number, seed: number): number => {
  const turn = wrap(clock / blinkPeriod(spacing) + blinkPhase(seed), 1);
  const power = 1 / (2 * Math.max(blinkDuty(share), DUTY_FLOOR));
  return ((1 + cosTurn(turn)) / 2) ** power;
};

/**
 * The blink, drawn: the field itself, and then the field taken out of itself by how dark the
 * pulse stands at this instant — a composite of the field with the field, which leaves nought at
 * nought, so no fill is laid over the picture and no pixel is touched (0129, 0269). A lull at no
 * chance is the one draw and stops there.
 */
const blinkPass: LookPass = (into, source, presence, terms, _veer, clock) => {
  into.drawImage(source, 0, 0);
  const share = terms.share ?? 0;
  const depth = blinkDepth(presence, share);
  if (depth <= 0) return;
  into.globalCompositeOperation = "destination-out";
  into.globalAlpha = depth * blinkDark(clock, terms.spacing ?? 0, share, terms.seed ?? 0);
  into.drawImage(source, 0, 0);
};

/**
 * Lull's: the field going dark and coming back on the deck's own clock — the picture keeps every
 * row it had and loses most of itself for a share of each cycle, which is what a rest does to a
 * sound. How much of each cycle is the Chance, on its own range, which is the knob this entry's
 * presence is already read off; how long a cycle is, is the Gap, on its.
 */
export const blinkLook: Look = {
  at: "pass",
  terms: { share: "turn", spacing: "turn", seed: "value" },
  pass: blinkPass,
};
