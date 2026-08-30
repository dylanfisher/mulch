/**
 * @role One yard's burst stray: the Vary dial, and beside it in its own run the one amount saying
 *   whether a landing is varied at all (P87). Two fields of one `deck.player` spec, patched by the
 *   card that owns the command.
 * @instead How long a landing actually sounds → src/lib/playerWalk.ts. The burst the stray is
 *   measured against, in the same unit and on the same range → src/ui/PlayerCard.tsx. The run the
 *   chance stands in, and the name it wears in it → src/ui/PlayerRun.tsx. What range each dial is
 *   drawn on → src/lib/playerKnobs.ts.
 */
import { PLAYER_VARY_KNOBS } from "@/lib/playerKnobs";
import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";
import { PlayerDial, voiceProps } from "@/ui/PlayerDial";
import { PlayerRun, runName, type PlayerRunProps } from "@/ui/PlayerRun";

export function PlayerVary({
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
      title={PLAYER_KNOB_LABELS.vary}
      dial={
        <PlayerDial
          named={named}
          size="default"
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
          named={runName(named, PLAYER_KNOB_LABELS.vary)}
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
