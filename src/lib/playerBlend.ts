/**
 * @role Where a hand stands among the six, as a place: the hexagon's own coordinates, where each
 *   character's corner and its name sit round the middle, and the weighing that turns one point
 *   into six shares of one. Pure maths — no DOM, no React, no PRNG.
 * @instead What those six shares are spent on, which is one spec blended out of six draws →
 *   `blendCast`, src/lib/playerCharacter.ts. The pad they are dragged on →
 *   src/ui/PlayerBlend.tsx. The six names themselves → src/lib/playerCast.ts.
 */
import { PLAYER_CHARACTERS } from "./playerCast.ts";

/** The square the pad is drawn in, and its middle. */
export const BLEND_PAD = 200;
export const BLEND_MIDDLE = BLEND_PAD / 2;

/**
 * How far the box spills past the square on each side. The geometry is the square; the names sit
 * outside it, and a name that runs off the edge of its own picture reads as a shorter number
 * rather than as a truncation — `stutter 38` drawn as `stutter 3` (0252). So the box is wider than
 * the pad rather than the names smaller.
 *
 * Wide enough for three digits, because a name pressed is the whole of its corner and reads `100`
 * (0259, `blendCorner`): at the spill this was drawn at, that one extra digit was the case that
 * ran off the edge.
 */
export const BLEND_SPILL = 60;
export const BLEND_VIEW = BLEND_PAD + BLEND_SPILL * 2;

/**
 * The element's own size, said once. It is `h-40 w-64` at the box's own 320:200, because any other
 * ratio letterboxes the drawing inside the element while the pointer maths stretch-fits — which
 * hands the drag a place a few units off the finger (0252).
 */
export const BLEND_BOX = "h-40 w-64";

/** How far out the corners sit, and how far out the names sit — outside them, never under a puck. */
export const BLEND_RING = 72;
export const BLEND_NAMES = 92;

/** A place in the pad's own coordinates. */
export type BlendPoint = { x: number; y: number };
/** A place on a circle round the middle of the pad: where it is, and which way out that is. */
export type BlendPlace = { angle: number; x: number; y: number };

/**
 * Six shares of one, which is what a blend is. A blend standing on nothing has no answer to give —
 * there is no such place — so it says so rather than handing back six NaNs (principle 5).
 */
export function blendNormalise(raw: readonly number[]): number[] {
  const total = raw.reduce((sum, one) => sum + one, 0);
  if (total <= 0) throw new Error("A blend weighed the whole cast at nothing, which is nowhere.");
  return raw.map((one) => one / total);
}

/** Where the nth of `count` sits going round, starting at the top. */
export function blendAround(index: number, count: number, radius: number): BlendPlace {
  const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
  return {
    angle,
    x: BLEND_MIDDLE + Math.cos(angle) * radius,
    y: BLEND_MIDDLE + Math.sin(angle) * radius,
  };
}

/**
 * The six round the pad: where each one's mark is drawn, and where its own name is drawn. Built off
 * `PLAYER_CHARACTERS`, so the pad's corners are the module's cast in the module's own order and a
 * name added to the cast arrives here with no change (principle 1).
 */
export const BLEND_CORNERS = PLAYER_CHARACTERS.map((name, index) => {
  const mark = blendAround(index, PLAYER_CHARACTERS.length, BLEND_RING);
  return {
    name,
    angle: mark.angle,
    x: mark.x,
    y: mark.y,
    label: blendAround(index, PLAYER_CHARACTERS.length, BLEND_NAMES),
  };
});

/**
 * How softly a corner's pull falls off, in the pad's own units squared. It is what keeps the middle
 * of the pad an even six rather than a spike at whichever corner is a hair nearer: at nought the
 * weighing is a pure inverse square and the puck would have to sit exactly on the centre for the
 * six to be equal.
 */
const BLEND_SOFT = 400;

/** How much of each corner a puck on the hexagon is standing in: inverse square, normalised. */
export function weighBlend(at: BlendPoint): number[] {
  return blendNormalise(
    BLEND_CORNERS.map(
      (corner) => 1 / (Math.hypot(corner.x - at.x, corner.y - at.y) ** 2 + BLEND_SOFT),
    ),
  );
}

/** Where the puck stands when the card mounts: off-centre, so the pad is not a flat six. */
export const BLEND_START: BlendPoint = { x: BLEND_MIDDLE + 26, y: BLEND_MIDDLE - 18 };

/**
 * The whole of one corner, as six weights: what a hand asks for when it names a character rather
 * than pointing at a place between them. Not `weighBlend` at the corner's own point, which is four
 * fifths of that corner and a fifth of everything else — the softening that keeps the middle an
 * even six is exactly what stops a puck standing on a corner from being only that corner, and a
 * name pressed has to mean the name (`blendCast` returns a corner's draw untouched at a weight of
 * one).
 */
export function blendCorner(index: number): number[] {
  if (BLEND_CORNERS[index] === undefined) {
    throw new Error(`The cast has no corner ${index}; it has ${BLEND_CORNERS.length}.`);
  }
  return BLEND_CORNERS.map((_, one) => (one === index ? 1 : 0));
}
