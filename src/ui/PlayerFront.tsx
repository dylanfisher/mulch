/**
 * @role The mulcher card's front: the walk as a score with the cast's own pad beside it — where a
 *   corner's name pressed fills every dial on the card with that character, a puck dragged between
 *   them weighs all six at once, and the pad's own row carries the reseed that draws the number
 *   they all unfold from. What a hand meets before it meets a dial (0197, 0259).
 * @instead The forty dials themselves, which are the card's other register →
 *   src/ui/PlayerDials.tsx and src/ui/PlayerCard.tsx. What a character is, and the arithmetic a
 *   weighing moves by → src/lib/playerCharacter.ts. What the picture draws → src/ui/PlayerScope.tsx.
 *   The pad beside it → src/ui/PlayerBlend.tsx.
 */
import type { Instrument } from "@/app/facade";
import type { PlayerSpec } from "@/lib/player";
import type { SongPartId } from "@/lib/playerSong";
import type { DeckId, DeckState } from "@/state/store";
import { PlayerBlend } from "@/ui/PlayerBlend";
import { PlayerScope } from "@/ui/PlayerScope";

// One prop per thing the front is handed and a paragraph on each: the length is that list's rather
// than a judgement of this function's. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function PlayerFront({
  instrument,
  deck,
  state,
  solo,
  player,
  patch,
  reseed,
  reseedLabel,
  disabled,
}: {
  instrument: Instrument;
  deck: DeckId;
  state: DeckState;
  /** The part the transport is auditioning, handed through to the picture that lights it (0190). */
  solo: SongPartId | null;
  /** The spec a press reads and fills, which is the card's own (0089). */
  player: PlayerSpec;
  /** The card's own patch: one `deck.player` per gesture, carrying the whole spec (0089). */
  patch: (fields: Partial<PlayerSpec>) => void;
  /** The card's own reseed, which draws the number every dial here unfolds from. */
  reseed: () => void;
  /** What that button is called, built by the card because only it knows the yard and the part. */
  reseedLabel: string;
  /** Refused rather than absent while the switch is off, the way every dial under it is
   *  (0121, 0173). */
  disabled: boolean;
}) {
  return (
    /* The picture first, above every control that shapes it: what the module is doing is the
          thing a hand reaching for these is trying to change, and it was the one thing on this card
          nothing drew (0180). It is the walk's own future — the landings the pattern has already
          decided — and it draws nothing at all where the loop has no grid to jump around, which is
          the same answer the drift gives (0159).

          The pad stands beside it rather than under it, and at the picture's own height: it is the
          other reading of the same thing — the walk is what the cast came out as — and a hand
          dragging the puck watches the score redraw under the very same glance (0259). It keeps its
          own width, because the box and the drawing share one ratio and any other letterboxes the
          drag (0252). Wrapping, so a narrow card stacks them rather than squeezing either. */
    <div className="flex w-full flex-wrap items-start gap-3">
      <div className="min-w-64 flex-1">
        <PlayerScope instrument={instrument} deck={deck} state={state} solo={solo} />
      </div>
      {/* The pad carries the reseed on its own button row: drawing another six and drawing the
          number they unfold from are one question asked at two depths, so they stand together
          rather than a row apart (0089, 0259). */}
      <PlayerBlend
        deck={deck}
        player={player}
        patch={patch}
        reseed={reseed}
        reseedLabel={reseedLabel}
        disabled={disabled}
      />
    </div>
  );
}
