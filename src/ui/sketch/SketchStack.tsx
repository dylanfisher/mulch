/**
 * @role Sketch 04 — the mulcher as a stack of moves: behaviour is composed by dragging small
 *   cards into a chain, each carrying one verb and at most two numbers, so an empty stack is a
 *   simple mulcher and depth is something a hand adds on purpose.
 * @instead The rack this borrows its shape from, where instances of an entry stack the same way
 *   → src/ui/EffectRack.tsx.
 */
// One surface, one argument — the length is the surface's (0247, 0007).
// oxlint-disable max-lines-per-function
import { useCallback, useMemo, useState } from "react";

import { cn } from "@/lib/cn";
import { SketchLabel } from "@/ui/sketch/SketchFrame";
import { Button } from "@/ui/components/button";
import { Slider } from "@/ui/components/slider";
import { Switch } from "@/ui/components/switch";

/** What a move card can be. Each is one verb and at most two numbers — that is the whole rule. */
const MOVES = [
  { move: "Jump", says: "go somewhere else in the loop", dials: ["how far", "how often"] },
  { move: "Stutter", says: "strike the landing again", dials: ["how many", "how tight"] },
  { move: "Hold", says: "let it ring", dials: ["how long"] },
  { move: "Reverse", says: "play it backwards", dials: ["how likely"] },
  { move: "Rest", says: "say nothing", dials: ["how long", "how often"] },
  { move: "Slide", says: "bend into the next one", dials: ["how far"] },
  { move: "Spark", says: "put an edge on it", dials: ["how much", "how late"] },
] as const;

/**
 * The stack as it stands on the bench: four moves, one of them switched off — joined to what each
 * move *is* once here, so a row does not look its own verb up every render (react-perf).
 */
const CHAIN = [
  { move: "Jump", on: true, values: [40, 75] },
  { move: "Stutter", on: true, values: [60, 30] },
  { move: "Rest", on: false, values: [20, 50] },
  { move: "Slide", on: true, values: [55] },
].map((entry) => {
  const spec = MOVES.find((one) => one.move === entry.move);
  if (spec === undefined) throw new Error(`The stack holds a move nothing declares: ${entry.move}`);
  return {
    move: entry.move,
    on: entry.on,
    values: entry.values,
    says: spec.says,
    dials: spec.dials,
  };
});

/** How many numbers the whole chain is — the figure this sketch exists to say out loud. */
const CHAIN_NUMBERS = CHAIN.reduce((sum, entry) => sum + entry.dials.length, 0);

/** One dial of one card. Its own component because a fresh `[n]` every render is a new prop. */
function MoveDial({ name, at }: { name: string; at: number }) {
  const value = useMemo(() => [at], [at]);
  return (
    <label className="flex min-w-40 items-center gap-2">
      <span className="type-eyebrow text-muted-foreground">{name}</span>
      <Slider defaultValue={value} className="w-24" />
    </label>
  );
}

/** One move in the chain, with its handler as a prop rather than a closure (react-perf). */
function MoveCard({
  index,
  move,
  says,
  dials,
  values,
  on,
  picked,
  onPick,
}: {
  index: number;
  move: string;
  says: string;
  dials: readonly string[];
  values: readonly number[];
  on: boolean;
  picked: boolean;
  onPick: (index: number) => void;
}) {
  const onClick = useCallback(() => {
    onPick(index);
  }, [onPick, index]);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col gap-2 rounded border border-border p-3 text-left",
        picked && "bg-primary/15",
        !on && "opacity-50",
      )}
    >
      <div className="flex items-center gap-3">
        <span aria-hidden className="cursor-grab type-readout text-muted-foreground">
          ⠿
        </span>
        <span className="type-title">{move}</span>
        <span className="type-body text-muted-foreground">{says}</span>
        <span className="ml-auto">
          <Switch defaultChecked={on} />
        </span>
      </div>
      {/* One row of dials per card, and never more than two — the cap is the whole point. */}
      <div className="flex flex-wrap gap-4 pl-7">
        {dials.map((dial, at) => (
          <MoveDial key={dial} name={dial} at={values[at] ?? 50} />
        ))}
      </div>
    </button>
  );
}

export function SketchStack() {
  const [picked, setPicked] = useState(1);
  const onPick = useCallback((index: number) => {
    setPicked(index);
  }, []);

  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="flex min-w-72 flex-1 flex-col gap-2">
        <div className="flex items-center gap-3">
          <SketchLabel>What It Does, In Order</SketchLabel>
          <span className="ml-auto type-readout text-muted-foreground">Seed 4821</span>
        </div>

        {CHAIN.map((entry, index) => (
          <MoveCard
            key={entry.move}
            index={index}
            move={entry.move}
            says={entry.says}
            dials={entry.dials}
            values={entry.values}
            on={entry.on}
            picked={index === picked}
            onPick={onPick}
          />
        ))}

        <Button variant="outline" size="sm" className="self-start">
          Add a move
        </Button>
      </div>

      <div className="w-56 shrink-0">
        <SketchLabel>Moves</SketchLabel>
        <div className="mt-2 flex flex-col gap-1">
          {MOVES.map((one) => (
            <div
              key={one.move}
              className="cursor-grab rounded border border-dashed border-border px-3 py-2"
            >
              <div className="type-body">{one.move}</div>
              <div className="type-eyebrow text-muted-foreground">
                {one.dials.length} number{one.dials.length === 1 ? "" : "s"}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 type-body text-muted-foreground">
          Drag one in. This stack is {CHAIN_NUMBERS} numbers; the same patch on the card today is
          forty-five, drawn whether or not any of them is doing anything.
        </p>
      </div>
    </div>
  );
}
