/**
 * @role One yard's figure: the Phrase dial, and beside it in its own run the three amounts saying
 *   how many passes keep one figure, whether a kept one evolves and where a let-go one goes (0151).
 *   Four fields of one `deck.player` spec, patched by the card that owns the command.
 * @instead What a figure becomes in sound — which slot each landing reads from →
 *   src/audio/player.ts. What a figure is, and the walk that lays and reads it →
 *   src/lib/playerFigure.ts. The run the three stand in, and the name they wear in it →
 *   src/ui/PlayerRun.tsx. What range each dial is drawn on → src/lib/playerKnobs.ts.
 */
import { PLAYER_PHRASE_KNOBS } from "@/lib/playerKnobs";
import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";
import { PlayerDial, voiceProps } from "@/ui/PlayerDial";
import { PlayerRun, runName, type PlayerRunProps } from "@/ui/PlayerRun";

export function PlayerPhrase({
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
          named={runName(named, PLAYER_KNOB_LABELS.phrase)}
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
