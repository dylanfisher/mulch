/**
 * @role The panner's look, whole: how far apart the picture's bands stand across the field, where
 *   the whole of them sits, and the one draw it is — the field taken in bands and each of them slid
 *   its own distance across, so a glance says the sound is not standing in one place. Declared in a
 *   file of its own the way the five before it were, because src/lib/moireLook.ts stands at its
 *   800-line hard cap (0287-0296, 0323).
 * @instead What a look is at all — the names, the terms and where each lands → src/lib/moireLook.ts.
 *   How a term is read off the entry's own knob → src/ui/moireLooks.ts. The declaration itself →
 *   `look` and `lookFrom` on src/audio/effects/panner.ts.
 */
import type { Look, LookPass } from "@/lib/moireLook";
import { clamp, denormalize } from "@/lib/range";
import { tunable } from "@/lib/moireTuning";
import { weighed } from "@/lib/moireWeigh";

/**
 * How many bands the field is taken apart in. The sound's own crossover is three ways and its
 * slices are two, so the picture is neither: what a glance has to read is that the picture is not
 * standing in one piece, and six bands is enough of a stagger to say so at the strip's
 * thirty-two rows — five would leave the middle band standing exactly where it was, and a dozen is
 * a comb rather than a sound taken apart.
 */
export const STAGGER_BANDS = 6;

/**
 * How many more the field is taken apart in while the Band stage is standing. The stage is a
 * crossover and its crossover is three ways, so what a standing one adds to the picture is its own
 * three: nine bands rather than six is visibly more pieces and still short of the dozen the count
 * above refuses, which would read as a comb rather than as a sound taken apart (0359).
 */
export const STAGGER_SPLIT = 3;

/**
 * Whether a stage is standing, read off the toggle's own turn. The three toggles are stepped by one
 * and two values wide (src/audio/effects/panner.ts), so what arrives here is nought or one and the
 * round is what says the picture reads a choice as a choice: none of the three is an amount, which
 * is why none of them reaches a dimension of a row (0148, 0359).
 */
const standing = (turn: number): number => Math.round(clamp(turn, 0, 1));

/** How many bands the field is taken apart in, with the Band stage standing or not. */
export const staggerBands = (count: number): number =>
  STAGGER_BANDS + standing(count) * STAGGER_SPLIT;

/**
 * How far the outermost band slides from where it stood, as a share of the field's width. In shares
 * and not in pixels for the band's reason (0287): nothing about where a sound sits lands on a grid,
 * so the strip, the overlay and an export at any scale stagger by the same amount of picture. Well
 * short of half the width, because a band slid past the middle of the picture reads as a second
 * copy of it rather than as the same one moved.
 */
export const STAGGER_SHIFT = tunable("look.stagger", 0.18, { min: 0, max: 0.5, step: 0.01 });

/**
 * How far apart the bands actually stand: the spread term its entry declared, weighed by how present
 * the picture has travelled the instance to, under the ceiling. The spread *is* this entry's own
 * presence (0202), so the two are one knob read twice — and this is the blocks' walk rather than the
 * bloom's weighed share (0281, 0283): the pass lays nothing over the picture and has no alpha to
 * weigh, so what a travelling presence moves is the distance itself. A panner arriving walks its
 * bands apart rather than crossfading two pictures.
 */
export const staggerSpread = (presence: number, spread: number): number =>
  clamp(presence, 0, 1) * clamp(spread, 0, 1) * STAGGER_SHIFT.value;

/**
 * How far the whole staggered field walks at either end of the Position knob, as a share of the
 * picture's width. **Well short of the whole of it, and that bound is what makes the term readable
 * at all**: the draw wraps a band round the edge (below), so a displacement of a whole width is the
 * picture exactly where it started — hard left, the middle and hard right would draw the same thing.
 * A quarter of the width reads as a sound sitting off to one side, and with the spread's own ceiling
 * on top of it no band is ever slid past a width, which is what keeps the wrap covering the picture
 * rather than leaving a column of it blank.
 */
export const STAGGER_PLACE = 0.25;

/**
 * Where the whole staggered field sits across the picture, as a share of its width: the position
 * term, which is a pan and so already runs from one edge to the other. Denormalized off the turn the
 * knob is read at back onto that -1..1 and then walked by the share above, so the middle of the knob
 * is the middle of the picture and either end is a quarter of it away.
 */
export const staggerCentre = (position: number): number =>
  denormalize(clamp(position, 0, 1), -1, 1) * STAGGER_PLACE;

/**
 * Where one band stands relative to the rest, on -1 at the bottom of the field to 1 at the top —
 * the lows on one side and the highs on the other, which is what the Band split does to the sound.
 * Symmetric about the middle, so a spread of nothing leaves every band where it was and the whole
 * of the move is the position.
 */
export const staggerAlong = (band: number, bands: number): number => (band / (bands - 1)) * 2 - 1;

/**
 * How far the field a band is read from is drawn in toward the middle of the picture while the Time
 * stage is standing, as a share — the one term that is a distance down the picture rather than
 * across it, which is what the stage is: the two sides of the sound no longer arriving together. A
 * share and not a count of pixels, for `STAGGER_SHIFT`'s reason, and well short of the whole: a
 * field read entirely from its own middle is one band repeated down the picture.
 */
export const STAGGER_LAG = tunable("look.staggerLag", 0.12, { min: 0, max: 0.4, step: 0.01 });

export const staggerLag = (presence: number, spacing: number): number =>
  weighed(presence, standing(spacing), STAGGER_LAG.value);

/**
 * Which row of the field one band is read from: its own top, drawn toward the middle of the picture
 * by the lag. **Stated as a squeeze toward the middle rather than as an offset down the field,
 * because an offset cannot move the two end bands at all** — the top band has nothing above it and
 * the bottom band nothing below, so a clamped offset lags the four in between and leaves the two
 * the spread throws furthest standing exactly where they were. A squeeze moves every band but the
 * one at the middle, moves the ends the most, and needs no clamp: it is a point inside a span
 * scaled about that span's own centre, so it cannot leave the field.
 */
export const staggerRead = (top: number, deep: number, height: number, lag: number): number => {
  const middle = (height - deep) / 2;
  return middle + (top - middle) * (1 - clamp(lag, 0, 1));
};

/**
 * How much of its own width a band gives up while the Slice stage is standing, as a share: the band
 * is read from a slice of the field and drawn over the whole of its width, and successive bands
 * take the slice from opposite edges — which is what a slicer does to a sound, landing successive
 * slices in different places. Bounded well under the whole width, because a slice of nothing blown
 * up over a band is one column of the picture and not a picture.
 */
export const STAGGER_SLICE = tunable("look.staggerSlice", 0.3, { min: 0, max: 0.7, step: 0.01 });

export const staggerTake = (presence: number, size: number): number =>
  weighed(presence, standing(size), STAGGER_SLICE.value);

/**
 * The stagger, drawn: the field taken in `staggerBands` bands down the picture, each slid its own
 * distance across — the whole of them by the position, and each further from the last by the
 * spread — and each read from where its own stages say, which is the lag down the field and the
 * slice across it. Draws of what is already drawn, no fill over the picture and no pixel touched
 * (0129, 0269), and **the same two draws a band whatever the three stages say**: a stage moves
 * where a band is read from and never how many times it is drawn (0359).
 *
 * **Each band is drawn twice, a width apart, for the wobble's reason** (`wobblePass`,
 * src/lib/moireLook.ts): the column a slide leaves behind is covered by the copy on the far side of
 * the edge rather than left blank down the picture. The pair covers the whole width for any slide
 * inside one, which is why the position's own walk (`STAGGER_PLACE`) and the spread's widest
 * (`STAGGER_SHIFT`'s own ceiling) come to less than one between them. Written here rather than shared with that pass
 * because the guard is three lines around a draw whose rect is this look's own, and lifting it would
 * put half of what a stagger is in the file this one was split out of (principle 3).
 */
const staggerPass: LookPass = (into, source, presence, terms) => {
  const { width, height } = source;
  const spread = staggerSpread(presence, terms.spread ?? 0);
  const centre = staggerCentre(terms.position ?? 0.5);
  const bands = staggerBands(terms.count ?? 0);
  const lag = staggerLag(presence, terms.spacing ?? 0);
  const take = staggerTake(presence, terms.size ?? 0);
  const slice = Math.max(1, Math.round(width * (1 - take)));
  // A panner at no spread, and one the picture has not travelled to yet, are both the field where
  // it stands — and this is the one draw that says so. The position goes with it: where a sound
  // sits is a place and not an amount, so a panner nothing has arrived at is not standing anywhere
  // rather than standing hard left, which is the chain's own rule for every pass (0285).
  if (spread <= 0) {
    into.drawImage(source, 0, 0);
    return;
  }
  for (let band = 0; band < bands; band++) {
    const top = Math.floor((band * height) / bands);
    const deep = Math.floor(((band + 1) * height) / bands) - top;
    if (deep <= 0) continue;
    const along = staggerAlong(band, bands);
    // Where the band is read from: drawn toward the middle of the field by its own lag, which moves
    // every band but the middle one and cannot leave the picture; and from one edge of the width or
    // the other by its place in the order, so successive bands take opposite slices.
    const read = staggerRead(top, deep, height, lag);
    const from = band % 2 === 0 ? 0 : width - slice;
    const slid = Math.round((centre + spread * along) * width);
    into.drawImage(source, from, read, slice, deep, slid, top, width, deep);
    if (slid !== 0) {
      into.drawImage(
        source,
        from,
        read,
        slice,
        deep,
        slid - Math.sign(slid) * width,
        top,
        width,
        deep,
      );
    }
  }
};

/**
 * The panner's, and the fourteenth look: the picture's rows displaced across the field in bands, by
 * the spread, at the position. What a panner does to a sound is take it apart and put the pieces in
 * different places, and this is that said at a glance's size — the field no longer standing in one
 * piece, leaning further the harder the spread is pushed (0323).
 *
 * **And its three stages, which are the picture of what the sound is taken apart *by*** (0359): the
 * Band split is how many pieces there are (`count`), the Time offset is how far down the field a
 * piece is read from (`spacing`), and the Slicer is how much of the width each piece is taken from
 * (`size`). None of the three is an amount, so none of them reaches a dimension of a row — a look
 * is where a choice lands, as the eq's shape already is (0148, 0322).
 */
export const staggerLook: Look = {
  at: "pass",
  terms: { spread: "turn", position: "turn", count: "turn", spacing: "turn", size: "turn" },
  pass: staggerPass,
};
