/**
 * @role The word a hand writes on a yard, as the field that holds it: one `deck.tag` per commit,
 *   and the empty string for a yard nobody has named (0386).
 * @instead The name and the emoji a yard was drawn with, which never change → src/ui/actions.ts
 *   and the session's own deck list (0057). The numeric field beside it → src/ui/LoadField.tsx,
 *   whose shape this follows.
 */
import { useCallback } from "react";

import type { Instrument } from "@/app/facade";
import { yardLabel } from "@/lib/copy";
import { TAG_HINT, TAG_LABEL } from "@/lib/copyTag";
import { DURABLE_TEXT_MAX } from "@/lib/guards";
import type { DeckId } from "@/state/store";
import { InlineField, useFieldCommit } from "@/ui/InlineField";

/**
 * Uncontrolled and committed on blur or Enter, the way the frequency beside it is: a controlled
 * field would send a durable edit per keystroke, which is a history entry per letter. `key` is the
 * committed word, so a tag set from anywhere else — an undo, a restored session, a JSONL line —
 * remounts the field in step with the yard.
 */
export function DeckTag({
  instrument,
  deck,
  tag,
}: {
  instrument: Instrument;
  deck: DeckId;
  tag: string;
}) {
  const commit = useCallback(
    (input: HTMLInputElement) => {
      // Nothing is sent for a word that is already the yard's: an unchanged field a hand tabbed
      // through is not an edit, and it would be an undo step that changes nothing.
      if (input.value === tag) return;
      instrument.send({ t: "deck.tag", deck, tag: input.value });
    },
    [instrument, deck, tag],
  );

  const { onBlur, onKeyDown } = useFieldCommit(commit);

  return (
    <InlineField
      key={tag}
      id={`${deck}-tag`}
      label={TAG_LABEL}
      hint={TAG_HINT}
      aria-label={`${TAG_LABEL} ${yardLabel(deck)}`}
      className="type-readout"
      // The bound the stored shape is validated at, said at the field too, so a word that would
      // be refused cannot be typed rather than being refused after it is (src/lib/guards.ts).
      maxLength={DURABLE_TEXT_MAX}
      defaultValue={tag}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
    />
  );
}
