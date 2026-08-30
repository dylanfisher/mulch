/**
 * @role One yard's read-rate walk: the Hold dial, and beside it in its own run the four amounts
 *   saying how often the rate lets go, how far it may stray, how far one change leaps and how far
 *   the ladder climbs between the repeats of one landing (0118, 0167). Five fields of one
 *   `deck.player` spec, patched by the card that owns the command.
 * @instead What a hold unfolds into — which rung a change lands on → src/lib/playerWalk.ts. The
 *   rest of the module's dials, and the one `deck.player` send they all go through →
 *   src/ui/PlayerCard.tsx. The run the four stand in, and the name they wear in it →
 *   src/ui/PlayerRun.tsx. What range each dial is drawn on → src/lib/playerKnobs.ts.
 */
import { PLAYER_RATE_KNOBS } from "@/lib/playerKnobs";
import { PLAYER_RATE_LABEL } from "@/lib/copy";
import { PlayerDial, voiceProps } from "@/ui/PlayerDial";
import { PlayerRun, runName, type PlayerRunProps } from "@/ui/PlayerRun";

export function PlayerRate({
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
      title={PLAYER_RATE_LABEL}
      dial={
        <PlayerDial
          named={named}
          size="default"
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
          named={runName(named, PLAYER_RATE_LABEL)}
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
