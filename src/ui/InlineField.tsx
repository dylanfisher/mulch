/**
 * @role A label beside a short input, as one thing a row of `sm` buttons can hold: the two on
 *   one line, the input as tall as the buttons beside it, and the whole standing at the top of
 *   its row rather than at the baseline of whatever taller thing shares it (0306).
 * @instead A label stacked over a full-width input, the shape a dialog reads →
 *   src/ui/components/field.tsx. The four fields that go through here → src/ui/LoadField.tsx,
 *   src/ui/DeckTag.tsx, src/ui/PlayerSeed.tsx and src/ui/LoopBeats.tsx.
 */
import { type ComponentProps, type FocusEvent, type KeyboardEvent, useCallback } from "react";

import { cn } from "@/lib/cn";
import { Field, FieldLabel } from "@/ui/components/field";
import { Input } from "@/ui/components/input";

/**
 * The one gesture every field through here is edited by: commit on blur, commit on Enter, and
 * nothing on any other key. One hook rather than the four copies of it the fields here had grown
 * (principle 3) — each of them holds an uncontrolled input because a controlled one would send a
 * durable edit per keystroke, so each needs this pair of handlers and this read of
 * `currentTarget`. A field that answers more keys than Enter — the readout's Escape and its draft
 * (src/ui/KnobReadout.tsx) — is a different gesture and is deliberately not through here.
 */
export function useFieldCommit(commit: (input: HTMLInputElement) => void) {
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
  return { onBlur, onKeyDown };
}

type InlineFieldProps = ComponentProps<typeof Input> & {
  id: string;
  label: string;
  /** What the field is for, worn as a `title` by the label and the input both. */
  hint?: string;
};

/**
 * `h-7` is what `Button` and `Toggle` say `size="sm"` is (src/ui/components/*.tsx) — the one
 * height a row of them has, so a field beside them draws no second edge below theirs.
 */
export function InlineField({ id, label, hint, className, ...input }: InlineFieldProps) {
  return (
    <Field orientation="horizontal" className="w-auto self-start" title={hint}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input id={id} className={cn("h-7 w-20", className)} {...input} />
    </Field>
  );
}
