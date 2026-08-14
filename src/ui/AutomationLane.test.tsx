/** @role Pointer-boundary and capture-lifecycle tests for the automation lane editor. */
import { Children, isValidElement, type PointerEvent, type ReactNode } from "react";
import type * as ReactTypes from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return {
    ...react,
    useCallback: (callback: unknown) => callback,
    useMemo: (factory: () => unknown) => factory(),
    useRef: (initial: unknown) => ({ current: initial }),
  };
});

import { manualClock } from "@/app/clock";
import { createInstrument } from "@/app/facade";
import { AutomationLane } from "@/ui/AutomationLane";

type PointerHandler = (event: PointerEvent<SVGSVGElement>) => void;
type LaneProps = {
  onPointerDown: PointerHandler;
  onPointerMove: PointerHandler;
  onPointerUp: PointerHandler;
  onPointerCancel: PointerHandler;
  onLostPointerCapture: PointerHandler;
};

function renderLane() {
  const clock = manualClock(4);
  const instrument = createInstrument(clock);
  const root = AutomationLane({
    instrument,
    deck: "a",
    param: "deck.gain",
    points: [],
    duration: 2,
  });
  if (!isValidElement<{ children: ReactNode }>(root)) throw new Error("lane rendered no root");
  const [, lane] = Children.toArray(root.props.children);
  if (!isValidElement<LaneProps>(lane)) throw new Error("lane rendered no SVG");
  return { instrument, lane: lane.props };
}

function target() {
  let captured = false;
  return {
    getBoundingClientRect: () => ({ left: 10, top: 20, width: 200, height: 64 }),
    hasPointerCapture: vi.fn(() => captured),
    releasePointerCapture: vi.fn(() => {
      captured = false;
    }),
    setPointerCapture: vi.fn(() => {
      captured = true;
    }),
  };
}

function dispatch(
  handler: PointerHandler,
  currentTarget: ReturnType<typeof target>,
  x: number,
  y: number,
): void {
  Reflect.apply(handler, undefined, [
    { button: 0, clientX: x, clientY: y, currentTarget, pointerId: 1 },
  ]);
}

describe("AutomationLane drawing", () => {
  it("clamps outside coordinates and commits one whole gesture", () => {
    const { instrument, lane } = renderLane();
    const element = target();

    dispatch(lane.onPointerDown, element, 0, 100);
    dispatch(lane.onPointerMove, element, 300, 0);
    dispatch(lane.onPointerUp, element, 300, 0);

    expect(instrument.probe().decks.a.automation["deck.gain"]).toEqual([
      { at: 4, value: 0 },
      { at: 6, value: 1.5 },
    ]);
    expect(instrument.ring().filter(({ t }) => t === "automation.changed")).toHaveLength(1);
  });

  it.each(["onPointerCancel", "onLostPointerCapture"] as const)(
    "abandons a draft on %s and accepts the next pointer",
    (ending) => {
      const { instrument, lane } = renderLane();
      const element = target();

      dispatch(lane.onPointerDown, element, 10, 20);
      dispatch(lane.onPointerMove, element, 110, 52);
      dispatch(lane[ending], element, 110, 52);
      expect(instrument.probe().decks.a.automation).toEqual({});

      dispatch(lane.onPointerDown, element, 10, 20);
      dispatch(lane.onPointerUp, element, 10, 20);
      expect(instrument.ring().filter(({ t }) => t === "automation.changed")).toHaveLength(1);
    },
  );

  it("refuses a zero-sized drawing surface before capturing a pointer", () => {
    const { lane } = renderLane();
    const element = target();
    element.getBoundingClientRect = () => ({ left: 0, top: 0, width: 0, height: 0 });

    expect(() => {
      dispatch(lane.onPointerDown, element, 0, 0);
    }).toThrow(/no drawable bounds/u);
    expect(element.setPointerCapture).not.toHaveBeenCalled();
  });
});
