/**
 * @role The mulcher card's front: the walk as a picture, and under it the six names that fill every
 *   dial on the card in one press, the amount saying how far each press goes, and the reseed that
 *   draws the number they all unfold from. What a hand meets before it meets a dial (0197).
 * @instead The forty dials themselves, which are the card's other register →
 *   src/ui/PlayerDials.tsx and src/ui/PlayerCard.tsx. What a character is, and the arithmetic an
 *   amount moves by → src/lib/playerCharacter.ts. What the picture draws → src/ui/PlayerScope.tsx.
 */
// Over the dependency cap by one, and over the line cap by the paragraphs on this file's props:
// what the front is made of is a picture, six names, an amount and a reseed, and every import below
// is one of those four. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import type { Instrument } from "@/app/facade";
import { ACTION_TOOLTIPS } from "@/lib/copy";
import { PLAYER_FRONT_LABEL } from "@/lib/copyCard";
import type { PlayerSpec } from "@/lib/player";
import type { SongPartId } from "@/lib/playerSong";
import type { DeckId, DeckState } from "@/state/store";
import { Button } from "@/ui/components/button";
import { ACTION_ICONS } from "@/ui/icons";
import { PlayerCharacter } from "@/ui/PlayerCharacter";
import { PlayerScope } from "@/ui/PlayerScope";
import { Says } from "@/ui/Says";
// oxlint-enable import/max-dependencies

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
  selected,
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
  /** Whether a press fills the selected part rather than the pattern (0152, 0176). */
  selected: boolean;
  /** Refused rather than absent while the switch is off, the way every dial under it is
   *  (0121, 0173). */
  disabled: boolean;
}) {
  return (
    <div className="flex w-full flex-col items-stretch gap-2">
      {/* The picture first, above every control that shapes it: what the module is doing is the
          thing a hand reaching for these is trying to change, and it was the one thing on this card
          nothing drew (0180). It is the walk's own future — the landings the pattern has already
          decided — and it draws nothing at all where the loop has no grid to jump around, which is
          the same answer the drift gives (0159). */}
      <PlayerScope instrument={instrument} deck={deck} state={state} solo={solo} />
      {/* And under it the one gesture that moves every dial at once. In the open rather than behind
          the corner's icon, because a press here is the shortest road from a loaded sample to a
          pattern worth hearing, and it was the last thing on the card a hand had to find (0195's
          own argument for the arrangement's cast and the ground's clock, said for this one). */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-col gap-1">
          <span className="type-eyebrow text-muted-foreground">{PLAYER_FRONT_LABEL}</span>
          <PlayerCharacter
            layout="inline"
            deck={deck}
            player={player}
            patch={patch}
            selected={selected}
            disabled={disabled}
          />
        </div>
        {/* Beside the names and not in the corner they came from: a character draws every dial and
            a reseed draws the number they all unfold from, so a hand reaching for "make this sound
            different" finds the two of them in one place (0152, P98). */}
        <Says what={ACTION_TOOLTIPS.reseed}>
          <Button
            size="icon-sm"
            variant="ghost"
            disabled={disabled}
            aria-label={reseedLabel}
            onClick={reseed}
          >
            <ACTION_ICONS.reseed />
          </Button>
        </Says>
      </div>
    </div>
  );
}
