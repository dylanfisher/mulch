/**
 * @role The pile's own arithmetic — where a chip settles in the heap, where each wood writes its
 *   name over it, and how tall a box the two of them are guaranteed to fit in. No DOM: a pile is
 *   `(sorts) → chips` and nothing else, which is the seam the blend weights are split on too.
 * @instead The surface drawn out of it → src/ui/sketch/SketchChips.tsx. The one made-up walk it
 *   heaps → src/ui/sketch/sketchWalk.ts.
 */
import type { PlayerCharacter } from "@/lib/playerCast";
import { SKETCH_CAST, SKETCH_WALK } from "@/ui/sketch/sketchWalk";

/** How tall one chip is, and how far the next one up the heap sits, in the pile's own pixels. */
export const CHIP = 11;
export const LAYER = 13;
/** The smallest a chip may be drawn: a heap is read by eye, and a one-pixel chip is not a chip. */
export const CHIP_FLOOR = 0.02;
/**
 * How much wider than its own hold a chip is drawn. A pile is chips resting on chips, and sixteen
 * landings drawn at their true width never touch — which is a row of ticks and not a heap.
 */
export const HEAP = 3;
/** How much of the pile's width one name takes, which is how near is too near to another. */
export const NAME_ROOM = 0.14;
/**
 * How deep the pile goes. The sorts are unbounded gestures — a hand may press Coarser all day —
 * so the depth is capped here rather than left to the box: a chip with nowhere left to rest lies
 * on the top layer, which is what a full box looks like, and no chip and no name is ever pushed
 * out through an `overflow-hidden` edge.
 */
export const LAYERS = 5;
/** How far one name is lifted clear of another, and how much room the name itself takes. */
const NAME_ROW = 16;
const NAME_HEIGHT = 14;

/**
 * How tall the box has to be, derived rather than chosen: the deepest chip, plus a name over it,
 * plus the worst case of every wood but the first being lifted clear of the one before it.
 */
export const PILE_HEIGHT = LAYERS * LAYER + 4 + (SKETCH_CAST.length - 1) * NAME_ROW + NAME_HEIGHT;

/** How far a sort may push the pile before it stops answering — coarse enough, fine enough. */
export const GRIND = { min: 0.5, max: 2.4, step: 1.25 };
export const WOOD = { min: 0.4, max: 2.2, step: 1.3 };

/** How much of each wood is in the pile to begin with, in the cast's own order. */
export const WOOD_START = SKETCH_CAST.map(() => 1);

export type Chip = {
  at: number;
  character: PlayerCharacter;
  left: number;
  width: number;
  level: number;
  style: { left: string; width: string; bottom: string; height: string };
};

/**
 * The heap. A chip lands where in the source it came from and rides up on whatever is already
 * under it, which is the whole of the picture: there is no time here, only how much of what.
 */
export function heapOf(grind: number, wood: readonly number[]): Chip[] {
  const chips: Chip[] = [];
  for (const landing of SKETCH_WALK) {
    const much = wood[SKETCH_CAST.indexOf(landing.character)] ?? 1;
    const width = Math.min(Math.max(landing.span, CHIP_FLOOR) * HEAP * grind * much, 0.32);
    const left = Math.min(Math.max(landing.at, 0), 1 - width);
    // A chip falls in and settles on the lowest layer nothing else is already lying across —
    // not on top of the tallest thing it touches, which stacks sixteen landings into a staircase
    // rather than a heap, because the walk hands them over left to right.
    let level = 0;
    const lying = (under: Chip) =>
      under.level === level && left < under.left + under.width && under.left < left + width;
    while (level < LAYERS - 1 && chips.some((under) => lying(under))) level += 1;
    chips.push({
      at: landing.at,
      character: landing.character,
      left,
      width,
      level,
      style: {
        left: `${left * 100}%`,
        width: `${width * 100}%`,
        bottom: `${level * LAYER}px`,
        height: `${CHIP}px`,
      },
    });
  }
  return chips;
}

/**
 * Each wood names itself over its own chips, so the pile is read without a legend (0252). Two
 * woods heaped in the same stretch would write their names over each other — which reads as one
 * unreadable word rather than as two names — so a name that lands near one already placed is
 * lifted clear of it. The lift is re-checked against every name already down and not only against
 * the ones it had cleared before: a name lifted over one neighbour can land on another.
 */
export function namesOf(chips: readonly Chip[]) {
  const placed: { middle: number; bottom: number }[] = [];
  return SKETCH_CAST.map((name) => {
    const mine = chips.filter((chip) => chip.character === name);
    const middle = mine.reduce((sum, chip) => sum + chip.left + chip.width / 2, 0) / mine.length;
    // Clear of the whole pile under the name and not just of this wood's own chips: another
    // wood heaped higher at the same stretch would otherwise have a name lying across it.
    const top = chips.reduce(
      (high, chip) =>
        chip.left <= middle && middle <= chip.left + chip.width ? Math.max(high, chip.level) : high,
      0,
    );
    let bottom = (top + 1) * LAYER + 4;
    for (let lifted = true; lifted;) {
      lifted = false;
      for (const other of placed) {
        const close = Math.abs(other.middle - middle) < NAME_ROOM;
        if (close && Math.abs(other.bottom - bottom) < LAYER) {
          bottom = other.bottom + NAME_ROW;
          lifted = true;
        }
      }
    }
    placed.push({ middle, bottom });
    return { name, middle, bottom, style: { left: `${middle * 100}%`, bottom: `${bottom}px` } };
  });
}
