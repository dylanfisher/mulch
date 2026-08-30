/**
 * @role A dial's number as something a hand can also type: the box the reading is drawn in, the
 *   field it becomes when it is pressed, and the commit that turns what was typed into a value on
 *   the dial's own range and step. Every knob in the instrument reads out through here, so a
 *   number is set by hand the same way wherever it is drawn (0201).
 * @instead The dial, its gestures and how a number is spelled → src/ui/Knob.tsx. What a reading in
 *   another unit means → the parser declared beside that unit's own format. Range maths →
 *   src/lib/range.ts.
 */
import {
  type ComponentProps,
  type FocusEvent,
  type KeyboardEvent,
  type RefObject,
  useCallback,
  useState,
} from "react";

import { cn } from "@/lib/cn";
import { snapToStep } from "@/lib/range";

/**
 * How a typed reading is read back into a value. It is handed the dial's bounds because a reading
 * is not always in the value's own unit and the bounds are what tell the two apart — a burst of
 * `500` is milliseconds precisely because the dial does not reach 500 seconds (`burstValue`).
 */
export type ReadingParser = (text: string, min: number, max: number) => number | undefined;

/**
 * The default: the number as it stands, and nothing else. Anything that is not one is refused
 * rather than turned into a zero — an empty box, a stray letter and a half-typed minus sign are
 * all a hand that has not finished, and none of them is a value the dial should take (P5).
 */
export const readNumber: ReadingParser = (text) => {
  const trimmed = text.trim();
  // An empty box is not a zero, which is the one thing `Number("")` would make it.
  const value = trimmed === "" ? Number.NaN : Number(trimmed);
  return Number.isFinite(value) ? value : undefined;
};

/** A reading with a unit spelled after it, read back by dropping the unit: `1.25s` is 1.25. */
export const withoutUnit = (text: string, unit: string): string =>
  text.trim().toLowerCase().endsWith(unit) ? text.trim().slice(0, -unit.length) : text;

/**
 * A field's own alignment, taken from the box it opened in rather than from the browser: an
 * `input` is the one element whose UA style refuses to inherit `text-align`, and a reading that
 * jumped to the left of its column the moment it was pressed is the digits moving under the hand
 * that came to type them. Hoisted because a fresh object every render is a fresh prop every render.
 */
const INHERIT_ALIGN = { textAlign: "inherit" } as const;

/** Everything the trigger is handed from outside — the tooltip's handlers and ref (0094). */
type TriggerProps = Omit<ComponentProps<"span">, "children" | "onChange" | "style">;

type KnobReadoutProps = TriggerProps & {
  /** The element a per-frame paint writes its text into, so a live read never goes through
   *  React (docs/plan.md §4, src/ui/Knob.tsx). */
  readout: RefObject<HTMLOutputElement | null>;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  parse: ReadingParser;
  onChange: (value: number) => void;
  disabled: boolean;
  /** The column a compact reading holds, which is the dial's and not the value's (P129). */
  style?: { minWidth: string } | undefined;
};

/**
 * The reading, and the field it becomes. A press opens it holding exactly what was on screen, so
 * what a hand edits is what it was reading; Enter or leaving it commits, Escape puts it back. A
 * value nothing can be read out of leaves the dial where it stands rather than snapping it to a
 * zero nobody asked for (P5).
 *
 * Over the line cap by the two ways out of the field and the paragraph on each: what is here is
 * one control's whole handler set, and splitting it makes hooks with one caller each. See
 * docs/decisions/0007-reviewed-oversized-functions.md.
 */
// oxlint-disable-next-line max-lines-per-function
export function KnobReadout({
  readout,
  value,
  min,
  max,
  step,
  format,
  parse,
  onChange,
  disabled,
  className,
  ...trigger
}: KnobReadoutProps) {
  /** What is being typed, or null for a reading nobody is editing. One state and not two: the
   *  draft is the editing. */
  const [draft, setDraft] = useState<string | null>(null);

  const open = useCallback(() => {
    if (!disabled) setDraft(format(value));
  }, [disabled, format, value]);

  const commit = useCallback(
    (text: string) => {
      setDraft(null);
      const read = parse(text, min, max);
      if (read === undefined) return;
      const next = snapToStep(read, min, max, step);
      if (next !== value) onChange(next);
    },
    [max, min, onChange, parse, step, value],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      // Both keys are this field's and no surface above it: Enter would submit whatever form the
      // instrument is drawn in, and Escape would close the popover a lane's dial is typed inside.
      if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        commit(event.currentTarget.value);
      } else if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setDraft(null);
      }
    },
    [commit],
  );

  /** Leaving the field is the same as pressing Enter: a number typed and then clicked away from
   *  was still typed. Nothing fires here after Escape — the field is already gone. */
  const onBlur = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      commit(event.currentTarget.value);
    },
    [commit],
  );

  const onDraft = useCallback((event: { currentTarget: { value: string } }) => {
    setDraft(event.currentTarget.value);
  }, []);

  /** Focused and selected the moment it appears, so typing replaces the reading rather than
   *  landing beside it — the whole point of pressing a number is to say another one. */
  const takeFocus = useCallback((element: HTMLInputElement | null) => {
    element?.focus();
    element?.select();
  }, []);

  return (
    // The box the tooltip is anchored to, and the one thing that does not change when the reading
    // turns into a field: a trigger whose element came and went would lose the sentence it is
    // saying halfway through a keystroke (0094).
    <span data-slot="knob-reading" className={cn("inline-flex", className)} {...trigger}>
      {draft === null ? (
        // A button, so the field is reached by keyboard as well as by pointer, and named by the
        // number it draws: the dial beside it carries the parameter's name already, and a second
        // element repeating it is a second control to read past (0055).
        <button
          type="button"
          data-slot="knob-readout"
          disabled={disabled}
          // The same bottom border the field draws, drawn in nothing: the reading and the field
          // occupy one box, so pressing a number does not move it a pixel under the hand.
          className="w-full cursor-text border-b border-transparent text-inherit disabled:cursor-not-allowed"
          onClick={open}
        >
          <output ref={readout}>{format(value)}</output>
        </button>
      ) : (
        <input
          ref={takeFocus}
          // Not `type="number"`: a reading is spelled in the dial's own unit — `1.25s`, `100%` —
          // and a numeric field refuses the very text it was opened holding.
          type="text"
          inputMode="decimal"
          data-slot="knob-field"
          style={INHERIT_ALIGN}
          aria-label={format(value)}
          className="w-full min-w-0 border-b border-ring bg-transparent text-inherit outline-none select-text"
          value={draft}
          onChange={onDraft}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
        />
      )}
    </span>
  );
}
