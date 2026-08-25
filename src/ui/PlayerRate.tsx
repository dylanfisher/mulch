/**
 * @role One yard's read-rate walk: the Hold dial, and behind the marker at its corner the three
 *   amounts saying how often the rate lets go, how far it may stray and how far one change leaps
 *   (0118). Four fields of one `deck.player` spec, patched by the card that owns the command.
 * @instead What a hold unfolds into — which rung a change lands on → src/lib/playerWalk.ts. The
 *   rest of the module's dials, and the one `deck.player` send they all go through →
 *   src/ui/PlayerCard.tsx. The door the three sit behind → src/ui/PlayerMore.tsx. What range each
 *   dial is drawn on → src/lib/playerKnobs.ts.
 */
import { PLAYER_RATE_KNOBS } from "@/lib/playerKnobs";
import { type PlayerDefaults, type PlayerSpec } from "@/lib/player";
import { PLAYER_RATE_LABEL } from "@/lib/copy";
import type { DeckId } from "@/state/store";
import { PlayerDial, voiceProps, type PlayerVoiceReader } from "@/ui/PlayerDial";
import { PlayerMore } from "@/ui/PlayerMore";

export function PlayerRate({
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
      title={PLAYER_RATE_LABEL}
      dial={
        <PlayerDial
          knob="hold"
          player={player}
          defaults={defaults}
          patch={patch}
          {...voiceProps(voice)}
        />
      }
    >
      {/* The declared partition itself, rather than a list of it written again: which amounts
          shape the rate walk is src/lib/player.ts's answer, and a menu that spelled them out here
          would be a second one nothing reports the divergence of (principle 1, 0124). */}
      {PLAYER_RATE_KNOBS.map((knob) => (
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
