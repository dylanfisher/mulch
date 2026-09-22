/**
 * @role The header's look switch: pressed, each yard draws the scene its name reads; released,
 *   every yard draws the one field. A state and not an action, so it is a Toggle reporting
 *   `aria-pressed`, the way the drift's own switch is (0055, 0400). Gone while the picture is off,
 *   since there is no look to choose for a picture nobody draws.
 * @instead The preference it flips → src/ui/driftLook.ts. Whether the picture is drawn at all →
 *   src/ui/DriftToggle.tsx. The picture it changes → src/ui/MoireStrip.tsx.
 */
import { useCallback } from "react";

import { MOIRE_LOOK_LABEL } from "@/lib/copyDrift";
import { setDriftLook, useDriftLook } from "@/ui/driftLook";
import { useDriftShown } from "@/ui/driftShown";
import { PreferenceToggle } from "@/ui/PreferenceToggle";

export function DriftLookToggle({ className }: { className?: string }) {
  const shown = useDriftShown();
  const look = useDriftLook();
  const onPressedChange = useCallback((scenes: boolean) => {
    setDriftLook(scenes ? "scenes" : "uniform");
  }, []);
  if (!shown) return null;
  return (
    <PreferenceToggle
      action="scenes"
      pressed={look === "scenes"}
      onPressedChange={onPressedChange}
      aria-label={MOIRE_LOOK_LABEL}
      className={className}
    />
  );
}
