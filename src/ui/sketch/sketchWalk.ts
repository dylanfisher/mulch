/**
 * @role The one made-up walk every sketch on the bench draws — a fixed run of landings with the
 *   character, length and loudness each was drawn with — plus the fake part list and the fake
 *   planted grounds beside it. Deterministic and hand-written: a sketch is an argument about a
 *   surface, and a surface that redraws itself between two screenshots is arguing with itself.
 * @instead The real walk, which comes off a seed → src/lib/player.ts. The picture the card
 *   actually draws it with → src/ui/PlayerScope.tsx.
 */
import { PLAYER_CHARACTERS, type PlayerCharacter } from "@/lib/playerCast";

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
};

/**
 * Sixteen landings across one loop, written by hand rather than seeded: the shape is the point —
 * a dense cluster, a long hold, a scatter, and one silence — and a generator would have to be
 * tuned until it produced exactly that anyway.
 */
export const SKETCH_WALK: readonly SketchLanding[] = [
  { at: 0.02, span: 0.05, repeats: 1, level: 0.9, character: "plain" },
  { at: 0.08, span: 0.02, repeats: 4, level: 0.75, character: "stutter" },
  { at: 0.11, span: 0.02, repeats: 4, level: 0.7, character: "stutter" },
  { at: 0.14, span: 0.02, repeats: 3, level: 0.62, character: "stutter" },
  { at: 0.19, span: 0.09, repeats: 1, level: 1, character: "riff" },
  { at: 0.3, span: 0.04, repeats: 2, level: 0.55, character: "scatter" },
  { at: 0.36, span: 0.01, repeats: 6, level: 0.42, character: "scatter" },
  { at: 0.39, span: 0.03, repeats: 1, level: 0.6, character: "scatter" },
  { at: 0.46, span: 0.12, repeats: 1, level: 0.35, character: "breathe" },
  { at: 0.62, span: 0.06, repeats: 1, level: 0.85, character: "riff" },
  { at: 0.7, span: 0.03, repeats: 3, level: 0.68, character: "slide" },
  { at: 0.75, span: 0.03, repeats: 3, level: 0.72, character: "slide" },
  { at: 0.8, span: 0.02, repeats: 5, level: 0.5, character: "stutter" },
  { at: 0.84, span: 0.07, repeats: 1, level: 0.95, character: "plain" },
  { at: 0.93, span: 0.02, repeats: 2, level: 0.44, character: "scatter" },
  { at: 0.96, span: 0.03, repeats: 1, level: 0.3, character: "breathe" },
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
