/**
 * @role The loop as a count of beats: the field beside the strip that reads the loop's length
 *   back in beats and sets its end from its start and a count typed into it — one `deck.loop` on
 *   commit, the same command the handles and the loop button send (0389). Drawn only where the
 *   analysis found a tempo, because a source with no beat has no count to type.
 * @instead The pointer gestures that move the same loop → src/ui/LoopHandles.tsx. The arithmetic
 *   a count is turned into a loop by → src/lib/analysis.ts. The field's shape →
 *   src/ui/InlineField.tsx.
 */
import { useCallback } from "react";

import type { Instrument } from "@/app/facade";
import { beatsLoop, loopBeats } from "@/lib/analysis";
import { yardLabel } from "@/lib/copy";
import { LOOP_BEATS_LABEL } from "@/lib/copyLoop";
import type { Loop } from "@/lib/timeline";
import type { DeckId, DeckState } from "@/state/store";
import { InlineField, useFieldCommit } from "@/ui/InlineField";

/**
 * The loop's own length as the count a hand could have typed — and the empty field for a yard
 * with no loop, or one shorter than half a beat, where there is no whole count to show. A loop a
 * drag left at 4.03 beats reads as 4, because a count is what a hand types and 4.03 is not one.
 */
function shownBeats(loop: Loop | null, bpm: number): string {
  if (bpm <= 0 || loop === null) return "";
  const beats = Math.round(loopBeats(loop, bpm));
  return beats > 0 ? String(beats) : "";
}

/**
 * The loop a count typed into the field asks for, sent, or the field put back to the loop the
 * yard already has. A count of no whole beats, and one that would run past the end of the source,
 * are both refused: the yard keeps its loop and the field is put back rather than left reading a
 * loop nothing is playing (src/ui/LoadField.tsx, which refuses a load the same way). So is a field
 * that still reads what it was handed: a hand that clicked into it and away again, or that
 * tabbed through it, has typed no count, and a blur that moved the loop it was only looking at
 * would restart the yard and land an undo step nobody asked for. The price is that the rounded
 * read cannot be squared up by retyping the number already in the field — a loop of 4.03 beats
 * is made exactly four by typing any other count and four again (0389).
 *
 * A loop begins where it already begins, and at the top of the buffer for a yard that has none:
 * the count says the length, and moving the start is what the handles are for.
 */
function commitBeats(
  input: HTMLInputElement,
  { bpm, loop, duration }: Pick<DeckState, "loop" | "duration"> & { bpm: number },
  text: string,
  send: (loop: Loop) => void,
): void {
  if (input.value === text) return;
  const next = beatsLoop(loop?.in ?? 0, input.valueAsNumber, bpm, duration);
  if (next === null) {
    input.value = text;
    return;
  }
  send(next);
}

/**
 * Uncontrolled and committed on blur or Enter, the way the tag and the frequency beside it are: a
 * controlled field would send a durable edit — and restart playback, which `setLoop` does by
 * design — on every keystroke. `key` is the loop itself, so a loop set from anywhere else — a
 * drag on the handles, a JSONL line — remounts the field in step with the yard. A restore does
 * not come through that road at all: it clears the analysis (src/app/restore.ts), so an undo
 * withdraws the field until the yard has been measured again.
 *
 * Nothing durable holds the count. It is derived from the loop each render and derived back into
 * a loop on commit, so the loop stays what it has always been: two numbers in the buffer's own
 * seconds (docs/plan.md §2).
 */
export function LoopBeats({
  instrument,
  deck,
  state,
}: {
  instrument: Instrument;
  deck: DeckId;
  /** The deck's session state, from the subscription the waveform already holds (0025). */
  state: DeckState;
}) {
  const { analysis, loop, duration } = state;
  const bpm = analysis === null ? 0 : analysis.bpm;
  const text = shownBeats(loop, bpm);
  // What the field is remounted on: the loop itself and never the count it is shown as. Two
  // loops read as the same four beats are still two loops, and a half-typed count left standing
  // across a drag would otherwise commit against a start it was never typed at.
  const held = loop === null ? "none" : `${loop.in}:${loop.out}`;

  const commit = useCallback(
    (input: HTMLInputElement) => {
      // Never reached with no tempo: the field this is bound to is not drawn for one.
      commitBeats(input, { bpm, loop, duration }, text, (next) => {
        instrument.send({ t: "deck.loop", deck, in: next.in, out: next.out });
      });
    },
    [instrument, deck, bpm, loop, duration, text],
  );

  const { onBlur, onKeyDown } = useFieldCommit(commit);

  // Withdrawn rather than drawn dead, the way the loop toggle is from a tone (0110): a source
  // with no tempo has no count a hand could type that would mean anything.
  if (bpm <= 0) return null;

  return (
    <InlineField
      key={held}
      id={`${deck}-loop-beats`}
      label={LOOP_BEATS_LABEL}
      aria-label={`${yardLabel(deck)} Loop ${LOOP_BEATS_LABEL}`}
      type="number"
      className="type-readout"
      min={1}
      step={1}
      defaultValue={text}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
    />
  );
}
