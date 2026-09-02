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
 *   draw is here beside its declaration (0280).
 */
import { clamp, denormalize } from "@/lib/range";

/** Every look the picture has maths for. One name per whole-field move, and no effect ids here. */
export const LOOK_NAMES = [
  "lattice",
  "warp",
  "fold",
  "shatter",
  "bloom",
  "blocks",
  "echoes",
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
 */
export type LookPass = (
  into: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  presence: number,
  terms: LookTerms,
  veer: number,
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
  clamp(presence, 0, 1) * clamp(amount, 0, 1) * BLOOM_CEILING;

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
  const { width, height } = source;
  const scale = bloomScale(terms.radius ?? 0);
  const wide = Math.max(1, Math.round(width * scale));
  const deep = Math.max(1, Math.round(height * scale));
  into.drawImage(source, 0, 0, wide, deep);
  into.globalCompositeOperation = "copy";
  into.globalAlpha = alpha;
  into.drawImage(into.canvas, 0, 0, wide, deep, 0, 0, width, height);
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
  clamp(presence, 0, 1) * Math.abs(clamp(veer, -1, 1)) * ECHO_CEILING;

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
  /** Scatter's: how much of the field is drawn from somewhere else along it (0269). */
  shatter: { at: "cut", terms: { share: "turn" } },
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
