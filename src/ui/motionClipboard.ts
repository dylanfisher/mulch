/**
 * @role The one motion a hand is carrying between two knobs: the lane it copied, the range that
 *   lane was drawn in, and what drew it. A module-level manager surfaces subscribe to, the way the
 *   toast manager is (0319) — not the session store, which src/app's `send()` alone writes, and
 *   nothing durable: a clipboard is a gesture half-finished, like a selection or a drag, so it is
 *   in no history entry, no archive and no restore, and it dies with the tab.
 * @instead The presses that fill it and empty it → src/ui/MotionMenu.tsx. What rescales a lane
 *   onto the range it is pasted into → src/lib/automation.ts.
 */
import { useSyncExternalStore } from "react";

import type { AutomationLane, AutomationRange } from "@/lib/automation";
import type { MotionDrawn } from "@/lib/motion";

/**
 * A whole motion off one knob: the lane, the range it is meaningful beside, and its `drawn`
 * sibling — null for a lane a hand rode, which pastes as a lane nothing drew (0314).
 */
export type MotionClip = {
  lane: AutomationLane;
  range: AutomationRange;
  drawn: MotionDrawn | null;
};

/** At most one. A second copy is what a hand meant by pressing Copy again. */
let held: MotionClip | null = null;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** The same object until a copy replaces it, which is what `useSyncExternalStore` compares by. */
const snapshot = (): MotionClip | null => held;

/** Take a motion off a knob, replacing whatever was carried, and tell everyone watching once. */
export function carryMotion(clip: MotionClip): void {
  held = clip;
  for (const listener of listeners) listener();
}

/** What is being carried, as a surface reads it. */
export function useMotionClipboard(): MotionClip | null {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
