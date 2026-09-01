/**
 * @role Sketch 08 — the same machine from the output end only: no hopper and no drum, just the
 *   pile. Every landing is a chip whose size is how long it holds and whose fill is which
 *   character cut it, and the controls are sorts rather than numbers.
 * @instead The whole machine, worked from the top → src/ui/sketch/SketchChipper.tsx. Where a chip
 *   settles and where a name goes over it → src/ui/sketch/sketchPile.ts.
 */
// One surface, one argument — the length is the surface's (0247, 0007).
// oxlint-disable max-lines-per-function
import { useCallback, useMemo, useState } from "react";

import { cn } from "@/lib/cn";
import type { PlayerCharacter } from "@/lib/playerCast";
import { Button } from "@/ui/components/button";
import { SketchLabel } from "@/ui/sketch/SketchFrame";
import { GRIND, heapOf, namesOf, PILE_HEIGHT, WOOD, WOOD_START } from "@/ui/sketch/sketchPile";
import { SKETCH_CAST, SKETCH_CHARACTER_WEIGHT } from "@/ui/sketch/sketchWalk";

/**
 * The box is as tall as the pile can get and no taller — the height is derived from the same
 * layer cap the heap is packed under, so nothing the sorts can do pushes a chip or a name out
 * through the `overflow-hidden` edge.
 */
const PILE_BOX = { height: `${PILE_HEIGHT}px` };

export function SketchChips() {
  const [grind, setGrind] = useState(1);
  const [wood, setWood] = useState<readonly number[]>(WOOD_START);

  const coarser = useCallback(() => {
    setGrind((was) => Math.min(GRIND.max, was * GRIND.step));
  }, []);
  const finer = useCallback(() => {
    setGrind((was) => Math.max(GRIND.min, was / GRIND.step));
  }, []);
  const sort = useCallback((index: number, way: number) => {
    setWood((was) =>
      was.map((much, at) =>
        at === index ? Math.min(WOOD.max, Math.max(WOOD.min, much * way)) : much,
      ),
    );
  }, []);

  const chips = useMemo(() => heapOf(grind, wood), [grind, wood]);
  const names = useMemo(() => namesOf(chips), [chips]);

  return (
    <div className="flex flex-wrap items-end gap-6">
      <div
        data-machine="chips"
        style={PILE_BOX}
        className="relative min-w-96 flex-1 overflow-hidden rounded-lg border border-border bg-muted"
      >
        {chips.map((chip) => (
          <div
            key={chip.at}
            style={chip.style}
            className={cn("absolute rounded-sm", SKETCH_CHARACTER_WEIGHT[chip.character])}
          />
        ))}
        {names.map((one) => (
          <span
            key={one.name}
            style={one.style}
            className="absolute -translate-x-1/2 type-readout text-muted-foreground"
          >
            {one.name}
          </span>
        ))}
      </div>

      <div data-sorts="chips" className="flex min-w-64 flex-col gap-3">
        <div>
          <SketchLabel>How It Is Sorted</SketchLabel>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="outline" onClick={coarser}>
              Coarser
            </Button>
            <Button size="sm" variant="outline" onClick={finer}>
              Finer
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          {SKETCH_CAST.map((name, index) => (
            <Wood key={name} name={name} index={index} sort={sort} />
          ))}
        </div>
        <p className="max-w-sm type-body text-muted-foreground">
          Nothing states a number. A hand pushes the pile toward how it should look, and what it
          gives up is everything a pile cannot hold: order, repeats and rests are invisible in a
          heap, so how it is timed has no surface here at all.
        </p>
      </div>
    </div>
  );
}

/** One wood's own pair of sorts, named for the character rather than for the knob behind it. */
function Wood({
  name,
  index,
  sort,
}: {
  name: PlayerCharacter;
  index: number;
  sort: (index: number, way: number) => void;
}) {
  const more = useCallback(() => {
    sort(index, WOOD.step);
  }, [index, sort]);
  const less = useCallback(() => {
    sort(index, 1 / WOOD.step);
  }, [index, sort]);
  return (
    <div data-wood={name} className="flex items-center gap-2">
      <span
        className={cn("size-3 rounded-full", SKETCH_CHARACTER_WEIGHT[name])}
        aria-hidden="true"
      />
      <span className="w-16 type-body">{name}</span>
      <Button size="sm" variant="ghost" onClick={more}>
        More
      </Button>
      <Button size="sm" variant="ghost" onClick={less}>
        Less
      </Button>
    </div>
  );
}
