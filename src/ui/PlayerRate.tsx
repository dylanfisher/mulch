/**
 * @role One yard's read-rate walk: the Hold dial, and behind the marker at its corner the four
 *   amounts saying how often the rate lets go, how far it may stray, how far one change leaps and
 *   how far the ladder climbs between the repeats of one landing (0118, 0167). Five fields of one
 *   `deck.player` spec, patched by the card that owns the command.
 * @instead What a hold unfolds into — which rung a change lands on → src/lib/playerWalk.ts. The
 *   rest of the module's dials, and the one `deck.player` send they all go through →
 *   src/ui/PlayerCard.tsx. The door the three sit behind → src/ui/PlayerMore.tsx. What range each
 *   dial is drawn on → src/lib/playerKnobs.ts.
 */
import { PLAYER_RATE_KNOBS } from "@/lib/playerKnobs";
import { PLAYER_RATE_LABEL } from "@/lib/copy";
import { PlayerDial, voiceProps } from "@/ui/PlayerDial";
import { PlayerMore, type PlayerDoorProps } from "@/ui/PlayerMore";

export function PlayerRate({
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
      title={PLAYER_RATE_LABEL}
      dial={
        <PlayerDial
          named={named}
          knob="hold"
          player={player}
          defaults={defaults}
          patch={patch}
          {...voiceProps(voice)}
          selected={selected}
          disabled={disabled}
        />
      }
    >
      {/* The declared partition itself, rather than a list of it written again: which amounts
          shape the rate walk is src/lib/player.ts's answer, and a menu that spelled them out here
          would be a second one nothing reports the divergence of (principle 1, 0124). */}
      {PLAYER_RATE_KNOBS.map((knob) => (
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
