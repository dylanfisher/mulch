/**
 * @role One yard's wait between jumps: the Rest dial, and beside it in its own run the amounts of
 *   whichever author of the wait is live — the two that place it, and the two that roll one where
 *   nothing is placing it (P87, 0163). Five fields of one `deck.player` spec, patched by the card
 *   that owns the command.
 * @instead What a placed wait is, and the rule saying which author is live →
 *   src/lib/playerRest.ts. How long the pattern actually waits → src/lib/playerWalk.ts. The rest of
 *   the module's dials → src/ui/PlayerCard.tsx. The run the two stand in, and the name they wear in
 *   it → src/ui/PlayerRun.tsx. What range each dial is drawn on → src/lib/playerKnobs.ts.
 */
import { PLAYER_REST_KNOBS, PLAYER_REST_PLACED_KNOBS } from "@/lib/playerKnobs";
import { restIsPlaced } from "@/lib/playerRest";
import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";
import { PlayerDial, voiceProps } from "@/ui/PlayerDial";
import { PlayerRun, runName, type PlayerRunProps } from "@/ui/PlayerRun";

export function PlayerRest({
  named,
  player,
  defaults,
  patch,
  voice,
  selected = false,
  disabled = false,
}: PlayerRunProps) {
  return (
    <PlayerRun
      title={PLAYER_KNOB_LABELS.rest}
      dial={
        <PlayerDial
          named={named}
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
          named={runName(named, PLAYER_KNOB_LABELS.rest)}
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
    </PlayerRun>
  );
}
