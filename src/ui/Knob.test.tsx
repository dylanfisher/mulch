/**
 * @role Gesture regression tests for the knob's two-axis drag and pointer-capture lifecycle, and
 *   for what a per-frame read paints: the dial's two attributes and the readout's precision.
 */
// One file over the 400-line cap, and what is over it is cases rather than code: this is the one
// place the knob's gestures are proven, and each describe block is a different mechanism — drag,
// capture, dial paint, keyboard, readout, caption. Splitting it would put half of one control's
// contract in a file named for the other half, and every block stands on the one `renderKnob`
// harness below. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
import { Children, isValidElement, type PointerEvent, type ReactNode } from "react";
import type * as ReactTypes from "react";
import { describe, expect, it, vi } from "vitest";

/** The per-frame painter this render registered, called by hand instead of by a RAF loop. */
let frame: (() => void) | null = null;
/** The layout effect this render registered, likewise called by hand instead of by a commit. */
let commit: (() => void) | null = null;

vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return {
    ...react,
    useCallback: (callback: unknown) => callback,
    useMemo: (factory: () => unknown) => factory(),
    useRef: (initial: unknown) => ({ current: initial }),
    // These renders are plain function calls with no DOM under them: what the effects do is
    // paint, and painting is what the browser smoke checks. Here they are inert until called.
    useEffect: () => {},
    useLayoutEffect: (callback: () => void) => {
      commit = callback;
    },
  };
});
vi.mock("@/ui/frame", () => ({
  useOnFrame: (callback: () => void, enabled: boolean) => {
    frame = enabled ? callback : null;
  },
}));

import { PLAYER_BURST_MAX, PLAYER_BURST_MIN, PLAYER_BURST_STEP } from "@/lib/player";
import { burstLabel, Knob } from "@/ui/Knob";

type PointerHandler = (event: PointerEvent<HTMLDivElement>) => void;
type ControlProps = {
  className: string;
  children: ReactNode;
  onPointerDown: PointerHandler;
  onPointerMove: PointerHandler;
  onKeyDown: (event: { key: string; preventDefault: () => void }) => void;
};
type DialProps = {
  fraction: number;
  travelled: { current: unknown };
  indicator: { current: unknown };
};

/** A stand-in for an SVG element, recording what a frame wrote onto it. */
function attributes() {
  const written = new Map<string, string>();
  return {
    written,
    setAttribute(name: string, value: string) {
      written.set(name, value);
    },
  };
}

function renderKnob(
  onChange: (value: number) => void,
  extra: Partial<Parameters<typeof Knob>[0]> = {},
) {
  frame = null;
  commit = null;
  const root = Knob({
    label: "Test",
    value: 0.5,
    min: 0,
    max: 1,
    defaultValue: 0.5,
    onChange,
    ...extra,
  });
  if (!isValidElement<{ className: string; children: ReactNode }>(root)) {
    throw new Error("Knob rendered no root.");
  }
  const [control, , output] = Children.toArray(root.props.children);
  if (!isValidElement<ControlProps>(control)) throw new Error("Knob rendered no control.");
  if (!isValidElement<{ ref: { current: unknown } }>(output)) {
    throw new Error("Knob rendered no readout.");
  }
  const dial = control.props.children;
  if (!isValidElement<DialProps>(dial)) throw new Error("Knob rendered no dial.");
  return { root, control: control.props, dial, readout: output.props.ref };
}

/** `element.type` is a union with a class constructor; only the function half is ever rendered. */
function isComponent(type: unknown): type is (props: DialProps) => ReactNode {
  return typeof type === "function";
}

/** The dial's own render, which has to land on the same attributes a frame writes. */
function renderDial(dial: ReturnType<typeof renderKnob>["dial"]) {
  const draw = dial.type;
  if (!isComponent(draw)) throw new Error("Dial is not a component.");
  const svg = draw(dial.props);
  if (!isValidElement<{ children: ReactNode }>(svg)) throw new Error("Dial rendered no svg.");
  return Children.toArray(svg.props.children);
}

function dispatch(
  handler: PointerHandler,
  currentTarget: ReturnType<typeof target>,
  x: number,
  y: number,
  buttons = 1,
): void {
  Reflect.apply(handler, undefined, [
    {
      button: 0,
      buttons,
      clientX: x,
      clientY: y,
      currentTarget,
      pointerId: 1,
      shiftKey: false,
    },
  ]);
}

/**
 * The element the knob captures on, and the one the skeleton wires the lost-capture ending onto
 * (0114) — `lose` is the browser firing it.
 */
function target() {
  const listeners: ((event: { buttons: number }) => void)[] = [];
  return {
    hasPointerCapture: vi.fn(() => false),
    releasePointerCapture: vi.fn(),
    setPointerCapture: vi.fn(),
    addEventListener: (type: string, listener: (event: { buttons: number }) => void) => {
      if (type === "lostpointercapture") listeners.push(listener);
    },
    removeEventListener: (_type: string, listener: (event: { buttons: number }) => void) => {
      const at = listeners.indexOf(listener);
      if (at >= 0) listeners.splice(at, 1);
    },
    lose: () => {
      // Taken off as they fire: the browser's own capture is gone by then either way.
      for (const listener of listeners.splice(0)) listener({ buttons: 1 });
    },
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
    element.lose();
    dispatch(control.onPointerMove, element, 36, 0);

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("prevents selection across the control, label and readout", () => {
    const { root } = renderKnob(() => {});
    expect(root.props.className).toContain("select-none");
  });
});

describe("Knob dial", () => {
  it("reveals the travelled arc by dash offset, over the track's own path", () => {
    const { dial } = renderKnob(() => {}, { live: () => 0.25 });
    const [track, travelled] = renderDial(dial);
    if (!isValidElement<{ d: string; pathLength: number; strokeDashoffset: number }>(travelled)) {
      throw new Error("Dial drew no travelled arc.");
    }
    if (!isValidElement<{ d: string }>(track)) throw new Error("Dial drew no track.");
    // The rendered arc is the whole sweep — one path, measured as a unit — so a frame changes
    // how much of it shows without touching its geometry.
    expect(travelled.props.d).toBe(track.props.d);
    expect(travelled.props.pathLength).toBe(1);
    expect(travelled.props.strokeDashoffset).toBe(0.5);

    const arc = attributes();
    dial.props.travelled.current = arc;
    if (frame === null) throw new Error("Knob registered no per-frame painter.");

    frame();

    expect(arc.written.get("stroke-dashoffset")).toBe("0.75");
    expect(arc.written.has("d")).toBe(false);
  });

  it("turns one static indicator about the dial's centre", () => {
    const { dial } = renderKnob(() => {}, { live: () => 0.25 });
    const line = renderDial(dial).at(2);
    if (!isValidElement<{ x1: number; x2: number; transform: string }>(line)) {
      throw new Error("Dial drew no indicator.");
    }
    // Authored at 12 o'clock and rotated from there: at rest, halfway through a 270° sweep.
    expect(line.props.x1).toBe(20);
    expect(line.props.x2).toBe(20);
    expect(line.props.transform).toBe("rotate(0 20 20)");

    const indicator = attributes();
    dial.props.indicator.current = indicator;
    if (frame === null) throw new Error("Knob registered no per-frame painter.");

    frame();

    // A quarter of the way up: −135° + 0.25 × 270°.
    expect(indicator.written.get("transform")).toBe("rotate(-67.5 20 20)");
    expect(indicator.written.has("x2")).toBe(false);
  });
});

describe("Knob dial paints", () => {
  it("writes nothing on a frame the dial did not move", () => {
    const { dial } = renderKnob(() => {}, { live: () => 0.25 });
    let writes = 0;
    const counted = () => ({
      setAttribute: () => {
        writes += 1;
      },
    });
    dial.props.travelled.current = counted();
    dial.props.indicator.current = counted();

    driven().frame();
    expect(writes).toBe(2);

    // A dial holding one value — a halted lane (0040), a span dial nobody has hold of — hands
    // the CSSOM the two attributes already on it once, not sixty times a second (0070).
    driven().frame();
    driven().frame();
    expect(writes).toBe(2);
  });
});

/** A stand-in for the readout, counting the writes a frame makes to it. */
function readoutText(readout: { current: unknown }) {
  const wrote: string[] = [];
  let text = "";
  readout.current = {
    get textContent() {
      return text;
    },
    set textContent(next: string) {
      wrote.push(next);
      text = next;
    },
  };
  return {
    wrote,
    read: () => text,
    /** React's own write, which the knob does not go through and must not count as its own. */
    render: (next: string) => {
      text = next;
    },
  };
}

/** The painter and the commit this render registered, as a pair no test may find missing. */
function driven() {
  if (frame === null) throw new Error("Knob registered no per-frame painter.");
  if (commit === null) throw new Error("Knob registered no layout effect.");
  return { frame, commit };
}

describe("Knob keyboard", () => {
  /**
   * A log dial's arrow key moves by a fraction of the whole sweep, and `commit` then snaps that to
   * the dial's own step and drops a move that lands back where it started. Over the burst's
   * 1024:1 sweep the smallest move is ~7% of the value, so at the floor the step has to be finer
   * than a seventh of it or the key is dead there — permanently, since every press recomputes
   * from the value that never changed. The burst dial is the one call site where the two numbers
   * are close enough to collide, so it is the one this is asked of (P82, src/ui/PlayerCard.tsx).
   */
  it("moves a log dial off its own floor, at the step that call site declares", () => {
    const onChange = vi.fn<(value: number) => void>();
    const { control } = renderKnob(onChange, {
      value: PLAYER_BURST_MIN,
      min: PLAYER_BURST_MIN,
      max: PLAYER_BURST_MAX,
      defaultValue: 1,
      curve: "log",
      step: PLAYER_BURST_STEP,
    });

    control.onKeyDown({ key: "ArrowUp", preventDefault: () => {} });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]?.[0] ?? 0).toBeGreaterThan(PLAYER_BURST_MIN);
  });
});

describe("Knob readout", () => {
  it("reads a live value at the precision a resting one has", () => {
    // Between two lane points, which is where every frame but the endpoints lands.
    const { readout } = renderKnob(() => {}, { live: () => 0.36000000000000004 });
    const text = readoutText(readout);

    driven().frame();

    expect(text.read()).toBe("0.36");
  });

  it("leaves the readout alone on a frame that formats to what is already there", () => {
    let read = 0.36;
    const { readout } = renderKnob(() => {}, { live: () => read });
    const text = readoutText(readout);

    // A lane creeping between two points formats to the same string frame after frame; only a
    // frame that actually reads differently is worth a write.
    driven().frame();
    driven().frame();
    read = 0.37;
    driven().frame();

    expect(text.wrote).toEqual(["0.36", "0.37"]);
  });

  it("puts the readout back after React has written over it", () => {
    const { readout } = renderKnob(() => {}, { live: () => 0.36 });
    const text = readoutText(readout);

    driven().frame();
    // What a render does to the readout while a lane plays: React owns that text and writes its
    // own. The commit that follows is the knob's only chance to forget what it last painted.
    text.render("0.90");
    driven().commit();
    driven().frame();

    expect(text.read()).toBe("0.36");
  });
});

/** The class the caption under one knob's dial is drawn with, for a label of any length. */
const caption = (label: string): string => {
  const root = Knob({ label, value: 0.5, min: 0, max: 1, defaultValue: 0.5, onChange: () => {} });
  if (!isValidElement<{ children: ReactNode }>(root)) throw new Error("Knob rendered no root.");
  const [, box] = Children.toArray(root.props.children);
  if (!isValidElement<{ className: string }>(box)) throw new Error("Knob rendered no caption.");
  return box.props.className;
};

/**
 * The same caption, drawn inside the `Says` a sentence turns it into: `Says` renders no element
 * of its own, so the class lands on its one child (0094).
 */
const explainedCaption = (label: string): string => {
  const root = Knob({
    label,
    says: "What this knob is.",
    value: 0.5,
    min: 0,
    max: 1,
    defaultValue: 0.5,
    onChange: () => {},
  });
  if (!isValidElement<{ children: ReactNode }>(root)) throw new Error("Knob rendered no root.");
  const [, said] = Children.toArray(root.props.children);
  if (!isValidElement<{ children: ReactNode }>(said)) throw new Error("Knob rendered no sentence.");
  const box = said.props.children;
  if (!isValidElement<{ className: string }>(box)) throw new Error("Says wraps no caption.");
  return box.props.className;
};

describe("Knob caption", () => {
  /**
   * The caption's line box is spent whether or not the label wraps into it. A rack card is as
   * tall as its knobs, so one two-word label — "EQ Gain", "Pre-delay" — would otherwise make its
   * card taller than the card beside it and the rack stop reading as a row (P64). The class is
   * asserted rather than a measured height because nothing here lays anything out; the height
   * itself is measured in the browser, by ./scripts/smoke.d/rackRow.js.
   */
  it("reserves the same caption box whatever the label is", () => {
    expect(caption("Cutoff")).toContain("h-[2lh]");
    expect(caption("Pre-delay")).toBe(caption("Cutoff"));
  });

  /**
   * And spent identically once the caption is explaining itself. A tooltip is words on a rest,
   * not a layout: a knob that says what it is must measure exactly what a knob that does not
   * measures, or one card in a rack row stands taller than the one beside it (0093, P65).
   */
  it("draws the same caption box with a sentence as without one", () => {
    expect(explainedCaption("Cutoff")).toBe(caption("Cutoff"));
  });
});

/**
 * The compact rung's readout: the box beside the dial, and whatever is saying what the dial is.
 * A compact knob draws no caption, so its second child is the readout — inside the `Says` a
 * sentence turns it into, which renders no element of its own (0094).
 */
const compactReadout = (extra: Partial<Parameters<typeof Knob>[0]> = {}) => {
  const root = Knob({
    label: "Test",
    size: "xs",
    value: 0.5,
    min: 0,
    max: 1,
    defaultValue: 0.5,
    onChange: () => {},
    ...extra,
  });
  if (!isValidElement<{ children: ReactNode }>(root)) throw new Error("Knob rendered no root.");
  const [, tail] = Children.toArray(root.props.children);
  type Said = { what?: string; children?: ReactNode; style?: { minWidth?: string } };
  if (!isValidElement<Said>(tail)) throw new Error("Knob rendered no readout.");
  const said = tail.props.what;
  const box = said === undefined ? tail : tail.props.children;
  if (!isValidElement<Said>(box)) throw new Error("Says wraps no readout.");
  return { said, width: box.props.style?.minWidth };
};

describe("Knob readout column", () => {
  /**
   * A compact readout sits beside its dial rather than under it, so a value one character wider
   * than the last pushes everything to its right along: a song's rows moved under the pointer as
   * the part standing walked from 8 to 16 and its amount from 99% to 100%. The column is the
   * widest thing the dial's own bounds and default read as, and it does not depend on the value
   * showing in it (P129). Read off `burstLabel`, the instrument's own two-unit reading, and off a
   * plain integer dial the length of a part is one of.
   */
  it("holds one column whatever the value in it reads", () => {
    const burst = { format: burstLabel, min: PLAYER_BURST_MIN, max: PLAYER_BURST_MAX };
    expect(compactReadout({ ...burst, value: PLAYER_BURST_MAX }).width).toBe("4ch");
    expect(compactReadout({ ...burst, value: PLAYER_BURST_MIN }).width).toBe("4ch");
    expect(compactReadout({ min: 1, max: 64, value: 8, defaultValue: 4 }).width).toBe("2ch");
  });

  /**
   * And it carries the same sentence the dial does. The compact rung is two things beside each
   * other and the readout is the wider half, so a hand resting on the number was resting on
   * nothing — the sentence is annotating the control rather than becoming one, on both halves of
   * it (0094, P129).
   */
  it("says what a compact dial is on the number as well as the dial", () => {
    expect(compactReadout({ says: "What this knob is." }).said).toBe("What this knob is.");
    expect(compactReadout().said).toBeUndefined();
  });
});
