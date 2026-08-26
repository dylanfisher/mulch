/**
 * @role One yard's figure: the Phrase dial, and behind the marker at its corner the three amounts
 *   saying how many passes keep one figure, whether a kept one evolves and where a let-go one goes
 *   (0151). Four fields of one `deck.player` spec, patched by the card that owns the command.
 * @instead What a figure becomes in sound — which slot each landing reads from →
 *   src/audio/player.ts. What a figure is, and the walk that lays and reads it →
 *   src/lib/playerFigure.ts. The door the three sit behind → src/ui/PlayerMore.tsx. What range each
 *   dial is drawn on → src/lib/playerKnobs.ts.
 */
import { PLAYER_PHRASE_KNOBS } from "@/lib/playerKnobs";
import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";
import { PlayerDial, voiceProps } from "@/ui/PlayerDial";
import { PlayerMore, type PlayerDoorProps } from "@/ui/PlayerMore";

export function PlayerPhrase({
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
      title={PLAYER_KNOB_LABELS.phrase}
      dial={
        <PlayerDial
          named={named}
          knob="phrase"
          player={player}
          defaults={defaults}
          patch={patch}
          {...voiceProps(voice)}
          selected={selected}
          disabled={disabled}
        />
      }
    >
      {/* The keep among them is counted in passes of the figure rather than in jumps, which is why
          it declares a range of its own where the count's keep shares the rate walk's
          (src/lib/playerFigure.ts). */}
      {PLAYER_PHRASE_KNOBS.map((knob) => (
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
