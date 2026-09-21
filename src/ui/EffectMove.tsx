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
import { ACTION_TOOLTIPS, MASTER_LABEL, MOVE_TO_LABEL, rackLabel, taggedLabel } from "@/lib/copy";
import { moveEffectCommand } from "@/ui/actions";
import { deckIn, type DeckEntry, type RackId } from "@/state/store";
import { Button } from "@/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/ui/components/dropdown-menu";
import { ACTION_ICONS } from "@/ui/icons";
import { Says } from "@/ui/Says";
import { INSTANT_POPUP } from "@/ui/shell";
// oxlint-enable import/max-dependencies

/**
 * The one character a tag cannot hold — an `<input>` will not carry a NUL — so the yards' words
 * join into one string and come back apart by their places in the list.
 */
const TAG_GAP = "\u0000";

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
  // And the words a hand wrote on those yards, which live on the yards and not on the records
  // they were drawn with (0057, 0386). Read as one string rather than as the `decks` record: that
  // record is replaced on every write to any yard, including a `param.set` per pointer move, so
  // subscribing to it would re-render every card's menu for the whole of a knob drag. A string is
  // its own identity, so this one wakes only when a tag changes.
  const readTags = useCallback(() => {
    const state = instrument.state.getState();
    return state.deckList.map((entry) => deckIn(state.decks, entry.id).tag).join(TAG_GAP);
  }, [instrument]);
  const tags = useSyncExternalStore<string>(instrument.state.subscribe, readTags, readTags);
  const yards = useMemo(() => {
    const written = tags.split(TAG_GAP);
    return deckList
      .map((entry, at) => ({
        id: entry.id,
        label: taggedLabel(entry.name, written[at] ?? ""),
        emoji: entry.emoji,
      }))
      .filter((entry) => entry.id !== deck);
  }, [deckList, tags, deck]);
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
        {/* The heading and the racks it heads are one group, and the heading is written inside
            it: a menu label with no group around it throws on the first open, which is a menu
            that never opens at all — the crash this control was reported for (0381). The same
            rule src/ui/SourcePicker.tsx's generator heading already follows. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>{MOVE_TO_LABEL}</DropdownMenuLabel>
          {/* The yards as they were drawn — the emoji and the name the session stored with each
              (0057) — and never the opaque letter, which says nothing a reader could pick from.
              Wearing the word a hand wrote on the yard where there is one, which is the whole
              point of writing it: a rack of six is picked from by what each is for (0386). */}
          {yards.map((entry) => (
            <DropdownMenuItem
              key={entry.id}
              aria-label={`${MOVE_TO_LABEL} ${entry.label}`}
              onClick={go(entry.id)}
            >
              {`${entry.emoji} ${entry.label}`}
            </DropdownMenuItem>
          ))}
          {/* And the rack that is no yard's under them, which is where it sits on the screen
              too. */}
          {deck === null ? null : (
            <DropdownMenuItem aria-label={`${MOVE_TO_LABEL} ${MASTER_LABEL}`} onClick={go(null)}>
              {MASTER_LABEL}
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
