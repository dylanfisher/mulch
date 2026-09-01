/**
 * @role Sketch 02 — the walk as an editable score: every landing is a block on the loop that a
 *   hand drags, stretches and stacks, and the numbers are a readout beside it rather than the way in.
 * @instead The walk drawn as a picture nobody may touch → src/ui/PlayerScope.tsx, and the argument
 *   for that → docs/decisions/0232-a-picture-is-a-control-only-where-the-pointer-is-the-value.md.
 */
// One surface, one argument — the length is the surface's (0247, 0007).
// oxlint-disable max-lines-per-function
import { useCallback, useMemo, useState } from "react";

import { cn } from "@/lib/cn";
import { SketchLabel } from "@/ui/sketch/SketchFrame";
import {
  SKETCH_CAST,
  SKETCH_CHARACTER_WEIGHT,
  SKETCH_STANDING,
  SKETCH_WALK,
  type SketchLanding,
} from "@/ui/sketch/sketchWalk";
import { Button } from "@/ui/components/button";
import { Toggle } from "@/ui/components/toggle";

/** Four lanes deep, so a landing struck many times stacks upward instead of growing a dial. */
const LANES = 4;
/** Eight bars, so a hand can see where the beat is without a Beat toggle to tell it. */
const BARS = 8;

const LANE_LINES = Array.from({ length: LANES }, (_, lane) => ({
  lane,
  style: { top: `${(lane / LANES) * 100}%` },
}));
const BAR_LINES = Array.from({ length: BARS }, (_, bar) => ({
  bar,
  style: { left: `${(bar / BARS) * 100}%` },
}));

/** Every block's box, written once: where it opens, how long it holds, how often it is struck. */
const BLOCKS = SKETCH_WALK.map((landing, index) => ({
  index,
  landing,
  style: {
    left: `${landing.at * 100}%`,
    width: `${Math.max(landing.span, 0.012) * 100}%`,
    height: `${(Math.min(landing.repeats, LANES) / LANES) * 100}%`,
  },
}));

/** One block. Its own component so its handler is a prop and not a closure the row rebuilds. */
function ScoreBlock({
  index,
  landing,
  style,
  picked,
  onPick,
}: {
  index: number;
  landing: SketchLanding;
  style: React.CSSProperties;
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
      style={style}
      className={cn(
        "absolute bottom-0 cursor-grab rounded-t border border-border",
        SKETCH_CHARACTER_WEIGHT[landing.character],
        picked && "ring-2 ring-ring",
        index === SKETCH_STANDING && "outline-2 outline-foreground",
      )}
    >
      <span className="sr-only">{landing.character}</span>
    </button>
  );
}

export function SketchScore() {
  const [picked, setPicked] = useState(4);
  const onPick = useCallback((index: number) => {
    setPicked(index);
  }, []);
  const landing = SKETCH_WALK[picked];
  const readout = useMemo(
    () =>
      landing === undefined
        ? []
        : [
            { term: "lands at", value: `${Math.round(landing.at * 100)}%` },
            { term: "holds for", value: `${Math.round(landing.span * 1000) / 10}%` },
            { term: "struck", value: `${landing.repeats}×` },
            { term: "loudness", value: `${Math.round(landing.level * 100)}` },
          ],
    [landing],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <SketchLabel>The Walk</SketchLabel>
        <span className="type-body text-muted-foreground">
          Drag a block along the loop for where it lands · its right edge for how long · upward for
          how often it is struck
        </span>
        <Button size="sm" variant="outline" className="ml-auto">
          Reseed
        </Button>
      </div>

      <div className="relative h-40 overflow-hidden rounded border border-border bg-muted">
        {LANE_LINES.map((line) => (
          <div
            key={line.lane}
            className="absolute inset-x-0 border-t border-border/60"
            style={line.style}
          />
        ))}
        {BAR_LINES.map((line) => (
          <div
            key={line.bar}
            className="absolute inset-y-0 border-l border-border"
            style={line.style}
          />
        ))}
        {BLOCKS.map((block) => (
          <ScoreBlock
            key={block.landing.at}
            index={block.index}
            landing={block.landing}
            style={block.style}
            picked={block.index === picked}
            onPick={onPick}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-start gap-6">
        {/* The one place a number appears: about the block a hand has hold of, and nowhere else. */}
        <div className="min-w-56 rounded border border-border p-3">
          <SketchLabel>This Landing</SketchLabel>
          <dl className="mt-2 grid grid-cols-2 gap-x-4">
            {readout.map((row) => (
              <div key={row.term} className="contents">
                <dt className="type-body text-muted-foreground">{row.term}</dt>
                <dd className="type-readout">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Character is a paintbrush here rather than a preset: you pick one and draw with it. */}
        <div className="flex flex-col gap-2">
          <SketchLabel>Paint With</SketchLabel>
          <div className="flex flex-wrap gap-1">
            {SKETCH_CAST.map((name) => (
              <Toggle key={name} size="sm" pressed={name === landing?.character}>
                <span
                  aria-hidden
                  className={cn("mr-2 size-3 rounded-full", SKETCH_CHARACTER_WEIGHT[name])}
                />
                {name}
              </Toggle>
            ))}
          </div>
          <p className="max-w-80 type-body text-muted-foreground">
            No Fine Tune, no folds, no part rows. A part is a stretch of this score you name, and
            the arrangement is the score scrolled sideways.
          </p>
        </div>
      </div>
    </div>
  );
}
