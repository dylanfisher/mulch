/**
 * @role A rotary control for one bounded continuous value — the instrument's main knob.
 * @instead Linear travel → src/ui/components/slider.tsx. A fixed set of choices →
 *   src/ui/components/toggle-group.tsx. Range maths belongs in src/lib/range.ts, not here.
 */

// `input[type=range]` is the tag `role="slider"` usually implies, but it cannot be drawn as a
// dial. role="slider" on a focusable element is the ARIA pattern for a knob, so the rule is off
// for this file only — see docs/decisions/0003-lint-generated-components.md.
// oxlint-disable jsx-a11y/prefer-tag-over-role

// This file sat exactly on the 400-line soft cap, and what carries it over is the caption's
// second branch: a caption that explains itself is the same box drawn inside a tooltip trigger
// (P65), and pulling those twelve lines into a component of their own puts the class 0093 asserts
// somewhere no test can read it. Read and judged, well under the hard cap docs/map.md sets — see
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines

import {
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";

import { cn } from "@/lib/cn";
import { clamp, denormalize, normalize, snapToStep, type RangeCurve } from "@/lib/range";
import { useOnFrame } from "@/ui/frame";
import { KnobReadout, readNumber, type ReadingParser, withoutUnit } from "@/ui/KnobReadout";
import { usePointerGesture } from "@/ui/gesture";
import { Says } from "@/ui/Says";

/**
 * The dial sweeps 270°, centred on 12 o'clock: −135° to +135°. Exported because the automator's
 * rows paint a mini-knob of what it drew each of these at, and a value read off one of those has
 * to read the same way as one read off the dial it was drawn for (principle 1, 0208).
 */
export const SWEEP = 270;
export const START = -135;
/** Horizontal or vertical pixels of drag that cover the whole range. Shift scales it down. */
const DRAG_TRAVEL_PX = 180;
/** Ignore initial pointer jitter before choosing the axis for the rest of the drag. */
const AXIS_LOCK_THRESHOLD_PX = 3;
const FINE_SCALE = 0.2;
/** Geometry of the 40×40 viewBox the arcs are drawn in. */
const CENTER = 20;
const RADIUS = 16;

/**
 * A dial's readout for a value that is a length of time: seconds, to the hundredth. Declared here
 * because it is the knob's own readout and more than two dials want it — a lane's span, and the
 * session's shared jump clock — and two spellings of one duration are two readouts that disagree.
 */
export const secondsLabel = (secs: number): string => `${secs.toFixed(2)}s`;

/** And read back: the same seconds, with the unit that was drawn after them dropped (0201). */
export const secondsValue: ReadingParser = (text, min, max) =>
  readNumber(withoutUnit(text, "s"), min, max);

/**
 * The same length read the way a grain is read, in the two units a duration spanning three orders
 * of magnitude needs. Whole milliseconds under a second — `5` to `999`, which is where a grain's
 * length is heard as timbre and a tenth of a millisecond is below what a hand can set — and
 * seconds at or above it, `1.00` to `16.0`. The step from `999` to `1.00` is the unit changing,
 * which is the one place four characters can say "second" without the word; the caption's sentence
 * carries it in full.
 *
 * A decimal is dropped rather than a character added, and it is dropped by measuring the reading
 * rather than by comparing the value: the readout is four characters at every reading of the dial,
 * and `(9.996).toFixed(2)` is `10.00`, which a test of `secs < 10` would have let through. A
 * compact readout sits in a row that shifts under the pointer the moment one of them grows
 * (`readoutChars`), and what that hundredth would name up there is a step the dial cannot be
 * turned to by eye anyway.
 *
 * Here rather than on the jumps card because the burst is no longer the only dial that reads in
 * it: the vary beside it is the same length in the same unit, and that is the whole point of
 * saying a vary in seconds (0135). The default `String` would put `0.012500000000000002` in a box
 * sized for four characters.
 */
export const burstLabel = (secs: number): string => {
  if (secs < 1) return String(Math.round(secs * 1000));
  const hundredths = secs.toFixed(2);
  return hundredths.length > 4 ? secs.toFixed(1) : hundredths;
};

/**
 * The same two units read back, decided by how the number was spelled rather than by how big it
 * is: the readout draws milliseconds as whole numbers and seconds with a decimal point, so a
 * reading carrying one is seconds and a reading without one is milliseconds. `500` is half a
 * second, `1.5` is a second and a half, and both are what the box they were typed into said.
 *
 * The exception is a whole number too small to be a reading in milliseconds at all: under the
 * dial's own floor, milliseconds is not a unit it can hold, so `1` on a dial bottoming out at five
 * of them can only have been a second. That is the whole of the old rule — read the unit off the
 * dial's range — and it used to be the whole of it, which worked only while the top of the range
 * was below the smallest reading the box could draw. At a ceiling of sixteen seconds the two
 * overlap, and typing back the `5` the floor itself reads out would have set five seconds (0388).
 */
export const burstValue: ReadingParser = (text, min, max) => {
  const read = readNumber(text, min, max);
  const millis = (read ?? 0) / 1000;
  return read === undefined || text.includes(".") || millis < min ? read : millis;
};

/** The caption under the dial, written once because it is drawn plain and inside a tooltip
 * trigger, and the two must stay the same box: a caption spends two line boxes whatever it says,
 * so every card in a rack row measures one height (0093). Exported because a parameter drawn as a
 * picker rather than as a dial wears the identical caption in the identical box, and a second
 * spelling of it is a rack row that measures two heights (src/ui/ParameterChoice.tsx). */
export const CAPTION = "h-[2lh] w-full text-center type-eyebrow text-muted-foreground";

/**
 * How wide a compact dial's readout column is, in characters: the widest of what the dial's own
 * declared bounds and its default read as. A compact readout sits beside the dial rather than
 * under it, so a value that grows a character — 8 to 16, 99% to 100% — moves everything to its
 * right, and a row of them under a playing song shifts under the pointer. A dial drawn with a
 * caption takes its width from the column the caption already sets, so this is the compact rung's
 * alone. Three readings and not a sweep of the range: what a dial declares is its bounds and the
 * value it returns to, and a format is free to be its own width in between (`burstLabel`).
 */
const readoutChars = (format: (value: number) => string, ...values: readonly number[]): number =>
  Math.max(...values.map((value) => format(value).length));

/** The dial's rungs. `xs` is the compact one: no caption, and its readout beside the dial rather
 * than under it — a dial that small is a corner control named by `aria-label` alone (0055). */
const SIZES = {
  xs: "size-6",
  sm: "size-9",
  default: "size-12",
  lg: "size-16",
} as const;
const COMPACT_SIZE = "xs";

/**
 * Keyboard steps, in multiples of `step`, as maps rather than object literals: `event.key`
 * is a string from the outside, and an object would answer `"constructor"` with a function.
 * Page Up/Down carry the big move — Shift cannot, since `step` is already the finest the
 * value is allowed to land on, and the drag's Shift means the opposite.
 */
const STEPS = new Map([
  ["ArrowUp", 1],
  ["ArrowRight", 1],
  ["ArrowDown", -1],
  ["ArrowLeft", -1],
  ["PageUp", 10],
  ["PageDown", -10],
]);

/** A point on the dial, in viewBox coordinates. 0° is 12 o'clock, positive clockwise. */
function polar(degrees: number) {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: CENTER + RADIUS * Math.sin(radians),
    y: CENTER - RADIUS * Math.cos(radians),
  };
}

/** An SVG arc command sweeping clockwise from `START` to `degrees`. */
function arc(degrees: number) {
  const from = polar(START);
  const to = polar(degrees);
  return `M ${from.x} ${from.y} A ${RADIUS} ${RADIUS} 0 ${
    degrees - START > 180 ? 1 : 0
  } 1 ${to.x} ${to.y}`;
}

/**
 * The full sweep, drawn once. Both arcs use it: the travelled one is the same path revealed by a
 * dash offset, so following a lane writes one attribute a frame instead of rebuilding geometry.
 */
const TRACK = arc(START + SWEEP);

/** Where the indicator points when the dial reads `fraction`, as an SVG transform. */
function spin(fraction: number) {
  return `rotate(${START + fraction * SWEEP} ${CENTER} ${CENTER})`;
}

/** The keys that jump straight to a value rather than nudging by a step. */
function jump(key: string, min: number, max: number, defaultValue: number): number | undefined {
  switch (key) {
    case "Home":
      return min;
    case "End":
      return max;
    case "Backspace":
      return defaultValue;
    default:
      return undefined;
  }
}

/**
 * The dial face: the full-sweep track, the arc travelled so far, and the indicator line. The two
 * moving parts are handed out as refs, because a knob following an automation lane repaints them
 * sixty times a second and nothing per-frame may enter React state (docs/plan.md §4).
 */
function Dial({
  fraction,
  travelled,
  indicator,
}: {
  fraction: number;
  travelled: RefObject<SVGPathElement | null>;
  indicator: RefObject<SVGLineElement | null>;
}) {
  return (
    <svg viewBox="0 0 40 40" className="size-full" aria-hidden="true">
      <path d={TRACK} fill="none" strokeWidth={4} strokeLinecap="butt" className="stroke-muted" />
      <path
        ref={travelled}
        d={TRACK}
        pathLength={1}
        strokeDasharray="1 1"
        strokeDashoffset={1 - fraction}
        fill="none"
        strokeWidth={4}
        strokeLinecap="butt"
        className="stroke-primary"
      />
      <line
        ref={indicator}
        x1={CENTER}
        y1={CENTER - RADIUS * 0.35}
        x2={CENTER}
        y2={CENTER - RADIUS * 0.9}
        transform={spin(fraction)}
        strokeWidth={2}
        strokeLinecap="round"
        className="stroke-foreground"
      />
    </svg>
  );
}

/** One drag of the dial, carrying the un-snapped value it has accumulated so fine moves are not
 * quantized away, and the axis it locked onto once it had travelled far enough to choose one. */
type Drag = {
  pointerId: number;
  x: number;
  y: number;
  fraction: number;
  /** The value this drag last handed out — what the next move is compared against, because a
   * dial committed once for a whole gesture (0079) does not get `value` back between moves, and
   * would call a move back to where it started no move at all. */
  reached: number;
  axis: "horizontal" | "vertical" | null;
};

type KnobProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  defaultValue: number;
  onChange: (value: number) => void;
  step?: number;
  curve?: RangeCurve;
  format?: (value: number) => string;
  /**
   * How a number typed into the readout is read back into a value — the inverse of `format`, and
   * declared beside it wherever a format is more than the number itself (principle 1). Absent, a
   * reading is the value as it stands, which is what every plain dial reads out.
   */
  parse?: ReadingParser;
  size?: keyof typeof SIZES;
  /** Pixels of drag covering the whole range, for a range one sweep cannot land in: a lane's span
   * is twelve doublings wide, and the default would put a doubling inside fourteen pixels (0079).
   * Absent, every dial travels the same `DRAG_TRAVEL_PX`. */
  travelPx?: number;
  disabled?: boolean;
  className?: string;
  /**
   * A value read and painted straight onto the dial — how a knob follows the lane driving its
   * parameter. Returning null paints `value`, which is what an un-automated moment looks like.
   * Absent, the knob is painted by React alone, so a page of knobs nothing is automating runs no
   * frames at all (0035).
   */
  live?: () => number | null;
  /**
   * What to call this dial where the caption alone would not tell it from another on screen. The
   * caption is a dial's accessible name by default, and two on screen at once carrying one word
   * are two sliders nothing can tell apart — so a surface that draws a knob the card behind it is
   * already drawing says the fuller name here and keeps the caption a word wide (0153,
   * src/ui/tooltips.test.ts). It has to contain the caption: a visible label that is not part of
   * the accessible name is a control a voice cannot ask for by what it reads (WCAG 2.5.3).
   */
  name?: string;
  /**
   * What this parameter is and in what unit — the sentence the one-word caption cannot hold,
   * shown when a pointer rests on it. Absent, the caption is drawn plain: a knob whose meaning
   * nothing has been written for says nothing rather than an empty box (P65).
   *
   * A compact dial draws no caption, so its sentence goes on the dial itself: every `xs` dial in
   * the instrument is explained the same way, through this one prop, rather than by a `Says`
   * wrapped around a component that spreads no handlers onto its root (0094, 0157).
   */
  says?: string;
  /**
   * Whether that value is still moving. False reads it once per render instead of once a frame —
   * which is a halted lane: it is holding one value, and holding it is not animation (0040).
   */
  animate?: boolean;
  /**
   * Whether this dial says, in its words, that nobody has moved it. A card of forty dials where
   * most stand where the switch left them is forty things to read and no way to tell the handful
   * that are shaping the sound from the rest — so a dial that opts in raises its caption to the
   * page's own ink once its value leaves `defaultValue`, and leaves it muted until then (0197).
   *
   * Opt-in rather than always: a rack row is five dials a hand set on purpose, and a parameter
   * standing at its default there is not news (src/ui/ParameterKnob.tsx). Absent, every caption is
   * muted, which is what every dial in the instrument did before this prop existed.
   *
   * It is paint and nothing else. A dial standing at its default is turnable, focusable, and reads
   * out the same number it always did — the mark is which of them a hand has been to.
   */
  marksDefault?: boolean;
  /**
   * Whether a double-click sends the default even where the dial's own value already is it. A
   * dial following a lane is not standing at `value` — it is wherever the lane has it — and what
   * the reset asks for there is the lane gone, which only reaches the store as a move; the guard
   * that spares a plain dial a commit it does not need is what refused it, on every lane a hand
   * rode from the default (0385, src/ui/ParameterKnob.tsx). Absent, the guard stands.
   */
  resetsAnyway?: boolean;
  /**
   * The places this dial is allowed to stand, as a landing every value it reaches passes through
   * before it is painted or sent — a parameter held to the beat lands on whole divisions of it
   * and on nothing between them (src/ui/ParameterBeat.tsx). Absent, a dial stands wherever its
   * own `step` lets it, which is every dial in the instrument but a held one.
   *
   * It is a landing and not a second range: the drag goes on accumulating the value it would have
   * reached, so a hand travelling across two divisions crosses one and the dial *steps* rather
   * than sliding and being corrected afterwards, and the keys go on stepping by `step` until the
   * sum of them reaches the next place — as far as `step` moves the value at all, which on a log
   * dial whose declared step is coarser than a key's own move is nowhere, landing or none. Must be
   * stable across renders; must be idempotent, since the readout's own typed value passes through
   * the caller's copy of it too.
   */
  land?: (value: number) => number;
};

/**
 * A rotary control. Drag right or up to change (hold Shift for fine), double-click to
 * return to `defaultValue`, or focus it and use the arrow keys — Page Up/Down for ten
 * steps at a time.
 *
 * Over the line cap by design: what remains after the dial and the prop types moved out is
 * one control's gesture set — pointer capture, fine drag, keyboard steps, reset. Splitting
 * it further means hooks with a seven-argument parameter list and one caller each; see
 * docs/decisions/0007-reviewed-oversized-functions.md.
 */
// oxlint-disable-next-line max-lines-per-function
export function Knob({
  label,
  name,
  value,
  min,
  max,
  defaultValue,
  onChange,
  step = 0.01,
  curve = "linear",
  format = String,
  parse = readNumber,
  size = "default",
  travelPx = DRAG_TRAVEL_PX,
  disabled = false,
  className,
  live,
  says,
  animate = true,
  marksDefault = false,
  resetsAnyway = false,
  land,
}: KnobProps) {
  /** The three parts a live value moves: the arc, the indicator and the readout under it. */
  const travelled = useRef<SVGPathElement>(null);
  const indicator = useRef<SVGLineElement>(null);
  const readout = useRef<HTMLOutputElement>(null);
  /** What the last paint left on the dial, so a frame that would repeat it writes nothing at all
   * (0070). A dial holding one value — a halted lane (0040), a span dial nobody has hold of — is
   * what would otherwise hand the CSSOM its own two attributes sixty times a second. */
  const painted = useRef<{ reached: number } | null>(null);

  const paint = useCallback(
    (read: number) => {
      // A live read lands anywhere between a lane's points, so it is snapped to the same step a
      // gesture commits on: an automated knob reads at the precision a resting one does, rather
      // than spelling out the interpolation.
      const next = snapToStep(read, min, max, step);
      const reached = normalize(next, min, max, curve);
      const last = painted.current;
      if (last === null || last.reached !== reached) {
        // Two writes and no geometry: the arc is the whole track revealed by its dash offset, and
        // the indicator is one static line turned about the dial's centre.
        travelled.current?.setAttribute("stroke-dashoffset", String(1 - reached));
        indicator.current?.setAttribute("transform", spin(reached));
      }
      // The readout follows; `aria-valuenow` deliberately does not. It is the value a performer
      // set and can set again, and sixty announcements a second is not an accessible control.
      // Compared against the text that is actually on it rather than against a remembered one:
      // the readout is torn down and rebuilt every time a hand types into it (0201), and a frame
      // trusting what it wrote to the element before that would leave React's text standing.
      const text = format(next);
      if (readout.current !== null && readout.current.textContent !== text) {
        readout.current.textContent = text;
      }
      painted.current = { reached };
    },
    [curve, format, max, min, step],
  );

  /**
   * The value this dial last reached — sent by its own hand, or handed to it by a render that
   * moved `value` — and what a key, a reset and a press step from instead of the prop: the yard
   * follows the store in a transition (0307), so the `value` a render carries can be one commit
   * behind, and a key repeated inside that gap would step from where the dial had already left.
   * `rendered` is what the last render carried, which is how a render that moved is told from one
   * that did not.
   *
   * Under a landing it is also where the hand is between two places, which is not where the dial
   * is — see `landed`, and `settle`, which is what keeps the difference inside one gesture.
   */
  const reached = useRef(value);
  const rendered = useRef(value);
  /**
   * Where the dial is actually standing — `reached` put through `land`, and the same number where
   * there is no landing. Held apart from `reached` because the two are exactly what a stepped dial
   * needs to be: the hand goes on travelling between two places while the dial stays on the one it
   * is on, and a move that lands where it already is turns nothing and sends nothing.
   */
  const landed = useRef(value);
  /**
   * A gesture's ending, however it ends: the hand's travel goes back to where the dial is standing.
   *
   * On a plain dial this is already true — every move wrote, so the two are the same number — and
   * under a landing it is the whole difference between accumulating *inside* a drag and keeping a
   * drag's abandoned travel forever. A press that never crossed to the next place sends nothing,
   * so no render carries a new `value` and the layout effect below never re-seats either ref; the
   * next press would then start from a fraction the dial is not at, and the next arrow key would
   * cross on one stroke (0387).
   */
  const settle = useCallback(() => {
    reached.current = landed.current;
  }, []);
  // A dial paints ahead of the store for exactly the length of its own gesture — a move turns it
  // before its value is sent, so the hand never waits on what a commit costs downstream (0307) —
  // and yet a gesture the browser ended has nothing to put back but the hand's own travel: every
  // move committed the value it painted, so what is on the dial is what the store holds (0114).
  const drag = usePointerGesture<Drag>(settle);
  const fraction = normalize(value, min, max, curve);

  const commit = useCallback(
    (next: number, anyway = false) => {
      const snapped = snapToStep(next, min, max, step);
      if (snapped === reached.current && !anyway) return;
      reached.current = snapped;
      const place = land === undefined ? snapped : land(snapped);
      if (place === landed.current && !anyway) return;
      landed.current = place;
      paint(place);
      onChange(place);
    },
    [land, max, min, onChange, paint, step],
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (disabled || event.button !== 0) return;
      drag.begin(event.currentTarget, event, {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        fraction: normalize(reached.current, min, max, curve),
        reached: reached.current,
        axis: null,
      });
    },
    [curve, disabled, drag, max, min],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      // A second finger on the same knob reports its own coordinates; only the captured
      // pointer moves the value, or the two would be differenced against each other.
      const state = drag.matched(event);
      if (state === null) return;
      const perPixel = (1 / travelPx) * (event.shiftKey ? FINE_SCALE : 1);
      const horizontal = event.clientX - state.x;
      const vertical = state.y - event.clientY;
      if (state.axis === null) {
        if (Math.max(Math.abs(horizontal), Math.abs(vertical)) < AXIS_LOCK_THRESHOLD_PX) return;
        state.axis = Math.abs(horizontal) >= Math.abs(vertical) ? "horizontal" : "vertical";
      }
      // Lock the dominant axis for the whole gesture: on opposing diagonals, choosing again
      // per event lets tiny sampling differences reverse the value from one frame to the next.
      const travel = state.axis === "horizontal" ? horizontal : vertical;
      state.fraction = clamp(state.fraction + travel * perPixel, 0, 1);
      state.x = event.clientX;
      state.y = event.clientY;
      const next = snapToStep(denormalize(state.fraction, min, max, curve), min, max, step);
      if (next === state.reached) return;
      state.reached = next;
      reached.current = next;
      // The place that value lands on, which on a plain dial is the value. A drag across a stepped
      // dial goes on accumulating above — the fraction is the hand's, not the dial's — so what is
      // dropped here is the stretch of travel between two places, and the dial steps onto the next
      // one when the hand crosses to it.
      const place = land === undefined ? next : land(next);
      if (place === landed.current) return;
      landed.current = place;
      // Painted before it is sent: the dial is at the hand whatever the commit below costs.
      paint(place);
      onChange(place);
    },
    [curve, drag, land, max, min, onChange, paint, step, travelPx],
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      // The capture comes back with the record, in the skeleton: it is what took it, and it is
      // the only thing that knows the pointer is already gone on a `pointercancel` (0114). The
      // hand's angle stands on every ending: every move committed the value it painted, and the
      // render carrying it may still be on its way (0307).
      drag.ended(event);
      settle();
    },
    [drag, settle],
  );

  useOnFrame(
    () => {
      paint(live?.() ?? value);
    },
    live !== undefined && animate,
  );

  // React paints the dial from `value` on every render, but a frame that painted something else
  // left attributes React has no reason to touch again. This is what puts them back — and before
  // the commit paints, so nothing flashes at the old angle. A held lane is put back to the value
  // it is holding rather than to `value`: pausing must not move a dial any more than it moves a
  // playhead (0040).
  useLayoutEffect(() => {
    // React has just drawn the dial from `value`, so the angle the last frame left is no longer
    // what is on screen: forget it, or a frame reaching that same angle again would write nothing
    // and leave React's arc standing.
    painted.current = null;
    // A render that moved `value` is the store speaking — a commit landing, an undo, a lane handing
    // the value back — and the dial follows it, unless a hand is on the dial, which outranks it.
    // One that carried the same `value` as the last is the yard one transition behind (0307), and
    // says nothing about where the dial is.
    if (value !== rendered.current) {
      rendered.current = value;
      if (drag.held() === null) {
        reached.current = value;
        landed.current = value;
      }
    }
    if (!animate || live === undefined) paint(live?.() ?? landed.current);
  }, [animate, drag, live, paint, value]);

  /**
   * The reset. Sent whether or not the number moves where the dial says so (`resetsAnyway`): a
   * double-click on a dial a lane is driving is a hand asking for the lane gone, and the value it
   * is standing at says nothing about whether there is one to clear (0385).
   */
  const handleDoubleClick = useCallback(() => {
    commit(defaultValue, resetsAnyway);
  }, [commit, defaultValue, resetsAnyway]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      const delta = STEPS.get(event.key);
      const next =
        delta === undefined
          ? jump(event.key, min, max, defaultValue)
          : curve === "log"
            ? denormalize(
                normalize(reached.current, min, max, curve) + delta * 0.01,
                min,
                max,
                curve,
              )
            : reached.current + delta * step;
      if (next === undefined) return;
      event.preventDefault();
      commit(next);
    },
    [commit, curve, defaultValue, disabled, max, min, step],
  );

  /**
   * The dial itself. Held apart from the layout below because a compact dial is explained on it:
   * a caption is where a sentence is drawn (P65) and the compact rung draws none, so the sentence
   * is put on the one thing it does draw. `Says` renders the control it is given rather than
   * wrapping it, so this element, its role, its name and its handlers are exactly what they were
   * (0094) — which the trigger could not do from outside, because this component takes a declared
   * prop list and spreads nothing onto its root (0157).
   */
  const dial = (
    <div
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={name ?? label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={format(value)}
      aria-disabled={disabled}
      data-slot="knob"
      className={cn(
        SIZES[size],
        "touch-none rounded-full outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
        disabled ? "pointer-events-none opacity-50" : "cursor-ns-resize",
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
    >
      <Dial fraction={fraction} travelled={travelled} indicator={indicator} />
    </div>
  );

  const compact = size === COMPACT_SIZE;
  /**
   * Whether this dial is one a hand has been to, for the caption that says so. Derived here rather
   * than asked for as a second prop, because both numbers are already in this control's hands and
   * a caller passing its own answer could pass one the dial disagrees with (principle 1, 0197).
   */
  const moved = marksDefault && value !== defaultValue;
  /** The caption's own box, at the page's ink where a hand has been and muted where it has not. */
  const caption = cn(CAPTION, moved && "text-foreground");
  /**
   * The value, and the column it holds. Held apart from the layout below for the reason the dial
   * is: a compact readout is the other half of the control the pointer is over, so it carries the
   * same sentence — a hover target the dial alone does not give it, and the hand reaching a number
   * on a row is over the number rather than over the 24px dial beside it (0094, P129).
   */
  const column = useMemo(
    () => (compact ? { minWidth: `${readoutChars(format, min, max, defaultValue)}ch` } : undefined),
    [compact, defaultValue, format, max, min],
  );
  const reading = (
    // Right-aligned inside that column, so the digits end where they always ended: the lane
    // preview lays its compact dial out against the right of its own row, and a column filled
    // from the left would have moved the number off that edge (src/ui/AutomationPreview.tsx).
    // It is also where the value is typed: every dial in the instrument can be told a number as
    // well as turned to one, because a turn cannot reach an exact reading and a hand that knows
    // which one it wants should not have to hunt for it (0201).
    <KnobReadout
      readout={readout}
      value={value}
      min={min}
      max={max}
      step={step}
      format={format}
      parse={parse}
      onChange={onChange}
      disabled={disabled}
      className={cn(
        "type-readout",
        // Where the digits sit when the reading is a field wide enough to have somewhere to sit:
        // against the right in a compact column, and under the dial everywhere else.
        compact ? "justify-end text-right" : "text-center",
        // Muted with its caption and for the same reason: a number nobody has moved is the
        // switch's own, and reading it at the page's ink says a hand set it there (0197).
        marksDefault && !moved && "text-muted-foreground",
      )}
      style={column}
    />
  );

  return (
    <div
      className={cn(
        "flex select-none",
        compact ? "items-center gap-1" : "w-16 flex-col items-center gap-1",
        className,
      )}
    >
      {compact && says !== undefined ? <Says what={says}>{dial}</Says> : dial}
      {compact ? null : says === undefined ? (
        <div className={caption}>{label}</div>
      ) : (
        // The same box either way, so the caption still spends its two line boxes and a card in a
        // rack row is no taller for having been explained (0093). A button rather than the plain
        // div, so a keyboard reaches the sentence the way a resting pointer does — and beside the
        // knob's accessible name rather than instead of it: the name is `aria-label` on the
        // slider above, and this is what a caption of one word cannot hold (P65).
        <Says what={says}>
          <button type="button" className={caption}>
            {label}
          </button>
        </Says>
      )}
      {compact && says !== undefined ? <Says what={says}>{reading}</Says> : reading}
    </div>
  );
}
