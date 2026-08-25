/**
 * @role One yard's burst stray: the Vary dial, and behind the marker at its corner the one amount
 *   saying whether a landing is varied at all (P87). Two fields of one `deck.player` spec, patched
 *   by the card that owns the command.
 * @instead How long a landing actually sounds → src/lib/playerWalk.ts. The burst the stray is
 *   measured against, in the same unit and on the same range → src/ui/PlayerCard.tsx. The door the
 *   chance sits behind → src/ui/PlayerMore.tsx. What range each dial is drawn on →
 *   src/lib/playerKnobs.ts.
 */
import { PLAYER_VARY_KNOBS } from "@/lib/playerKnobs";
import { type PlayerDefaults, type PlayerSpec } from "@/lib/player";
import { PLAYER_KNOB_LABELS } from "@/lib/copy";
import type { DeckId } from "@/state/store";
import { PlayerDial, voiceProps, type PlayerVoiceReader } from "@/ui/PlayerDial";
import { PlayerMore } from "@/ui/PlayerMore";

export function PlayerVary({
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
      title={PLAYER_KNOB_LABELS.vary}
      dial={
        <PlayerDial
          knob="vary"
          player={player}
          defaults={defaults}
          patch={patch}
          {...voiceProps(voice)}
        />
      }
    >
      {/* The chance alone: Vary *is* the spread of a burst, and a drift is a property of a walk,
          which a burst length is not — it is drawn fresh at every landing (P87). */}
      {PLAYER_VARY_KNOBS.map((knob) => (
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
