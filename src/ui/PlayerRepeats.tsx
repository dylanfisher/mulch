/**
 * @role One yard's repeat count: the Repeats dial, and beside it in its own run the four amounts
 *   saying whether a due redraw fires, how far it strays, how many jumps keep one (0135) and how
 *   much of each repeat the next one keeps (P118). Five fields of one `deck.player` spec, patched
 *   by the card that owns the command.
 * @instead What a count unfolds into — which number one landing is held at → src/lib/playerWalk.ts.
 *   The rest of the module's dials → src/ui/PlayerCard.tsx. The run the four stand in, and the name
 *   they wear in it → src/ui/PlayerRun.tsx. What range each dial is drawn on →
 *   src/lib/playerKnobs.ts.
 */
import { PLAYER_REPEATS_KNOBS } from "@/lib/playerKnobs";
import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";
import { PlayerDial, voiceProps } from "@/ui/PlayerDial";
import { PlayerRun, runName, type PlayerRunProps } from "@/ui/PlayerRun";

export function PlayerRepeats({
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
      title={PLAYER_KNOB_LABELS.repeats}
      dial={
        <PlayerDial
          named={named}
          knob="repeats"
          player={player}
          defaults={defaults}
          patch={patch}
          {...voiceProps(voice)}
          selected={selected}
          disabled={disabled}
        />
      }
    >
      {/* There is no drift beside them: a redrawn count is drawn fresh inside the spread rather
          than travelled from the count it is on, so there is nothing a drift could bound (0124). */}
      {PLAYER_REPEATS_KNOBS.map((knob) => (
        <PlayerDial
          named={runName(named, PLAYER_KNOB_LABELS.repeats)}
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
