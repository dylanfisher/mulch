/**
 * @role Whether one yard is heard, as the control that says so: one `deck.mute` per press,
 *   carrying the state to be in rather than a toggle (0386).
 * @instead What the mute does to the graph → src/audio/chain.ts, where it is the last scale in
 *   the chain and above the meter's tap. Stopping the yard instead → src/ui/DeckTransport.tsx,
 *   which is a different thing entirely: a mute leaves the transport running.
 */
import { useCallback } from "react";

import type { Instrument } from "@/app/facade";
import { ACTION_TOOLTIPS, yardLabel } from "@/lib/copy";
import type { DeckId } from "@/state/store";
import { Toggle } from "@/ui/components/toggle";
import { ACTION_ICONS } from "@/ui/icons";
import { Says } from "@/ui/Says";

/**
 * A Toggle rather than a Button, because muted is a state the yard is left in and `aria-pressed`
 * is what says so (0055). The press sends the state it is moving to, so the line a press writes
 * and the line a restore replays are the same line.
 */
export function DeckMute({
  instrument,
  deck,
  muted,
}: {
  instrument: Instrument;
  deck: DeckId;
  muted: boolean;
}) {
  const onPressedChange = useCallback(
    (next: boolean) => {
      instrument.send({ t: "deck.mute", deck, muted: next });
    },
    [instrument, deck],
  );

  return (
    <Says what={ACTION_TOOLTIPS.mute}>
      <Toggle
        size="sm"
        aria-label={`Mute ${yardLabel(deck)}`}
        pressed={muted}
        onPressedChange={onPressedChange}
      >
        <ACTION_ICONS.mute />
      </Toggle>
    </Says>
  );
}
