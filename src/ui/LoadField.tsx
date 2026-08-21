/**
 * @role One numeric argument of a `deck.load` as a field — the generator's length and frequency,
 *   the two things a load carries that no knob can hold.
 * @instead A parameter of the running deck → src/ui/Knob.tsx, which rides src/audio/params.ts.
 *   The rule for what a load accepts → src/lib/waveform.ts; this file is handed it, never its own.
 */
import { type FocusEvent, type KeyboardEvent, useCallback } from "react";

import { Field, FieldLabel } from "@/ui/components/field";
import { Input } from "@/ui/components/input";

type LoadFieldProps = {
  id: string;
  name: string;
  value: number;
  min: number;
  max?: number;
  /**
   * How far one press of the spinner moves the value. Named at each call site rather than left
   * open: a pitch dialled in whole hertz steps over every beat between two yards (P70), and
   * "any" is what a field whose useful granularity is the whole of `valid` asks for.
   */
  step: number | "any";
  /** The rule from src/lib/waveform.ts, so the field offers exactly what a load accepts. */
  valid: (value: number) => boolean;
  disabled: boolean;
  onCommit: (value: number) => void;
};

function commitInput(
  input: HTMLInputElement,
  value: number,
  valid: (value: number) => boolean,
  onCommit: (value: number) => void,
): void {
  if (input.valueAsNumber === value) return;
  if (valid(input.valueAsNumber)) {
    onCommit(input.valueAsNumber);
    return;
  }
  // A refused value loads nothing, so nothing remounts this field: put the session's own
  // number back rather than leave the input reading something the deck is not playing.
  input.value = String(value);
}

/**
 * Uncontrolled and committed on blur or Enter, because a controlled field would generate a whole
 * buffer on every keystroke. `key` is the committed value, so a load from anywhere else — the
 * source picker, a JSONL line — remounts the field in step with the session.
 */
export function LoadField({
  id,
  name,
  value,
  min,
  max,
  step,
  valid,
  disabled,
  onCommit,
}: LoadFieldProps) {
  const commit = useCallback(
    (input: HTMLInputElement) => {
      commitInput(input, value, valid, onCommit);
    },
    [value, valid, onCommit],
  );

  const onBlur = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      commit(event.currentTarget);
    },
    [commit],
  );
  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") commit(event.currentTarget);
    },
    [commit],
  );

  return (
    <Field className="w-20">
      <FieldLabel htmlFor={id}>{name}</FieldLabel>
      <Input
        key={value}
        id={id}
        type="number"
        className="type-readout"
        min={min}
        {...(max === undefined ? {} : { max })}
        step={step}
        defaultValue={value}
        disabled={disabled}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
      />
    </Field>
  );
}
