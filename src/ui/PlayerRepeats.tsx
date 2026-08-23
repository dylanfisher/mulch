/**
 * @role One yard's count of repeats: the Repeats dial, and behind the marker at its corner the
 *   three amounts saying whether a due redraw fires, how far the count strays and how many jumps
 *   keep one (0135). Four fields of one `deck.player` spec, patched by the card that owns the
 *   command.
 * @instead What a count becomes in sound — how many times one landing plays →
 *   src/audio/player.ts. What a count is drawn as, and the hold it is kept over →
 *   src/lib/player.ts. The door the three sit behind → src/ui/PlayerMore.tsx.
 */
// One callback per field and one dial per field, and the length is how many fields the count
// declares rather than how much this component decides — the same waiver the rate group beside
// it carries. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines-per-function
import { useCallback } from "react";

import {
  PLAYER_HOLD_MAX,
  PLAYER_HOLD_MIN,
  PLAYER_REPEATS_CHANCE_MAX,
  PLAYER_REPEATS_CHANCE_MIN,
  PLAYER_REPEATS_MAX,
  PLAYER_REPEATS_MIN,
  PLAYER_REPEATS_SPREAD_MAX,
  PLAYER_REPEATS_SPREAD_MIN,
  type PlayerDefaults,
  type PlayerSpec,
} from "@/lib/player";
import { PLAYER_KNOB_LABELS, PLAYER_KNOB_TOOLTIPS } from "@/lib/copy";
import type { DeckId } from "@/state/store";
import { Knob } from "@/ui/Knob";
import { PlayerMore } from "@/ui/PlayerMore";

export function PlayerRepeats({
  deck,
  player,
  defaults,
  patch,
}: {
  deck: DeckId;
  player: PlayerSpec;
  /** What each dial snaps back to on a double-click: the switch's own values (0118). */
  defaults: PlayerDefaults;
  /** The card's own patch: one `deck.player` per gesture, carrying the whole spec (0089). */
  patch: (fields: Partial<PlayerSpec>) => void;
}) {
  const onRepeats = useCallback(
    (value: number) => {
      patch({ repeats: Math.round(value) });
    },
    [patch],
  );
  const onChance = useCallback(
    (value: number) => {
      patch({ repeatsChance: value });
    },
    [patch],
  );
  const onSpread = useCallback(
    (value: number) => {
      patch({ repeatsSpread: Math.round(value) });
    },
    [patch],
  );
  const onHold = useCallback(
    (value: number) => {
      patch({ repeatsHold: Math.round(value) });
    },
    [patch],
  );

  return (
    <PlayerMore
      deck={deck}
      title={PLAYER_KNOB_LABELS.repeats}
      dial={
        <Knob
          label={PLAYER_KNOB_LABELS.repeats}
          says={PLAYER_KNOB_TOOLTIPS.repeats}
          size="sm"
          value={player.repeats}
          min={PLAYER_REPEATS_MIN}
          max={PLAYER_REPEATS_MAX}
          defaultValue={defaults.repeats}
          step={1}
          onChange={onRepeats}
        />
      }
    >
      <Knob
        label={PLAYER_KNOB_LABELS.repeatsChance}
        says={PLAYER_KNOB_TOOLTIPS.repeatsChance}
        size="sm"
        value={player.repeatsChance}
        min={PLAYER_REPEATS_CHANCE_MIN}
        max={PLAYER_REPEATS_CHANCE_MAX}
        defaultValue={defaults.repeatsChance}
        onChange={onChance}
      />
      <Knob
        label={PLAYER_KNOB_LABELS.repeatsSpread}
        says={PLAYER_KNOB_TOOLTIPS.repeatsSpread}
        size="sm"
        value={player.repeatsSpread}
        min={PLAYER_REPEATS_SPREAD_MIN}
        max={PLAYER_REPEATS_SPREAD_MAX}
        defaultValue={defaults.repeatsSpread}
        step={1}
        onChange={onSpread}
      />
      {/* The hold a count is kept over is counted in jumps, which is the range the rate walk's own
          hold already declares — one range and not two that happen to agree (principle 1). */}
      <Knob
        label={PLAYER_KNOB_LABELS.repeatsHold}
        says={PLAYER_KNOB_TOOLTIPS.repeatsHold}
        size="sm"
        value={player.repeatsHold}
        min={PLAYER_HOLD_MIN}
        max={PLAYER_HOLD_MAX}
        defaultValue={defaults.repeatsHold}
        step={1}
        onChange={onHold}
      />
    </PlayerMore>
  );
}
