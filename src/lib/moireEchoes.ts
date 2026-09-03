/**
 * @role The delay's look, whole: how far apart the repeats stand, how many of them there are, how
 *   much of one survives into the next, the ceiling every standing delay shares and the one draw
 *   that lays the ladder — the finished field drawn again behind itself along the wind. A whole look
 *   in a file of its own, for `bandLook`'s, `squashLook`'s and `doubleLook`'s reason (0287, 0288,
 *   0289): src/lib/moireLook.ts stood at the 800-line hard cap again when the shared ceiling landed
 *   (0294), so what moved is a whole look and never half of one.
 * @instead What a look is at all — the names, the terms, where each lands, and the passes that keep
 *   their draws there → src/lib/moireLook.ts. How a term is read off the entry's own knob, how many
 *   looks of one kind stand, and the travel every presence takes → src/ui/moireLooks.ts. The
 *   declaration itself → `look` and `lookFrom` on src/audio/effects/delay.ts.
 */
import type { Look, LookPass } from "@/lib/moireLook";
import { weighed } from "@/lib/moireWeigh";
import { clamp, denormalize } from "@/lib/range";

/**
 * How far one repeat stands from the one before it, as a share of the field's width: the band the
 * spacing term is stated across, closest first, because a delay's Time reads the same way round — a
 * few milliseconds is a slap on the back of the sound and two seconds is a repeat the ear counts.
 * In shares and not in pixels, which is the bloom's answer and not the blocks' (0280, 0281): a
 * ghost is a displacement of the whole picture and nothing about it lands on a grid, so the strip,
 * the overlay and an export at any scale repeat by the same amount of picture.
 *
 * **Open at the top until a long delay reads as repeats standing apart** (0294). The band was half
 * this wide on the argument that a repeat further off than the picture's own diagonals stand apart
 * reads as the whole field washing out — which held while the Time knob spent most of its travel
 * near the bottom of the band and every setting drew nearly the same gap. With the Time on a log
 * curve the top of the knob is a second of delay, and a second of delay has to look like one: a
 * sixth of the field a rung, so the whole ladder is half the picture and the gaps are the picture's
 * own diagonals apart rather than under them.
 */
export const ECHO_SPACING: readonly [number, number] = [1 / 48, 1 / 6];

/** How far one repeat stands from the last, off the spacing term its entry declared, as a share. */
export const echoSpacing = (spacing: number): number => denormalize(spacing, ...ECHO_SPACING);

/**
 * The most repeats a delay draws behind the field. Every one is a whole draw of the picture, so the
 * cap is what keeps the pass at four draws however hard the feedback is driven — and past three
 * repeats the ghosts stand closer together than the picture's own diagonals do, which reads as one
 * smeared picture rather than as a picture repeated (shot before this landed).
 */
export const ECHO_CAP = 3;

/**
 * How many repeats stand behind the field, off the feedback term: **one at no feedback at all**,
 * because a delay line with nothing fed back still repeats once and a picture that drew nothing
 * would say the effect was not there, up to the cap. Whole, because half a ghost is not a draw.
 *
 * **And not weighted by presence**, which is what tells this count from the crusher's hardening
 * (0281). A whole count stepping with the travel would pop a whole picture in and out of the field
 * as a delay arrives; the ladder's alpha carries the travel instead, so a delay coming in is its
 * repeats fading up behind the picture, which is what a delay coming in sounds like.
 */
export const echoCount = (count: number): number =>
  1 + Math.round(clamp(count, 0, 1) * (ECHO_CAP - 1));

/**
 * How much of one repeat is left in the next: the band the fade term is stated across, quickest
 * first, so a hard feedback is a long tail of repeats and a soft one is a ghost or two. Short of the
 * whole of itself at either end — a fade of one is a ladder of solid copies, and the picture under
 * it would be gone.
 */
export const ECHO_FADE: readonly [number, number] = [0.35, 0.75];

/**
 * How far up its own band the spacing lifts the fade's floor: a delay at the top of its Time
 * starts half a band above the quickest tail there is (0294). A long delay is not only wider gaps
 * but slower repeats — the ear counts a second-long echo for longer than it counts a slap — and the
 * picture says that with the one number it has for how long a rung lasts. Half and not the whole,
 * because the feedback is still the knob that decides the tail and a Time that could reach the top
 * of the band alone would say it was not.
 */
export const ECHO_TIME_FADE = 0.5;

/**
 * How much of one repeat survives into the next: the fade term its entry declared, read across a
 * band whose *floor* the spacing lifts. The top of the band is the fade's own whatever the Time is,
 * so every turn of the Feedback still moves the picture at every Time — **which is why the spacing
 * lifts the floor and is not added to the term**. Summed into one fraction, a long delay drove the
 * sum past one and the clamp ate the top third of the Feedback knob: at the default Time every
 * feedback above 0.63 of its range drew the same tail, which is a knob the picture stopped
 * answering (the review's finding). Lifting the floor keeps the reading monotonic in both terms and
 * inside the one band.
 */
export const echoFade = (fade: number, spacing: number): number =>
  denormalize(
    clamp(fade, 0, 1),
    ECHO_FADE[0] + clamp(spacing, 0, 1) * ECHO_TIME_FADE * (ECHO_FADE[1] - ECHO_FADE[0]),
    ECHO_FADE[1],
  );

/**
 * The most of itself the first repeat stands at. The echoes' own number and not the bloom's, though
 * it is here for the bloom's reason (0280): the field is a hole mask, so every ghost drawn behind it
 * takes more ink out of the screen, and a halo may take most of it where a ladder of three may not.
 * Under a half, so what stands in front is always the picture itself and what is behind it is always
 * a ghost of one.
 */
export const ECHO_CEILING = 0.45;

/**
 * The ceiling one of `crowd` standing delays draws its first rung under, so that all of them
 * together add one `ECHO_CEILING`'s worth of coverage and never more: a ghost is drawn over what is
 * already there, so `crowd` of them at a share `a` leave `(1 - a) ** crowd` of the picture untouched,
 * and this is that solved for the share — `gratingDepth`'s arithmetic (src/lib/moireGrating.ts) said
 * of ghosts rather than of rows, and for its reason (0294). Two delays are twice the repeats and
 * never a whiter picture: what the count says is how many ladders stand, not how much ink is gone.
 *
 * **Never under one crowd.** A rack holding no delay asks nothing of this, and a delay on its way in
 * or out is still one delay drawing one ladder — its own travel is in the alpha below, and dividing
 * the ceiling by a fraction as well would brighten the ghosts of a delay that is leaving.
 */
export const echoCeiling = (crowd: number): number =>
  crowd <= 1 ? ECHO_CEILING : 1 - (1 - ECHO_CEILING) ** (1 / crowd);

/**
 * How much of the picture the first repeat is drawn at: the presence the look has travelled to and
 * how hard the wind is blowing, under the ceiling `crowd` standing delays share.
 *
 * **The wind is in the alpha because it is in the spacing.** A veer on its way through nought is a
 * ladder gathered onto the field it came from, and three copies of a hole mask laid exactly over
 * each other are not repeats at all — they are the picture composed with itself, which lifts every
 * half-covered pixel toward solid and hazes every window evenly, the one thing a pass may not do
 * (0269). Fading the ladder by the same number that gathers it means the repeats leave as they
 * arrive on top of one another, and a wind standing still draws the field once.
 *
 * **And every delay standing draws its own ladder in its own slot, under a ceiling all of them
 * share** (`echoCeiling`, 0294): two delays are two passes and twice the repeats — 0279's rule, and
 * the whole of what two of one kind means — but the ink they take between them is one delay's, so
 * adding a second is more repeats and never a paler picture.
 */
export const echoAlpha = (presence: number, veer: number, crowd: number): number =>
  weighed(presence, Math.abs(veer), echoCeiling(crowd));

/**
 * The echoes, drawn: the field itself at the whole of itself, and then the field again behind it
 * once per repeat — each one spacing further along the wind and each at the last one's alpha times
 * the fade, which is the geometric ladder a feedback delay is. The first rung is the ceiling and not
 * the picture, so what stands in front is always the picture and what is behind it is always a ghost
 * of one. Draws of what is already drawn, no fill over the picture and no pixel touched (0129, 0269).
 *
 * **Along the wind's veer, and by the whole of it rather than by its sign.** The veer is a direction
 * the picture travels to over the wind's seconds, so multiplying the spacing by it walks the repeats
 * in as the wind picks up and takes them back out as it turns — where a sign would flip the whole
 * ladder across the picture between two frames, which is the one thing the wind's own travel exists
 * to prevent (0267). The same number is in the ladder's alpha, so a gathering ladder fades as it
 * gathers rather than stacking three copies of the picture on the picture (`echoAlpha`).
 */
const echoesPass: LookPass = (into, source, presence, terms, veer, _clock, crowd) => {
  into.drawImage(source, 0, 0);
  let alpha = echoAlpha(presence, veer, crowd);
  // A delay the picture has not travelled to yet, and one whose wind is standing still, are both the
  // field itself — and this is the one draw that says so.
  if (alpha <= 0) return;
  const count = echoCount(terms.count ?? 0);
  const fade = echoFade(terms.fade ?? 0, terms.spacing ?? 0);
  const step = echoSpacing(terms.spacing ?? 0) * source.width * clamp(veer, -1, 1);
  for (let echo = 1; echo <= count; echo++) {
    into.globalAlpha = alpha;
    into.drawImage(source, step * echo, 0);
    alpha *= fade;
  }
};

/**
 * Delay's, and the third look to take a slot in the chain: the finished picture drawn again behind
 * itself, once per repeat, spaced along the wind and fading a fixed share every time — so the
 * picture keeps every row it had and gains the ghosts of them. How far apart the repeats stand is
 * the Time, on its own range; how many there are and how slowly they fade are both the Feedback, on
 * its — which is the one look whose two terms come off one knob, because a feedback delay's count
 * and its fade are one number in the sound as well.
 */
export const echoesLook: Look = {
  at: "pass",
  terms: { spacing: "turn", count: "turn", fade: "turn" },
  pass: echoesPass,
};
