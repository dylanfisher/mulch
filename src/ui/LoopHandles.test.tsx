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
// One `const` per prop a pointer arrives through, and the length is how many of them there are.
// See 0007.
// oxlint-disable-next-line max-lines-per-function
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
      !isValidElement<{
        onPointerDown: Down;
        style: { display?: string; left?: string };
        className: string;
      }>(child)
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
    lefts: grips.map((grip) => grip.style.left),
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

function dispatch(
  handler: Down | undefined,
  currentTarget: ReturnType<typeof strip>,
  x: number,
  shiftKey = false,
): void {
  if (handler === undefined) throw new Error("no handler to dispatch to");
  Reflect.apply(handler, undefined, [
    { button: 0, clientX: x, currentTarget, pointerId: 1, shiftKey },
  ]);
}

/** A whole gesture: down on one grip, moved across the strip, released there. */
function drag(
  grips: ReturnType<typeof renderStrip>,
  grip: "region" | "markIn" | "markOut",
  from: number,
  to: number,
  shiftKey = false,
): void {
  const element = strip();
  dispatch(grips[grip], element, from, shiftKey);
  dispatch(grips.strip.onPointerMove, element, to, shiftKey);
  dispatch(grips.strip.onPointerUp, element, to, shiftKey);
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

  it("draws each boundary line at exactly the edge its handle holds", () => {
    // The loop covers 1s–3s of a 4s source, so the two lines sit at a quarter and three
    // quarters of the peaks below — the handles bracket the loop, the lines do not (0066).
    const grips = renderStrip(vi.fn<(cmd: Command) => void>());
    expect(grips.lefts[3]).toBe("25%");
    expect(grips.lefts[4]).toBe("75%");
    // The same left the handle above each line took: one position, not two.
    expect(grips.lefts[3]).toBe(grips.lefts[1]);
    expect(grips.lefts[4]).toBe(grips.lefts[2]);
    // The loop's own colour token, the one the peaks' sweep preview draws in as well.
    for (const line of [grips.classes[3], grips.classes[4]]) {
      expect(line).toContain("bg-loop");
      expect(line).toContain("pointer-events-none");
    }
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

  it("still snaps a handle drag that is holding Shift", () => {
    // Shift is the loop's own modifier on the peaks and overrides nothing here: the snap toggle
    // is the whole of that choice, so a Shift-held handle drag lands on the onset anyway (0066).
    const send = vi.fn<(cmd: Command) => void>();
    const grips = renderStrip(send, LOOP, { onsets: [1.52] });
    drag(grips, "markIn", 100, 150, true);
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
    // The two boundary lines go with the handles: nothing is drawn down through the peaks of a
    // deck that has no loop to draw.
    expect(grips.hidden).toEqual([true, true, true, true, true]);
  });
});

/** The peaks' own pointer handlers: the seek a plain press is, and the sweep Shift makes. */
function renderPeaks(send: (cmd: Command) => void, loop: DeckState["loop"] = LOOP) {
  const instrument = createInstrument(manualClock());
  const base = instrument.state.getState().decks.a!;
  const state: DeckState = { ...base, duration: DURATION, loop };
  const root = Waveform({
    instrument: { ...instrument, send: send },
    deck: "a",
    state,
    onFile: () => {},
  });
  if (!isValidElement<{ children: ReactNode }>(root)) throw new Error("no surface");
  const [, peaks] = Children.toArray(root.props.children);
  if (
    !isValidElement<{
      onPointerDown: Down;
      onPointerMove: Down;
      onPointerUp: Down;
      onPointerCancel: Down;
      onLostPointerCapture: Down;
    }>(peaks)
  ) {
    throw new Error("Waveform rendered no peaks.");
  }
  return peaks.props;
}

/** A whole gesture on the peaks: down, moved across them, released there. */
function sweep(peaks: ReturnType<typeof renderPeaks>, from: number, to: number, shift = true) {
  const element = strip();
  dispatch(peaks.onPointerDown, element, from, shift);
  dispatch(peaks.onPointerMove, element, to, shift);
  dispatch(peaks.onPointerUp, element, to, shift);
}

describe("Waveform peaks", () => {
  it("seeks on a press that drags across it, and never sends a loop", () => {
    const send = vi.fn<(cmd: Command) => void>();
    sweep(renderPeaks(send), 200, 250, false);
    // Travel changes nothing without Shift: the press is a seek and the drag is not a gesture.
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({ t: "deck.seek", deck: "a", position: 2 });
  });

  it("refuses a press outside the loop", () => {
    const send = vi.fn<(cmd: Command) => void>();
    dispatch(renderPeaks(send).onPointerDown, strip(), 350);
    expect(send).not.toHaveBeenCalled();
  });
});

// One case per sweep, each keeping its whole press-move-release timeline visible (0007).
// oxlint-disable-next-line max-lines-per-function
describe("Waveform sweeps", () => {
  it("sweeps a loop, and no seek, when Shift is held", () => {
    const send = vi.fn<(cmd: Command) => void>();
    // 200px is 2s and 350px is 3.5s of the 4s source drawn across 400: one deck.loop on
    // release, and nothing at all on the press (0066).
    sweep(renderPeaks(send), 200, 350);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({ t: "deck.loop", deck: "a", in: 2, out: 3.5 });
  });

  it("sweeps the same loop backwards, on a deck that had none", () => {
    const send = vi.fn<(cmd: Command) => void>();
    sweep(renderPeaks(send, null), 350, 200);
    expect(send).toHaveBeenCalledWith({ t: "deck.loop", deck: "a", in: 2, out: 3.5 });
  });

  it("clamps a sweep that leaves the buffer", () => {
    const send = vi.fn<(cmd: Command) => void>();
    sweep(renderPeaks(send), 300, 600);
    expect(send).toHaveBeenCalledWith({ t: "deck.loop", deck: "a", in: 3, out: DURATION });
  });

  it("sends nothing for a Shift press that travels less than the drag threshold", () => {
    const send = vi.fn<(cmd: Command) => void>();
    sweep(renderPeaks(send), 200, 202);
    expect(send).not.toHaveBeenCalled();
  });

  it("abandons a sweep whose capture was lost, and takes the next one", () => {
    // A detached or stolen peaks element ends the gesture with no pointercancel: the sweep has
    // to be abandoned there, or the ref holds a gesture nobody can end and every later Shift
    // press is refused by the one-sweep-at-a-time guard.
    const send = vi.fn<(cmd: Command) => void>();
    const peaks = renderPeaks(send);
    const element = strip();
    dispatch(peaks.onPointerDown, element, 200, true);
    dispatch(peaks.onPointerMove, element, 350, true);
    dispatch(peaks.onLostPointerCapture, element, 350, true);
    expect(send).not.toHaveBeenCalled();
    sweep(peaks, 100, 200);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({ t: "deck.loop", deck: "a", in: 1, out: 2 });
  });

  it("sends nothing for a sweep that comes back to where it started", () => {
    // A collapsed pair is `setLoop`'s clear, and a durable clear is not what a drag that
    // travelled out and back asked for.
    const send = vi.fn<(cmd: Command) => void>();
    const peaks = renderPeaks(send);
    const element = strip();
    dispatch(peaks.onPointerDown, element, 200, true);
    dispatch(peaks.onPointerMove, element, 350, true);
    dispatch(peaks.onPointerMove, element, 200, true);
    dispatch(peaks.onPointerUp, element, 200, true);
    expect(send).not.toHaveBeenCalled();
  });

  it("commits nothing when a sweep is cancelled", () => {
    const send = vi.fn<(cmd: Command) => void>();
    const peaks = renderPeaks(send);
    const element = strip();
    dispatch(peaks.onPointerDown, element, 200, true);
    dispatch(peaks.onPointerMove, element, 350, true);
    dispatch(peaks.onPointerCancel, element, 350, true);
    dispatch(peaks.onPointerUp, element, 350, true);
    expect(send).not.toHaveBeenCalled();
  });
});
