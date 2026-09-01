/**
 * @role The one made-up walk every sketch on the bench draws — a fixed run of landings with the
 *   character, length and loudness each was drawn with — plus the fake part list and the fake
 *   planted grounds beside it. Deterministic and hand-written: a sketch is an argument about a
 *   surface, and a surface that redraws itself between two screenshots is arguing with itself.
 * @instead The real walk, which comes off a seed → src/lib/player.ts. The picture the card
 *   actually draws it with → src/ui/PlayerScope.tsx.
 */
import { PLAYER_CHARACTERS, type PlayerCharacter } from "@/lib/playerCast";
import { PLAYER_SLOTS } from "@/lib/playerSlots";

/** One landing of the made-up walk: where in the loop it opens, how long it holds, and how it sounds. */
export type SketchLanding = {
  /** Where it opens, as a fraction of the loop. */
  at: number;
  /** How long it holds, as a fraction of the loop. */
  span: number;
  /** How many times the landing is struck before the next jump. */
  repeats: number;
  /** How loud, nought to one — what the block's fill is spent on. */
  level: number;
  /** Which of the six the landing was drawn as. */
  character: PlayerCharacter;
  /**
   * Which slot of the loop it reads — where on the *source* it came from, which is the one thing
   * `at` does not say. The jump's three amounts are only visible against this: a step's size is
   * the distance, its side is the bias, and a return to slot nought is the walk coming home.
   */
  slot: number;
};

/**
 * Sixteen landings across one loop, written by hand rather than seeded: the shape is the point —
 * a dense cluster, a long hold, a scatter, and one silence — and a generator would have to be
 * tuned until it produced exactly that anyway.
 */
export const SKETCH_WALK: readonly SketchLanding[] = [
  { at: 0.02, span: 0.05, repeats: 1, level: 0.9, character: "plain", slot: 0 },
  { at: 0.08, span: 0.02, repeats: 4, level: 0.75, character: "stutter", slot: 3 },
  { at: 0.11, span: 0.02, repeats: 4, level: 0.7, character: "stutter", slot: 7 },
  { at: 0.14, span: 0.02, repeats: 3, level: 0.62, character: "stutter", slot: 5 },
  { at: 0.19, span: 0.09, repeats: 1, level: 1, character: "riff", slot: 0 },
  { at: 0.3, span: 0.04, repeats: 2, level: 0.55, character: "scatter", slot: 4 },
  { at: 0.36, span: 0.01, repeats: 6, level: 0.42, character: "scatter", slot: 6 },
  { at: 0.39, span: 0.03, repeats: 1, level: 0.6, character: "scatter", slot: 10 },
  { at: 0.46, span: 0.12, repeats: 1, level: 0.35, character: "breathe", slot: 0 },
  { at: 0.62, span: 0.06, repeats: 1, level: 0.85, character: "riff", slot: 2 },
  { at: 0.7, span: 0.03, repeats: 3, level: 0.68, character: "slide", slot: 6 },
  { at: 0.75, span: 0.03, repeats: 3, level: 0.72, character: "slide", slot: 10 },
  { at: 0.8, span: 0.02, repeats: 5, level: 0.5, character: "stutter", slot: 8 },
  { at: 0.84, span: 0.07, repeats: 1, level: 0.95, character: "plain", slot: 0 },
  { at: 0.93, span: 0.02, repeats: 2, level: 0.44, character: "scatter", slot: 3 },
  { at: 0.96, span: 0.03, repeats: 1, level: 0.3, character: "breathe", slot: 7 },
];

/**
 * The three amounts the walk above was drawn with, read back off it rather than invented beside
 * it: the longest step it takes, which side its steps lean to, and how often it comes home to the
 * top of the loop instead of travelling. A picture that drew a reach the landings do not obey
 * would be a legend rather than a reading of them.
 *
 * The distance is what the walk *did*, which is a floor under the dial that let it: the dial is a
 * cap and a jump draws inside it (`leanStep`, src/lib/playerWalk.ts). A hand-written walk short of
 * its own cap is the normal case and not a fault, so the picture says the reach it can show.
 */
export const SKETCH_REACH = ((): { distance: number; bias: number; home: number } => {
  const steps = SKETCH_WALK.slice(1).map((landing, index) => {
    const from = SKETCH_WALK[index];
    // Not a default: an index inside a `slice(1)` cannot be missing, and a nought standing in for
    // a slot nobody read would be a step of the wrong size drawn as a fact (principle 5).
    if (from === undefined) throw new Error(`The walk fixture holds no landing ${index}.`);
    const by = landing.slot - from.slot;
    // The real jump wraps at the loop's edge, so a move of +4 from slot 14 lands on slot 2 and
    // reads here as a step back of twelve (`travelFrom`, src/lib/playerWalk.ts). Nothing this file
    // draws unwraps one, so the fixture stays clear of the edge and says so loudly if it stops:
    // a wrapped pair would put a distance on the picture that no jump ever travelled.
    // Only of a step that travelled: coming home is a jump to the top of the loop however far
    // that is, so a return from slot ten is not a step of ten (`leanStep` returns null for it).
    if (landing.slot !== 0 && Math.abs(by) > PLAYER_SLOTS / 2) {
      throw new Error(
        `The walk fixture steps ${by} slots, which is the loop's wrap and not a jump.`,
      );
    }
    return { to: landing.slot, by };
  });
  const travelled = steps.filter((step) => step.to !== 0);
  if (travelled.length === 0) {
    throw new Error("The walk fixture never leaves the top of the loop, so it has no reach.");
  }
  const forward = travelled.filter((step) => step.by > 0).length;
  return {
    distance: Math.max(...travelled.map((step) => Math.abs(step.by))),
    // The module's own reading of a side: a bias of nought is even, one is every step forward
    // (`leanStep`, src/lib/playerWalk.ts) — so it is twice the forward share less one, and not
    // the share itself.
    bias: (2 * forward) / travelled.length - 1,
    home: (steps.length - travelled.length) / steps.length,
  };
})();

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

/** The six in the order the module declares them, so a sketch's row is the module's row. */
export const SKETCH_CAST = PLAYER_CHARACTERS;

/** A made-up arrangement: what the song list would hold while the bench is looked at. */
export const SKETCH_PARTS = [
  { name: "Open", bars: 4, character: "plain" },
  { name: "Chew", bars: 8, character: "stutter" },
  { name: "Wide", bars: 4, character: "breathe" },
  { name: "Chew Again", bars: 8, character: "scatter" },
] as const satisfies readonly { name: string; bars: number; character: PlayerCharacter }[];

/** Made-up planted grounds — the chips `Which Ground` keeps, as fractions of the whole source. */
export const SKETCH_BEDS = [
  { name: "Head", at: 0.04, span: 0.1 },
  { name: "Break", at: 0.31, span: 0.16 },
  { name: "Tail", at: 0.72, span: 0.09 },
] as const;
