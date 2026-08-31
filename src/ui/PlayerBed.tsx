/**
 * @role One yard's ground: the Every dial, and beside it in its own run what that period is counted
 *   in (0192) and the three amounts saying how far one bed move travels, which way it leans and how
 *   often it comes home to the song's own bed instead (0183). Five fields of one `deck.player`
 *   spec, patched by the card that owns the command — the song's own, so no selection reaches them
 *   and none of them wears a mark (0184, the way the arrangement's four are drawn).
 * @instead The Bed dial those three are measured from, which stands on the box's own row because
 *   it is a place and not an amount of the move → src/ui/PlayerCard.tsx, which draws this box beside
 *   the arrangement's rather than among the three a part carries. What a bed becomes in
 *   sound — how far through the source a landing reads, counted in the loop's own sixteenths
 *   (0185) → src/audio/player.ts. What the three shape, and the move itself →
 *   src/lib/playerWalk.ts. The run they stand in, and the name they wear in it →
 *   src/ui/PlayerRun.tsx. What range each dial is drawn on → src/lib/playerKnobs.ts.
 */
import { useCallback, useMemo } from "react";

import { yardLabel } from "@/lib/copy";
import {
  PLAYER_BED_PER_LABEL,
  PLAYER_BED_PER_LABELS,
  PLAYER_BED_PER_TOOLTIP,
} from "@/lib/copyGround";
import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";
import { isBedPer, PLAYER_BED_PERS } from "@/lib/playerBed";
import { PLAYER_BED_KNOBS } from "@/lib/playerKnobs";
import { ToggleGroup, ToggleGroupItem } from "@/ui/components/toggle-group";
import { PlayerDial, voiceProps } from "@/ui/PlayerDial";
import { PlayerRun, runName, type PlayerRunProps } from "@/ui/PlayerRun";
import { Says } from "@/ui/Says";

// One handler for the clock the period is counted on, plus the dial and the row beside it: the
// length is how many controls this run holds rather than how much it decides. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function PlayerBed({
  deck,
  named,
  player,
  defaults,
  patch,
  voice,
  selected = false,
  disabled = false,
}: PlayerRunProps) {
  /** One clock, sent as the whole spec, like every other gesture on this card (0089). Base UI
   *  clears the group when the pressed item was already on, and a period is always counted on one
   *  of the four — so an empty selection is a press on the one that is already live. */
  const onValueChange = useCallback(
    (value: string[]) => {
      const [next] = value;
      if (isBedPer(next)) patch({ bedPer: next });
    },
    [patch],
  );
  /** The one press that is on, as the group's own value. Memoised because a fresh array every
   *  render is a new prop on a control that renders in a loop (`react-perf`, src/ui/ThemeToggle.tsx). */
  const value = useMemo(() => [player.bedPer], [player.bedPer]);
  return (
    <PlayerRun
      title={PLAYER_KNOB_LABELS.bedEvery}
      dial={
        <PlayerDial
          named={named}
          size="default"
          knob="bedEvery"
          player={player}
          defaults={defaults}
          patch={patch}
          {...voiceProps(voice)}
          selected={selected}
          disabled={disabled}
        />
      }
    >
      {/* What the dial beside it counts, under an eyebrow of its own: three clocks are a choice and
          not a further amount, so it is a set of presses rather than a dial — the shape the cast in
          the arrangement's own run has too (0192, 0174, src/ui/PlayerArrange.tsx). It stands first
          because the three dials after it shape a move, and this says when one happens at all. */}
      <div className="flex flex-col gap-1">
        <span className="type-eyebrow text-muted-foreground">{PLAYER_BED_PER_LABEL}</span>
        <Says what={PLAYER_BED_PER_TOOLTIP}>
          <ToggleGroup
            value={value}
            onValueChange={onValueChange}
            variant="outline"
            size="sm"
            spacing={0}
            disabled={disabled}
            aria-label={`${yardLabel(deck)} ${PLAYER_BED_PER_LABEL}`}
          >
            {PLAYER_BED_PERS.map((per) => (
              <ToggleGroupItem key={per} value={per} aria-label={PLAYER_BED_PER_LABELS[per]}>
                {PLAYER_BED_PER_LABELS[per]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Says>
      </div>
      {PLAYER_BED_KNOBS.map((knob) => (
        <PlayerDial
          named={runName(named, PLAYER_KNOB_LABELS.bedEvery)}
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
