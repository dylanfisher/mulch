/**
 * @role The one motion carried between two knobs: what a copy replaces, and what a surface
 *   subscribed to it is told (0319).
 * @instead The presses that fill it → src/ui/MotionMenu.test.tsx.
 */
import { describe, expect, it, vi } from "vitest";

/**
 * The one hook this module calls, made callable outside a renderer — the stand-in every suite over
 * a hand-built mount in this directory declares for itself (`vi.mock` is hoisted per module). What
 * a surface would hold is the snapshot; the subscribe is kept so the listener can be registered.
 */
let subscribed: ((listener: () => void) => () => void) | null = null;
vi.mock("react", () => ({
  useSyncExternalStore: (
    subscribe: (listener: () => void) => () => void,
    snapshot: () => unknown,
  ) => {
    subscribed = subscribe;
    return snapshot();
  },
}));

import { carryMotion, useMotionClipboard } from "@/ui/motionClipboard";

/** A listener registered the way the hook registers one, and what it was told. Named for the
 * hook it calls, which is what makes calling one here legitimate. */
const useWatcher = () => {
  useMotionClipboard();
  if (subscribed === null) throw new Error("the clipboard was never subscribed to");
  const told = vi.fn<() => void>();
  return { told, off: subscribed(told) };
};

const clip = (value: number) => ({
  lane: [{ at: 0, value }],
  range: { min: 0, max: 1 },
  drawn: null,
});

describe("the motion clipboard", () => {
  it("carries nothing until a copy, and a copy replaces what was held", () => {
    expect(useMotionClipboard()).toBeNull();

    carryMotion(clip(0.25));
    expect(useMotionClipboard()).toEqual(clip(0.25));

    // At most one: the second copy is what the hand meant, not a second thing carried.
    carryMotion(clip(0.75));
    expect(useMotionClipboard()).toEqual(clip(0.75));
  });

  it("tells a subscriber once per copy, and nothing once it has let go", () => {
    const { told, off } = useWatcher();
    carryMotion(clip(0.5));
    expect(told).toHaveBeenCalledTimes(1);
    carryMotion(clip(0.5));
    expect(told).toHaveBeenCalledTimes(2);

    off();
    carryMotion(clip(0.5));
    expect(told).toHaveBeenCalledTimes(2);
  });
});
