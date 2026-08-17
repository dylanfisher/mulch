/**
 * @role That the dot lands in the commit rather than a frame later — the halt rule the dial
 *   already keeps (0040), from the one surface that was reaching it a frame behind.
 */
import { Children, isValidElement, type ReactNode } from "react";
import type * as ReactTypes from "react";
import { describe, expect, it, vi } from "vitest";

/** The per-frame painter this render registered, called by hand instead of by a RAF loop. */
let frame: (() => void) | null = null;
/** Its commit-time twin, held rather than run: React attaches refs before it flushes one, and
 *  what this effect paints is exactly what needs the dot's element to already exist. */
let settle: (() => void) | null = null;

vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return {
    ...react,
    useCallback: (callback: unknown) => callback,
    useRef: (initial: unknown) => ({ current: initial }),
    useLayoutEffect: (effect: () => void) => {
      settle = effect;
    },
  };
});
vi.mock("@/ui/frame", () => ({
  useOnFrame: (callback: () => void, enabled: boolean) => {
    frame = enabled ? callback : null;
  },
}));

import type { AutomationPoint } from "@/lib/automation";
import { AutomationPreview } from "@/ui/AutomationPreview";

/** A one-second ramp: at half a cycle the dot sits half way across and half way up. */
const lane: AutomationPoint[] = [
  { at: 0, value: 0 },
  { at: 1, value: 1 },
];

/**
 * One render, with a stand-in element under the dot's ref — the style object is the assertion,
 * and every assignment to it is counted, because what a frame does not write is one of them.
 */
function renderPreview(phase: () => number | null) {
  frame = null;
  settle = null;
  const root = AutomationPreview({ lane, min: 0, max: 1, base: 0, title: "gain lane", phase });
  if (!isValidElement<{ children: ReactNode }>(root)) throw new Error("preview rendered no root.");
  const [, dot] = Children.toArray(root.props.children);
  if (!isValidElement<{ ref: { current: unknown } }>(dot)) {
    throw new Error("preview rendered no dot.");
  }
  const style: Record<string, string> = {};
  let written = 0;
  const counted = new Proxy(style, {
    set: (target, key: string, value: string) => {
      written += 1;
      target[key] = value;
      return true;
    },
  });
  dot.props.ref.current = { style: counted };
  return { style, writes: () => written };
}

describe("AutomationPreview", () => {
  it("paints the dot in the commit, without waiting for a frame", () => {
    const { style } = renderPreview(() => 0.5);

    // The halt commit is where this matters: the deck stops, the dial is put back to the value
    // it is holding in that same commit (src/ui/Knob.tsx), and the dot has to arrive with it —
    // one frame later is one frame of two surfaces disagreeing about one clock (0040).
    expect(settle).not.toBeNull();
    settle?.();

    expect(style).toEqual({ left: "50%", top: "50%", opacity: "1" });
  });

  it("still rides the frame loop while the lane is moving", () => {
    let at = 0.25;
    const { style } = renderPreview(() => at);
    settle?.();
    expect(style.left).toBe("25%");

    at = 0.75;
    frame?.();
    expect(style.left).toBe("75%");
  });

  it("takes the dot off the path when there is no cycle to be in", () => {
    const { style } = renderPreview(() => null);
    settle?.();
    expect(style).toEqual({ opacity: "0" });
  });

  it("writes nothing on a frame the lane did not move", () => {
    const { style, writes } = renderPreview(() => 0.5);
    settle?.();
    expect(writes()).toBe(3);

    // A halted lane holds the phase it stopped on (0040), so this is the state a hover sits in
    // for as long as it is held: the dot is already where it belongs, and putting it there
    // again is three strings and three CSSOM writes a frame for no movement (0070).
    frame?.();
    frame?.();
    expect(writes()).toBe(3);
    expect(style).toEqual({ left: "50%", top: "50%", opacity: "1" });
  });
});
