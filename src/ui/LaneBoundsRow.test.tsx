/**
 * @role That the lane's window is one command per gesture, in the parameter's own units, and that
 *   a window dragged wide open is no window at all (0065, 0393).
 */
import type * as ReactTypes from "react";
import { Children, isValidElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

/** One mount's one state cell, so a move paints the readout the next hand-called render reads. */
const cell: { current: unknown } = { current: null };

vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return {
    ...react,
    useCallback: (callback: unknown) => callback,
    useState: (initial: unknown) => [
      cell.current ?? initial,
      (next: unknown) => {
        cell.current = next;
      },
    ],
  };
});

import type { ParamSpec } from "@/audio/params";
import type { LaneBounds } from "@/lib/automation";
import { BOUNDS_ANY } from "@/lib/copyAuto";
import { LaneBoundsRow } from "@/ui/LaneBoundsRow";

/** A plain nought-to-one parameter, so a fraction of the range is the value it reads as. */
const RANGE: ParamSpec = { label: "Mix", min: 0, max: 1, default: 1, precision: 2 };

type Slider = {
  value: readonly number[];
  onValueChange: (value: number | readonly number[]) => void;
  onValueCommitted: (value: number | readonly number[]) => void;
};

/** The row rendered outside a renderer: what it sent, the slider, and what it reads out. */
function render(bounds: LaneBounds | null) {
  cell.current = null;
  const sent: (LaneBounds | null)[] = [];
  const draw = () => {
    const root = LaneBoundsRow({
      range: RANGE,
      bounds,
      title: "mix lane",
      onBounds: (next) => {
        sent.push(next);
      },
    });
    if (!isValidElement<{ children: ReactNode }>(root)) throw new Error("the row drew nothing.");
    const [said, slider] = Children.toArray(root.props.children);
    if (!isValidElement<{ children: ReactNode }>(said)) throw new Error("the row said nothing.");
    if (!isValidElement<Slider>(slider)) throw new Error("the row drew no slider.");
    const [, readout] = Children.toArray(said.props.children);
    if (!isValidElement<{ children: string }>(readout)) throw new Error("the row read nothing.");
    return { slider: slider.props, readout: readout.props.children };
  };
  return { sent, draw };
}

describe("a lane's floor and ceiling", () => {
  it("sends the window in the parameter's own units, once, when the drag ends", () => {
    const { sent, draw } = render(null);
    const { slider } = draw();

    slider.onValueChange([0.25, 0.75]);
    expect(sent).toEqual([]);

    slider.onValueCommitted([0.25, 0.75]);
    expect(sent).toEqual([{ min: 0.25, max: 0.75 }]);
  });

  it("clears the window when it is dragged wide open", () => {
    const { sent, draw } = render({ min: 0.25, max: 0.75 });
    const { slider } = draw();

    expect(slider.value).toEqual([0.25, 0.75]);
    slider.onValueCommitted([0, 1]);
    expect(sent).toEqual([null]);
  });

  it("reads out the two ends it is holding, and the word for no window at all", () => {
    expect(render(null).draw().readout).toBe(BOUNDS_ANY);
    expect(render({ min: 0.2, max: 0.8 }).draw().readout).toBe("0.20–0.80");
  });
});
