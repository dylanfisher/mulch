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
  useRef,
} from "react";

import { cn } from "@/lib/cn";
import { clamp, denormalize, normalize, snapToStep, type RangeCurve } from "@/lib/range";
import { useOnFrame } from "@/ui/frame";
import { usePointerGesture } from "@/ui/gesture";
import { Says } from "@/ui/Says";

/** The dial sweeps 270°, centred on 12 o'clock: −135° to +135°. */
const SWEEP = 270;
const START = -135;
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

/**
 * The same length read the way a grain is read, in the two units a duration spanning three orders
 * of magnitude needs. Whole milliseconds under a second — `5` to `999`, which is where a grain's
 * length is heard as timbre and a tenth of a millisecond is below what a hand can set — and two
 * decimals at or above it, `1.00` to `2.00`. The step from `999` to `1.00` is the unit changing,
 * which is the one place four characters can say "second" without the word; the caption's sentence
 * carries it in full.
 *
 * Here rather than on the jumps card because the burst is no longer the only dial that reads in
 * it: the vary beside it is the same length in the same unit, and that is the whole point of
 * saying a vary in seconds (0135). The default `String` would put `0.012500000000000002` in a box
 * sized for four characters.
 */
export const burstLabel = (secs: number): string =>
  secs < 1 ? String(Math.round(secs * 1000)) : secs.toFixed(2);

/** The caption under the dial, written once because it is drawn plain and inside a tooltip
 * trigger, and the two must stay the same box: a caption spends two line boxes whatever it says,
 * so every card in a rack row measures one height (0093). */
const CAPTION = "h-[2lh] w-full text-center type-eyebrow text-muted-foreground";

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
  size = "default",
  travelPx = DRAG_TRAVEL_PX,
  disabled = false,
  className,
  live,
  says,
  animate = true,
}: KnobProps) {
  // A dial paints nothing ahead of the store — every move it made already committed the value it
  // reached — so a gesture the browser ended has nothing left to put back (0114).
  const drag = usePointerGesture<Drag>(() => {});
  const fraction = normalize(value, min, max, curve);

  const commit = useCallback(
    (next: number) => {
      const snapped = snapToStep(next, min, max, step);
      if (snapped !== value) onChange(snapped);
    },
    [max, min, onChange, step, value],
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (disabled || event.button !== 0) return;
      drag.begin(event.currentTarget, event, {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        fraction,
        reached: value,
        axis: null,
      });
    },
    [disabled, drag, fraction, value],
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
      onChange(next);
    },
    [curve, drag, max, min, onChange, step, travelPx],
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      // The capture comes back with the record, in the skeleton: it is what took it, and it is
      // the only thing that knows the pointer is already gone on a `pointercancel` (0114).
      drag.ended(event);
    },
    [drag],
  );

  /** The three parts a live value moves: the arc, the indicator and the readout under it. */
  const travelled = useRef<SVGPathElement>(null);
  const indicator = useRef<SVGLineElement>(null);
  const readout = useRef<HTMLOutputElement>(null);
  /** What the last paint left on the dial, so a frame that would repeat it writes nothing at all
   * (0070). A dial holding one value — a halted lane (0040), a span dial nobody has hold of — is
   * what would otherwise hand the CSSOM its own two attributes sixty times a second. */
  const painted = useRef<{ text: string; reached: number } | null>(null);

  const paint = useCallback(
    (read: number) => {
      // A live read lands anywhere between a lane's points, so it is snapped to the same step a
      // gesture commits on: an automated knob reads at the precision a resting one does, rather
      // than spelling out the interpolation.
      const next = snapToStep(read, min, max, step);
      const reached = normalize(next, min, max, curve);
      const last = painted.current;
      if (last !== null && last.reached === reached) return;
      // Two writes and no geometry: the arc is the whole track revealed by its dash offset, and
      // the indicator is one static line turned about the dial's centre.
      travelled.current?.setAttribute("stroke-dashoffset", String(1 - reached));
      indicator.current?.setAttribute("transform", spin(reached));
      // The readout follows; `aria-valuenow` deliberately does not. It is the value a performer
      // set and can set again, and sixty announcements a second is not an accessible control.
      const text = format(next);
      if (readout.current !== null && last?.text !== text) readout.current.textContent = text;
      painted.current = { text, reached };
    },
    [curve, format, max, min, step],
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
    // React has just written `format(value)` into the readout, so what the last frame wrote is
    // no longer what is on screen: forget it, or a frame reading that same string again would
    // skip the write and leave React's text standing.
    painted.current = null;
    if (!animate || live === undefined) paint(live?.() ?? value);
  }, [animate, live, paint, value]);

  const handleDoubleClick = useCallback(() => {
    commit(defaultValue);
  }, [commit, defaultValue]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      const delta = STEPS.get(event.key);
      const next =
        delta === undefined
          ? jump(event.key, min, max, defaultValue)
          : curve === "log"
            ? denormalize(fraction + delta * 0.01, min, max, curve)
            : value + delta * step;
      if (next === undefined) return;
      event.preventDefault();
      commit(next);
    },
    [commit, curve, defaultValue, disabled, fraction, max, min, step, value],
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

  return (
    <div
      className={cn(
        "flex select-none",
        size === COMPACT_SIZE ? "items-center gap-1" : "w-16 flex-col items-center gap-1",
        className,
      )}
    >
      {size === COMPACT_SIZE && says !== undefined ? <Says what={says}>{dial}</Says> : dial}
      {size === COMPACT_SIZE ? null : says === undefined ? (
        <div className={CAPTION}>{label}</div>
      ) : (
        // The same box either way, so the caption still spends its two line boxes and a card in a
        // rack row is no taller for having been explained (0093). A button rather than the plain
        // div, so a keyboard reaches the sentence the way a resting pointer does — and beside the
        // knob's accessible name rather than instead of it: the name is `aria-label` on the
        // slider above, and this is what a caption of one word cannot hold (P65).
        <Says what={says}>
          <button type="button" className={CAPTION}>
            {label}
          </button>
        </Says>
      )}
      <output ref={readout} className="type-readout">
        {format(value)}
      </output>
    </div>
  );
}
