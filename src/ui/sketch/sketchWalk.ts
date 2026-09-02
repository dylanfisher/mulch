/**
 * @role The one made-up walk every sketch on the bench draws — a fixed run of landings with the
 *   character, length and loudness each was drawn with — plus the fake planted grounds beside it. Deterministic and hand-written: a sketch is an argument about a
 *   surface, and a surface that redraws itself between two screenshots is arguing with itself.
 * @instead The real walk, which comes off a seed → src/lib/player.ts. The picture the card
 *   actually draws it with → src/ui/PlayerScope.tsx.
 */
import type { PlayerCharacter } from "@/lib/playerCast";
import { PLAYER_SLOTS } from "@/lib/playerSlots";

/** One landing of the made-up walk: where in the loop it opens, how long it holds, and how it sounds. */
export type SketchLanding = {
  /** Where it opens, as a fraction of the loop. */
  at: number;
  /** How long it holds, as a fraction of the loop. */
  span: number;
  /** How loud, nought to one — what the block's fill is spent on. */
  level: number;
  /** Which of the six the landing was drawn as. */
  character: PlayerCharacter;
};

/**
 * Sixteen landings across one loop, written by hand rather than seeded: the shape is the point —
 * a dense cluster, a long hold, a scatter, and one silence — and a generator would have to be
 * tuned until it produced exactly that anyway.
 */
export const SKETCH_WALK: readonly SketchLanding[] = [
  { at: 0.02, span: 0.05, level: 0.9, character: "plain" },
  { at: 0.08, span: 0.02, level: 0.75, character: "stutter" },
  { at: 0.11, span: 0.02, level: 0.7, character: "stutter" },
  { at: 0.14, span: 0.02, level: 0.62, character: "stutter" },
  { at: 0.19, span: 0.09, level: 1, character: "riff" },
  { at: 0.3, span: 0.04, level: 0.55, character: "scatter" },
  { at: 0.36, span: 0.01, level: 0.42, character: "scatter" },
  { at: 0.39, span: 0.03, level: 0.6, character: "scatter" },
  { at: 0.46, span: 0.12, level: 0.35, character: "breathe" },
  { at: 0.62, span: 0.06, level: 0.85, character: "riff" },
  { at: 0.7, span: 0.03, level: 0.68, character: "slide" },
  { at: 0.75, span: 0.03, level: 0.72, character: "slide" },
  { at: 0.8, span: 0.02, level: 0.5, character: "stutter" },
  { at: 0.84, span: 0.07, level: 0.95, character: "plain" },
  { at: 0.93, span: 0.02, level: 0.44, character: "scatter" },
  { at: 0.96, span: 0.03, level: 0.3, character: "breathe" },
];

/** Where the walk is standing while the bench is looked at, so one landing can be drawn lit. */
export const SKETCH_STANDING = 9;

/**
 * How each of the six reads as a fill, as an opacity on the one accent — the palette has a single
 * hue outside `destructive` (src/ui/tokens.css), so a character is a weight and not a colour, and
 * a sketch that invented a seventh ink would be arguing about the palette instead (0236).
 */
export const SKETCH_CHARACTER_WEIGHT: Record<PlayerCharacter, string> = {
  plain: "bg-primary",
  stutter: "bg-primary/70",
  riff: "bg-primary/85",
  scatter: "bg-primary/45",
  breathe: "bg-primary/25",
  slide: "bg-primary/55",
};

/**
 * The same weight as a number, for the pictures drawn in SVG — where `bg-primary/70` is not a fill
 * and an `opacity` is. Read off the map above rather than written out a second time (principle 1):
 * the share after the slash in a Tailwind token *is* the weight, and a token whose shape this
 * cannot read is a mistake rather than a full-strength fill.
 */
export function characterInk(character: PlayerCharacter): number {
  const token = SKETCH_CHARACTER_WEIGHT[character];
  const share = /^bg-primary(?:\/(\d+))?$/u.exec(token);
  if (share === null) throw new Error(`No weight can be read out of the token "${token}".`);
  const much = share[1];
  return much === undefined ? 1 : Number(much) / 100;
}

/**
 * One entry of a hand-written fixture, or a throw naming what was asked for. Every picture on the
 * bench indexes a fixture somewhere, and a fixture is written by hand so there is nothing to fall
 * back to: an index nobody wrote is a picture drawn of nothing, never a nought (principle 5).
 */
export function fixtureAt<T>(list: readonly T[], index: number, of: string): T {
  const one = list[index];
  if (one === undefined) throw new Error(`The bench fixture holds no ${of} ${index}.`);
  return one;
}

/** One planted ground: a name, where it opens and how much of the source it holds. */
export type SketchBed = { name: string; at: number; span: number };

/** Made-up planted grounds — the chips `Which Ground` keeps, as fractions of the whole source. */
export const SKETCH_BEDS: readonly SketchBed[] = [
  { name: "Head", at: 0.04, span: 0.1 },
  { name: "Break", at: 0.31, span: 0.16 },
  { name: "Tail", at: 0.72, span: 0.09 },
] as const;

/** How many loop-lengths of source the made-up file holds — how many beds there are to walk over. */
export const SKETCH_SOURCE_BEDS = 4;

/**
 * How many of the loop's own sixteenths the made-up file holds end to end — its length said in the
 * unit the crawl is counted in, so a picture of the source and a picture of its beds are two
 * readings of one measure rather than two made-up scales (`PLAYER_SLOTS`, src/lib/playerSlots.ts).
 */
export const SKETCH_SOURCE_SLOTS = SKETCH_SOURCE_BEDS * PLAYER_SLOTS;

/**
 * The source the beds are planted on, as a made-up run of loudness across the whole file. Written
 * by hand for the same reason the walk is: the shape is the argument — a quiet head, a loud break
 * in the middle, and a tail that decays — and a waveform a hand cannot recognise is a texture.
 */
export const SKETCH_SOURCE: readonly number[] = [
  0.12, 0.28, 0.44, 0.36, 0.52, 0.4, 0.3, 0.46, 0.34, 0.22, 0.18, 0.26, 0.38, 0.5, 0.62, 0.74, 0.88,
  0.96, 0.82, 0.9, 0.7, 0.86, 0.64, 0.78, 0.58, 0.72, 0.5, 0.6, 0.42, 0.54, 0.36, 0.48, 0.6, 0.44,
  0.56, 0.4, 0.5, 0.34, 0.42, 0.28, 0.36, 0.24, 0.3, 0.2, 0.24, 0.16, 0.18, 0.1,
];

/**
 * The five amounts of `Which Ground`, which are the song's and never a part's (0184) — so there is
 * one of these and not one per part, which is itself the thing the sketch has to draw. Written out
 * rather than read off a deck: the bench is wired to nothing (0247).
 */
export const SKETCH_GROUND: {
  bed: number;
  standing: number;
  every: number;
  distance: number;
  bias: number;
  home: number;
} = {
  /**
   * Which bed of the sample the song opens on, in the loop's own beds — nought is the loop itself
   * (`PLAYER_BED_MIN`…`MAX`, src/lib/playerBed.ts) — and it is what a move that comes home comes
   * home to. Not an index into `SKETCH_BEDS`: those are the grounds a hand planted, which is a
   * different list from the beds the crawl walks over.
   */
  bed: 0,
  /**
   * How far the ground has crawled from it, in the loop's own sixteenths. A bed is `PLAYER_SLOTS`
   * of them, so this stands a bed and a half along — part-way into one, which is the whole of the
   * crawl and the thing whole beds cannot say.
   */
  standing: 24,
  /**
   * How many go by before the loop moves along the sample — **counted in whole sequences of the
   * walk**, which is the unit the card has none of: `bedPer` offers jumps, parts and whole rounds
   * of the song and not this one (0192, src/lib/playerBed.ts). Whether that fourth clock is worth
   * being one is the question the eight drawings on this bench are asking.
   */
  every: 4,
  /**
   * How far one move may travel, **in the loop's own sixteenths and never in whole beds** — the
   * card's own unit, which `src/lib/playerBed.ts` is emphatic about because it is what lets the
   * loop crawl out of step with the sample rather than hopping bed to bed.
   */
  distance: 24,
  /** Which side it leans to, −1…1, nought as likely back as on. */
  bias: 0.4,
  /** The odds a move comes home to the song's own bed instead of travelling. */
  home: 0.25,
};

/**
 * How many whole sequences of the walk have gone by since the song started, while the bench is
 * being looked at. Not a multiple of `every`: two of them have gone since the last move, so the
 * next one is still two sequences off — a count standing on a boundary would draw a clock that has
 * just struck and never a clock going round, which is the whole of what these eight are asking.
 */
export const SKETCH_GROUND_GONE = 14;

/**
 * Where each move of the crawl has landed so far, in the loop's own sixteenths from the top of the
 * file, in the order they fell. Written by hand and not rolled, for the reason every fixture here
 * is: the shape is the argument — out, home, and out further than it started — and the last of them
 * is where the ground is standing now, which `sketchGround.ts` checks rather than trusts.
 */
export const SKETCH_GROUND_CRAWL: readonly number[] = [16, 0, 24];
