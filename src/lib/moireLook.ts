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
export const LOOK_NAMES = ["lattice", "warp", "fold", "shatter", "bloom"] as const;

export type LookName = (typeof LOOK_NAMES)[number];

/** Every term any look reads. Named once, so `lookFrom` can be typed against the whole set. */
export const LOOK_TERMS = ["bend", "wander", "share", "amount", "radius"] as const;

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
 */
export type LookPass = (
  into: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  presence: number,
  terms: LookTerms,
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
