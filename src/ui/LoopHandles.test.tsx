/**
 * @role Gesture regression tests for the loop strip: which command each of the three grips
 *   sends, and which edge each of them leaves alone.
 */
// Two surfaces share one pointer harness — the strip and the peaks below it — and the length is
// how many gestures they offer between them, the way Deck.test.tsx and ParameterKnob.test.tsx
// are long. See 0007.
// oxlint-disable max-lines
import { Children, isValidElement, type PointerEvent, type ReactNode } from "react";
import type * as ReactTypes from "react";
import { describe, expect, it, vi } from "vitest";

import { manualClock } from "@/app/clock";
import { createInstrument } from "@/app/facade";
import type { Command } from "@/app/commands";
import type * as PeakCanvas from "@/ui/peakCanvas";
import type { DeckState } from "@/state/store";

/**
 * The refs a render asked for, in order, kept across renders so a second call to the same
 * component is a re-render of the same instance rather than a second one — which is what lets a
 * render arriving mid-drag be dispatched at the strip the drag is already running on.
 */
const hooks: { current: unknown }[] = [];
let cursor = 0;
/** The layout effects the last render registered — run by hand, because painting is the subject. */
const painters: (() => void)[] = [];
/** What the passive effects returned: the component going away, driven by `unmount()`. */
const teardowns: (() => void)[] = [];

vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return {
    ...react,
    useCallback: (callback: unknown) => callback,
    useMemo: (compute: () => unknown) => compute(),
    useRef: (initial: unknown) => {
      hooks[cursor] ??= { current: initial };
      return hooks[cursor++]!;
    },
    // A plain function call with no DOM under it: what a passive effect does here is subscribe,
    // and the browser smoke is what checks that. The layout effect is the overlay's one writer,
    // so it is collected rather than dropped, and what an effect returns is kept so an unmount
    // can be driven by hand — the one ending no pointer event reaches (0114).
    useState: (initial: unknown) => [initial, () => {}],
    useEffect: (run: () => (() => void) | void) => {
      const off = run();
      if (typeof off === "function") teardowns.push(off);
    },
    useLayoutEffect: (run: () => void) => {
      painters.push(run);
    },
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

/** One overlay element, as much of it as the strip writes to. */
type Painted = { style: Record<string, string> };

/** A render of a component this file has not rendered before — fresh refs, no stale painters. */
function fresh(): void {
  hooks.length = 0;
  cursor = 0;
  painters.length = 0;
  teardowns.length = 0;
}

/** The rendered component going away, with whatever it was holding. */
function unmount(): void {
  for (const teardown of teardowns) teardown();
  teardowns.length = 0;
}

/** Everything the layout effect the last render registered would write, written. */
function paint(): void {
  for (const painter of painters) painter();
  painters.length = 0;
}

/** The five overlay elements, in the order the strip declares its refs. */
function painted(): Painted[] {
  // oxlint-disable-next-line no-unsafe-type-assertion -- the fakes attached by renderStrip
  return hooks.slice(0, 5).map((ref) => ref.current as Painted);
}

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
  options: { onsets?: number[]; stored?: DeckState["loop"]; again?: boolean } = {},
) {
  // A re-render is the same strip rendered again: same refs, same gesture, new props — which is
  // the arrival the overlay's one writer exists to survive.
  if (options.again === true) cursor = 0;
  else fresh();
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
  // The elements React handed refs to. Attached here rather than rendered, because this file has
  // no DOM: what the strip writes to them is the whole subject below.
  for (const ref of hooks.slice(0, 5)) ref.current ??= { style: {} } satisfies Painted;
  paint();
  return {
    strip: rendered.props,
    region: region!.onPointerDown,
    markIn: markIn!.onPointerDown,
    markOut: markOut!.onPointerDown,
    classes: grips.map((grip) => grip.className),
    /** The style React itself renders each element with — never a position (0103). */
    styles: grips.map((grip) => grip.style),
    hidden: () => painted().map((element) => element.style.display === "none"),
    lefts: () => painted().map((element) => element.style.left),
    widths: () => painted().map((element) => element.style.width),
  };
}

/**
 * The strip's own box: 400px wide at x=0, which makes a client pixel a pixel of the axis. It
 * listens, because the skeleton wires the lost-capture ending onto the element it captured on
 * (0114), and `lose` is the browser firing it.
 */
function strip() {
  const listeners: Record<string, ((event: { buttons: number }) => void)[]> = {};
  return {
    clientLeft: 0,
    clientWidth: WIDTH,
    getBoundingClientRect: () => ({ left: 0 }),
    hasPointerCapture: vi.fn(() => true),
    releasePointerCapture: vi.fn(),
    setPointerCapture: vi.fn(),
    addEventListener: (type: string, listener: (event: { buttons: number }) => void) => {
      (listeners[type] ??= []).push(listener);
    },
    removeEventListener: (type: string, listener: (event: { buttons: number }) => void) => {
      listeners[type] = (listeners[type] ?? []).filter((held) => held !== listener);
    },
    /** `buttons` is 0 for the report a proper release takes its capture away with (0072). */
    lose: (buttons = 1) => {
      for (const listener of listeners["lostpointercapture"] ?? []) listener({ buttons });
    },
  };
}

/**
 * A pointer event as the surfaces read it. `buttons` is 0 for one whose release nobody saw, and
 * `pointerId` is 2 for a second pointer arriving over a surface the first one is dragging on.
 */
function dispatch(
  handler: Down | undefined,
  currentTarget: ReturnType<typeof strip>,
  x: number,
  shiftKey = false,
  buttons = 1,
  pointerId = 1,
): void {
  if (handler === undefined) throw new Error("no handler to dispatch to");
  Reflect.apply(handler, undefined, [
    { button: 0, buttons, clientX: x, currentTarget, pointerId, shiftKey },
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

  it("commits where the pointer was let go, not where its last move landed", () => {
    // The browser coalesces the moves of a frame, so the last pixels of a drag arrive in the
    // `pointerup` and in no move before it. Read from the moves alone, the release lands the
    // edge short of the hand.
    const send = vi.fn<(cmd: Command) => void>();
    const grips = renderStrip(send);
    const element = strip();
    dispatch(grips.markIn, element, 100);
    dispatch(grips.strip.onPointerMove, element, 130);
    dispatch(grips.strip.onPointerUp, element, 150);
    expect(send).toHaveBeenCalledWith({ t: "deck.loop", deck: "a", in: 1.5, out: 3 });
  });

  it("commits a whole drag the page saw only as a press and a release", () => {
    // A flick inside one frame: every move of it coalesced away, and the release is the only
    // report of where it went. Committing nothing here snaps the edge back to where it began.
    const send = vi.fn<(cmd: Command) => void>();
    const grips = renderStrip(send);
    const element = strip();
    dispatch(grips.markIn, element, 100);
    dispatch(grips.strip.onPointerUp, element, 150);
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
    expect(grips.lefts()[3]).toBe("25%");
    expect(grips.lefts()[4]).toBe("75%");
    // The same left the handle above each line took: one position, not two.
    expect(grips.lefts()[3]).toBe(grips.lefts()[1]);
    expect(grips.lefts()[4]).toBe(grips.lefts()[2]);
    // The loop's own colour token, the one the peaks' sweep preview draws in as well.
    for (const line of [grips.classes[3], grips.classes[4]]) {
      expect(line).toContain("bg-loop");
      expect(line).toContain("pointer-events-none");
    }
  });
});

// One case per way a position can be written or lost, and the length is how many of them there
// are (0007).
// oxlint-disable-next-line max-lines-per-function
describe("LoopHandles overlay", () => {
  it("takes no position from React, so a render cannot rewrite what a gesture is drawing", () => {
    // React renders the five elements hidden and never touches their style again: it is handed
    // the one constant object every render, so the positions below have exactly one writer.
    // Positioned from a memo as well, any render whose memo recomputed — an undo, the loop
    // button, a JSONL line — re-stated the store's loop over the drag in flight (0103).
    const grips = renderStrip(vi.fn<(cmd: Command) => void>());
    for (const style of grips.styles) {
      expect(style).toEqual({ display: "none" });
    }
    expect(new Set(grips.styles).size).toBe(1);
    // And the writer paints: the loop covers 1s-3s of a 4s source.
    expect(grips.lefts()).toEqual(["25%", "25%", "75%", "25%", "75%"]);
    expect(grips.hidden()).toEqual([false, false, false, false, false]);
  });

  it("commits the loop it drew when the pointer leaves the strip's own box", () => {
    // 300px to the left of a 400px strip: `axis` is a span and reads it unclamped, which is what
    // keeps the travel honest (0053), and `edges` clamps what that travel lands on. The overlay
    // and the release read the same one, so what is committed is what was drawn.
    const send = vi.fn<(cmd: Command) => void>();
    const grips = renderStrip(send);
    const element = strip();
    dispatch(grips.markIn, element, 100);
    dispatch(grips.strip.onPointerMove, element, -300);
    expect(grips.lefts()).toEqual(["0%", "0%", "75%", "0%", "75%"]);
    expect(grips.widths()[0]).toBe("75%");
    dispatch(grips.strip.onPointerUp, element, -300);
    expect(send).toHaveBeenCalledWith({ t: "deck.loop", deck: "a", in: 0, out: 3 });
  });

  it("commits the loop it drew when the pointer leaves the far edge", () => {
    const send = vi.fn<(cmd: Command) => void>();
    const grips = renderStrip(send);
    const element = strip();
    dispatch(grips.markOut, element, 300);
    dispatch(grips.strip.onPointerMove, element, 700);
    expect(grips.lefts()).toEqual(["25%", "25%", "100%", "25%", "100%"]);
    dispatch(grips.strip.onPointerUp, element, 700);
    expect(send).toHaveBeenCalledWith({ t: "deck.loop", deck: "a", in: 1, out: 4 });
  });

  it("leaves a drag's own positions alone when a render arrives under it", () => {
    const send = vi.fn<(cmd: Command) => void>();
    const grips = renderStrip(send);
    const element = strip();
    dispatch(grips.markIn, element, 100);
    dispatch(grips.strip.onPointerMove, element, 50);
    expect(grips.lefts()[1]).toBe("12.5%");
    // Something else moved the loop while the hand was down. The render that follows repaints
    // nothing: the gesture owns the overlay until it lets go, and then puts the store back.
    renderStrip(send, { in: 0.5, out: 2.5 }, { again: true });
    expect(grips.lefts()[1]).toBe("12.5%");
    dispatch(grips.strip.onPointerUp, element, 50);
    expect(send).toHaveBeenCalledWith({ t: "deck.loop", deck: "a", in: 0.5, out: 3 });
  });

  it("follows the store on every render that no gesture owns", () => {
    const send = vi.fn<(cmd: Command) => void>();
    const grips = renderStrip(send);
    expect(grips.lefts()[1]).toBe("25%");
    renderStrip(send, { in: 0.5, out: 2.5 }, { again: true });
    expect(grips.lefts()).toEqual(["12.5%", "12.5%", "62.5%", "12.5%", "62.5%"]);
    renderStrip(send, null, { again: true });
    expect(grips.hidden()).toEqual([true, true, true, true, true]);
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

// One case per ending nobody sends the strip an event for, on the surface that has the most to
// put back; the length is how many of them there are. See 0007.
// oxlint-disable-next-line max-lines-per-function
describe("LoopHandles endings", () => {
  it("abandons a drag whose capture was lost, and takes the next one", () => {
    // The grip detached or its capture stolen: no pointerup and no pointercancel ever arrive, so
    // the record would sit there refusing every later press — with the overlay left where the
    // dead gesture put it (0114).
    const send = vi.fn<(cmd: Command) => void>();
    const grips = renderStrip(send);
    const element = strip();
    dispatch(grips.markIn, element, 100);
    dispatch(grips.strip.onPointerMove, element, 150);
    element.lose();
    expect(send).not.toHaveBeenCalled();
    // Back on the store's own loop, at 1s of 4, rather than on the 1.5s the drag was drawing.
    expect(grips.lefts()[1]).toBe("25%");
    drag(grips, "markIn", 100, 150);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({ t: "deck.loop", deck: "a", in: 1.5, out: 3 });
  });

  it("abandons a drag whose button came up where the page could not see it", () => {
    // A button let go outside the window sends nothing at all, and the capture is still held:
    // the next move over the strip carries no button, and that is the ending (0114).
    const send = vi.fn<(cmd: Command) => void>();
    const grips = renderStrip(send);
    const element = strip();
    dispatch(grips.markIn, element, 100);
    dispatch(grips.strip.onPointerMove, element, 150);
    dispatch(grips.strip.onPointerMove, element, 200, false, 0);
    expect(send).not.toHaveBeenCalled();
    expect(grips.lefts()[1]).toBe("25%");
    // The capture is still the browser's to give back — nothing released it — so the skeleton
    // does, or every later press lands on this grip whatever it was pointing at.
    expect(element.releasePointerCapture).toHaveBeenCalledWith(1);
    drag(grips, "markIn", 100, 150);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({ t: "deck.loop", deck: "a", in: 1.5, out: 3 });
  });

  it("commits a drag whose lost capture is reported before its release", () => {
    // A proper release takes its capture off too, and nothing promises which of the two reports
    // arrives first (0072): a lost capture carrying no button is that release, not a loss, and
    // the pointerup behind it is what says where the gesture landed.
    const send = vi.fn<(cmd: Command) => void>();
    const grips = renderStrip(send);
    const element = strip();
    dispatch(grips.markIn, element, 100);
    dispatch(grips.strip.onPointerMove, element, 150);
    element.lose(0);
    dispatch(grips.strip.onPointerUp, element, 150);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({ t: "deck.loop", deck: "a", in: 1.5, out: 3 });
  });

  it("takes its listener and its capture away when the surface goes", () => {
    // The yard is undone away under a held drag: the strip unmounts still holding the capture,
    // and the browser fires the lost capture at an element with nobody left to answer for it —
    // where the cancel path would read a deck that no longer exists.
    const send = vi.fn<(cmd: Command) => void>();
    const grips = renderStrip(send);
    const element = strip();
    dispatch(grips.markIn, element, 100);
    dispatch(grips.strip.onPointerMove, element, 150);
    unmount();
    expect(element.releasePointerCapture).toHaveBeenCalledWith(1);
    element.lose();
    // Nothing ran: the overlay is still where the gesture left it, not put back by a syncOverlay
    // reaching into a session that has moved on.
    expect(send).not.toHaveBeenCalled();
    expect(grips.lefts()[1]).toBe("37.5%");
  });

  it("keeps a drag through a second pointer hovering across the strip", () => {
    // A mouse moving over a strip a finger is dragging on reports no buttons for the whole of
    // that drag: the ending belongs to the gesture's own pointer and to no other one.
    const send = vi.fn<(cmd: Command) => void>();
    const grips = renderStrip(send);
    const element = strip();
    dispatch(grips.markIn, element, 100);
    dispatch(grips.strip.onPointerMove, element, 150);
    dispatch(grips.strip.onPointerMove, element, 300, false, 0, 2);
    dispatch(grips.strip.onPointerUp, element, 150);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({ t: "deck.loop", deck: "a", in: 1.5, out: 3 });
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
    expect(grips.hidden()).toEqual([true, true, true, true, true]);
  });
});

/** The peaks' own pointer handlers: the seek a plain press is, and the sweep Shift makes. */
function renderPeaks(send: (cmd: Command) => void, loop: DeckState["loop"] = LOOP) {
  fresh();
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

  it("seeks to the loop's top on a press outside it", () => {
    // The loop is the segment being performed, and a press it does not cover asks for the top of
    // that segment rather than for nothing: a waveform that answers no press is a dead one.
    const send = vi.fn<(cmd: Command) => void>();
    dispatch(renderPeaks(send).onPointerDown, strip(), 350);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({ t: "deck.seek", deck: "a", position: LOOP.in });
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

  it("commits a sweep the page saw only as a press and a release", () => {
    // The peaks' half of the same coalesced frame the strip's flick is: Shift down at one point,
    // up at another, and no move between them to say the gesture ever happened.
    const send = vi.fn<(cmd: Command) => void>();
    const peaks = renderPeaks(send);
    const element = strip();
    dispatch(peaks.onPointerDown, element, 200, true);
    dispatch(peaks.onPointerUp, element, 300, true);
    expect(send).toHaveBeenCalledWith({ t: "deck.loop", deck: "a", in: 2, out: 3 });
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
    element.lose();
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
