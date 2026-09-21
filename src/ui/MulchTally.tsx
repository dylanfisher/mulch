/**
 * @role The header's readout of what the session is doing to the sound: how many yards stand, how
 *   many effects sit on all their racks and the master's, how many parameters are moving on their
 *   own, how deep the longest chain runs — and the one word grading that depth. One read of the
 *   store per change, beside the meter; a later statistic joins these rather than standing beside
 *   them.
 * @instead The bus's level, which is per-frame → src/ui/MasterMeter.tsx. What each number counts
 *   → src/state/mulchTally.ts. The words → src/lib/copyMulch.ts.
 */
import { useCallback, useMemo, useSyncExternalStore } from "react";

import type { Instrument } from "@/app/facade";
import { MULCH_TALLY_LABELS, MULCH_TALLY_TOOLTIP } from "@/lib/copyMulch";
import { mulchGrade, mulchKey, mulchOfKey, tallyMulch } from "@/state/mulchTally";
import { Says } from "@/ui/Says";

/** One caption and the number under it, in the readout's one shape. */
function Count({ name, label, count }: { name: string; label: string; count: number }) {
  return (
    <span data-slot="mulch-count" data-count={name} className="flex items-baseline gap-1">
      <span className="type-eyebrow text-muted-foreground">{label}</span>
      <span className="type-readout">{count}</span>
    </span>
  );
}

/**
 * Subscribed to the counts as one string rather than to the store's objects — see `mulchKey`
 * (src/state/mulchTally.ts) for why the snapshot cannot be the tally itself. The tally is read
 * back out of that string, so the numbers on screen and the string that woke this are one fact.
 */
export function MulchTally({ instrument }: { instrument: Instrument }) {
  const read = useCallback(() => mulchKey(tallyMulch(instrument.state.getState())), [instrument]);
  const key = useSyncExternalStore<string>(instrument.state.subscribe, read, read);
  const tally = useMemo(() => mulchOfKey(key), [key]);

  return (
    <Says what={MULCH_TALLY_TOOLTIP}>
      {/* Plain text under a `Says`, the way a readout is written here (src/ui/MoireTuning.tsx):
          these are numbers to read and not a control to press. No `aria-label` either — each
          number is captioned in the markup, and a name on an element with no role is a name
          nothing reads back. */}
      <div data-slot="mulch-tally" className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Count name="yards" label={MULCH_TALLY_LABELS.yards} count={tally.yards} />
        <Count name="effects" label={MULCH_TALLY_LABELS.effects} count={tally.effects} />
        <Count name="moving" label={MULCH_TALLY_LABELS.moving} count={tally.moving} />
        <Count name="deepest" label={MULCH_TALLY_LABELS.deepest} count={tally.deepest} />
        <span data-slot="mulch-grade" className="type-eyebrow text-primary">
          {mulchGrade(tally)}
        </span>
      </div>
    </Says>
  );
}
