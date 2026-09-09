/**
 * @role The rack that is no yard's, under all of them: the same rack card a yard carries, at the
 *   one address that names no yard (0320). It holds the fold and reads the two facts that rack
 *   needs — what the session's master holds, and whether anything is sounding for a lane to ride.
 * @instead The cards, the picker and the drag inside it → src/ui/EffectRack.tsx, which this
 *   renders and does not repeat. What an effect command does at this address → src/app/effects.ts.
 */
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

import type { Instrument } from "@/app/facade";
import { MASTER_LABEL } from "@/lib/copy";
import { EffectRack } from "@/ui/EffectRack";

/**
 * Under the yards and above nothing, folded shut like every other card fold but the front (0217).
 * Its heading says whose rack it is, because the section inside carries only the word Effects and
 * a rack with no yard's name on it would be one more Effects heading among however many yards.
 */
export function MasterRack({ instrument }: { instrument: Instrument }) {
  const readEffects = useCallback(() => instrument.state.getState().master.effects, [instrument]);
  const effects = useSyncExternalStore(instrument.state.subscribe, readEffects, readEffects);
  // Whether a lane on this rack is being heard: the master is running over everything, so what
  // stands in for a yard's own `playing` is any yard playing at all (0321).
  const readPlaying = useCallback(
    () => Object.values(instrument.state.getState().decks).some((deck) => deck.playing),
    [instrument],
  );
  const playing = useSyncExternalStore(instrument.state.subscribe, readPlaying, readPlaying);
  const [folded, setFolded] = useState(true);
  const fold = useMemo((): [boolean, (next: boolean) => void] => [folded, setFolded], [folded]);
  const state = useMemo(() => ({ effects, playing }), [effects, playing]);

  return (
    <section className="flex flex-col gap-2" aria-label={MASTER_LABEL}>
      <div className="type-eyebrow text-muted-foreground">{MASTER_LABEL}</div>
      <EffectRack instrument={instrument} deck={null} state={state} fold={fold} />
    </section>
  );
}
