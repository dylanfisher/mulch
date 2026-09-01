/**
 * @role Sketch 06 — the seed as the interface: one roll draws six whole candidate walks as
 *   pictures, a hand picks the one it likes, and a padlock on each register freezes what was good
 *   so the next roll only moves the rest.
 * @instead The seed as it is today — a readout beside a Reseed press → src/ui/PlayerCard.tsx.
 */
// One surface, one argument — the length is the surface's (0247, 0007).
// oxlint-disable max-lines-per-function
import { useCallback, useState } from "react";

import { cn } from "@/lib/cn";
import { PLAYER_GROUP_LABELS } from "@/lib/copy";
import { SketchLabel } from "@/ui/sketch/SketchFrame";
import { Button } from "@/ui/components/button";
import { Toggle } from "@/ui/components/toggle";

/** The five registers the card already folds its numbers into, each of which may be locked. */
const REGISTERS = [
  { key: "landing", locked: false },
  { key: "sound", locked: true },
  { key: "timing", locked: false },
  { key: "ground", locked: true },
  { key: "arrange", locked: false },
] as const;

/**
 * Six candidates as runs of bar heights, hand-written so the six read as recognisably different
 * characters rather than as six versions of one noise. Each bar carries its own style, because a
 * fresh object per bar per render is a new prop on a thing drawn ninety-six times (react-perf).
 */
const CANDIDATES = [
  { seed: 4821, bars: [9, 2, 2, 2, 8, 5, 1, 3, 7, 4, 4, 6, 2, 9, 3, 1] },
  { seed: 1174, bars: [4, 4, 4, 4, 5, 5, 5, 5, 3, 3, 3, 3, 6, 6, 6, 6] },
  { seed: 9302, bars: [9, 1, 1, 8, 1, 1, 7, 1, 1, 9, 1, 1, 6, 1, 1, 8] },
  { seed: 2660, bars: [1, 2, 3, 4, 5, 6, 7, 8, 9, 8, 7, 6, 5, 4, 3, 2] },
  { seed: 7015, bars: [8, 8, 2, 2, 9, 9, 1, 1, 7, 7, 3, 3, 8, 8, 2, 2] },
  { seed: 3388, bars: [2, 1, 9, 1, 2, 1, 8, 1, 3, 1, 9, 1, 2, 1, 7, 1] },
].map((one) => ({
  seed: one.seed,
  bars: one.bars.map((bar, at) => ({
    id: `${one.seed}-${at}`,
    style: { height: `${bar * 10}%`, opacity: 0.4 + bar * 0.06 },
  })),
}));

/** One candidate, as a picture you can tell apart from five others at a glance. */
function Candidate({
  seed,
  bars,
  held,
  onHold,
}: {
  seed: number;
  bars: readonly { id: string; style: React.CSSProperties }[];
  held: boolean;
  onHold: (seed: number) => void;
}) {
  const onClick = useCallback(() => {
    onHold(seed);
  }, [onHold, seed]);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col gap-2 rounded border border-border p-2",
        held ? "bg-primary/15 ring-2 ring-ring" : "hover:bg-muted",
      )}
    >
      <div className="flex h-16 items-end gap-px">
        {bars.map((bar) => (
          <div key={bar.id} className="flex-1 rounded-t bg-primary" style={bar.style} />
        ))}
      </div>
      <span className="type-readout text-muted-foreground">{seed}</span>
    </button>
  );
}

export function SketchRolls() {
  const [held, setHeld] = useState(4821);
  const onHold = useCallback((seed: number) => {
    setHeld(seed);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <Button size="lg">Roll</Button>
        <span className="type-body text-muted-foreground">
          Six whole mulchers. Pick one, lock what worked, roll again.
        </span>
        <span className="ml-auto type-readout text-muted-foreground">Seed {held}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {CANDIDATES.map((one) => (
          <Candidate
            key={one.seed}
            seed={one.seed}
            bars={one.bars}
            held={one.seed === held}
            onHold={onHold}
          />
        ))}
      </div>

      {/* The locks. This is the whole of Fine Tune: not what a number is, but whether it moves. */}
      <div className="flex flex-wrap items-center gap-2">
        <SketchLabel className="w-full">Keep When It Rolls</SketchLabel>
        {REGISTERS.map((register) => (
          <Toggle key={register.key} size="sm" pressed={register.locked}>
            <span aria-hidden className="mr-2">
              {register.locked ? "🔒" : "🔓"}
            </span>
            {PLAYER_GROUP_LABELS[register.key]}
          </Toggle>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline">
          Nudge this one
        </Button>
        <Button size="sm" variant="outline">
          Roll six more like it
        </Button>
        <Button size="sm" variant="ghost">
          Open the numbers ▸
        </Button>
      </div>

      <p className="max-w-3xl type-body text-muted-foreground">
        Nothing is dialled. A patch is arrived at by choosing between things whose shape you can
        already see, and refinement is narrowing what may move rather than moving it — the same
        gesture the whole way down, from the first roll to the last.
      </p>
    </div>
  );
}
