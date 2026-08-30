/**
 * @role The header's shared jump clock: the switch that holds one, and how often it ticks. One
 *   `session.sync` command per gesture, carrying the whole clock, because the clock is the
 *   session's and not any yard's (0097).
 * @instead One yard's own pattern → src/ui/PlayerCard.tsx. When a step actually begins →
 *   src/audio/player.ts. Nothing here knows which yards are jumping; a clock ticks either way.
 */
import { useCallback, useSyncExternalStore } from "react";

import type { Instrument } from "@/app/facade";
import { SYNC_LABEL, SYNC_PERIOD_LABEL, SYNC_PERIOD_TOOLTIP, SYNC_TOOLTIP } from "@/lib/copy";
import { SYNC_MAX_SECS, SYNC_MIN_SECS } from "@/lib/playerClock";
import { Toggle } from "@/ui/components/toggle";
import { Knob, secondsLabel, secondsValue } from "@/ui/Knob";
import { Says } from "@/ui/Says";

/**
 * What pressing the switch holds: a clock near the bar most loops are cut to, so two yards
 * landing together is heard on the first press rather than dialled for. A performer turns it on
 * to hear the yards land together; how often is the next gesture.
 */
export const SYNC_DEFAULT_SECS = 1;

/**
 * Controlled by the session throughout: the switch and the dial both read `sync` and every
 * gesture sends the whole clock back, so neither can hold an opinion the instrument does not
 * share — the same shape one yard's player strip has.
 */
export function SyncClock({ instrument }: { instrument: Instrument }) {
  const read = useCallback(() => instrument.state.getState().sync, [instrument]);
  const sync = useSyncExternalStore(instrument.state.subscribe, read, read);
  const send = useCallback(
    (next: number | null) => {
      instrument.send({ t: "session.sync", sync: next });
    },
    [instrument],
  );
  const onSwitch = useCallback(
    (pressed: boolean) => {
      send(pressed ? SYNC_DEFAULT_SECS : null);
    },
    [send],
  );

  return (
    <div className="flex items-center gap-2">
      <Says what={SYNC_TOOLTIP}>
        <Toggle size="sm" variant="outline" pressed={sync !== null} onPressedChange={onSwitch}>
          {SYNC_LABEL}
        </Toggle>
      </Says>
      {sync === null ? null : (
        <Knob
          label={SYNC_PERIOD_LABEL}
          size="xs"
          value={sync}
          min={SYNC_MIN_SECS}
          max={SYNC_MAX_SECS}
          defaultValue={SYNC_DEFAULT_SECS}
          curve="log"
          format={secondsLabel}
          parse={secondsValue}
          says={SYNC_PERIOD_TOOLTIP}
          onChange={send}
        />
      )}
    </div>
  );
}
