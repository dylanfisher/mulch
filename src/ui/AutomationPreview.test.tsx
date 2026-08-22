/**
 * @role That the dot lands in the commit rather than a frame later — the halt rule the dial
 *   already keeps (0040), from the one surface that was reaching it a frame behind.
 */
import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import type * as ReactTypes from "react";
import { describe, expect, it, vi } from "vitest";

/** The per-frame painter this render registered, called by hand instead of by a RAF loop. */
let frame: (() => void) | null = null;
/** Its commit-time twin, held rather than run: React attaches refs before it flushes one, and
 *  what this effect paints is exactly what needs the dot's element to already exist. */
let settle: (() => void) | null = null;
/** Every cleanup the passive effects returned — the preview's own commit, and the skeleton's
 *  under the dial it renders — run together by `unmount()`. */
const teardowns: (() => void)[] = [];

vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return {
    ...react,
    useCallback: (callback: unknown) => callback,
    useRef: (initial: unknown) => ({ current: initial }),
    useLayoutEffect: (effect: () => void) => {
      settle = effect;
    },
    // The cleanups are held rather than run: what they are is the unmount, which is a thing the
    // tests below call by hand.
    useEffect: (effect: () => (() => void) | void) => {
      const off = effect();
      if (typeof off === "function") teardowns.push(off);
    },
  };
});
/** The rendered tree going away, with everything each of its effects was holding. */
function unmount(): void {
  for (const teardown of teardowns) teardown();
  teardowns.length = 0;
}

vi.mock("@/ui/frame", () => ({
  useOnFrame: (callback: () => void, enabled: boolean) => {
    frame = enabled ? callback : null;
  },
}));

import type { AutomationPoint } from "@/lib/automation";
import { AutomationPreview } from "@/ui/AutomationPreview";
import { Knob } from "@/ui/Knob";

/** One pointer event, in the shape both the dial and the row it bubbles to read off it. */
type DialEvent = {
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
type PointerHandlers = {
  onPointerDown: (event: DialEvent) => void;
  onPointerMove?: (event: DialEvent) => void;
  onPointerUp: (event: DialEvent) => void;
  onPointerCancel: (event: DialEvent) => void;
  onGotPointerCapture?: (event: DialEvent) => void;
  onKeyDown?: (event: { key: string; preventDefault: () => void }) => void;
};

/** A one-second ramp: at half a cycle the dot sits half way across and half way up. */
const lane: AutomationPoint[] = [
  { at: 0, value: 0 },
  { at: 1, value: 1 },
];

/**
 * The stretch as a hand on it: the dial's own handlers, and the row's underneath them in the
 * order a real pointer reaches them — the dial captures, and the ending bubbles to the row. The
 * dial is built once per gesture, because its drag lives in refs of the render that made it.
 */
function stretchOn(row: ReactElement<PointerHandlers & { children: ReactNode }>): PointerHandlers {
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

/**
 * One render, with a stand-in element under the dot's ref — the style object is the assertion,
 * and every assignment to it is counted, because what a frame does not write is one of them.
 */
function renderPreview(
  phase: () => number | null,
  onSpan: (span: number) => void = () => {},
  points: AutomationPoint[] = lane,
  playing = true,
) {
  frame = null;
  settle = null;
  teardowns.length = 0;
  const root = AutomationPreview({
    lane: points,
    min: 0,
    max: 1,
    base: 0,
    title: "gain lane",
    phase,
    playing,
    onSpan,
  });
  if (!isValidElement<{ children: ReactNode }>(root)) throw new Error("preview rendered no root.");
  const [row, picture] = Children.toArray(root.props.children);
  if (!isValidElement<PointerHandlers & { children: ReactNode }>(row)) {
    throw new Error("preview rendered no span row.");
  }
  if (!isValidElement<{ children: ReactNode }>(picture)) {
    throw new Error("preview rendered no picture.");
  }
  const [, dot] = Children.toArray(picture.props.children);
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
  return { style, writes: () => written, stretch: () => stretchOn(row) };
}

/** One pointer event at `clientY`, with the capture target a real drag would be given. */
const press = (clientY: number, pointerId = 1): DialEvent => ({
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

// Its own block rather than a case inside the one above, which is already at the length
// max-lines-per-function allows.
describe("AutomationPreview over a halted yard", () => {
  it("registers no frame callback while the yard is not playing", () => {
    // A halted lane holds the phase it stopped on (0040), which is exactly what the dial beside
    // it already refuses to animate (`animate={playing}`, src/ui/ParameterKnob.tsx): a picture of
    // a value that cannot move is a commit, not a subscription (0070).
    const { style } = renderPreview(
      () => 0.5,
      () => {},
      lane,
      false,
    );
    settle?.();

    expect(style).toEqual({ left: "50%", top: "50%", opacity: "1" });
    expect(frame).toBeNull();
  });
});

// The one thing on this picture that is not read-only: the dial above it, whose vertical drag is
// the whole of P53's gesture (0079), read the way round every other dial on the instrument is.
// oxlint-disable-next-line max-lines-per-function
describe("AutomationPreview span dial", () => {
  /** The commands one gesture on the dial sent, for a lane one second long. */
  const stretchedBy = (
    drive: (dial: ReturnType<typeof renderPreview>["stretch"]) => void,
    points?: AutomationPoint[],
  ) => {
    const spans: number[] = [];
    const { stretch } = renderPreview(
      () => null,
      (span) => {
        spans.push(span);
      },
      points,
    );
    drive(stretch);
    return spans;
  };

  it("lengthens the span for an upward drag and shortens it for a downward one", () => {
    // Up is longer, which is the direction every dial on this instrument grows in — the whole of
    // P57's first half. A doubling's worth of travel is a doubling either way.
    const up = stretchedBy((stretch) => {
      const dial = stretch();
      dial.onPointerDown(press(0));
      dial.onPointerMove?.(press(-180));
      dial.onPointerUp(press(-180));
    });
    expect(up).toEqual([2]);

    const down = stretchedBy((stretch) => {
      const dial = stretch();
      dial.onPointerDown(press(0));
      dial.onPointerMove?.(press(180));
      dial.onPointerUp(press(180));
    });
    expect(down).toEqual([0.5]);
  });

  it("sends one span command for a whole drag rather than one per pointer event", () => {
    const spans = stretchedBy((stretch) => {
      const dial = stretch();
      dial.onPointerDown(press(0));
      for (const y of [-15, -30, -60, -120, -180]) dial.onPointerMove?.(press(y));
      dial.onPointerUp(press(-180));
    });

    // Five moves, one command: what the moves wrote is the dial, and what the release wrote is
    // the session (0065).
    expect(spans).toEqual([2]);
  });

  it("sends nothing for a press that never moved", () => {
    const spans = stretchedBy((stretch) => {
      const dial = stretch();
      dial.onPointerDown(press(40));
      dial.onPointerUp(press(40));
    });

    expect(spans).toEqual([]);
  });

  it("sends nothing for a drag that comes back to the length it started on", () => {
    const spans = stretchedBy((stretch) => {
      const dial = stretch();
      dial.onPointerDown(press(0));
      dial.onPointerMove?.(press(-180));
      dial.onPointerMove?.(press(0));
      dial.onPointerUp(press(0));
    });

    // The dial is back where it was pressed, so the gesture is a no-op — not the move before it,
    // which is the only length the drag has said out loud.
    expect(spans).toEqual([]);
  });

  it("keeps sending for a keyboard nudge after a press the dial refused", () => {
    const spans = stretchedBy((stretch) => {
      const dial = stretch();
      // A second button: the dial takes no pointer, so nothing will ever report an ending for it.
      dial.onPointerDown({ ...press(0), button: 2 });
      dial.onKeyDown?.({ key: "ArrowUp", preventDefault: () => {} });
    });

    // A keyboard nudge is a whole gesture on its own and lands at once (0065).
    expect(spans).toHaveLength(1);
    expect(spans[0]).toBeGreaterThan(1);
  });

  it("refuses a lane that never moved, which has no length to scale", () => {
    const spans = stretchedBy(
      (stretch) => {
        const dial = stretch();
        dial.onPointerDown(press(0));
        dial.onPointerMove?.(press(-180));
        dial.onPointerUp(press(-180));
        dial.onKeyDown?.({ key: "ArrowUp", preventDefault: () => {} });
      },
      // One point, recorded by a gesture that never moved: laneSpan is 0, and stretchLane throws
      // rather than inventing a gesture (0079).
      [{ at: 0, value: 0.5 }],
    );

    expect(spans).toEqual([]);
  });

  it("drops a cancelled stretch and keeps the span the lane had", () => {
    const spans = stretchedBy((stretch) => {
      const dial = stretch();
      dial.onPointerDown(press(0));
      dial.onPointerMove?.(press(-180));
      dial.onPointerCancel(press(-180));
      dial.onPointerUp(press(-180));
    });

    expect(spans).toEqual([]);
  });

  it("ignores a second pointer landing on the dial mid-stretch", () => {
    const spans = stretchedBy((stretch) => {
      const dial = stretch();
      dial.onPointerDown(press(0));
      dial.onPointerDown(press(0, 2));
      dial.onPointerMove?.(press(180, 2));
      dial.onPointerUp(press(180, 2));
      dial.onPointerMove?.(press(-180));
      dial.onPointerUp(press(-180));
    });

    // The second finger neither moved the first drag nor ended it: one gesture, one command.
    expect(spans).toEqual([2]);
  });

  it("commits the stretch when Option takes the preview away mid-drag", () => {
    const spans = stretchedBy((stretch) => {
      const dial = stretch();
      dial.onPointerDown(press(0));
      dial.onPointerMove?.(press(-180));
      // Option up: the popover unmounts and no pointerup will ever reach the element that is
      // gone, which is the same ending the knob's own recording takes (0034).
      unmount();
    });

    expect(spans).toEqual([2]);
  });
});
