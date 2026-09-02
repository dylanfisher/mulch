/**
 * @role The coordinate bent by itself before the picture is read: the swirl inside a reference
 *   cell, which is two sines of the point fed back into the point — what a sway effect standing in
 *   the rack does to the whole finished field. Pure maths on picture units, and the one place a
 *   warp is a number.
 * @instead Where the field is actually bent — in slices of the finished picture, one pass each way
 *   → `cutField` in src/ui/moireCanvasField.ts. How much sway the rack is holding — sway's own
 *   declared look → src/ui/moireLooks.ts (0279); the phase its own rate has walked →
 *   src/ui/moireShape.ts. The bench picture this came off → src/ui/sketch/sketchDrift.ts.
 */
import { TAU } from "./moire.ts";
import { clamp } from "./range.ts";

/**
 * How far a whole warp bends the picture, as a fraction of its height. Bounded here and not where
 * it is read, the way the shatter's share is (`shatterShare`, src/lib/moireGeometry.ts): the bend
 * is spent through slices of the finished field, and a slice slid further than the lens's own
 * slide reads as a band rather than as a bend.
 */
export const WARP_CEILING = 0.12;

/** How many cycles of the first sine there are down the height, and of the second across it. */
export const WARP_DOWN = 1.3;
export const WARP_ACROSS = 0.9;

/** How far a rack `amount` warped, on nought to one, actually bends the picture: never past the ceiling. */
export const warpShare = (amount: number): number => WARP_CEILING * clamp(amount, 0, 1);

/**
 * How far a band of the picture standing `t` of the height down it is slid across, at a `share`
 * of the height, `phase` turns into the warp's own cycle — the first sine of the sketch's warp,
 * which bends x by y.
 */
export const warpSlideX = (share: number, phase: number, t: number): number =>
  share * Math.sin(TAU * (WARP_DOWN * t + phase));

/**
 * And how far a column standing `t` heights across is slid down — the second sine, which bends y
 * by x, on the opposite phase so the two never line up into one diagonal slide.
 */
export const warpSlideY = (share: number, phase: number, t: number): number =>
  share * Math.sin(TAU * (WARP_ACROSS * t - phase));
