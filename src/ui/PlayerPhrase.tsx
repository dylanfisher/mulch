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
import { type PlayerDefaults, type PlayerSpec } from "@/lib/player";
import { PLAYER_KNOB_LABELS } from "@/lib/copy";
import type { DeckId } from "@/state/store";
import { PlayerDial, voiceProps, type PlayerVoiceReader } from "@/ui/PlayerDial";
import { PlayerMore } from "@/ui/PlayerMore";

export function PlayerPhrase({
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
      title={PLAYER_KNOB_LABELS.phrase}
      dial={
        <PlayerDial
          knob="phrase"
          player={player}
          defaults={defaults}
          patch={patch}
          {...voiceProps(voice)}
        />
      }
    >
      {/* The keep among them is counted in passes of the figure rather than in jumps, which is why
          it declares a range of its own where the count's keep shares the rate walk's
          (src/lib/playerFigure.ts). */}
      {PLAYER_PHRASE_KNOBS.map((knob) => (
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
