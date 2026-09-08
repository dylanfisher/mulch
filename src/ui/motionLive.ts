/**
 * @role The per-frame read of a knob's motion: the stretch the clock is inside, drawn once when
 *   the clock enters it and kept in a ref until it leaves, and the value that stretch holds at
 *   the phase `peek()` files — the one reading, through `automationValueAt` (0035, 0309). Nothing
 *   here allocates per frame (0070).
 * @instead The knob that paints from it → src/ui/ParameterKnob.tsx. The maths → src/lib/motion.ts.
 */
import { useCallback, useRef } from "react";

import type { Instrument } from "@/app/facade";
import { PARAMS, type ParamId } from "@/audio/params";
import { automationValueAt, type AutomationLane } from "@/lib/automation";
import { drawMotionStretch, motionCycle, motionPhase, type MotionSpec } from "@/lib/motion";
import type { DeckId } from "@/state/store";

/** The stretch kept between frames, and what it was drawn from. */
type Stretch = { cycle: number; motion: MotionSpec; base: number; lane: AutomationLane };

/**
 * A read of the motion's value now, or null with no motion or with no elapsed time filed for
 * it. `key` is the `paramKey` the peek files under; `base` is the knob's own value, which the
 * first stretch begins at — a new one is a new first stretch, so the kept one is let go.
 */
export function useMotionLive(
  instrument: Instrument,
  deck: DeckId,
  key: string,
  param: ParamId,
  motion: MotionSpec | null,
  base: number,
): () => number | null {
  const kept = useRef<Stretch | null>(null);
  return useCallback((): number | null => {
    if (motion === null) return null;
    const elapsed = instrument.peek(deck).automation.get(key);
    if (elapsed === undefined) return null;
    const cycle = motionCycle(elapsed);
    let stretch = kept.current;
    // Drawn again only when the clock leaves the stretch, or when what it is drawn from changes:
    // the spec, or the base a new first stretch begins at.
    if (
      stretch === null ||
      stretch.cycle !== cycle ||
      stretch.motion !== motion ||
      stretch.base !== base
    ) {
      stretch = {
        cycle,
        motion,
        base,
        lane: drawMotionStretch(motion, cycle, PARAMS[param], base),
      };
      kept.current = stretch;
    }
    return automationValueAt(stretch.lane, motionPhase(elapsed), base);
  }, [instrument, deck, key, param, motion, base]);
}
