/**
 * @role The header's transport: play, pause and stop over every yard the session holds, beside
 *   the File and View menus on the bar both screens read (0074). One press is the per-deck
 *   commands a person pressing every yard in turn would have sent, so this is a second way to
 *   send and never a second kind of state (P66).
 * @instead One yard's own transport → src/ui/DeckTransport.tsx. What each of those commands does
 *   → src/audio/deck.ts. What a press expands into → src/ui/actions.ts, which the Space key
 *   reads too, so the key and these buttons can never disagree.
 */

import { useCallback } from "react";

import type { Instrument } from "@/app/facade";
import {
  TRANSPORT_ACTIONS,
  TRANSPORT_ALL_LABELS,
  TRANSPORT_ALL_TOOLTIPS,
  type TransportAction,
} from "@/lib/copy";
import { transportAllCommands } from "@/ui/actions";
import { Button } from "@/ui/components/button";
import { ACTION_ICONS } from "@/ui/icons";
import { Says } from "@/ui/Says";

/**
 * One button per gesture, each a Button rather than a Toggle: none of the three holds a state.
 * There is no one playing flag over a session of yards that may each be doing something else —
 * play means start them all, and pause means hold them all, which is a thing that happens once
 * per press (P25). Play starts a yard that is already playing too, which lines every yard up at
 * the top of its loop; the toggle that would pause one instead is the Space key (0095). Sized
 * like the history controls across the bar, because they are the same kind of thing on it.
 */
function TransportButton({
  instrument,
  action,
}: {
  instrument: Instrument;
  action: TransportAction;
}) {
  const press = useCallback(() => {
    for (const command of transportAllCommands(instrument.state.getState(), action)) {
      instrument.send(command);
    }
  }, [instrument, action]);
  const Icon = ACTION_ICONS[action];

  return (
    <Says what={TRANSPORT_ALL_TOOLTIPS[action]}>
      <Button size="xs" variant="outline" onClick={press} aria-label={TRANSPORT_ALL_LABELS[action]}>
        <Icon />
      </Button>
    </Says>
  );
}

export function GlobalTransport({ instrument }: { instrument: Instrument }) {
  return (
    <div className="flex items-center gap-1">
      {TRANSPORT_ACTIONS.map((action) => (
        <TransportButton key={action} instrument={instrument} action={action} />
      ))}
    </div>
  );
}
