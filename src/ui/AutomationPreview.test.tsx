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
/** The cleanup the mounted preview registered — Option coming up, called by hand. */
let unmount: (() => void) | null = null;

vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return {
    ...react,
    useCallback: (callback: unknown) => callback,
    useRef: (initial: unknown) => ({ current: initial }),
    useLayoutEffect: (effect: () => void) => {
      settle = effect;
    },
    // Held rather than run: what this one registers is the unmount, which is a thing the tests
    // below call by hand.
    useEffect: (effect: () => () => void) => {
      unmount = effect();
    },
  };
});
vi.mock("@/ui/frame", () => ({
  useOnFrame: (callback: () => void, enabled: boolean) => {
    frame = enabled ? callback : null;
  },
}));

import type { AutomationPoint } from "@/lib/automation";
import { AutomationPreview, stretchedSpan } from "@/ui/AutomationPreview";

type AxisEvent = {
  pointerId: number;
  clientY: number;
  currentTarget: { setPointerCapture: () => void };
};
type AxisHandlers = {
  onPointerDown: (event: AxisEvent) => void;
  onPointerMove: (event: AxisEvent) => void;
  onPointerUp: (event: AxisEvent) => void;
  onPointerCancel: (event: AxisEvent) => void;
};

/** A one-second ramp: at half a cycle the dot sits half way across and half way up. */
const lane: AutomationPoint[] = [
  { at: 0, value: 0 },
  { at: 1, value: 1 },
];

/**
 * One render, with a stand-in element under the dot's ref — the style object is the assertion,
 * and every assignment to it is counted, because what a frame does not write is one of them.
 */
function renderPreview(phase: () => number | null, onSpan: (span: number) => void = () => {}) {
  frame = null;
  settle = null;
  unmount = null;
  const root = AutomationPreview({
    lane,
    min: 0,
    max: 1,
    base: 0,
    title: "gain lane",
    phase,
    onSpan,
  });
  if (!isValidElement<{ children: ReactNode }>(root)) throw new Error("preview rendered no root.");
  const [, dot] = Children.toArray(root.props.children);
  if (!isValidElement<{ ref: { current: unknown } }>(dot)) {
    throw new Error("preview rendered no dot.");
  }
  const [, , axis] = Children.toArray(root.props.children);
  if (!isValidElement<AxisHandlers>(axis)) throw new Error("preview rendered no time axis.");
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
  return { style, writes: () => written, axis: axis.props };
}

/** One pointer event on the axis, with the capture target a real drag would be given. */
const press = (clientY: number, pointerId = 1) => ({
  pointerId,
  clientY,
  currentTarget: { setPointerCapture: () => {} },
});

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

// The one thing on this picture that is not read-only: the time axis, whose vertical drag is the
// whole of P53's gesture (0079).
// oxlint-disable-next-line max-lines-per-function
describe("AutomationPreview span drag", () => {
  it("sends one span command for a whole drag rather than one per pointer event", () => {
    const spans: number[] = [];
    const { axis } = renderPreview(
      () => null,
      (span) => {
        spans.push(span);
      },
    );

    axis.onPointerDown(press(0));
    for (const y of [10, 20, 40, 80, 120]) axis.onPointerMove(press(y));
    axis.onPointerUp(press(120));

    // Five moves, one command: what the moves wrote is the readout, and what the release wrote
    // is the session (0065).
    expect(spans).toEqual([stretchedSpan(1, 120)]);
    // A doubling's worth of travel is a doubling, which is the law the readout was following.
    expect(spans).toEqual([2]);
  });

  it("sends nothing for a press that never moved", () => {
    const spans: number[] = [];
    const { axis } = renderPreview(
      () => null,
      (span) => {
        spans.push(span);
      },
    );

    axis.onPointerDown(press(40));
    axis.onPointerUp(press(40));

    expect(spans).toEqual([]);
  });

  it("drops a cancelled stretch and keeps the span the lane had", () => {
    const spans: number[] = [];
    const { axis } = renderPreview(
      () => null,
      (span) => {
        spans.push(span);
      },
    );

    axis.onPointerDown(press(0));
    axis.onPointerMove(press(-120));
    axis.onPointerCancel(press(-120));
    axis.onPointerUp(press(-120));

    expect(spans).toEqual([]);
  });

  it("ignores a second pointer landing on the axis mid-stretch", () => {
    const spans: number[] = [];
    const { axis } = renderPreview(
      () => null,
      (span) => {
        spans.push(span);
      },
    );

    axis.onPointerDown(press(0));
    axis.onPointerDown(press(0, 2));
    axis.onPointerMove(press(120, 2));
    axis.onPointerUp(press(120, 2));
    axis.onPointerMove(press(-120));
    axis.onPointerUp(press(-120));

    // The second finger neither moved the first drag nor ended it: one gesture, one command.
    expect(spans).toEqual([0.5]);
  });

  it("commits the stretch when Option takes the preview away mid-drag", () => {
    const spans: number[] = [];
    const { axis } = renderPreview(
      () => null,
      (span) => {
        spans.push(span);
      },
    );

    axis.onPointerDown(press(0));
    axis.onPointerMove(press(120));
    // Option up: the popover unmounts and no pointerup will ever reach the element that is gone,
    // which is the same ending the knob's own recording takes (0034).
    unmount?.();

    expect(spans).toEqual([2]);
  });
});
