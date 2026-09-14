/**
 * @role The words a yard's sequence is said in: what the view is called, what the run of steps
 *   is called, what each kind of step is called and does, and how a step's length reads on its
 *   dial. Beside src/lib/copy.ts rather than in it because that file is at the hard cap (0045,
 *   the reason src/lib/copySongs.ts is where it is).
 * @instead What a sequence *is*, and the bound each length sits under → src/lib/deckSequence.ts.
 *   The row itself → src/ui/DeckSequencerRow.tsx. The one sentence the header's switch says, keyed
 *   with the icon vocabulary → `ACTION_TOOLTIPS.sequencer` in src/lib/copy.ts.
 */
import type { SequenceStepKind } from "./deckSequence.ts";

/** What the view is called, on the header's switch. Titlecase per (0059). */
export const SEQUENCER_LABEL = "Sequencer";

/** What one yard's run of steps is called, where the row needs a word. */
export const SEQUENCE_LABEL = "Sequence";

/** What each kind of step is called, in the order the picker lays them out. */
export const SEQUENCE_STEP_LABELS: Record<SequenceStepKind, string> = {
  in: "Fade In",
  play: "Play",
  out: "Fade Out",
  rest: "Rest",
};

/** What each kind does, for the picker's sentence. */
export const SEQUENCE_STEP_TOOLTIPS: Record<SequenceStepKind, string> = {
  in: "Bring the yard up from silence to its own level over this long.",
  play: "Hold the yard at its own level for this long.",
  out: "Take the yard down to silence over this long.",
  rest: "Hold the yard silent for this long. It goes on playing underneath, so it comes back wherever its loop has got to.",
};

/** The length dial beside each step, and the sentence on it. */
export const SEQUENCE_SECS_LABEL = "Length";
export const SEQUENCE_SECS_TOOLTIP =
  "How long this step takes, from a second to an hour. The whole run counts from the yard's own play: pause holds it, stop rewinds it, and past its last step it goes round again from the top.";

/** The press that puts a step on the end of the run, and the one that takes a step out. */
export const SEQUENCE_ADD_LABEL = "Add Step";
export const SEQUENCE_ADD_TOOLTIP = "Put another step on the end of the run.";

/** What the row says while the run holds nothing. */
export const SEQUENCE_EMPTY = "No steps — the yard plays at its own level.";

/**
 * A step's length as minutes and seconds — `2:30` — which is how a hand thinks of a run that is
 * minutes long, where the dial's ordinary `150.00s` is a number to be worked out.
 */
export const sequenceSecsLabel = (secs: number): string => {
  const whole = Math.round(secs);
  const minutes = Math.floor(whole / 60);
  const seconds = whole % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};
