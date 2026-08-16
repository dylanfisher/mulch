/**
 * @role Gesture regression tests for the loop strip: which command each of the three grips
 *   sends, and which edge each of them leaves alone.
 */
import { Children, isValidElement, type PointerEvent, type ReactNode } from "react";
import type * as ReactTypes from "react";
import { describe, expect, it, vi } from "vitest";

import { manualClock } from "@/app/clock";
import { createInstrument } from "@/app/facade";
import type { Command } from "@/app/commands";
import type * as PeakCanvas from "@/ui/peakCanvas";
import type { DeckState } from "@/state/store";

vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return {
    ...react,
    useCallback: (callback: unknown) => callback,
    useMemo: (compute: () => unknown) => compute(),
    useRef: (initial: unknown) => ({ current: initial }),
    // These renders are plain function calls with no DOM under them: what the effects do is
    // paint, and painting is what the browser smoke checks. Here they are inert.
    useState: (initial: unknown) => [initial, () => {}],
    useEffect: () => {},
    useLayoutEffect: () => {},
  };
});
vi.mock("@/ui/frame", () => ({ useOnFrame: () => {} }));
vi.mock("@/ui/peakCanvas", async (importOriginal) => {
  const actual = await importOriginal<typeof PeakCanvas>();
  return {
    ...actual,
    usePeakCanvas: () => ({
      rootRef: { current: null },
      canvasRef: { current: null },
      widthRef: { current: WIDTH },
    }),
  };
});

import { LoopHandles } from "@/ui/LoopHandles";
import { Waveform } from "@/ui/Waveform";

/** A 4-second source with a loop over its middle two seconds, drawn across 400 pixels. */
const DURATION = 4;
const WIDTH = 400;
const LOOP = { in: 1, out: 3 };

type Down = (event: PointerEvent<HTMLDivElement>) => void;

/**
 * The strip and the three grips it renders, as the props a pointer would arrive through.
 * `stored` is the loop the store holds when a release reads it, which is the pressed one unless
 * a test is asking what happens when something else cleared it mid-gesture.
 */
function renderStrip(
  send: (cmd: Command) => void,
  loop: DeckState["loop"] = LOOP,
  options: { onsets?: number[]; stored?: DeckState["loop"] } = {},
) {
  const instrument = createInstrument(manualClock());
  const base = instrument.state.getState().decks.a!;
  const state: DeckState = {
    ...base,
    duration: DURATION,
    loop,
    analysis: options.onsets === undefined ? null : { bpm: 120, onsets: options.onsets },
  };
  const session = instrument.state.getState();
  const stored = {
    ...session,
    decks: {
      ...session.decks,
      a: { ...state, loop: options.stored === undefined ? loop : options.stored },
    },
  };
  const rendered = LoopHandles({
    instrument: { ...instrument, send, state: { ...instrument.state, getState: () => stored } },
    deck: "a",
    state,
    snapping: options.onsets !== undefined,
  });
  if (!isValidElement<{ onPointerMove: Down; onPointerUp: Down; children: ReactNode }>(rendered)) {
    throw new Error("LoopHandles rendered no strip.");
  }
  const grips = Children.toArray(rendered.props.children).map((child) => {
    if (
      !isValidElement<{ onPointerDown: Down; style: { display?: string }; className: string }>(
        child,
      )
    ) {
      throw new Error("LoopHandles rendered no grip.");
    }
    return child.props;
  });
  const [region, markIn, markOut] = grips;
  return {
    strip: rendered.props,
    region: region!.onPointerDown,
    markIn: markIn!.onPointerDown,
    markOut: markOut!.onPointerDown,
    hidden: grips.map((grip) => grip.style.display === "none"),
    classes: grips.map((grip) => grip.className),
  };
}

/** The strip's own box: 400px wide at x=0, which makes a client pixel a pixel of the axis. */
function strip() {
  return {
    clientLeft: 0,
    clientWidth: WIDTH,
    getBoundingClientRect: () => ({ left: 0 }),
    hasPointerCapture: vi.fn(() => true),
    releasePointerCapture: vi.fn(),
    setPointerCapture: vi.fn(),
  };
}

function dispatch(handler: Down, currentTarget: ReturnType<typeof strip>, x: number): void {
  Reflect.apply(handler, undefined, [
    { button: 0, clientX: x, currentTarget, pointerId: 1, shiftKey: false },
  ]);
}

/** A whole gesture: down on one grip, moved across the strip, released there. */
function drag(
  grips: ReturnType<typeof renderStrip>,
  grip: "region" | "markIn" | "markOut",
  from: number,
  to: number,
): void {
  const element = strip();
  dispatch(grips[grip], element, from);
  dispatch(grips.strip.onPointerMove, element, to);
  dispatch(grips.strip.onPointerUp, element, to);
}

describe("LoopHandles", () => {
  it("moves the dragged edge and leaves the other one where it was", () => {
    const send = vi.fn<(cmd: Command) => void>();
    const grips = renderStrip(send);
    // The in handle sits at 100px (1s of 4 across 400px); dragged to 150px it is 1.5s.
    drag(grips, "markIn", 100, 150);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({ t: "deck.loop", deck: "a", in: 1.5, out: 3 });
  });

  it("moves the edge by the travel, not to the pointer, when a handle is grabbed off-edge", () => {
    const send = vi.fn<(cmd: Command) => void>();
    const grips = renderStrip(send);
    // The IN handle brackets its edge, so its centre sits 16px to the left of the 100px edge.
    // A press there and 50px of travel is 0.5s of travel, not a jump to where the press landed.
    drag(grips, "markIn", 84, 134);
    expect(send).toHaveBeenCalledWith({ t: "deck.loop", deck: "a", in: 1.5, out: 3 });
  });
});

describe("LoopHandles layout", () => {
  it("brackets the loop with its handles so the region stays pressable at any length", () => {
    // IN ends where the loop starts and OUT begins where it ends: a handle centred on its edge
    // would cover half its width of the region, and a loop drawn narrower than a handle would
    // have no region left to press and no way to tell one handle from the other.
    const grips = renderStrip(vi.fn<(cmd: Command) => void>());
    expect(grips.classes[1]).toContain("-translate-x-full");
    expect(grips.classes[2]).not.toContain("translate-x");
  });
});

describe("LoopHandles region", () => {
  it("translates both edges by the same travel when the region is dragged", () => {
    const send = vi.fn<(cmd: Command) => void>();
    const grips = renderStrip(send);
    drag(grips, "region", 200, 250);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({ t: "deck.loop", deck: "a", in: 1.5, out: 3.5 });
  });

  it("leaves the untouched edge exactly where it was when snapping finds it nothing", () => {
    const send = vi.fn<(cmd: Command) => void>();
    // Snapping on, with an onset near the dragged edge alone: 1.5s is what IN lands on, and the
    // OUT edge at 3s has no candidate within tolerance, so it commits unmoved. An onset beside
    // OUT would move it, which is snapping doing its job on both edges and not a fixed edge
    // drifting (0025).
    const grips = renderStrip(send, LOOP, { onsets: [1.52] });
    drag(grips, "markIn", 100, 150);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({ t: "deck.loop", deck: "a", in: 1.52, out: 3 });
  });

  it("commits nothing when the loop it was dragging was cleared mid-gesture", () => {
    const send = vi.fn<(cmd: Command) => void>();
    // The handles are gone by the time the pointer comes up — the loop button, a key or an undo
    // cleared the loop — but pointer capture kept the gesture alive.
    const grips = renderStrip(send, LOOP, { stored: null });
    drag(grips, "markIn", 100, 150);
    expect(send).not.toHaveBeenCalled();
  });
});

describe("LoopHandles refusals", () => {
  it("sends nothing for a press that travels less than the drag threshold", () => {
    const send = vi.fn<(cmd: Command) => void>();
    const grips = renderStrip(send);
    drag(grips, "markOut", 300, 302);
    expect(send).not.toHaveBeenCalled();
  });

  it("shows no handles at all, and moves nothing, on a deck with no loop", () => {
    const send = vi.fn<(cmd: Command) => void>();
    const grips = renderStrip(send, null);
    for (const grip of ["region", "markIn", "markOut"] as const) {
      drag(grips, grip, 100, 200);
    }
    expect(send).not.toHaveBeenCalled();
    expect(grips.hidden).toEqual([true, true, true]);
  });
});

describe("Waveform peaks", () => {
  /** The peaks' own pointer handler, which is the surface's only gesture now. */
  function renderPeaks(send: (cmd: Command) => void) {
    const instrument = createInstrument(manualClock());
    const base = instrument.state.getState().decks.a!;
    const state: DeckState = { ...base, duration: DURATION, loop: LOOP };
    const root = Waveform({
      instrument: { ...instrument, send: send },
      deck: "a",
      state,
      onFile: () => {},
    });
    if (!isValidElement<{ children: ReactNode }>(root)) throw new Error("no surface");
    const [, peaks] = Children.toArray(root.props.children);
    if (!isValidElement<{ onPointerDown: Down; onPointerMove?: Down }>(peaks)) {
      throw new Error("Waveform rendered no peaks.");
    }
    return peaks.props;
  }

  it("seeks on a press that drags across it, and never sends a loop", () => {
    const send = vi.fn<(cmd: Command) => void>();
    const peaks = renderPeaks(send);
    dispatch(peaks.onPointerDown, strip(), 200);
    // Travel changes nothing: the peaks carry no move handler for a drag to travel through, so
    // there is no path from a press on them to a deck.loop at all.
    expect(peaks.onPointerMove).toBeUndefined();
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({ t: "deck.seek", deck: "a", position: 2 });
  });

  it("refuses a press outside the loop", () => {
    const send = vi.fn<(cmd: Command) => void>();
    dispatch(renderPeaks(send).onPointerDown, strip(), 350);
    expect(send).not.toHaveBeenCalled();
  });
});
