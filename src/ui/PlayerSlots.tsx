/**
 * @role Which of the loop's sixteen divisions a yard's pattern may land on: the strip of presses
 *   that turns one off, and the one-shot action that reads the source's transients once and turns
 *   on the divisions they fall in. One `deck.player` per gesture, carrying the whole spec, so a
 *   mask is undone, logged, archived and replayed like any other durable edit (0089, 0165).
 * @instead What a mask is, and the snap that puts a jump onto a permitted slot →
 *   src/lib/playerSlots.ts. Where that snap is spent → src/lib/playerWalk.ts. The transients
 *   themselves → src/lib/analysis.ts, read here at the gesture and never at walk time. The rest of
 *   the module's dials, and the one `deck.player` send they all go through → src/ui/PlayerCard.tsx.
 */
// Over the dependency cap, and every one of them is either a word this strip says or a control it
// says it with — the same arithmetic src/ui/PlayerCard.tsx carries.
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import { useCallback } from "react";

import {
  PLAYER_SLOTS_ALL_LABEL,
  PLAYER_SLOTS_FROM_SOURCE_LABEL,
  PLAYER_SLOTS_FROM_SOURCE_TOOLTIP,
  PLAYER_SLOTS_LABEL,
  PLAYER_SLOTS_TOOLTIP,
  yardLabel,
} from "@/lib/copy";
import type { PlayerSpec } from "@/lib/player";
import {
  maskFromOnsets,
  PLAYER_GRID,
  PLAYER_MASK_MAX,
  PLAYER_SLOTS,
  slotAllowed,
  withSlot,
} from "@/lib/playerSlots";
import type { Loop } from "@/lib/timeline";
import type { DeckId } from "@/state/store";
import { Button } from "@/ui/components/button";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/ui/components/popover";
import { Toggle } from "@/ui/components/toggle";
import { Says } from "@/ui/Says";
import { INSTANT_POPUP } from "@/ui/shell";
// oxlint-enable import/max-dependencies

/**
 * One division of the loop as a press. Its own component so the handler is the component's rather
 * than a closure the row rebuilds every render, which is what `react-perf` asks of a control drawn
 * in a loop (src/ui/PlayerDial.tsx takes the same shape).
 */
function SlotToggle({
  deck,
  slot,
  allowed,
  press,
}: {
  deck: DeckId;
  slot: number;
  allowed: boolean;
  press: (slot: number, allowed: boolean) => void;
}) {
  const onPressedChange = useCallback(
    (next: boolean) => {
      press(slot, next);
    },
    [press, slot],
  );
  return (
    <Toggle
      size="sm"
      className="size-5 p-0"
      pressed={allowed}
      // Counted from one, the way a person counts divisions of a bar out loud.
      aria-label={`${yardLabel(deck)} ${PLAYER_SLOTS_LABEL} ${slot + 1}`}
      onPressedChange={onPressedChange}
    />
  );
}

// One handler per gesture the strip offers, and the length is how many gestures there are rather
// than how much this component decides. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function PlayerSlots({
  deck,
  player,
  patch,
  loop,
  onsets,
}: {
  deck: DeckId;
  /** The spec the strip reads, which is the card's own (0089). */
  player: PlayerSpec;
  /** The card's own patch: one `deck.player` per gesture, carrying the whole spec (0089). */
  patch: (fields: Partial<PlayerSpec>) => void;
  /**
   * The loop the grid divides, and the transients measured off the source — both transient state
   * the yard already holds, handed down rather than read again. Either may be missing: a deck with
   * no loop has no grid, and analysis arrives when the worker answers (0025).
   */
  loop: Loop | null;
  onsets: readonly number[] | null;
}) {
  const press = useCallback(
    (slot: number, allowed: boolean) => {
      const next = withSlot(player.slots, slot, allowed);
      // The last one on stays on: an empty mask is a pattern with no next slot to draw, and
      // `assertPlayer` refuses one — so the strip cannot send what the validator would throw on,
      // and the press that would empty it does nothing rather than failing loudly at the wire
      // (0165, principle 5).
      if (next === 0) return;
      patch({ slots: next });
    },
    [patch, player.slots],
  );
  const drawn = loop === null || onsets === null ? 0 : maskFromOnsets(onsets, loop);
  /**
   * The whole of what "a mask is ordinary durable numbers" means: the onsets are read here — on the
   * screen, at a gesture — and what travels is the number they made. Nothing on a walk-time or a
   * render path reads analysis, because `decodeAudioData` may resample and a mask that were a live
   * read of it would mean one thing here and another on the machine that replays the session
   * (plan §2, 0165).
   *
   * Read as the strip is drawn rather than inside the handler, so the action can say whether it
   * has anything to write: a loop no transient falls in makes no mask, and a button that looked
   * pressable and then did nothing would be exactly the silent fallback principle 5 refuses.
   */
  const fromSource = useCallback(() => {
    if (drawn === 0) return;
    patch({ slots: drawn });
  }, [patch, drawn]);
  const all = useCallback(() => {
    patch({ slots: PLAYER_MASK_MAX });
  }, [patch]);

  const open = PLAYER_GRID.filter((slot) => slotAllowed(player.slots, slot)).length;
  return (
    <Popover>
      <Says what={PLAYER_SLOTS_TOOLTIP}>
        <PopoverTrigger
          render={
            <Button
              size="sm"
              variant="ghost"
              className="type-eyebrow text-muted-foreground"
              aria-label={`${yardLabel(deck)} ${PLAYER_SLOTS_LABEL}`}
            >
              {PLAYER_SLOTS_LABEL}
              {/* How much of the grid is open, on the trigger: a mask is the one field of this
                  spec a hand can narrow without any dial moving, so what it is set to has to be
                  legible without opening anything (P98). */}
              <span className="type-readout">{`${open}/${PLAYER_SLOTS}`}</span>
            </Button>
          }
        />
      </Says>
      {/* Opens instantly, for the reason every other popup on this card does: ./scripts/drive
          clicks into it, and waiting out an enter and an exit costs the gate a scenario's worth of
          time for nothing a person would notice (0056). */}
      <PopoverContent side="top" align="start" className={`w-auto ${INSTANT_POPUP}`}>
        <PopoverTitle>{PLAYER_SLOTS_LABEL}</PopoverTitle>
        {/* Sixteen in a row, in the order the loop is read: the strip is the loop, so a division
            turned off is read where it is in time rather than looked up in a list. Each is a
            state and not an action — it is on or it is off — which is what a toggle is (0055). */}
        <div className="flex items-center gap-0.5">
          {PLAYER_GRID.map((slot) => (
            <SlotToggle
              key={slot}
              deck={deck}
              slot={slot}
              allowed={slotAllowed(player.slots, slot)}
              press={press}
            />
          ))}
        </div>
        <div className="flex items-center gap-1">
          {/* The one-shot action, pressable exactly while it has a mask to write: a deck with no
              loop has no grid, a source the worker has not answered for has no transients, and a
              loop none of them fall in makes no mask at all (0025, principle 5). */}
          <Says what={PLAYER_SLOTS_FROM_SOURCE_TOOLTIP}>
            <Button size="sm" variant="outline" disabled={drawn === 0} onClick={fromSource}>
              {PLAYER_SLOTS_FROM_SOURCE_LABEL}
            </Button>
          </Says>
          {/* And the way back to the whole loop, which is where a switch press leaves the strip. */}
          <Button size="sm" variant="ghost" onClick={all}>
            {PLAYER_SLOTS_ALL_LABEL}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
