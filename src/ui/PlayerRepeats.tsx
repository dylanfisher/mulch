/**
 * @role One yard's repeat count: the Repeats dial, and behind the marker at its corner the four
 *   amounts saying whether a due redraw fires, how far it strays, how many jumps keep one (0135)
 *   and how much of each repeat the next one keeps (P118). Five fields of one `deck.player` spec,
 *   patched by the card that owns the command.
 * @instead What a count unfolds into — which number one landing is held at → src/lib/playerWalk.ts.
 *   The rest of the module's dials → src/ui/PlayerCard.tsx. The door the four sit behind →
 *   src/ui/PlayerMore.tsx. What range each dial is drawn on → src/lib/playerKnobs.ts.
 */
import { PLAYER_REPEATS_KNOBS } from "@/lib/playerKnobs";
import { type PlayerDefaults, type PlayerSpec } from "@/lib/player";
import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";
import type { DeckId } from "@/state/store";
import { PlayerDial, voiceProps, type PlayerVoiceReader } from "@/ui/PlayerDial";
import { PlayerMore } from "@/ui/PlayerMore";

export function PlayerRepeats({
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
      title={PLAYER_KNOB_LABELS.repeats}
      dial={
        <PlayerDial
          knob="repeats"
          player={player}
          defaults={defaults}
          patch={patch}
          {...voiceProps(voice)}
        />
      }
    >
      {/* There is no drift beside them: a redrawn count is drawn fresh inside the spread rather
          than travelled from the count it is on, so there is nothing a drift could bound (0124). */}
      {PLAYER_REPEATS_KNOBS.map((knob) => (
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
