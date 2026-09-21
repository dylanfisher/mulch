/**
 * @role The floor and the ceiling one lane is squeezed into, as one two-ended slider: the window a
 *   recorded or drawn gesture is read onto, said in the picture's own space and sent as one
 *   command when the drag ends (0065, 0393).
 * @instead The picture it stands under, and the squeeze itself drawn → src/ui/AutomationPreview.tsx.
 *   The maths of the squeeze → squeezeLane in src/lib/automation.ts. The window on what an
 *   automator's run may draw, which is a different window on a different thing → src/ui/PoolEntries.tsx.
 */
import { useCallback, useState } from "react";

import type { ParamSpec } from "@/audio/params";
import type { LaneBounds } from "@/lib/automation";
// The word for a window that is no window, and the two ends said as one sentence: the same facts
// a pool entry's window says, read the same way rather than spelled a second time (principle 1).
import { BOUNDS_ANY, boundsLabel } from "@/lib/copyAuto";
import { LANE_BOUNDS_SAYS, LANE_BOUNDS_LABEL } from "@/lib/copyMotion";
import { denormalize, normalize, wholeRange } from "@/lib/range";
import { Says } from "@/ui/Says";
import { Slider } from "@/ui/components/slider";

/**
 * How finely the window's two ends move, in the picture's own space — the same step the pool's
 * windows are dragged on, because it is the same gesture on the same kind of thing.
 */
const BOUNDS_STEP = 0.01;

/**
 * The floor and the ceiling the lane is squeezed into, as one two-ended slider under the picture.
 * In the picture's own space, which is linear: a lane's values ignore the curve its dial is drawn
 * on, so the two ends mean exactly the heights they stand at in the box above (0393).
 *
 * Dragged wide open the command clears the window, the way a pool entry's does: a lane nobody has
 * squeezed stores nothing and swings its parameter's whole declared range.
 */
// One window: its two ends, the sentence it reads as and the one command a released drag sends.
// Splitting it means handing the picture's own space between helpers with one caller each. 0007.
// oxlint-disable-next-line max-lines-per-function
export function LaneBoundsRow({
  range,
  bounds,
  title,
  onBounds,
}: {
  range: ParamSpec;
  bounds: LaneBounds | null;
  title: string;
  onBounds: (bounds: LaneBounds | null) => void;
}) {
  const held: readonly number[] =
    bounds === null
      ? [0, 1]
      : [normalize(bounds.min, range.min, range.max), normalize(bounds.max, range.min, range.max)];
  const [ends, setEnds] = useState<readonly number[]>(held);
  const move = useCallback((value: number | readonly number[]) => {
    setEnds(typeof value === "number" ? [value, value] : value);
  }, []);
  // One command per gesture, never one per pointer event — the rule the span dial above keeps and
  // the pool's own windows keep (0065, 0090).
  const commit = useCallback(
    (value: number | readonly number[]) => {
      const next = typeof value === "number" ? [value, value] : value;
      const low = next[0] ?? 0;
      const high = next[1] ?? 1;
      onBounds(
        wholeRange(low, high)
          ? null
          : {
              min: denormalize(low, range.min, range.max),
              max: denormalize(high, range.min, range.max),
            },
      );
    },
    [onBounds, range],
  );
  const low = ends[0] ?? 0;
  const high = ends[1] ?? 1;
  return (
    <div className="flex w-full flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <Says what={LANE_BOUNDS_SAYS}>
          <button type="button" className="type-readout text-muted-foreground">
            {LANE_BOUNDS_LABEL}
          </button>
        </Says>
        <span className="type-readout text-muted-foreground tabular-nums">
          {wholeRange(low, high)
            ? BOUNDS_ANY
            : boundsLabel(
                denormalize(low, range.min, range.max),
                denormalize(high, range.min, range.max),
                range.precision,
              )}
        </span>
      </div>
      <Slider
        value={ends}
        min={0}
        max={1}
        step={BOUNDS_STEP}
        aria-label={`${title} Bounds`}
        onValueChange={move}
        onValueCommitted={commit}
      />
    </div>
  );
}
