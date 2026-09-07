/**
 * @role A label beside a short input, as one thing a row of `sm` buttons can hold: the two on
 *   one line, the input as tall as the buttons beside it, and the whole standing at the top of
 *   its row rather than at the baseline of whatever taller thing shares it (0306).
 * @instead A label stacked over a full-width input, the shape a dialog reads →
 *   src/ui/components/field.tsx. The one field that goes through here → src/ui/LoadField.tsx.
 */
import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";
import { Field, FieldLabel } from "@/ui/components/field";
import { Input } from "@/ui/components/input";

type InlineFieldProps = ComponentProps<typeof Input> & {
  id: string;
  label: string;
};

/**
 * `h-7` is what `Button` and `Toggle` say `size="sm"` is (src/ui/components/*.tsx) — the one
 * height a row of them has, so a field beside them draws no second edge below theirs.
 */
export function InlineField({ id, label, className, ...input }: InlineFieldProps) {
  return (
    <Field orientation="horizontal" className="w-auto self-start">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input id={id} className={cn("h-7 w-20", className)} {...input} />
    </Field>
  );
}
