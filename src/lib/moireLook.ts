/**
 * @role What a look is: the names the picture has maths for, the terms each one reads, how a term
 *   is read off the parameter an entry maps into it, and where in a painting the look lands. The
 *   whole of the contract an effect declares itself into — every registered entry that has a look
 *   names one from here beside its drift profile, and the registry refuses at load a name this file
 *   does not hold, a term the named look does not have, and the lattice, which is the rack's own
 *   and no entry's (0122, 0278).
 * @instead The declarations themselves → `look` and `lookFrom` on each entry in
 *   src/audio/effects/, checked in src/audio/effects/registry.ts. The reading of a standing rack
 *   into looks, and the travel and the reductions the painter spends → src/ui/moireLooks.ts. The
 *   maths each look is drawn by → src/lib/moireWarp.ts, src/lib/moireFold.ts and
 *   `rackScatter` in src/lib/moireSound.ts, except a look that takes a slot in the chain, whose one
 *   draw is here beside its declaration (0280). The one thing a draw here bakes rather than draws —
 *   the wobble's noise tile → src/lib/moireGrain.ts, split off here at the hard cap (0286) — and
 *   the one look declared whole in a file of its own, its terms and its draw together, because this
 *   file stood at the cap again → `bandLook` in src/lib/moireBand.ts (0287), `squashLook` in
 *   src/lib/moireSquash.ts (0288) and `doubleLook` in src/lib/moireDouble.ts (0289).
 */
// Over the soft cap and well under the hard one, and for the reason the whole file exists: every
// look's terms, where it lands and — where it lands in the chain — the one draw it is, sit together
// at its declaration, which is what lets the registry refuse a dishonest one at load and the painter
// draw a look it has never heard of (0279, 0280). Splitting the draws off would put half of what a
// look is in a file the declaration points at. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
import { bandLook } from "@/lib/moireBand";
import { doubleLook } from "@/lib/moireDouble";
import { squashLook } from "@/lib/moireSquash";
import { cosTurn, wrap } from "@/lib/moire";
import { GRAIN_SWEEP, GRAIN_TILE, grainOf } from "@/lib/moireGrain";
import { LENS_SLICES } from "@/lib/moireGeometry";
import { clamp, denormalize } from "@/lib/range";
import { weighed } from "@/lib/moireWeigh";

/** Every look the picture has maths for. One name per whole-field move, and no effect ids here. */
export const LOOK_NAMES = [
  "lattice",
  "warp",
  "fold",
  "shatter",
  "bloom",
  "blocks",
  "echoes",
  "sharpen",
  "wobble",
  "soften",
  "band",
  "squash",
  "double",
] as const;

export type LookName = (typeof LOOK_NAMES)[number];

/** Every term any look reads. Named once, so `lookFrom` can be typed against the whole set. */
export const LOOK_TERMS = [
  "bend",
  "wander",
  "share",
  "amount",
  "radius",
  "block",
  "levels",
  "spacing",
  "count",
  "fade",
  "saturation",
  "wobble",
  "grain",
  "position",
  "lift",
  "width",
  "floor",
  "ceiling",
  "zoom",
  "size",
] as const;

export type LookTerm = (typeof LOOK_TERMS)[number];

/** One look's terms as a picture reads them: a number per term the entry declared into. */
export type LookTerms = Readonly<Partial<Record<LookTerm, number>>>;

/**
 * How a term is read off the parameter an entry maps into it. A `turn` is where the knob stands on
 * its own declared range, which is what every reading of the picture is stated in; a `value` is the
 * parameter's own units, which the wander needs because it is a speed and nothing else in the
 * picture counts cycles a second. Declared here rather than guessed at the reading, so no code
 * outside this file knows which is which.
 */
export type LookRead = "turn" | "value";

/**
 * Where in a painting a look lands. Three of the four kinds are not passes at all and say so at the
 * declaration (0278): the lattice is the rack's own pattern over the whole field, the fold is a
 * bake on a curved row's coordinate before any field exists, and the warp and the shatter are cut
 * into the screen through the slices the lens already reads the field back in. `pass` is the chain
 * proper — a draw of the finished field between the field and the screen — and the bloom is the
 * first look to wear it (0280).
 */
export type LookAt = "field" | "bake" | "cut" | "pass";

/**
 * The one draw of the finished field a look that takes a slot in the chain is: `source` read, `into`
 * written, at the presence the picture has travelled to and the terms the entry declared.
 *
 * And `veer`, which way the wind the whole standing rack blows the field with is blowing, on -1 to 1
 * (`windTravelInto`, src/ui/moireWind.ts, 0267). A pass that displaces the field needs a direction
 * and the picture already has exactly one — a second would be a way the picture moves that nothing
 * else agreed to (principle 1) — so the chain hands every pass the one it has and the two passes
 * that displace nothing take four arguments and ignore it.
 *
 * And `clock`, how long the deck behind the picture has sounded without a break, in seconds
 * (`DeckPeek.sounding`). A pass that *moves* needs a clock, and the picture already has exactly one
 * and it is the deck's (0126) — so the chain hands every pass the one it has, for the veer's reason,
 * and a halted yard hands the same second twice and the motion stands still (0144). The wobble is
 * the first pass to read it and the four before it take five arguments and ignore it.
 */
export type LookPass = (
  into: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  presence: number,
  terms: LookTerms,
  veer: number,
  clock: number,
) => void;

/**
 * One look: what it reads, and where it lands. **Where it lands and whether it has a draw of its own
 * are one fact and not two**: a look that says `pass` carries one and every other kind carries none,
 * so the painter cannot step over a declared pass and cannot draw a baked look twice. Three of the
 * four that were here before this step land at the bake and at the cut; the bloom is the first that
 * says `pass`, and it carries the one draw it is (0280).
 */
export type Look =
  | { at: Exclude<LookAt, "pass">; terms: Readonly<Partial<Record<LookTerm, LookRead>>> }
  | { at: "pass"; terms: Readonly<Partial<Record<LookTerm, LookRead>>>; pass: LookPass };

/**
 * The field taken down to a working size and put straight back up over the whole surface — the blur
 * every pass here draws one with is made of, and the only way to draw one under 0129's rules: no
 * `ctx.filter`, no read-back, and a `drawImage` in each direction. The small copy is left on the
 * pass's own surface, which is the only place it can be kept without allocating a third (0280), and
 * `copy` is what takes it back up over the *whole* of that surface rather than blending it over the
 * corner it was drawn into — carrying `alpha`, because the upscale is where a halo's share rides.
 *
 * **Three passes blur this way, which is what makes it a helper and not a third copy** (principle 3,
 * and `weighed` said of a share, src/lib/moireWeigh.ts): the bloom's halo, the sharpen's mask and the soften's whole
 * picture. What each does *after* it is what tells the three apart, and stays at each declaration.
 */
const blurred = (
  into: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  scale: number,
  alpha: number,
): void => {
  const { width, height } = source;
  const wide = Math.max(1, Math.round(width * scale));
  const deep = Math.max(1, Math.round(height * scale));
  into.drawImage(source, 0, 0, wide, deep);
  into.globalCompositeOperation = "copy";
  into.globalAlpha = alpha;
  into.drawImage(into.canvas, 0, 0, wide, deep, 0, 0, width, height);
};

/**
 * How small the field is drawn before it is drawn back up again, as a share of its own size: the
 * band the bloom's radius is stated across, widest halo last. A blur by downscale and upscale is
 * the working size *being* the radius — a third of the field is a haze the eye reads as a soft
 * edge, a twenty-fourth is a halo two dozen pixels wide — and the band is stated in shares rather
 * than pixels so the strip, the overlay and an export at any scale bloom by the same amount of
 * picture (0129: no filter, no read-back, one `drawImage`).
 */
export const BLOOM_SCALE: readonly [number, number] = [1 / 3, 1 / 24];

/** The working size one bloom is drawn at, off the radius its entry declared, as a share. */
export const bloomScale = (radius: number): number => denormalize(radius, ...BLOOM_SCALE);

/**
 * The most of itself a bloom lays back over the field. Short of the whole of it on purpose: at one
 * the halo is the picture and the structure under it is gone, and what a bloom says is that the
 * room is there and not that the rows are not.
 */
export const BLOOM_CEILING = 0.9;

/**
 * How much of the blurred copy is laid back over the field: the amount its entry declared, weighted
 * by how present the picture has travelled the instance to (0279), under the ceiling. A reverb
 * reads its own wet twice over — once as presence and once as the amount — which is what makes a
 * wet room bloom and a dry one leave the picture alone.
 */
export const bloomAmount = (presence: number, amount: number): number =>
  weighed(presence, amount, BLOOM_CEILING);

/**
 * The bloom, drawn: the field small, that small copy back up over the whole surface at the amount,
 * and the field itself laid underneath it. Three draws of what is already drawn and no second pass
 * over any row, no pixel touched and no surface made — the copy is taken from the pass's own
 * surface, which is the only place a downscale can be kept without allocating a third (0280).
 *
 * `copy` is what makes the second draw the *whole* of the surface: it replaces the small corner the
 * first draw left rather than blending the upscale over it, and it carries the amount, so what
 * stands on the surface afterwards is the halo at its own share. `destination-over` then puts the
 * original underneath, which is the same picture as the halo laid over it `source-over` and one
 * draw cheaper.
 */
const bloomPass: LookPass = (into, source, presence, terms) => {
  const alpha = bloomAmount(presence, terms.amount ?? 0);
  // A room at no wet at all is the field itself, and the one draw that says so. A field of no size
  // is not guarded here and cannot be: `drawImage` throws on a zero-dimensioned source whichever
  // draw reaches it first, and a sized field is already what every cut of one is written against.
  if (alpha <= 0) {
    into.drawImage(source, 0, 0);
    return;
  }
  blurred(into, source, bloomScale(terms.radius ?? 0), alpha);
  into.globalCompositeOperation = "destination-over";
  into.globalAlpha = 1;
  into.drawImage(source, 0, 0);
};

/**
 * How wide one block of a crushed picture is, in the field's own pixels, across the band the block
 * term is stated on: coarsest first, because a crush's Rate reads the same way round — a hold of a
 * few hundred a second is the aliasing the effect exists for, and a hold at the top of the range is
 * a sample or two long and barely heard. Stated in pixels and not in shares of the field, unlike the
 * bloom's radius (0280), because a block grid is only a block grid on whole pixels: a picture whose
 * cells landed on fractions would draw a soft edge down every one of them at any scale.
 */
export const BLOCK_PIXELS: readonly [number, number] = [24, 2];

/**
 * How wide one block is, off the block term its entry declared and how present the picture has
 * travelled the instance to — **stepped to whole pixels**, which is what makes the grid a grid. A
 * block of one is the field itself, which is what an absent crush and a crush the picture has not
 * travelled to yet both draw; the walk up from one is the pass arriving over the wind's seconds
 * rather than between two frames. A crush at the top of its Rate is not that one but the band's own
 * other end, two pixels: the finest grid the picture states, and as near to the field as it goes.
 */
export const blockSize = (presence: number, block: number): number => {
  const wide = denormalize(block, ...BLOCK_PIXELS);
  return Math.max(1, Math.round(1 + clamp(presence, 0, 1) * (wide - 1)));
};

/**
 * The most times a crushed field is composed with itself. A bit lost off the depth is a level lost
 * off the picture, and the composite that takes one out is the field masked by its own alpha
 * (`destination-in`), which pushes every half-covered pixel toward nothing and leaves a covered one
 * where it is — so the blocks harden as the depth falls. Capped well short of the fifteen bits the
 * range can lose: past three the thin rows are simply gone, and a picture of a crush that has eaten
 * the picture says nothing about the crush.
 */
export const BLOCK_HARDENINGS = 3;

/**
 * How many times the blocked field is composed with itself, off the levels term and the travelled
 * presence: a whole depth hardens nothing, and one bit hardens as far as the cap. Whole, because a
 * fraction of a composite is not a draw.
 */
export const blockHarden = (presence: number, levels: number): number =>
  Math.round(clamp(presence, 0, 1) * (1 - clamp(levels, 0, 1)) * BLOCK_HARDENINGS);

/**
 * The blocks, drawn: the field down onto its own block grid with smoothing off, that grid back up
 * over the whole surface — nearest neighbour both ways, which is what makes a cell a flat cell and
 * not a blur — and then the result masked by itself once per lost bit. Draws of what is already
 * drawn, no fill over the picture and no pixel touched (0129, 0269).
 *
 * `copy` takes the small corner back up over the whole surface rather than blending it over itself,
 * exactly as the bloom's second draw does; the hardening then runs `destination-in` against the same
 * surface, which is the one place the blocked field can be read without allocating another.
 */
const blocksPass: LookPass = (into, source, presence, terms) => {
  const size = blockSize(presence, terms.block ?? 0);
  const hard = blockHarden(presence, terms.levels ?? 1);
  const { width, height } = source;
  if (size <= 1) {
    into.drawImage(source, 0, 0);
  } else {
    // Off for both draws and never turned back on here: the chain resets it before every pass, so a
    // look that wants smoothing gets it and this one does not have to know who runs next.
    into.imageSmoothingEnabled = false;
    // Enough cells to cover the field, taken back up at exactly `size` a cell rather than stretched
    // to the field's own width: a grid scaled to fit would divide the width by a whole number of
    // cells and land every one of them on a fraction of a pixel, which is the thing the whole-pixel
    // step exists to prevent. The last cell of each row and column runs off the edge instead, and
    // `copy` clips it there.
    const across = Math.max(1, Math.ceil(width / size));
    const down = Math.max(1, Math.ceil(height / size));
    into.drawImage(source, 0, 0, across, down);
    into.globalCompositeOperation = "copy";
    into.drawImage(into.canvas, 0, 0, across, down, 0, 0, across * size, down * size);
  }
  if (hard <= 0) return;
  into.globalCompositeOperation = "destination-in";
  for (let taken = 0; taken < hard; taken++) into.drawImage(into.canvas, 0, 0);
};

/**
 * How far one repeat stands from the one before it, as a share of the field's width: the band the
 * spacing term is stated across, closest first, because a delay's Time reads the same way round — a
 * few milliseconds is a slap on the back of the sound and two seconds is a repeat the ear counts.
 * In shares and not in pixels, which is the bloom's answer and not the blocks' (0280, 0281): a
 * ghost is a displacement of the whole picture and nothing about it lands on a grid, so the strip,
 * the overlay and an export at any scale repeat by the same amount of picture. **And a narrow band,
 * because the picture it displaces is nearly periodic**: a repeat further off than the picture's own
 * diagonals stand apart is a copy nothing can be told to belong to, and the ladder reads as the
 * whole field washing out rather than as one picture said twice (shot before this landed).
 */
export const ECHO_SPACING: readonly [number, number] = [1 / 48, 1 / 12];

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

/** How much of one repeat survives into the next, off the fade term its entry declared. */
export const echoFade = (fade: number): number => denormalize(fade, ...ECHO_FADE);

/**
 * The most of itself the first repeat stands at. The echoes' own number and not the bloom's, though
 * it is here for the bloom's reason (0280): the field is a hole mask, so every ghost drawn behind it
 * takes more ink out of the screen, and a halo may take most of it where a ladder of three may not.
 * Under a half, so what stands in front is always the picture itself and what is behind it is always
 * a ghost of one.
 */
export const ECHO_CEILING = 0.45;

/**
 * How much of the picture the first repeat is drawn at: the presence the look has travelled to and
 * how hard the wind is blowing, under the ceiling. Every repeat after it is this times the fade,
 * again, which is the geometric ladder a feedback delay is.
 *
 * **The wind is in the alpha because it is in the spacing.** A veer on its way through nought is a
 * ladder gathered onto the field it came from, and three copies of a hole mask laid exactly over
 * each other are not repeats at all — they are the picture composed with itself, which lifts every
 * half-covered pixel toward solid and hazes every window evenly, the one thing a pass may not do
 * (0269). Fading the ladder by the same number that gathers it means the repeats leave as they
 * arrive on top of one another, and a wind standing still draws the field once.
 */
export const echoAlpha = (presence: number, veer: number): number =>
  weighed(presence, Math.abs(veer), ECHO_CEILING);

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
const echoesPass: LookPass = (into, source, presence, terms, veer) => {
  into.drawImage(source, 0, 0);
  let alpha = echoAlpha(presence, veer);
  // A delay the picture has not travelled to yet, and one whose wind is standing still, are both the
  // field itself — and this is the one draw that says so.
  if (alpha <= 0) return;
  const count = echoCount(terms.count ?? 0);
  const fade = echoFade(terms.fade ?? 0);
  const step = echoSpacing(terms.spacing ?? 0) * source.width * clamp(veer, -1, 1);
  for (let echo = 1; echo <= count; echo++) {
    into.globalAlpha = alpha;
    into.drawImage(source, step * echo, 0);
    alpha *= fade;
  }
};

/**
 * The working size the copy an unsharp mask is taken out by is drawn at, as a share of the field's
 * own size — the blur's radius, the bloom's way round (`BLOOM_SCALE`) and the bloom's units, because
 * a blur *is* its working size and nothing about one lands on a grid (0280, 0281). One number and
 * not a band: pop declares two terms and neither of them is a radius, and a mask blurred much wider
 * than the picture's own cell stops being a local mean and becomes the bloom under another name.
 * A sixth of the field is about one cell of the lattice the picture is drawn on, which is the
 * distance an edge has to stand out against for the eye to read it as an edge.
 */
export const SHARPEN_SCALE = 1 / 6;

/**
 * How much of the mask is added back to the field at the most. Short of the whole of it for the
 * bloom's reason and at a number of pop's own: the mask is added and not blended, so at the whole of
 * it every window with any structure in it goes blank, and a picture whose windows are gone says
 * nothing about the edges this pass exists to bite. Shot at both: at 0.6 the zoomed crop's edge
 * energy is 23% over `BASE` and the whole picture 7% lighter, and at this number it is 15% over at
 * 4% lighter — sharper, and the one question the pass is asked at the crop is whether it is sharper
 * and not whether it is louder.
 */
export const SHARPEN_CEILING = 0.35;

/**
 * How hard the mask bites: the amount its entry declared — pop's own Mix, which is how much of the
 * stage is heard at all — weighted by how present the picture has travelled the instance to, under
 * the ceiling. At nothing the mask is added at nothing, which is the field, so a pop arriving walks
 * the picture out of what it was rather than switching between two pictures.
 */
export const sharpenAmount = (presence: number, amount: number): number =>
  weighed(presence, amount, SHARPEN_CEILING);

/**
 * The sharpen, drawn: the field's own blurred copy, the field taken through it `source-out` — which
 * is the field wherever its own neighbourhood is not, the mask an unsharp mask is — and that mask
 * added back onto the field at the amount. Draws of what is already drawn, no fill over the picture
 * and no pixel touched (0129, 0269).
 *
 * **The blur is the destination and the field is the source, which is what makes one surface
 * enough.** The only place the downscale can be kept without allocating a third surface is the
 * pass's own (0280), so the two are swapped and the composite with them: `source-out` keeps the
 * field exactly where the blurred copy is not, which is `destination-out` read from the other side.
 *
 * **And the mask is added rather than laid over, which the shot decided.** The field is a hole mask
 * — every window in it is ink the screen keeps, and a covered pixel is ink taken out (0281) — so
 * where the picture is at its darkest the field is already at nothing and there is no headroom to
 * sharpen into: the whole of what a mask can do here is push the *light* side of an edge the rest of
 * the way to nothing. `source-over` cannot: laid over the field it adds a share of what is *left*,
 * which is most of the picture at the middle of the mask and nothing at either end, so the picture
 * came back hazed: at the zoomed 1:1 crop its own spread fell from 19.3 to 17.1 and its edge energy
 * from 9.3 to 8.9 against the same rack at `BASE`, which is a picture washed rather than sharpened
 * (shot before this landed). `lighter` adds the mask itself: nothing where the field is nothing, the
 * whole of it where the field already stands, and clipped at solid where it is over — the same crop
 * comes back at a spread of 20.8 and an edge energy of 10.7. So the edge bites on the side that has
 * room to bite and the ink is left where the picture is already dense.
 */
const sharpenPass: LookPass = (into, source, presence, terms) => {
  const alpha = sharpenAmount(presence, terms.amount ?? 0);
  // A pop at no mix at all, and one the picture has not travelled to yet, are both the field
  // itself — and this is the one draw that says so.
  if (alpha <= 0) {
    into.drawImage(source, 0, 0);
    return;
  }
  // At the whole of itself, because what the amount weighs is how much of the mask is added back
  // and not how blurred the mask is.
  blurred(into, source, SHARPEN_SCALE, 1);
  into.globalCompositeOperation = "source-out";
  into.globalAlpha = alpha;
  into.drawImage(source, 0, 0);
  into.globalCompositeOperation = "lighter";
  into.globalAlpha = 1;
  into.drawImage(source, 0, 0);
};

/**
 * The furthest one band of a wobbling picture swims sideways, as a share of the field's own width —
 * the echoes' units and the echoes' reason (0282): a displacement of the picture lands on no grid,
 * so the strip, the overlay and an export at any scale swim by the same amount of picture. **And a
 * narrower band than the echoes take**, because what a wobble says is that the rows are *not
 * straight*: the swim is read against the row above it, so a band slid further than the lattice's
 * own cell no longer stands beside its neighbour at all and the picture reads as torn rather than as
 * swimming.
 */
export const WOBBLE_CEILING = 1 / 64;

/**
 * How far one band of the field is slid at the most: the wobble term its entry declared — the tape's
 * own Wow, which is how far the head wanders — weighted by how present the picture has travelled the
 * instance to, under the ceiling. The fourth share weighed this way and the helper's whole point
 * (principle 3). At nothing the field is drawn where it stands, so a tape arriving swims the picture
 * out of the straight rather than switching between two pictures.
 */
export const wobbleSwim = (presence: number, wobble: number): number =>
  weighed(presence, wobble, WOBBLE_CEILING);

/**
 * How fast the swim goes round, in cycles a second, and how many of those cycles stand down the
 * picture at once. The rate is inside the band the tape's own head wanders on (`WOW_BAND`,
 * src/audio/worklets/tape.js — a worklet imports nothing, so the picture states its own number and
 * this is the sound's own band read off it): fast enough that a glance catches the picture moving
 * and slow enough to read as wow rather than as flutter. Under two waves down the field, because a
 * wave a band deep is noise and what this pass draws is one long swim the eye can follow.
 */
export const WOBBLE_HZ = 0.75;
export const WOBBLE_WAVES = 1.5;

/**
 * Where one band stands in its own swim, on -1 to 1: a sine of the tape's own clock, offset down the
 * picture so the bands are never all slid the same way at once — which is what makes it a swim and
 * not the whole field sliding. Read off the deck's clock and never off a count of frames, for the
 * feedback turn's reason: the picture has one clock and it is the deck's (0126).
 */
export const wobbleSlide = (clock: number, slice: number, slices: number): number =>
  cosTurn(clock * WOBBLE_HZ + (slice / Math.max(1, slices)) * WOBBLE_WAVES);

/**
 * The most of the picture's ink the grain takes out. Well short of the whole of it: every speck is
 * ink the screen keeps (0281), so a grain at one would be a picture of the noise floor rather than a
 * picture with a noise floor under it.
 */
export const GRAIN_CEILING = 0.5;

/**
 * How hard the grain bites: the grain term its entry declared — the tape's own Hiss — weighted by
 * how present the picture has travelled the instance to, under the ceiling. The fifth share the one
 * helper weighs, and the ceiling is this look's own (0283).
 */
export const grainBite = (presence: number, grain: number): number =>
  weighed(presence, grain, GRAIN_CEILING);

/**
 * The wobble, drawn: the field back down in the slices the lens already cuts it in, each slid
 * sideways by a sine of the tape's own clock — and then the noise tile swept over the whole of it
 * `destination-out`, which is a speck of ink kept everywhere the tile is opaque. Draws of what is
 * already drawn and one tile baked before any of them, no fill over the picture and no pixel touched
 * on a frame (0129, 0269).
 *
 * **Each band is drawn twice, a width apart, for the cut's own reason** (`cutAcross`,
 * src/ui/moireCanvasField.ts): the column a slide leaves behind is covered by the copy on the far
 * side of the edge rather than left blank down the picture. Written here rather than shared with the
 * cut because that cut lands on the screen and this one lands on the pass's own surface — and
 * because the file it lives in is a tier this one may not import from (docs/map.md).
 *
 * **And the grain takes ink out rather than masking it in.** The plan's draw was `destination-in`,
 * and with a tile baked once it cannot be: the composite multiplies the field by the tile *and by
 * the share*, so a grain at half its range would halve the whole field's coverage and the picture
 * would go solid rather than speckled. `destination-out` is the same tile read from the other side —
 * the field times one minus its own share of the noise — so the specks are the only thing that
 * moves and the term rides the share the way every other pass's does.
 */
const wobblePass: LookPass = (into, source, presence, terms, _veer, clock) => {
  const swim = wobbleSwim(presence, terms.wobble ?? 0);
  const { width, height } = source;
  // A tape at no wow at all, and one the picture has not travelled to yet, are both the field where
  // it stands — and this is the one draw that says so. The grain still runs: hiss is not wow.
  if (swim <= 0) into.drawImage(source, 0, 0);
  else {
    for (let slice = 0; slice < LENS_SLICES; slice++) {
      const top = Math.floor((slice * height) / LENS_SLICES);
      const deep = Math.floor(((slice + 1) * height) / LENS_SLICES) - top;
      if (deep <= 0) continue;
      const slid = swim * width * wobbleSlide(clock, slice, LENS_SLICES);
      into.drawImage(source, 0, top, width, deep, slid, top, width, deep);
      // The cut's own guard, for the cut's own reason: a band drawn twice where it already stands
      // composes with itself rather than covering the column a slide left behind. A sine is never
      // exactly nought in a double, so this is parity with `cutAcross` and not a bug it caught.
      if (slid !== 0) {
        into.drawImage(
          source,
          0,
          top,
          width,
          deep,
          slid - Math.sign(slid) * width,
          top,
          width,
          deep,
        );
      }
    }
  }
  const bite = grainBite(presence, terms.grain ?? 0);
  if (bite <= 0) return;
  const tile = grainOf();
  if (tile === null) return;
  into.globalCompositeOperation = "destination-out";
  into.globalAlpha = bite;
  // Swept diagonally on the same clock the swim rides, so the noise floor crawls rather than
  // standing as one pattern printed on the picture — two dozen pixels a second, which is eight
  // specks' worth and a crawl rather than a curtain drawn across the picture. The offset wraps into
  // the tile, so nothing here depends on how long the deck has run.
  // On whole pixels: the chain hands every pass a smoothing context (0281), so a tile placed on a
  // fraction is filtered against what lies outside its own rect and the column where two tiles meet
  // comes back under-grained — a hairline every tile across a surface wider than one.
  const swept = Math.round(wrap(clock * GRAIN_SWEEP, GRAIN_TILE));
  for (let down = -swept; down < height; down += GRAIN_TILE) {
    for (let over = -swept; over < width; over += GRAIN_TILE) into.drawImage(tile, over, down);
  }
};

/**
 * The working size a softened field is redrawn at, as a share of its own size: the band the radius
 * is stated across, **open end last**, because the term is the cutoff's own turn and a filter's
 * cutoff reads the same way round — wide open at the top of the knob and shut at the bottom. The
 * bloom's units and the bloom's reason (0280): a blur *is* its working size, nothing about one
 * lands on a grid, and the strip, the overlay and an export at any scale soften by the same amount
 * of picture. Wider at its shut end than the halo the bloom draws, because what this pass says is
 * that the fine detail is *gone* rather than that there is a room around it — and **the open end is
 * the field itself**, which is the one band here that closes at one: a filter standing open is a
 * wire, and the entry's own presence stands at nought in the same place (0202). The two agree
 * because they are one knob, and the band says so rather than leaving the presence to say it.
 */
export const SOFTEN_SCALE: readonly [number, number] = [1 / 16, 1];

/**
 * The size the copy that replaces the field is drawn at: the radius its entry declared, walked out
 * from the field's own size by how present the picture has travelled the instance to. **The blocks'
 * walk and not the bloom's weighed share** (0281, 0283): this pass lays nothing over the picture and
 * has no alpha to weigh, so what a travelling presence moves is the working size itself — a filter
 * arriving dissolves the picture out of focus rather than crossfading two of them, and one at no
 * presence at all is the field at the whole of itself.
 */
export const softenScale = (presence: number, radius: number): number =>
  1 + clamp(presence, 0, 1) * (denormalize(radius, ...SOFTEN_SCALE) - 1);

/**
 * The soften, drawn: the field small, and that small copy back up over the whole surface — and
 * **nothing else**, which is the whole of what tells this pass from the bloom. The halo lays the
 * blurred copy back *over* the picture and keeps the original underneath it (0280); this one is the
 * blurred copy at the whole of itself with no original under it at all, so the fine detail does not
 * come back and the picture reads as out of focus rather than as lit. Two draws of what is already
 * drawn, no fill over the picture and no pixel touched (0129, 0269).
 *
 * `copy` is what makes the second draw the whole of the surface rather than a blend over the small
 * corner the first draw left, and it is the bloom's second draw exactly — at the whole of itself,
 * because the plan's draw is `source-over` at one and an alpha here would be a halo by another name.
 */
const softenPass: LookPass = (into, source, presence, terms) => {
  // An absent radius is the open end of the knob and not the shut one, which is the field itself —
  // the registry refuses an entry that leaves the term unread, so nothing standing reaches this.
  const scale = softenScale(presence, terms.radius ?? 1);
  // A filter standing open, and one the picture has not travelled to yet, are both the field at the
  // whole of itself — and this is the one draw that says so.
  if (scale >= 1) {
    into.drawImage(source, 0, 0);
    return;
  }
  // At the whole of itself, and with nothing drawn after it: the plan's draw is `source-over` at one
  // and an alpha here would be a halo by another name.
  blurred(into, source, scale, 1);
};

/**
 * The looks, and the whole of what a look is to anything outside this file. **A look two entries
 * claim is refused at load, exactly as a drift profile is** (0122): an effect's look is its whole
 * identity in a glance at the picture, and two entries wearing one would draw the same move twice
 * and read as more of one thing.
 */
export const LOOKS: Readonly<Record<LookName, Look>> = {
  /**
   * The rack's own, and the one no effect may claim: how tight a lattice the whole standing
   * population folds the field into is a picture of the arrangement and never of a plugin (0278).
   */
  lattice: { at: "field", terms: {} },
  /** Sway's: how far the finished field is bent, and how fast that bend wanders (0278). */
  warp: { at: "cut", terms: { bend: "turn", wander: "value" } },
  /**
   * The automator's, and the one look with no terms at all: how many times the plane is folded is
   * how many automators are standing, which is a fact about the run each of them *is* rather than
   * about any value one holds. Applied before any field exists, so it takes no slot in the chain.
   */
  fold: { at: "bake", terms: {} },
  /**
   * Scatter's: how much of the field is drawn from somewhere else along it (0269), and how big a
   * piece of it each of those is — the Span, on its own range, because a window's length is how
   * long a piece of what was heard the stage holds and so how long a piece of the picture it breaks
   * off (0290).
   */
  shatter: { at: "cut", terms: { share: "turn", size: "turn" } },
  /**
   * Reverb's, and the first look that takes a slot in the chain: the field blurred and laid back
   * over itself, so the picture keeps every row it had and gains a halo around each of them. How
   * much is laid back is the wet, on its own range; how wide the halo is, is the decay, on its —
   * a longer tail is a bigger room, and a bigger room is a softer edge (0280).
   */
  bloom: { at: "pass", terms: { amount: "turn", radius: "turn" }, pass: bloomPass },
  /**
   * Crush's: the field on a grid of flat cells, hardened as the depth falls, so the picture keeps
   * where its rows are and loses how finely they are drawn. How wide a cell is, is the Rate, on its
   * own range — a coarse hold is a coarse picture; how many levels are left is the Bits, on its.
   */
  blocks: { at: "pass", terms: { block: "turn", levels: "turn" }, pass: blocksPass },
  /**
   * Delay's: the field again behind itself, spaced along the wind and fading by a fixed share every
   * repeat, so the picture keeps every row it had and gains the ghosts of them. How far apart the
   * repeats stand is the Time, on its own range; how many there are and how slowly they fade are
   * both the Feedback, on its — which is the one look whose two terms come off one knob, because a
   * feedback delay's count and its fade are one number in the sound as well.
   */
  echoes: { at: "pass", terms: { spacing: "turn", count: "turn", fade: "turn" }, pass: echoesPass },
  /**
   * Pop's: the field with its own blurred copy taken out of it and the mask that leaves added back
   * on, so every row keeps where it is and gains what of it stands above its neighbours. How hard the mask
   * bites is the Mix, on its own range — how much of the stage is heard is how much of the picture
   * is brought into focus.
   *
   * **And the one term that is not drawn here at all**: the saturation is the Sheen, and it reaches
   * the screen's ink through the stepped travel that ink already takes rather than through this
   * pass (`looksSaturate`, src/ui/moireLooks.ts; `inkTravelInto`, src/ui/moireScreen.ts, 0266).
   * Colour is the tile's, and a pass that recoloured the field a frame is the one 0269 refused.
   */
  sharpen: { at: "pass", terms: { amount: "turn", saturation: "turn" }, pass: sharpenPass },
  /**
   * Tape's: the field swimming sideways band by band on the machine's own clock, with the medium's
   * own grain taken out of the ink over it — so the picture keeps every row it had and stops being
   * straight and stops being clean. How far a band swims is the Wow, on its own range; how thick the
   * grain over it is, is the Hiss, on its.
   *
   * **And the third thing a tape does to the picture is already drawn.** Its Tone is the warm end of
   * the machine, and it reaches the picture as the row's own `hue` — which is where between the cool
   * ink and the hot one the row is drawn (0141, `driftFrom` in src/audio/effects/tape.ts). A tint
   * term here could only land in the same place: colour is the tile's and no pass may recolour the
   * field on a frame (0269), so it would reach the screen's ink — whose hue is claimed off the
   * boldest row, which is the claim this knob already makes. One knob into two dimensions is a knob
   * doing two jobs; two roads into one dimension is principle 1 (0285).
   */
  wobble: { at: "pass", terms: { wobble: "turn", grain: "turn" }, pass: wobblePass },
  /**
   * Filter's, and the one look whose single term is the knob its own presence is read off: the field
   * redrawn from a copy of itself too small to hold what was in it, so the picture keeps where every
   * row is and loses how finely it is drawn. How small that copy is, is the Cutoff, on its own range
   * — a filter shut down over the band is a picture with its fine detail dissolved out of it, and one
   * standing open is the field itself, which is where this entry's presence already stands (0202).
   */
  soften: { at: "pass", terms: { radius: "turn" }, pass: softenPass },
  /**
   * EQ's, and the one look whose terms, maths and draw are declared away from here: this file stood
   * at the 800-line hard cap when the band landed, so what left it is a whole look and never half
   * of one (`bandLook`, src/lib/moireBand.ts, 0287). What it draws is one band of the picture stood
   * out of the rest of it — lit where the gain lifts and taken out where it cuts.
   */
  band: bandLook,
  /**
   * Compressor's, declared away from here for the band's reason and at the same cap (`squashLook`,
   * src/lib/moireSquash.ts, 0288): the picture's whole range closed up toward its own middle, its
   * deepest ink thinned by the floor the Ratio lays under the mask's own blank and its windows
   * dimmed by where the Threshold brings the ceiling down. **And the one pass that lays a fill at
   * all** — one composite of its two — because a floor is a level where the field has none, and
   * every composite of the field with itself leaves nought at nought (0269).
   */
  squash: squashLook,
  /**
   * Shift's, declared away from here for the band's and the squash's reason and at the same cap
   * (`doubleLook`, src/lib/moireDouble.ts, 0289): a second picture at the interval's own ratio laid
   * over the first, zoomed about the middle of the field — because a pass is handed the finished
   * picture and has no row's anchor to bake about (0278). How far it stands away is the Interval,
   * in semitones; how much of it is heard is the Mix, which is the knob this entry's presence is
   * already read off.
   */
  double: doubleLook,
};

/**
 * The looks no registry entry may claim, because the arrangement itself already draws with them —
 * the lattice, which is the whole rack standing and no effect's (0278). The registry throws at
 * load for an entry claiming one, exactly as it does for a reserved drift profile (`RESERVED_PROFILES`,
 * src/lib/moireProfiles.ts).
 */
export const RESERVED_LOOKS: readonly LookName[] = ["lattice"];

/** Whether a name is one the picture has maths for — the registry's own question, asked once. */
export const isLookName = (value: unknown): value is LookName =>
  typeof value === "string" && (LOOK_NAMES as readonly string[]).includes(value);
