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
import { type PlayerDefaults, type PlayerSpec } from "@/lib/player";
import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";
import type { DeckId } from "@/state/store";
import { PlayerDial, voiceProps, type PlayerVoiceReader } from "@/ui/PlayerDial";
import { PlayerMore } from "@/ui/PlayerMore";

export function PlayerDistance({
  deck,
  player,
  defaults,
  patch,
  voice,
}: {
  deck: DeckId;
  player: PlayerSpec;
  /** What each dial snaps back to on a double-click: the switch's own values (0118). */
  defaults: PlayerDefaults;
  /** The card's own patch: one `deck.player` per gesture, carrying the whole spec (0089). */
  patch: (fields: Partial<PlayerSpec>) => void;
  /** What the song is standing at, handed down from the card: every dial behind this door reads
   *  the pattern's own numbers while one plays, exactly as the dial on the row does (0157). */
  voice?: PlayerVoiceReader;
}) {
  return (
    <PlayerMore
      deck={deck}
      title={PLAYER_KNOB_LABELS.distance}
      dial={
        <PlayerDial
          knob="distance"
          player={player}
          defaults={defaults}
          patch={patch}
          {...voiceProps(voice)}
        />
      }
    >
      {PLAYER_TRAVEL_KNOBS.map((knob) => (
        <PlayerDial
          key={knob}
          knob={knob}
          player={player}
          defaults={defaults}
          patch={patch}
          {...voiceProps(voice)}
        />
      ))}
    </PlayerMore>
  );
}
