// `input[type=range]` is the tag `role="slider"` usually implies, but it cannot be drawn as a
// dial. role="slider" on a focusable element is the ARIA pattern for a knob, so the rule is off
// for this file only — see docs/decisions/0003-lint-generated-components.md.
// oxlint-disable jsx-a11y/prefer-tag-over-role

/**
 * @role A rotary control for one bounded continuous value — the instrument's main knob.
 * @instead Linear travel → src/ui/components/slider.tsx. A fixed set of choices →
 *   src/ui/components/toggle-group.tsx. Range maths belongs in src/lib/range.ts, not here.
 */
import { type KeyboardEvent, type PointerEvent, useCallback, useRef } from "react";

import { cn } from "@/lib/cn";
import { clamp, normalize, snapToStep } from "@/lib/range";

/** The dial sweeps 270°, centred on 12 o'clock: −135° to +135°. */
const SWEEP = 270;
const START = -135;
/** Vertical pixels of drag that cover the whole range. Shift scales it down. */
const DRAG_TRAVEL_PX = 180;
const FINE_SCALE = 0.2;
/** Geometry of the 40×40 viewBox the arcs are drawn in. */
const CENTER = 20;
const RADIUS = 16;

const SIZES = {
  sm: "size-9",
  default: "size-12",
  lg: "size-16",
} as const;

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
function polar(degrees: number, radius = RADIUS) {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.sin(radians),
    y: CENTER - radius * Math.cos(radians),
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

/** The dial face: the full-sweep track, the arc travelled so far, and the indicator line. */
function Dial({ angle }: { angle: number }) {
  const indicator = polar(angle, RADIUS * 0.9);
  const hub = polar(angle, RADIUS * 0.35);

  return (
    <svg viewBox="0 0 40 40" className="size-full" aria-hidden="true">
      <path
        d={arc(START + SWEEP)}
        fill="none"
        strokeWidth={4}
        strokeLinecap="butt"
        className="stroke-muted"
      />
      <path
        d={arc(angle)}
        fill="none"
        strokeWidth={4}
        strokeLinecap="butt"
        className="stroke-primary"
      />
      <line
        x1={hub.x}
        y1={hub.y}
        x2={indicator.x}
        y2={indicator.y}
        strokeWidth={2}
        strokeLinecap="round"
        className="stroke-foreground"
      />
    </svg>
  );
}

type KnobProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  defaultValue: number;
  onChange: (value: number) => void;
  step?: number;
  format?: (value: number) => string;
  size?: keyof typeof SIZES;
  disabled?: boolean;
  className?: string;
};

/**
 * A rotary control. Drag vertically to change (hold Shift for fine), double-click to
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
  value,
  min,
  max,
  defaultValue,
  onChange,
  step = 0.01,
  format = String,
  size = "default",
  disabled = false,
  className,
}: KnobProps) {
  /** The un-snapped value the drag has accumulated, so fine moves are not quantized away. */
  const drag = useRef<{ pointerId: number; y: number; value: number } | null>(null);
  const fraction = normalize(value, min, max);
  const angle = START + fraction * SWEEP;

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
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = { pointerId: event.pointerId, y: event.clientY, value };
    },
    [disabled, value],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const state = drag.current;
      // A second finger on the same knob reports its own coordinates; only the captured
      // pointer moves the value, or the two would be differenced against each other.
      if (state === null || state.pointerId !== event.pointerId) return;
      const perPixel = ((max - min) / DRAG_TRAVEL_PX) * (event.shiftKey ? FINE_SCALE : 1);
      state.value = clamp(state.value + (state.y - event.clientY) * perPixel, min, max);
      state.y = event.clientY;
      commit(state.value);
    },
    [commit, max, min],
  );

  const handlePointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (drag.current === null || drag.current.pointerId !== event.pointerId) return;
    // Ends the drag first: this also runs on `pointercancel`, where the pointer is already
    // gone and releasing its capture throws — leaving the knob latched to a dead drag.
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const handleDoubleClick = useCallback(() => {
    commit(defaultValue);
  }, [commit, defaultValue]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      const delta = STEPS.get(event.key);
      const next =
        delta === undefined ? jump(event.key, min, max, defaultValue) : value + delta * step;
      if (next === undefined) return;
      event.preventDefault();
      commit(next);
    },
    [commit, defaultValue, disabled, max, min, step, value],
  );

  return (
    <div className={cn("flex w-16 flex-col items-center gap-1", className)}>
      <div
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={format(value)}
        aria-disabled={disabled}
        data-slot="knob"
        className={cn(
          SIZES[size],
          "touch-none rounded-full outline-none select-none focus-visible:ring-1 focus-visible:ring-ring/50",
          disabled ? "pointer-events-none opacity-50" : "cursor-ns-resize",
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
      >
        <Dial angle={angle} />
      </div>
      <div className="w-full text-center type-eyebrow text-muted-foreground">{label}</div>
      <output className="type-readout">{format(value)}</output>
    </div>
  );
}
