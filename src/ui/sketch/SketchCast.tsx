/**
 * @role Sketch 01 — the whole mulcher as a place in the cast: four blends of the same six
 *   characters drawn side by side, one readout under them, and every one of the forty-five
 *   numbers derived from whichever a hand last moved.
 * @instead The four pictures themselves → src/ui/sketch/sketchBlends.tsx. The card this argues
 *   with → src/ui/PlayerCard.tsx. The six names themselves → src/lib/playerCast.ts.
 */
import { useMemo, useState } from "react";

import { cn } from "@/lib/cn";
import { PLAYER_PART_KNOBS } from "@/lib/player";
import { Button } from "@/ui/components/button";
import { Switch } from "@/ui/components/switch";
import { SketchLabel } from "@/ui/sketch/SketchFrame";
import { BLEND_WIDTH, type WroteWeights } from "@/ui/sketch/sketchBlendPad";
import { SKETCH_BLENDS } from "@/ui/sketch/sketchBlends";
import { BLEND_START } from "@/ui/sketch/sketchBlendWeights";
import { SKETCH_CAST, SKETCH_WALK } from "@/ui/sketch/sketchWalk";

/** The walk's bars are fixed, so their heights are written once here rather than every render. */
const WALK_BARS = SKETCH_WALK.map((landing) => ({
  at: landing.at,
  style: { height: `${landing.level * 100}%`, opacity: 0.35 + landing.level * 0.65 },
}));

export function SketchCast() {
  // One readout under four pictures: the blend a hand last moved is the one being read, which is
  // what makes the four comparable — they differ in the weighting and in nothing else.
  const [weights, setWeights] = useState<readonly number[]>(BLEND_START);

  return (
    <div className="flex flex-col gap-6">
      <BlendRow wrote={setWeights} />

      <div className="flex min-w-64 flex-1 flex-col gap-4">
        <div className="flex items-center gap-3">
          <Switch defaultChecked />
          <span className="type-body">Mulcher</span>
          <span className="ml-auto type-readout text-muted-foreground">Seed 4821</span>
          <Button size="sm" variant="outline">
            Reseed
          </Button>
        </div>

        <div>
          <SketchLabel>The Walk</SketchLabel>
          <div className="mt-2 flex h-16 items-end gap-px rounded bg-muted p-1">
            {WALK_BARS.map((bar) => (
              <div key={bar.at} className="flex-1 rounded-t bg-primary" style={bar.style} />
            ))}
          </div>
        </div>

        <p className="type-body text-muted-foreground">
          Whichever blend was moved last writes all {PLAYER_PART_KNOBS.length} of a part&apos;s
          numbers. Nothing below is a control — it is a readout of what the blend just wrote, and
          Fine Tune is a drawer that stays shut unless one of them is wrong.
        </p>

        <DerivedNumbers weights={weights} />

        <Button variant="ghost" size="sm" className="self-start">
          Fine Tune ▸
        </Button>
      </div>
    </div>
  );
}

/**
 * The four, side by side and small, so what a hand is comparing is the weighting and not the
 * wallpaper: one cast, one size, one readout underneath, and each one's own trade under itself.
 */
function BlendRow({ wrote }: { wrote: WroteWeights }) {
  return (
    <div className="flex flex-wrap items-start gap-6">
      {SKETCH_BLENDS.map(({ key, title, trades, Picture }) => (
        <div key={key} data-blend={key} className={cn("flex flex-col gap-2", BLEND_WIDTH)}>
          <SketchLabel>{title}</SketchLabel>
          <Picture wrote={wrote} />
          <p className="type-readout text-muted-foreground">Trades {trades}</p>
        </div>
      ))}
    </div>
  );
}

/** The forty-five, drawn as what they are here: an answer, not a question. */
function DerivedNumbers({ weights }: { weights: readonly number[] }) {
  const shown = useMemo(
    () =>
      PLAYER_PART_KNOBS.slice(0, 12).map((knob, index) => ({
        knob,
        at: Math.round(((weights[index % SKETCH_CAST.length] ?? 0) * 400 + index * 7) % 100),
      })),
    [weights],
  );
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded border border-border p-3 sm:grid-cols-4">
      {shown.map((one) => (
        <span key={one.knob} className="type-readout text-muted-foreground">
          {one.knob} {one.at}
        </span>
      ))}
      <span className="type-readout text-muted-foreground">
        +{PLAYER_PART_KNOBS.length - 12} more
      </span>
    </div>
  );
}
