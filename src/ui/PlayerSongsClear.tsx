/**
 * @role The one gesture on the songs heading that is about the run rather than about a song:
 *   every song off the pattern at once, asked first, and the press that sends it. The trigger
 *   carries no command; the confirmation, which says how many are going, carries it — the shape
 *   the rack's own clear-all takes, and the shape a playing deck's removal takes (0055,
 *   src/ui/DeckRemove.tsx). What it sends is one `deck.player` carrying no songs, which is the one
 *   road this card has (0089) and so one entry to undo; the gesture is ended before it because a
 *   `deck.player` is keyed by its deck alone (src/app/history.ts), and a song renamed or nudged
 *   inside `GESTURE_IDLE_MS` would otherwise swallow this press into that edit's entry — and
 *   ended again after it, so the next song added or dial turned inside that window does not join
 *   the entry from the other side (the ending src/ui/EffectRack.tsx takes after a draw). The pick
 *   goes with the songs: what it named is gone. And an empty run offers nothing at all — a word
 *   over an empty list is a control that does nothing, while the fold beside it stays, because a
 *   section says what it is whether or not it is full (P73).
 * @instead The heading it stands on, and every other gesture the grid offers →
 *   src/ui/PlayerGrid.tsx. The same question over the effects rack → src/ui/EffectRack.tsx. The
 *   words → src/lib/copy.ts and src/lib/copySongs.ts.
 */
import { useCallback } from "react";

import type { Instrument } from "@/app/facade";
import { CLEAR_ALL_LABEL, yardLabel } from "@/lib/copy";
import {
  PLAYER_SONGS_CLEAR_CONFIRM_LABEL,
  PLAYER_SONGS_CLEAR_TOOLTIP,
  PLAYER_SONGS_LABEL,
  playerSongsClearTitle,
} from "@/lib/copySongs";
import type { PlayerSpec } from "@/lib/player";
import type { DeckId } from "@/state/store";
import { Button } from "@/ui/components/button";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/ui/components/popover";
import type { GridPick } from "@/ui/PlayerGridCell";
import { Says } from "@/ui/Says";

export function PlayerSongsClear({
  instrument,
  deck,
  held,
  patch,
  onPick,
}: {
  instrument: Instrument;
  deck: DeckId;
  /** How many songs the press would take — the whole of what the question says, and at nought
   *  the whole of why there is nothing to press. */
  held: number;
  patch: (fields: Partial<PlayerSpec>) => void;
  onPick: (pick: GridPick | null) => void;
}) {
  const onClear = useCallback(() => {
    instrument.send({ t: "gesture.end" });
    patch({ songs: [] });
    instrument.send({ t: "gesture.end" });
    onPick(null);
  }, [instrument, patch, onPick]);

  if (held === 0) return null;
  const named = `${CLEAR_ALL_LABEL} ${PLAYER_SONGS_LABEL} on ${yardLabel(deck)}`;
  const confirmed = `Confirm ${named}`;
  return (
    <Popover>
      <Says what={PLAYER_SONGS_CLEAR_TOOLTIP}>
        <PopoverTrigger
          render={
            <Button size="xs" variant="ghost" className="text-muted-foreground" aria-label={named}>
              {CLEAR_ALL_LABEL}
            </Button>
          }
        />
      </Says>
      <PopoverContent side="bottom" align="end" className="w-56">
        <PopoverTitle>{playerSongsClearTitle(held)}</PopoverTitle>
        <Button size="xs" variant="destructive" aria-label={confirmed} onClick={onClear}>
          {PLAYER_SONGS_CLEAR_CONFIRM_LABEL}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
