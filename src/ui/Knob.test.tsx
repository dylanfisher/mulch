/** @role Gesture regression tests for the knob's two-axis drag and pointer-capture lifecycle. */
import { Children, isValidElement, type PointerEvent, type ReactNode } from "react";
import type * as ReactTypes from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return {
    ...react,
    useCallback: (callback: unknown) => callback,
    useRef: (initial: unknown) => ({ current: initial }),
  };
});

import { Knob } from "@/ui/Knob";

type PointerHandler = (event: PointerEvent<HTMLDivElement>) => void;
type ControlProps = {
  className: string;
  onPointerDown: PointerHandler;
  onPointerMove: PointerHandler;
  onLostPointerCapture: PointerHandler;
};

function renderKnob(onChange: (value: number) => void) {
  const root = Knob({
    label: "Test",
    value: 0.5,
    min: 0,
    max: 1,
    defaultValue: 0.5,
    onChange,
  });
  if (!isValidElement<{ className: string; children: ReactNode }>(root)) {
    throw new Error("Knob rendered no root.");
  }
  const [control] = Children.toArray(root.props.children);
  if (!isValidElement<ControlProps>(control)) throw new Error("Knob rendered no control.");
  return { root, control: control.props };
}

function dispatch(
  handler: PointerHandler,
  currentTarget: ReturnType<typeof target>,
  x: number,
  y: number,
): void {
  Reflect.apply(handler, undefined, [
    {
      button: 0,
      clientX: x,
      clientY: y,
      currentTarget,
      pointerId: 1,
      shiftKey: false,
    },
  ]);
}

function target() {
  return {
    hasPointerCapture: vi.fn(() => false),
    releasePointerCapture: vi.fn(),
    setPointerCapture: vi.fn(),
  };
}

describe("Knob dragging", () => {
  it.each([
    ["right", 18, 0],
    ["up", 0, -18],
    ["up and right", 18, -18],
  ])("increases across the same travel dragged %s", (_direction, x, y) => {
    const onChange = vi.fn();
    const { control } = renderKnob((next) => {
      onChange(next);
    });
    const element = target();

    dispatch(control.onPointerDown, element, 0, 0);
    dispatch(control.onPointerMove, element, x, y);

    expect(onChange).toHaveBeenLastCalledWith(0.6);
  });

  it("keeps the initially dominant axis across an opposing diagonal", () => {
    const onChange = vi.fn();
    const { control } = renderKnob((next) => {
      onChange(next);
    });
    const element = target();

    dispatch(control.onPointerDown, element, 0, 0);
    dispatch(control.onPointerMove, element, 6, 7);
    dispatch(control.onPointerMove, element, 13, 13);

    expect(onChange).toHaveBeenNthCalledWith(1, 0.46);
    expect(onChange).toHaveBeenNthCalledWith(2, 0.43);
  });
});

describe("Knob lifecycle", () => {
  it("stops moving when pointer capture is lost outside the control", () => {
    const onChange = vi.fn();
    const { control } = renderKnob((next) => {
      onChange(next);
    });
    const element = target();

    dispatch(control.onPointerDown, element, 0, 0);
    dispatch(control.onPointerMove, element, 18, 0);
    dispatch(control.onLostPointerCapture, element, 18, 0);
    dispatch(control.onPointerMove, element, 36, 0);

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("prevents selection across the control, label and readout", () => {
    const { root } = renderKnob(() => {});
    expect(root.props.className).toContain("select-none");
  });
});
