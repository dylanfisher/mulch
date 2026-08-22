/**
 * @role The one thing this button has that a plain one does not: while the work it kicked off is
 *   still running it says so and refuses to kick it off again, so a second press on Export is not
 *   a second export.
 */
import type { ReactElement } from "react";
import type * as ReactTypes from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

/** The component's own state, held across the renders this file performs by hand. */
let cells: unknown[] = [];
let cursor = 0;

vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return {
    ...react,
    useCallback: (callback: unknown) => callback,
    useEffect: () => {},
    useRef: (initial: unknown) => ({ current: initial }),
    useState: (initial: unknown) => {
      const cell = cursor;
      cursor += 1;
      if (cells.length <= cell) cells[cell] = initial;
      return [cells[cell], (value: unknown) => (cells[cell] = value)];
    },
  };
});

import { AsyncButton } from "@/ui/AsyncButton";

type Pressable = { disabled: boolean; children: unknown; onClick: () => void };

afterEach(() => {
  cells = [];
});

describe("a button that awaits", () => {
  it("says it is working, and will not start the work twice", async () => {
    let finish: (() => void) | undefined;
    const onAction = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const props = { busyLabel: "Exporting", onAction, children: "Export" };
    /** One render of the button, at whatever state the last one left behind. */
    const render = (): Pressable => {
      cursor = 0;
      return (AsyncButton(props) as ReactElement<Pressable>).props;
    };

    expect(render()).toMatchObject({ disabled: false, children: "Export" });
    render().onClick();
    // The work is in flight: the label is the one that says so, and the control is shut.
    expect(render()).toMatchObject({ disabled: true, children: "Exporting" });

    render().onClick();
    // A second export writes a second file over the first, from a dialog that looks pressable.
    expect(onAction).toHaveBeenCalledTimes(1);

    finish?.();
    await Promise.resolve();
    await Promise.resolve();
    expect(render()).toMatchObject({ disabled: false, children: "Export" });
    render().onClick();
    expect(onAction).toHaveBeenCalledTimes(2);
  });
});
