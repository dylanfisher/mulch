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
import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";
import { PlayerDial, voiceProps } from "@/ui/PlayerDial";
import { PlayerMore, type PlayerDoorProps } from "@/ui/PlayerMore";

export function PlayerVary({
  deck,
  named,
  player,
  defaults,
  patch,
  doors,
  voice,
  selected = false,
  disabled = false,
}: PlayerDoorProps) {
  return (
    <PlayerMore
      deck={deck}
      named={named}
      doors={doors}
      disabled={disabled}
      title={PLAYER_KNOB_LABELS.vary}
      dial={
        <PlayerDial
          named={named}
          knob="vary"
          player={player}
          defaults={defaults}
          patch={patch}
          {...voiceProps(voice)}
          selected={selected}
          disabled={disabled}
        />
      }
    >
      {/* The chance alone: Vary *is* the spread of a burst, and a drift is a property of a walk,
          which a burst length is not — it is drawn fresh at every landing (P87). */}
      {PLAYER_VARY_KNOBS.map((knob) => (
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
