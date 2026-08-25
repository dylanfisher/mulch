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
import { type PlayerDefaults, type PlayerSpec } from "@/lib/player";
import { PLAYER_KNOB_LABELS } from "@/lib/copy";
import type { DeckId } from "@/state/store";
import { PlayerDial, voiceProps, type PlayerVoiceReader } from "@/ui/PlayerDial";
import { PlayerMore } from "@/ui/PlayerMore";

export function PlayerArrange({
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
  /** What the song is standing at, handed down from the card, exactly as every other door's
   *  dials read it (0157). No character names any of these four, so what a dial here paints is
   *  the spec's own number whatever part is standing (0152, 0158). */
  voice?: PlayerVoiceReader;
}) {
  return (
    <PlayerMore
      deck={deck}
      title={PLAYER_KNOB_LABELS.arrange}
      dial={
        <PlayerDial
          knob="arrange"
          player={player}
          defaults={defaults}
          patch={patch}
          {...voiceProps(voice)}
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
        />
      ))}
    </PlayerMore>
  );
}
