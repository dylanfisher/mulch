/**
 * @role One yard's wait between jumps: the Rest dial, and behind the marker at its corner the
 *   amounts of whichever author of the wait is live — the two that place it, and the two that roll
 *   one where nothing is placing it (P87, 0163). Five fields of one `deck.player` spec, patched by
 *   the card that owns the command.
 * @instead What a placed wait is, and the rule saying which author is live →
 *   src/lib/playerRest.ts. How long the pattern actually waits → src/lib/playerWalk.ts. The rest of the module's
 *   dials → src/ui/PlayerCard.tsx. The door the two sit behind → src/ui/PlayerMore.tsx. What range
 *   each dial is drawn on → src/lib/playerKnobs.ts.
 */
import { PLAYER_REST_KNOBS, PLAYER_REST_PLACED_KNOBS } from "@/lib/playerKnobs";
import { restIsPlaced } from "@/lib/playerRest";
import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";
import { PlayerDial, voiceProps } from "@/ui/PlayerDial";
import { PlayerMore, type PlayerDoorProps } from "@/ui/PlayerMore";

export function PlayerRest({
  deck,
  player,
  defaults,
  patch,
  voice,
  selected = false,
  disabled = false,
}: PlayerDoorProps) {
  return (
    <PlayerMore
      deck={deck}
      disabled={disabled}
      title={PLAYER_KNOB_LABELS.rest}
      dial={
        <PlayerDial
          knob="rest"
          player={player}
          defaults={defaults}
          patch={patch}
          {...voiceProps(voice)}
          selected={selected}
          disabled={disabled}
        />
      }
    >
      {/* Whichever author is live and nothing else: the two that place the waits are always here,
          because one of them is what turns the pattern on, and the two that roll one are drawn
          only while nothing is placing them — a dial that is drawn and does nothing is worse than
          a dial that is not drawn (0163). There is no drift beside the rolled pair either: a wait
          is drawn fresh at every jump rather than walked, so there is no rest it could be
          travelling from (P87). */}
      {(restIsPlaced(player) ? PLAYER_REST_PLACED_KNOBS : PLAYER_REST_KNOBS).map((knob) => (
        <PlayerDial
          key={knob}
          knob={knob}
          player={player}
          defaults={defaults}
          patch={patch}
          {...voiceProps(voice)}
          selected={selected}
          disabled={disabled}
        />
      ))}
    </PlayerMore>
  );
}
