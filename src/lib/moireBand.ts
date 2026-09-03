/**
 * @role EQ's look, whole: where one band stands down the field, how deep it is, which way its gain
 *   sends it and the one draw it is — the field's own slice re-laid where the band lifts and taken
 *   out where it cuts. The first look declared in a file of its own, because src/lib/moireLook.ts
 *   stood at the 800-line hard cap when this landed (0287) — so what moved is a whole look and
 *   never half of one: its terms, where it lands and its draw are all here, and `LOOKS` holds the
 *   name against it.
 * @instead What a look is at all — the names, the terms, where each lands, and the six passes that
 *   landed before this one → src/lib/moireLook.ts. How a term is read off the entry's own knob, and
 *   the travel every presence takes → src/ui/moireLooks.ts. The declaration itself → `look` and
 *   `lookFrom` on src/audio/effects/eq.ts.
 */
import type { Look, LookPass } from "@/lib/moireLook";
import { clamp, denormalize } from "@/lib/range";
import { tunable } from "@/lib/moireTuning";

/**
 * How deep one band is, as a share of the field's own height: the band the width term is stated
 * across, **widest first**, because the term is the Q's own turn and a Q reads that way round — wide
 * open at the bottom of the knob and a needle at the top. In shares and not in pixels, which is the
 * bloom's answer and not the blocks' (0280, 0281): a band is a place in the picture and nothing
 * about one lands on a grid, so the strip, the overlay and an export at any scale light the same
 * amount of picture. Short of the whole field at its wide end, because a band that covers the
 * picture is not a band at all; and never under a lattice cell at its narrow end, because a band
 * thinner than the rows it crosses reads as a scratch rather than as a piece of the spectrum.
 */
export const BAND_DEPTH: readonly [number, number] = [1 / 3, 1 / 24];

/** How deep one band is drawn, off the width term its entry declared, as a share of the height. */
export const bandDepth = (width: number): number => denormalize(width, ...BAND_DEPTH);

/**
 * Where the band's middle stands down the field, as a share of its height, off the position term —
 * the frequency's own turn on its own log range. **Low at the bottom**, which is the way every
 * spectrum anyone has looked at is drawn and the way the picture's own y runs the other way: a turn
 * of nothing is the bottom edge and a turn of one is the top, so sweeping the frequency up walks
 * the lit band up the picture.
 */
export const bandCentre = (position: number): number => 1 - clamp(position, 0, 1);

/**
 * Which way the band goes: a gain above flat lifts and a gain under it cuts. The term is the gain's
 * own turn on its own range, so flat is the middle of it — the one look term read for a direction
 * rather than for a share, which is why the same knob may also be this look's presence without
 * being counted twice (0287).
 */
export const bandLifts = (lift: number): boolean => lift >= 0.5;

/**
 * The most of itself the band lays back over the field, or takes out of it. Well short of the whole
 * of it at either end, and the same number both ways so a cut reads as the opposite of a lift and
 * not as a louder one: at one a lifted band would be solid ink across the picture and a cut band a
 * bar of nothing, and what an EQ says is that one piece of the picture is louder or quieter than
 * the rest of it — never that the rest of it is gone.
 */
export const BAND_CEILING = tunable("look.band", 0.5, { min: 0, max: 1, step: 0.01 });

/**
 * How hard the band is drawn: how present the picture has travelled the instance to, under the
 * ceiling. **The gain is read twice and weighed once** — once here as the presence the entry
 * already declares it as (`presence: { param: "eq.gain" }`, 0202) and once as the term that says
 * which way the band goes, which is the filter's answer and not the bloom's (0286). A share off the
 * same knob on top of the presence would square the gain, and a band at half its range would all
 * but vanish.
 *
 * **So this weighs no share, and takes nothing from `weighed`** (src/lib/moireLook.ts), which is the
 * soften's answer for the soften's reason (0286): the helper states a presence times a share, and a
 * share of one is a share the band has not got.
 */
export const bandAlpha = (presence: number): number => clamp(presence, 0, 1) * BAND_CEILING.value;

/**
 * How many nested slices the band is laid in. The edges are softened with draws of the field and
 * nothing else (0269: a band that is a fill is refused), so the taper is stepped: every slice is
 * drawn at the same share of the alpha and each is shallower than the last, which leaves the middle
 * of the band carrying all of them and its rim carrying one. Three, because two is an edge with a
 * step in it and four is a fourth whole draw of a slice for a rim nobody can see.
 */
export const BAND_EDGES = tunable("look.bandEdges", 3, { min: 1, max: 8, step: 1 });

/**
 * How deep the nested slice at one step of the taper is, as a share of the band's own depth: the
 * whole of it at the outermost step and a `BAND_EDGES`th of it at the innermost, so the steps stand
 * evenly across the band's half-depth.
 */
export const bandTaper = (edge: number): number => 1 - edge / BAND_EDGES.value;

/**
 * The band, drawn: the field itself, and then the slice of it the band stands on drawn again over
 * where it already is — `destination-out` where the gain lifts and `source-over` where it cuts.
 * Draws of what is already drawn, no fill over the picture and no pixel touched (0129, 0269) —
 * **which is the whole reason both are draws of the field and not a bar wiped through it**: a
 * rectangle either way would land its own flat edge wherever the picture was blank as well as where
 * it was dense, and what an EQ lifts and cuts is the picture.
 *
 * **The two composites are exact opposites on the mask, and which of them is the lift is the shot's
 * answer and not the plan's.** The field is a hole mask — every window in it is ink the screen
 * keeps and a covered pixel is ink taken out (0281, 0283) — so laying the slice back over itself
 * `source-over` *fills* the mask by a share of what it already covers and takes that ink out of the
 * screen, and `destination-out` opens the mask by a share of the same thing. On the strip, a band
 * drawn the plan's way round came back as the one place the picture went quiet (0287). So the lift
 * is the composite that opens the mask and the cut is the one that closes it, at one alpha and over
 * one slice, which is what makes them one pair.
 *
 * **They share the alpha and not the move, and the difference is the mask's own arithmetic.** With
 * the field covering `c` where the slice is drawn, the lift leaves `c(1 - alpha·c)` and the cut
 * leaves `c + alpha·c(1 - c)` — the same size of move only at half coverage, and further apart the
 * denser or the sparser the picture is. Both are proportional to what the field already had there,
 * which is what keeps either from being a bar wiped through the picture, and the shot is what says
 * the pair reads as one band lit and the same band quieted (0287).
 *
 * Every slice is drawn, and one row deep at the least. The taper's steps stand a sixth of the band
 * apart, so on a short field — the thirty-two-row strip, at the narrow end of the Q — two of them
 * would round onto one row and be dropped, and the band would carry two thirds of its own alpha at
 * some frequencies and a third at others. A band thinner than its own taper is one row at the whole
 * of the alpha instead, which is the picture the term asks for and not a rounding of it.
 */
const bandPass: LookPass = (into, source, presence, terms) => {
  into.drawImage(source, 0, 0);
  const alpha = bandAlpha(presence);
  // A band at a gain of nothing is flat, and one the picture has not travelled to yet is the field
  // it came from — and the draw above is the one that says so.
  if (alpha <= 0) return;
  const { width, height } = source;
  const middle = bandCentre(terms.position ?? 0) * height;
  const deep = bandDepth(terms.width ?? 0) * height;
  into.globalCompositeOperation = bandLifts(terms.lift ?? 0.5) ? "destination-out" : "source-over";
  into.globalAlpha = alpha / BAND_EDGES.value;
  for (let edge = 0; edge < BAND_EDGES.value; edge++) {
    const half = (deep / 2) * bandTaper(edge);
    const top = Math.min(height - 1, Math.max(0, Math.round(middle - half)));
    const foot = Math.max(top + 1, Math.min(height, Math.round(middle + half)));
    into.drawImage(source, 0, top, width, foot - top, 0, top, width, foot - top);
  }
};

/**
 * EQ's, and the seventh look to take a slot in the chain: one band of the picture stood out of the
 * rest of it, at the frequency the band sits on. Where it stands is the Freq, on its own log range;
 * how deep it is, is the Q, on its; and which way it goes is the Gain — the one term a look reads
 * for a direction and not for a share, because how far the gain stands from flat is already this
 * entry's own presence (0202, 0287).
 */
export const bandLook: Look = {
  at: "pass",
  terms: { position: "turn", lift: "turn", width: "turn" },
  pass: bandPass,
};
