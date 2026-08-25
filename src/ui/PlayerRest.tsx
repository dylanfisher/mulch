/**
 * @role One yard's wait between jumps: the Rest dial, and behind the marker at its corner the two
 *   amounts saying whether a wait is taken and how far it strays (P87). Three fields of one
 *   `deck.player` spec, patched by the card that owns the command.
 * @instead How long the pattern actually waits → src/lib/playerWalk.ts. The rest of the module's
 *   dials → src/ui/PlayerCard.tsx. The door the two sit behind → src/ui/PlayerMore.tsx. What range
 *   each dial is drawn on → src/lib/playerKnobs.ts.
 */
import { PLAYER_REST_KNOBS, type PlayerDefaults, type PlayerSpec } from "@/lib/player";
import { PLAYER_KNOB_LABELS } from "@/lib/copy";
import type { DeckId } from "@/state/store";
import { PlayerDial } from "@/ui/PlayerDial";
import { PlayerMore } from "@/ui/PlayerMore";

export function PlayerRest({
  deck,
  player,
  defaults,
  patch,
}: {
  deck: DeckId;
  player: PlayerSpec;
  /** What each dial snaps back to on a double-click: the switch's own values (0118). */
  defaults: PlayerDefaults;
  /** The card's own patch: one `deck.player` per gesture, carrying the whole spec (0089). */
  patch: (fields: Partial<PlayerSpec>) => void;
}) {
  return (
    <PlayerMore
      deck={deck}
      title={PLAYER_KNOB_LABELS.rest}
      dial={<PlayerDial knob="rest" player={player} defaults={defaults} patch={patch} />}
    >
      {/* There is no drift beside these either: a wait is drawn fresh at every jump rather than
          walked, so there is no rest it could be travelling from (P87). */}
      {PLAYER_REST_KNOBS.map((knob) => (
        <PlayerDial key={knob} knob={knob} player={player} defaults={defaults} patch={patch} />
      ))}
    </PlayerMore>
  );
}
