/**
 * @role The header's drift switch: pressed, no yard draws its picture at all. A state and not an
 *   action, so it is a Toggle reporting `aria-pressed`, the way the mute is (0055, 0397).
 * @instead The preference it flips, and where it is stored → src/ui/driftShown.ts. The picture it
 *   withholds → src/ui/MoireStrip.tsx.
 */
import { useCallback } from "react";

import { MOIRE_SWITCH_LABEL } from "@/lib/copyDrift";
import { setDriftShown, useDriftShown } from "@/ui/driftShown";
import { PreferenceToggle } from "@/ui/PreferenceToggle";

export function DriftToggle({ className }: { className?: string }) {
  const shown = useDriftShown();
  const onPressedChange = useCallback((off: boolean) => {
    setDriftShown(!off);
  }, []);
  return (
    <PreferenceToggle
      action="drift"
      // Pressed is the picture gone: the switch reports the choice a hand made, not the state
      // the instrument rests in, which is what the yard's own mute does with the same control
      // (src/ui/DeckMute.tsx).
      pressed={!shown}
      onPressedChange={onPressedChange}
      aria-label={MOIRE_SWITCH_LABEL}
      className={className}
    />
  );
}
