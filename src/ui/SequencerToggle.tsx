/**
 * @role The header's sequencer switch: on, every yard is drawn folded with its sequence where its
 *   source and readout were. A state and not an action, so it is a Toggle reporting `aria-pressed`
 *   (0055, 0379).
 * @instead The preference it flips, and where it is stored → src/ui/sequencerMode.ts.
 */
import { SEQUENCER_LABEL } from "@/lib/copySequence";
import { PreferenceToggle } from "@/ui/PreferenceToggle";
import { setSequencerMode, useSequencerMode } from "@/ui/sequencerMode";

export function SequencerToggle({ className }: { className?: string }) {
  const on = useSequencerMode();
  return (
    <PreferenceToggle
      action="sequencer"
      pressed={on}
      onPressedChange={setSequencerMode}
      aria-label={SEQUENCER_LABEL}
      className={className}
    />
  );
}
