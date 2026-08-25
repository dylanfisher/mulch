/**
 * @role One yard's drawn arrangement: the Arrange dial, and behind the marker at its corner the
 *   three amounts saying how many rounds keep one arrangement, whether a kept one evolves and
 *   where a let-go one goes (0158). Four fields of one `deck.player` spec, patched by the card
 *   that owns the command — the Phrase door said one tier up, which is what the four amounts are.
 * @instead What a drawn arrangement is, and the cursor that lays and reads it →
 *   src/lib/playerSong.ts. The parts it is playing, where a written arrangement is read →
 *   src/ui/PlayerDrawn.tsx. The door the three sit behind → src/ui/PlayerMore.tsx. What range each
 *   dial is drawn on → src/lib/playerKnobs.ts.
 */
import { PLAYER_ARRANGE_KNOBS } from "@/lib/playerKnobs";
import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";
import { PlayerDial, voiceProps } from "@/ui/PlayerDial";
import { PlayerMore, type PlayerDoorProps } from "@/ui/PlayerMore";

// No character names any of the four amounts this door holds, so what a dial here paints is the
// spec's own number whatever part is standing (0152, 0158).
export function PlayerArrange({
  deck,
  player,
  defaults,
  patch,
  voice,
  disabled = false,
}: PlayerDoorProps) {
  return (
    <PlayerMore
      deck={deck}
      disabled={disabled}
      title={PLAYER_KNOB_LABELS.arrange}
      dial={
        <PlayerDial
          knob="arrange"
          player={player}
          defaults={defaults}
          patch={patch}
          {...voiceProps(voice)}
          disabled={disabled}
        />
      }
    >
      {/* The keep among them is counted in rounds of the arrangement, which is why it declares a
          range of its own where the figure's keep counts passes (src/lib/playerSong.ts). */}
      {PLAYER_ARRANGE_KNOBS.map((knob) => (
        <PlayerDial
          key={knob}
          knob={knob}
          player={player}
          defaults={defaults}
          patch={patch}
          {...voiceProps(voice)}
          disabled={disabled}
        />
      ))}
    </PlayerMore>
  );
}
