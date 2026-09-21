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
import { burstLabel, burstValue, Knob, secondsValue } from "@/ui/Knob";

type PointerHandler = (event: PointerEvent<HTMLDivElement>) => void;
type ControlProps = {
  className: string;
  children: ReactNode;
  onPointerDown: PointerHandler;
  onPointerMove: PointerHandler;
  onPointerUp: PointerHandler;
  onPointerCancel: PointerHandler;
  onKeyDown: (event: { key: string; preventDefault: () => void }) => void;
  onDoubleClick: () => void;
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
  if (!isValidElement<{ readout: { current: unknown } }>(output)) {
    throw new Error("Knob rendered no readout.");
  }
  const dial = control.props.children;
  if (!isValidElement<DialProps>(dial)) throw new Error("Knob rendered no dial.");
  // The element a frame paints into is the readout's own `<output>`, handed down to the component
  // that turns it into a field when it is pressed (src/ui/KnobReadout.tsx).
  return { root, control: control.props, dial, readout: output.props.readout };
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

// The two gestures a landing changes, kept apart from the plain drag's suite: what is asked here
// is where the dial may stand at all, which is a different question from where a hand took it.
// One case per thing a landing decides — the drag's crossing, the keys' sum, and the travel a
// gesture that crossed nothing leaves behind, which is asked once per ending. Waived at the site
// rather than raised for the tree; see docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("Knob landing", () => {
  /**
   * A dial handed a landing stands on the places it allows and nowhere between them: a drag across
   * the stretch between two of them writes nothing, and crossing to the next one writes it once.
   * That is the whole difference between a dial that steps and one that slides and is corrected
   * afterwards — the correction lands, but the hand watches the dial pass through values it cannot
   * hold (0387).
   */
  it("steps between the places a landing allows, and stands still between them", () => {
    const onChange = vi.fn<(value: number) => void>();
    // Quarters of the sweep, which the plain 0.01 step would otherwise fill in between.
    const { control } = renderKnob(onChange, { land: (v) => Math.round(v * 4) / 4 });
    const element = target();

    dispatch(control.onPointerDown, element, 0, 0);
    // 0.5 to 0.6: inside the same quarter, so the dial has not moved and nothing was written.
    dispatch(control.onPointerMove, element, 18, 0);
    expect(onChange).not.toHaveBeenCalled();
    // On across the crossing at 0.625 and past it: one write, at the place, not at the value.
    dispatch(control.onPointerMove, element, 36, 0);
    dispatch(control.onPointerMove, element, 45, 0);
    expect(onChange.mock.calls).toEqual([[0.75]]);
    // And back the way it came: the travel between the two places is still the hand's, so one
    // crossing is one write however many moves it took.
    dispatch(control.onPointerMove, element, 0, 0);
    expect(onChange.mock.calls).toEqual([[0.75], [0.5]]);
  });

  /**
   * The keys go on stepping by `step` under a landing — what they add up is the value the hand is
   * reaching for, and the dial moves when that sum crosses to the next place. Dropping the sum
   * would leave every arrow key on a held dial permanently dead, since each press would recompute
   * from the place it never left. What a press adds is still the dial's own `step`, which on a log
   * dial coarse enough to swallow it moves nothing with a landing or without one (0387, P82).
   */
  /**
   * And a press that crossed nothing leaves nothing behind: the hand's travel is the drag's, so it
   * goes back to where the dial is standing when the hand lets go, whichever way the gesture ended.
   * Without that, a drag that wrote nothing would seed the next press from a fraction the dial was
   * never at, and one arrow key afterwards would cross a place on its own (0387).
   */
  it.each([
    [
      "the pointer comes up",
      (control: ControlProps, element: ReturnType<typeof target>) => {
        dispatch(control.onPointerUp, element, 12, 0, 0);
      },
    ],
    [
      "the gesture is cancelled",
      (control: ControlProps, element: ReturnType<typeof target>) => {
        dispatch(control.onPointerCancel, element, 12, 0, 0);
      },
    ],
    [
      "the capture is lost",
      (_control: ControlProps, element: ReturnType<typeof target>) => {
        element.lose();
      },
    ],
  ])("hands the hand's travel back to the dial's place when %s", (_ending, end) => {
    const onChange = vi.fn<(value: number) => void>();
    const { control } = renderKnob(onChange, { land: (v) => Math.round(v * 4) / 4 });
    const element = target();

    // A whole drag inside one quarter: the dial never moved and nothing was ever written.
    dispatch(control.onPointerDown, element, 0, 0);
    dispatch(control.onPointerMove, element, 12, 0);
    expect(onChange).not.toHaveBeenCalled();
    end(control, element);

    // So an arrow key afterwards steps from the place, not from the travel that was abandoned.
    control.onKeyDown({ key: "ArrowUp", preventDefault: () => {} });
    expect(onChange).not.toHaveBeenCalled();
    // And the next drag starts there too: the same 12px goes the same nowhere it went before.
    dispatch(control.onPointerDown, element, 0, 0);
    dispatch(control.onPointerMove, element, 12, 0);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("adds keyboard steps up until they cross to the next place", () => {
    const onChange = vi.fn<(value: number) => void>();
    const { control } = renderKnob(onChange, { land: (v) => Math.round(v * 4) / 4 });
    const key = { key: "ArrowUp", preventDefault: () => {} };

    for (let press = 0; press < 12; press += 1) control.onKeyDown(key);
    // Twelve presses of 0.01 from 0.5 is 0.62, still under the crossing at 0.625.
    expect(onChange).not.toHaveBeenCalled();
    control.onKeyDown(key);
    expect(onChange.mock.calls).toEqual([[0.75]]);
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

/** The dial's two attributes at a fraction, as the frame and the hand both write them. */
const drawn = (fraction: number) => ({
  arc: String(1 - fraction),
  indicator: `rotate(${-135 + fraction * 270} 20 20)`,
});

describe("Knob paints ahead of the store", () => {
  /** A dial pressed at rest and moved 18px right: the hand is at 0.6 while `value` is still 0.5. */
  function moved(onChange: (value: number) => void = () => {}) {
    const { control, dial } = renderKnob(onChange);
    const arc = attributes();
    const indicator = attributes();
    dial.props.travelled.current = arc;
    dial.props.indicator.current = indicator;
    const element = target();
    dispatch(control.onPointerDown, element, 0, 0);
    dispatch(control.onPointerMove, element, 18, 0);
    return { control, element, arc, indicator };
  }

  it("turns the dial on the move itself, before any commit lands", () => {
    const { arc, indicator } = moved();
    expect(arc.written.get("stroke-dashoffset")).toBe(drawn(0.6).arc);
    expect(indicator.written.get("transform")).toBe(drawn(0.6).indicator);
  });

  it("keeps the hand's angle across a commit that is one move behind", () => {
    const { arc, indicator } = moved();
    // React re-rendered from a `value` the store has not caught up to yet, and its layout effect
    // is what would otherwise paint the dial back to it.
    if (commit === null) throw new Error("Knob registered no layout effect.");
    commit();
    expect(arc.written.get("stroke-dashoffset")).toBe(drawn(0.6).arc);
    expect(indicator.written.get("transform")).toBe(drawn(0.6).indicator);
  });

  it.each([
    [
      "the pointer comes up",
      (m: ReturnType<typeof moved>) => {
        dispatch(m.control.onPointerUp, m.element, 18, 0, 0);
      },
    ],
    [
      "the gesture is cancelled",
      (m: ReturnType<typeof moved>) => {
        dispatch(m.control.onPointerCancel, m.element, 18, 0, 0);
      },
    ],
    [
      "the capture is lost",
      (m: ReturnType<typeof moved>) => {
        m.element.lose();
      },
    ],
  ])(
    "leaves the hand's angle standing when %s, because every move was committed",
    (_ending, end) => {
      const m = moved();
      end(m);
      expect(m.arc.written.get("stroke-dashoffset")).toBe(drawn(0.6).arc);
      expect(m.indicator.written.get("transform")).toBe(drawn(0.6).indicator);
    },
  );

  it("steps a key from the value it last sent, not from a render one transition behind", () => {
    const onChange = vi.fn();
    const { control } = renderKnob(onChange);
    const key = { key: "ArrowUp", preventDefault: () => {} };
    control.onKeyDown(key);
    control.onKeyDown(key);
    expect(onChange).toHaveBeenNthCalledWith(1, 0.51);
    expect(onChange).toHaveBeenNthCalledWith(2, 0.52);
  });

  it("follows a render that moved the value, once no hand is on the dial", () => {
    const onChange = vi.fn();
    const { control } = renderKnob(onChange, { value: 0.2 });
    control.onKeyDown({ key: "ArrowUp", preventDefault: () => {} });
    expect(onChange).toHaveBeenLastCalledWith(0.21);
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

/**
 * 0385: a double-click asks for the default. On a dial nothing is driving, one already standing
 * there has nothing to send; on one following a lane, the dial is not at `value` at all and what
 * the reset asks for is the lane gone, which only reaches the store as a move — so the dial that
 * refused it is exactly the automated dial the gesture exists for (src/ui/ParameterKnob.tsx).
 */
describe("Knob reset", () => {
  it("sends the default from a dial already holding it, where a lane is driving it", () => {
    const onChange = vi.fn<(value: number) => void>();
    const { control } = renderKnob(onChange, { resetsAnyway: true, live: () => 0.9 });

    control.onDoubleClick();

    expect(onChange).toHaveBeenCalledWith(0.5);
  });

  it("says nothing from a plain dial already standing at its default", () => {
    const onChange = vi.fn<(value: number) => void>();

    renderKnob(onChange).control.onDoubleClick();

    expect(onChange).not.toHaveBeenCalled();
  });

  it("sends the default from a dial a hand has moved, either way round", () => {
    for (const resetsAnyway of [false, true]) {
      const onChange = vi.fn<(value: number) => void>();
      renderKnob(onChange, { value: 0.2, resetsAnyway }).control.onDoubleClick();
      expect(onChange).toHaveBeenCalledWith(0.5);
    }
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
   * tall as its knobs, so one two-word label — "Band Gain", "Pre-delay" — would otherwise make its
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

/** The class a caption carries when the mark says a hand has been here. */
const MOVED = "text-foreground";

/** One dial's caption class, at a value and with the mark asked for or not. */
const marked = (value: number, marksDefault: boolean): string => {
  const root = Knob({
    label: "Gate",
    value,
    min: 0,
    max: 1,
    defaultValue: 0.5,
    marksDefault,
    onChange: () => {},
  });
  if (!isValidElement<{ children: ReactNode }>(root)) throw new Error("Knob rendered no root.");
  const [, box] = Children.toArray(root.props.children);
  if (!isValidElement<{ className: string }>(box)) throw new Error("Knob rendered no caption.");
  return box.props.className;
};

/**
 * The mark a dial opts into so a card of forty can be skimmed for the handful a hand has been to:
 * a caption at the page's own ink where the value has left its default, and muted where it has not
 * (0197, src/ui/PlayerDial.tsx). Paint and nothing else — the mark says which dials were moved and
 * never that one of them may not be.
 */
describe("Knob default mark", () => {
  it("raises the caption of a dial a hand has moved and mutes one standing at its default", () => {
    expect(marked(0.75, true)).toContain(MOVED);
    expect(marked(0.5, true)).not.toContain(MOVED);
  });

  /**
   * And says nothing at all where it was not asked to. A rack row is five parameters a hand set on
   * purpose, and one of them standing at its default there is not news — so the mark is a dial's
   * to opt into rather than every dial's (src/ui/ParameterKnob.tsx).
   */
  it("leaves every caption alone where the mark was not asked for", () => {
    expect(marked(0.75, false)).not.toContain(MOVED);
    expect(marked(0.5, false)).not.toContain(MOVED);
  });

  /**
   * The caption box is the same either way, which is 0093's claim said for this mark: a card whose
   * dials all stood at their defaults would otherwise measure a different height from one whose
   * dials had been moved, and the rack would stop reading as a row.
   */
  it("spends the same caption box whichever way the mark falls", () => {
    expect(marked(0.75, true)).toContain("h-[2lh]");
    expect(marked(0.5, true)).toContain("h-[2lh]");
    // And the mark is the ink alone: it is one class swapped, never a box of another size.
    expect(caption("Gate")).toContain("h-[2lh]");
  });
});

/**
 * The way back from the two readings this file spells: a dial can be told a number in the unit it
 * is showing, not only in the unit the value is kept in (0201, src/ui/KnobReadout.tsx).
 */
describe("Knob readings", () => {
  it("reads seconds back with or without the unit drawn after them", () => {
    expect(secondsValue("1.25s", 0, 4)).toBe(1.25);
    expect(secondsValue("1.25", 0, 4)).toBe(1.25);
  });

  /**
   * And the burst's two units are told apart by the dial rather than by the spelling: it reads out
   * in seconds only as far as its own top, so a number above that is the milliseconds the box was
   * showing. `500` is what a hand read at half a second, and typing it back must land there.
   */
  it("reads a burst above its own range as the milliseconds it was drawn in", () => {
    const max = PLAYER_BURST_MAX;
    expect(burstValue("500", PLAYER_BURST_MIN, max)).toBe(0.5);
    expect(burstValue(burstLabel(0.5), PLAYER_BURST_MIN, max)).toBe(0.5);
    expect(burstValue("1.5", PLAYER_BURST_MIN, max)).toBe(1.5);
    expect(burstValue("", PLAYER_BURST_MIN, max)).toBeUndefined();
  });
});
