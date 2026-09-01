import { describe, expect, it } from "vitest";

import {
  CHIP,
  GRIND,
  heapOf,
  LAYER,
  LAYERS,
  namesOf,
  NAME_ROOM,
  PILE_HEIGHT,
  WOOD,
  WOOD_START,
} from "@/ui/sketch/sketchPile";
import { SKETCH_CAST } from "@/ui/sketch/sketchWalk";

/** Every corner of what the two sorts can reach, since a hand may press either of them all day. */
const SORTS = [
  { what: "as it opens", grind: 1, wood: WOOD_START },
  { what: "at the coarsest", grind: GRIND.max, wood: WOOD_START },
  { what: "at the finest", grind: GRIND.min, wood: WOOD_START },
  {
    what: "coarsest, with more of every wood",
    grind: GRIND.max,
    wood: SKETCH_CAST.map(() => WOOD.max),
  },
  {
    what: "finest, with less of every wood",
    grind: GRIND.min,
    wood: SKETCH_CAST.map(() => WOOD.min),
  },
];

describe("the pile", () => {
  it("settles a chip on the lowest layer nothing is already lying across", () => {
    const chips = heapOf(1, WOOD_START);
    for (const chip of chips) {
      if (chip.level === 0) continue;
      const under = chips.filter(
        (other) =>
          other !== chip &&
          other.level === chip.level - 1 &&
          chip.left < other.left + other.width &&
          other.left < chip.left + chip.width,
      );
      expect(under, `a chip at level ${chip.level} is resting on nothing`).not.toHaveLength(0);
    }
  });

  /**
   * The box is `overflow-hidden` and the sorts are unbounded gestures, so a pile that may grow
   * past its own height is a pile whose woods stop being named — which is the one thing the
   * surface exists to do (0252, 0253).
   */
  it("keeps every chip and every name inside the box at every sort it can be pushed to", () => {
    for (const { what, grind, wood } of SORTS) {
      const chips = heapOf(grind, wood);
      for (const chip of chips) {
        expect(chip.level, `${what}: a chip is stacked past the layer cap`).toBeLessThan(LAYERS);
        expect(
          chip.level * LAYER + CHIP,
          `${what}: a chip is drawn past the box`,
        ).toBeLessThanOrEqual(PILE_HEIGHT);
      }
      for (const name of namesOf(chips)) {
        expect(name.bottom, `${what}: ${name.name} is written past the box`).toBeLessThanOrEqual(
          PILE_HEIGHT - LAYER,
        );
      }
    }
  });
});

describe("the pile's names", () => {
  /**
   * A name lifted clear of one neighbour can land on a second, and a single forward pass never
   * looks back at the ones it had already cleared.
   */
  it("lifts a name clear of every other it lands near, not only of the ones placed before it", () => {
    for (const { what, grind, wood } of [
      ...SORTS,
      // The presses that put `scatter` back under `plain` when the lift was a single pass:
      // finest, less of plain, more of the rest — every one of them a sort a hand can press.
      {
        what: "finest, less of plain and more of the rest",
        grind: GRIND.min,
        wood: [WOOD.min, WOOD.step ** 2, WOOD.max, WOOD.step, WOOD.step ** 2, WOOD.step],
      },
    ]) {
      const names = namesOf(heapOf(grind, wood));
      for (const one of names) {
        for (const other of names) {
          if (one === other) continue;
          const close = Math.abs(one.middle - other.middle) < NAME_ROOM;
          if (!close) continue;
          expect(
            Math.abs(one.bottom - other.bottom),
            `${what}: ${one.name} and ${other.name} are written over each other`,
          ).toBeGreaterThanOrEqual(LAYER);
        }
      }
    }
  });
});
