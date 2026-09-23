/**
 * @role The rack that is no yard's, under all of them: the same rack card a yard carries, at the
 *   one address that names no yard (0320). It holds the fold and reads the two facts that rack
 *   needs — what the session's master holds, and whether anything is sounding for a lane to ride.
 * @instead The cards, the picker and the drag inside it → src/ui/EffectRack.tsx, which this
 *   renders and does not repeat. What an effect command does at this address → src/app/effects.ts.
 */
import { memo, useCallback, useDeferredValue, useMemo, useSyncExternalStore } from "react";

import type { Instrument } from "@/app/facade";
import { MASTER_LABEL } from "@/lib/copy";
import { EffectRack } from "@/ui/EffectRack";
import { useAnyDeckPlaying } from "@/ui/MasterMeter";
import { useRackFold } from "@/ui/rackFold";
import { useRackBeat } from "@/ui/ParameterBeat";

/**
 * The rack one transition behind the store, as a yard's is (0307): a master dial sends on every
 * pointer move, and without it each move re-rendered every card in this rack inside the move.
 */
const RackFollowing = memo(EffectRack);

/**
 * Under the yards and above nothing, folded the way it was last left — and, until a hand says,
 * shut over an empty rack and open over a full one (0392).
 * Its heading says whose rack it is, because the section inside carries only the word Effects and
 * a rack with no yard's name on it would be one more Effects heading among however many yards.
 */
export function MasterRack({ instrument }: { instrument: Instrument }) {
  const readEffects = useCallback(() => instrument.state.getState().master.effects, [instrument]);
  const effects = useSyncExternalStore(instrument.state.subscribe, readEffects, readEffects);
  // Whether a lane on this rack is being heard: the master is running over everything, so what
  // stands in for a yard's own `playing` is any yard playing at all (0321).
  const playing = useAnyDeckPlaying(instrument);
  // Shut over an empty rack, the way every other card fold but the front begins (0217) — and
  // open over one that is holding something, because a rack with effects in it is the thing the
  // fold was hiding. Either is only what a hand has not yet said: a fold left here is read back
  // on the next mount (src/ui/rackFold.ts, 0392).
  const fold = useRackFold(null, effects.length === 0);
  const shown = useDeferredValue(effects);
  const state = useMemo(() => ({ effects: shown, playing }), [shown, playing]);
  // Nought, because this rack is under every yard and belongs to none: there is no one analysis
  // and no one rate to read a sounding tempo off, so a tapped parameter here is tapped and never
  // held — the hold is greyed rather than absent, the way it is on a deck with no grid (0320,
  // 0326). The holds themselves are still kept here, so a shape this rack could grow a grid for
  // would need nothing else moved.
  const beat = useRackBeat(0);

  return (
    <section className="flex flex-col gap-2" aria-label={MASTER_LABEL}>
      <div className="type-eyebrow text-muted-foreground">{MASTER_LABEL}</div>
      <RackFollowing instrument={instrument} deck={null} state={state} fold={fold} beat={beat} />
    </section>
  );
}
