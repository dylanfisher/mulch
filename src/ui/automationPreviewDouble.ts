/**
 * @role The lane preview's span dial as a hand on it: the pointer event both the dial and the row
 *   under it read, and the walk down to the dial's own face — the dial captures the pointer and
 *   the gesture's ending bubbles to the row, so one drag is two handlers deep. Shared, because
 *   the preview's suites are several over exactly one picture (principle 1).
 * @instead What the picture draws and what each gesture sends → src/ui/AutomationPreview.test.tsx.
 *   Nothing here is production code.
 */
import { Children, isValidElement, type ReactElement, type ReactNode } from "react";

import { Knob } from "@/ui/Knob";

/** One pointer event, in the shape both the dial and the row it bubbles to read off it. */
export type DialEvent = {
  pointerId: number;
  button: number;
  clientX: number;
  clientY: number;
  shiftKey: boolean;
  buttons: number;
  /** The dial captures on this, and the skeleton listens on it for the capture coming off. */
  currentTarget: {
    setPointerCapture: () => void;
    hasPointerCapture: () => boolean;
    releasePointerCapture: () => void;
    addEventListener: () => void;
    removeEventListener: () => void;
  };
};
export type PointerHandlers = {
  onPointerDown: (event: DialEvent) => void;
  onPointerMove?: (event: DialEvent) => void;
  onPointerUp: (event: DialEvent) => void;
  onPointerCancel: (event: DialEvent) => void;
  onGotPointerCapture?: (event: DialEvent) => void;
  onKeyDown?: (event: { key: string; preventDefault: () => void }) => void;
};

/**
 * The stretch as a hand on it: the dial's own handlers, and the row's underneath them in the
 * order a real pointer reaches them — the dial captures, and the ending bubbles to the row. The
 * dial is built once per gesture, because its drag lives in refs of the render that made it.
 */
export function stretchOn(
  row: ReactElement<PointerHandlers & { children: ReactNode }>,
): PointerHandlers {
  const [knob] = Children.toArray(row.props.children);
  if (!isValidElement<Parameters<typeof Knob>[0]>(knob)) {
    throw new Error("the span row rendered no dial.");
  }
  const dialRoot = Knob(knob.props);
  if (!isValidElement<{ children: ReactNode }>(dialRoot)) {
    throw new Error("the dial rendered no root.");
  }
  const [face] = Children.toArray(dialRoot.props.children);
  if (!isValidElement<PointerHandlers>(face)) throw new Error("the dial rendered no face.");
  const dial = face.props;
  const both = (of: "onPointerMove" | "onPointerUp" | "onPointerCancel") => (event: DialEvent) => {
    dial[of]?.(event);
    row.props[of]?.(event);
  };
  return {
    // The row is told a gesture started by the capture the dial takes, not by the press — so a
    // press the dial refuses must not reach it here either.
    onPointerDown: (event: DialEvent) => {
      const grabbed: number[] = [];
      event.currentTarget.setPointerCapture = () => {
        grabbed.push(event.pointerId);
      };
      dial.onPointerDown(event);
      if (grabbed.length > 0) row.props.onGotPointerCapture?.(event);
    },
    ...(dial.onKeyDown === undefined ? {} : { onKeyDown: dial.onKeyDown }),
    onPointerMove: both("onPointerMove"),
    onPointerUp: both("onPointerUp"),
    onPointerCancel: both("onPointerCancel"),
  };
}

/** One pointer event at `clientY`, with the capture target a real drag would be given. */
export const press = (clientY: number, pointerId = 1): DialEvent => ({
  pointerId,
  button: 0,
  clientX: 0,
  clientY,
  shiftKey: false,
  buttons: 1,
  currentTarget: {
    setPointerCapture: () => {},
    hasPointerCapture: () => false,
    releasePointerCapture: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
  },
});

/**
 * Every path in a rendered picture, in the order it draws them: the window's two rules where the
 * preview was given a window, and the gesture last either way.
 */
export function pathsIn(picture: ReactElement<{ children: ReactNode }>): string[] {
  const [svg] = Children.toArray(picture.props.children);
  if (!isValidElement<{ children: ReactNode }>(svg)) throw new Error("preview drew no picture.");
  return Children.toArray(svg.props.children)
    .filter(
      (child): child is ReactElement<{ d: string }> =>
        isValidElement<{ d?: string }>(child) && child.props.d !== undefined,
    )
    .map((child) => child.props.d);
}

/**
 * A stand-in style object that counts what is written to it — what a frame does *not* write is
 * one of the preview's assertions (0070).
 */
export function countedStyle(): {
  style: Record<string, string>;
  writes: () => number;
  counted: Record<string, string>;
} {
  const style: Record<string, string> = {};
  let written = 0;
  const counted = new Proxy(style, {
    set: (target, key: string, value: string) => {
      written += 1;
      target[key] = value;
      return true;
    },
  });
  return { style, writes: () => written, counted };
}
