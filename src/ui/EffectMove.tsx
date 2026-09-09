/**
 * @role The one control that carries a rack instance to another rack: a menu of every rack this
 *   session has but the one the card is on — the yards by the emoji and name they were added with
 *   (0057), and the rack that is no yard's under them. One press, one `effect.move` (0320).
 * @instead What the move does to the session and the graph → src/app/effects.ts, which expands it
 *   into the removal and the arrival it is. The card this stands on → src/ui/EffectRack.tsx.
 */
// One import per thing this menu is built out of — the words it says, the command it sends, the
// primitives it says them with — and the count is how many racks a session can name rather than
// how much this file decides. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import { useCallback, useMemo, useSyncExternalStore } from "react";

import type { Instrument } from "@/app/facade";
import type { EffectInstanceId } from "@/audio/effects/contract";
import { ACTION_TOOLTIPS, MASTER_LABEL, MOVE_TO_LABEL, rackLabel } from "@/lib/copy";
import { moveEffectCommand } from "@/ui/actions";
import type { DeckEntry, RackId } from "@/state/store";
import { Button } from "@/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/ui/components/dropdown-menu";
import { ACTION_ICONS } from "@/ui/icons";
import { Says } from "@/ui/Says";
import { INSTANT_POPUP } from "@/ui/shell";
// oxlint-enable import/max-dependencies

/**
 * The menu, shown only where there is somewhere to go: a card on a yard always has the master to
 * offer, and a card on the master in a session holding no yards — a shape 0029 allows — has
 * nowhere at all, so the control is not drawn.
 */
// One trigger and one item per rack this session holds: the length tracks how many racks there
// are, and a component per item would put each item's own press one call away from the menu that
// lists it. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function EffectMove({
  instrument,
  deck,
  instance,
  label,
}: {
  instrument: Instrument;
  /** The rack this card is on, which is the one address the menu never lists. */
  deck: RackId;
  instance: EffectInstanceId;
  /** What the card is called, so the trigger and each item name the thing being carried. */
  label: string;
}) {
  const read = useCallback(() => instrument.state.getState().deckList, [instrument]);
  const deckList = useSyncExternalStore<readonly DeckEntry[]>(
    instrument.state.subscribe,
    read,
    read,
  );
  const yards = useMemo(() => deckList.filter((entry) => entry.id !== deck), [deckList, deck]);
  // One press, one command: where a moved instance lands and everything it carries are the
  // reducer's, so this control never sends the removal and the arrival itself (0092, 0320).
  const go = useCallback(
    (to: RackId) => () => {
      instrument.send(moveEffectCommand(deck, to, instance));
    },
    [instrument, deck, instance],
  );
  if (yards.length === 0 && deck === null) return null;

  return (
    <DropdownMenu>
      <Says what={ACTION_TOOLTIPS.move}>
        <DropdownMenuTrigger
          render={
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={`${MOVE_TO_LABEL} ${label} from ${rackLabel(deck)}`}
            >
              <ACTION_ICONS.move />
            </Button>
          }
        />
      </Says>
      {/* Opens instantly, for the reason every popup ./scripts/drive clicks does (0056). */}
      <DropdownMenuContent align="end" className={`w-52 ${INSTANT_POPUP}`}>
        <DropdownMenuLabel>{MOVE_TO_LABEL}</DropdownMenuLabel>
        {/* The yards as they were drawn — the emoji and the name the session stored with each
            (0057) — and never the opaque letter, which says nothing a reader could pick from. */}
        {yards.map((entry) => (
          <DropdownMenuItem
            key={entry.id}
            aria-label={`${MOVE_TO_LABEL} ${entry.name}`}
            onClick={go(entry.id)}
          >
            {`${entry.emoji} ${entry.name}`}
          </DropdownMenuItem>
        ))}
        {/* And the rack that is no yard's under them, which is where it sits on the screen too. */}
        {deck === null ? null : (
          <DropdownMenuItem aria-label={`${MOVE_TO_LABEL} ${MASTER_LABEL}`} onClick={go(null)}>
            {MASTER_LABEL}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
