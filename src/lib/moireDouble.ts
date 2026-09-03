/**
 * @role The shift's look, whole: how far a second picture is zoomed from the first, how much of it
 *   is laid over, and the one draw that lays it — the field drawn again about the picture's own
 *   centre at the interval's own doubling. A whole look in a file of its own, for `bandLook`'s and
 *   `squashLook`'s reason (0287, 0288): src/lib/moireLook.ts stood at the 800-line hard cap when
 *   this landed, so what moved is a whole look and never half of one.
 * @instead What a look is at all — the names, the terms, where each lands, and the eight passes
 *   that landed before this one → src/lib/moireLook.ts. How a term is read off the entry's own
 *   knob, and the travel every presence takes → src/ui/moireLooks.ts. The declaration itself →
 *   `look` and `lookFrom` on src/audio/effects/shift.ts. What an interval does to a *sound* →
 *   `playbackRate`, src/lib/timeline.ts, whose octave this file's ratio is read off.
 */
import type { Look, LookPass } from "@/lib/moireLook";
import { weighed } from "@/lib/moireWeigh";
import { clamp } from "@/lib/range";
import { SEMITONES_PER_OCTAVE } from "@/lib/timeline";

/**
 * The narrowest and the widest a second picture is ever drawn at, as a share of the field's own
 * size: two octaves either way, which is exactly the interval the entry declares (-24 to 24
 * semitones, src/audio/effects/shift.ts). Stated here rather than read off that declaration because
 * a look never knows which entry wears it — `LOOKS` is asked for maths and handed a number, and the
 * knob it came from is the registry's business (0279). What the band is for is the draw: a scale is
 * a scale whatever an automation lane hands the term, and a picture drawn at a ratio nothing bounds
 * is a picture nothing bounds.
 */
export const DOUBLE_ZOOM: readonly [number, number] = [1 / 4, 4];

/**
 * The most of itself a double lays back over the field. Well short of the whole of it, and for a
 * reason the bloom's own ceiling only half shares (0280): a second picture laid `source-over` at
 * one does not stand *beside* the first, it **replaces** it everywhere the two overlap — so a
 * double at the whole of itself is the field zoomed and the picture it doubled gone, which is a
 * transposition and not a doubling. What a shift says is that there are two voices.
 *
 * **The shot set the number and not the argument** (0289). The field is a dense mask — the strip's
 * ink stands at a fifth of the canvas — so a second copy of it laid at seven tenths closed nearly
 * every window in the picture: the strip read a swing of 0.008 against `BASE`'s 0.019, which is a
 * double that has covered what it doubled. At the sharpen's own ceiling the two pictures stand
 * together and the strip reads 0.029.
 */
export const DOUBLE_CEILING = 0.35;

/**
 * How far the second picture is zoomed from the first: the interval's own doubling, `2^(n/12)`,
 * read off the semitones the entry declared. **The one look term that is a ratio**, which is why it
 * is read as a `value` and not as a turn — how far apart two voices stand is the musical distance
 * and not where a knob happens to sit on its range, and the picture already holds exactly one
 * dimension that is itself a ratio for the same reason (`pitch`, 0139).
 *
 * The octave is `SEMITONES_PER_OCTAVE`, imported from where the deck's own rate maths states it
 * (src/lib/timeline.ts, 0031) rather than written a second time: an interval is the same doubling
 * whether it reaches the ear as a read rate or the eye as a zoom (principle 1). Bounded by
 * `DOUBLE_ZOOM` at both ends.
 */
export const doubleZoom = (semitones: number): number =>
  clamp(2 ** (semitones / SEMITONES_PER_OCTAVE), ...DOUBLE_ZOOM);

/**
 * And how much of that second picture is laid over the first: the Mix its entry declared, weighed
 * by how present the picture has travelled the instance to (0279), under the ceiling. **The Mix is
 * read twice and both readings stand at nought in the same place**, which is the compressor's
 * answer and not the bloom's (0288, 0202): this entry's presence is the Mix's own distance from
 * silence and the term is that same knob's turn, so a shift heard as nothing lays no second picture
 * whichever of the two numbers is asked.
 *
 * A presence times a share under a ceiling is what `weighed` states, and this is its fifth site, so
 * it is imported and not spelt out again (principle 3). **From src/lib/moireWeigh.ts and never from
 * the contract file**: a look declared in a file of its own may take only _types_ from there,
 * because the contract file imports this look's own declaration and a value read back across that
 * cycle is `undefined` at the moment `LOOKS` is built (0288) — which is what the shape's own module
 * is for, and what moved it out of the contract file at this third hand-copy (0289).
 */
export const doubleAmount = (presence: number, amount: number): number =>
  weighed(presence, amount, DOUBLE_CEILING);

/**
 * The double, drawn: the field itself, and the field again over it at the interval's ratio, scaled
 * about the picture's own centre. Two draws of what is already drawn, no fill over the picture and
 * no pixel touched (0129, 0269).
 *
 * **About the centre, because a pass has no anchor of its own.** The anchor in the painter today is
 * a row's: a curved row's tile is baked and zoomed about the point that row is read from
 * (`aimCurved`, src/ui/moireCanvasCurved.ts) and its tile is baked about it (0278).
 * A pass is handed the *finished* field — every row already cut into one picture — so there is no
 * row to ask and no anchor to inherit, and the one point every pass shares is the middle of the
 * field it was given. A double about anything else would be a second picture sliding across the
 * first as the field changed size, which nothing in the picture asked for.
 *
 * **At the unison the two pictures land on each other, and that is honest.** An interval of nothing
 * is a ratio of one, so the second draw is the field over itself — which is what the stage is doing
 * to the sound there too: at no interval the heads do not walk and what comes out is a fixed tap of
 * the input mixed back over it (src/audio/effects/shift.ts). A picture hazed by a copy of itself is
 * what 0269 refuses of a *fill*, and this is the draw the field's own alpha makes of itself.
 */
const doublePass: LookPass = (into, source, presence, terms) => {
  into.drawImage(source, 0, 0);
  const alpha = doubleAmount(presence, terms.amount ?? 0);
  // A shift at no mix at all, and one the picture has not travelled to yet, are both the field it
  // came from — and the draw above is the one that says so.
  if (alpha <= 0) return;
  const zoom = doubleZoom(terms.zoom ?? 0);
  const { width, height } = source;
  const wide = width * zoom;
  const deep = height * zoom;
  into.globalAlpha = alpha;
  into.drawImage(source, (width - wide) / 2, (height - deep) / 2, wide, deep);
};

/**
 * Shift's, and the ninth look to take a slot in the chain: a second picture at the interval's own
 * ratio, laid over the first — the picture keeps every row it had and gains a copy of itself
 * standing an interval away, which is what a pitch shifter does to a sound. How far that copy is
 * zoomed is the Interval, in its own semitones; how much of it is heard is the Mix, the knob this
 * entry's presence is already read off, standing at nought with it at no mix at all (0202).
 */
export const doubleLook: Look = {
  at: "pass",
  terms: { zoom: "value", amount: "turn" },
  pass: doublePass,
};
