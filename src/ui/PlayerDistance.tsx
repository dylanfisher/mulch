/**
 * @role One yard's jump: the Distance dial, and behind the marker at its corner the three amounts
 *   saying which way the walk leans, how often a jump takes the whole distance and how often it
 *   comes home instead (0162). Four fields of one `deck.player` spec, patched by the card that
 *   owns the command.
 * @instead What a jump becomes in sound — which slot each landing reads from →
 *   src/audio/player.ts. What the three shape, and the draw itself → src/lib/playerWalk.ts. The
 *   door the three sit behind → src/ui/PlayerMore.tsx. What range each dial is drawn on →
 *   src/lib/playerKnobs.ts.
 */
import { PLAYER_TRAVEL_KNOBS } from "@/lib/playerKnobs";
import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";
import { PlayerDial, voiceProps } from "@/ui/PlayerDial";
import { PlayerMore, type PlayerDoorProps } from "@/ui/PlayerMore";

export function PlayerDistance({
  deck,
  named,
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
      named={named}
      disabled={disabled}
      title={PLAYER_KNOB_LABELS.distance}
      dial={
        <PlayerDial
          named={named}
          knob="distance"
          player={player}
          defaults={defaults}
          patch={patch}
          {...voiceProps(voice)}
          selected={selected}
          disabled={disabled}
        />
      }
    >
      {PLAYER_TRAVEL_KNOBS.map((knob) => (
        <PlayerDial
          named={named}
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
