/**
 * @role One yard's spread of burst lengths: the Vary dial, and behind the marker at its corner the
 *   one amount that makes sense beside it — the odds a landing is varied at all (P87). Two fields
 *   of one `deck.player` spec, patched by the card that owns the command. The dial reads in the
 *   burst's own unit and off the burst's own step, because a vary is a length of burst (0135).
 * @instead What a burst length becomes in sound → src/audio/player.ts. What one is drawn as →
 *   src/lib/player.ts. The door the amount sits behind → src/ui/PlayerMore.tsx.
 */
// One callback per field and one dial per field, and the length is how many fields the spread
// declares rather than how much this component decides — the same waiver the rate group beside
// it carries. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines-per-function
import { useCallback } from "react";

import {
  PLAYER_BURST_STEP,
  PLAYER_VARY_CHANCE_MAX,
  PLAYER_VARY_CHANCE_MIN,
  PLAYER_VARY_MAX,
  PLAYER_VARY_MIN,
  type PlayerDefaults,
  type PlayerSpec,
} from "@/lib/player";
import { PLAYER_KNOB_LABELS, PLAYER_KNOB_TOOLTIPS } from "@/lib/copy";
import type { DeckId } from "@/state/store";
import { burstLabel, Knob } from "@/ui/Knob";
import { PlayerMore } from "@/ui/PlayerMore";

export function PlayerVary({
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
  const onVary = useCallback(
    (value: number) => {
      patch({ vary: value });
    },
    [patch],
  );
  const onChance = useCallback(
    (value: number) => {
      patch({ varyChance: value });
    },
    [patch],
  );

  return (
    <PlayerMore
      deck={deck}
      title={PLAYER_KNOB_LABELS.vary}
      dial={
        <Knob
          label={PLAYER_KNOB_LABELS.vary}
          says={PLAYER_KNOB_TOOLTIPS.vary}
          size="sm"
          value={player.vary}
          min={PLAYER_VARY_MIN}
          max={PLAYER_VARY_MAX}
          defaultValue={defaults.vary}
          step={PLAYER_BURST_STEP}
          format={burstLabel}
          onChange={onVary}
        />
      }
    >
      <Knob
        label={PLAYER_KNOB_LABELS.varyChance}
        says={PLAYER_KNOB_TOOLTIPS.varyChance}
        size="sm"
        value={player.varyChance}
        min={PLAYER_VARY_CHANCE_MIN}
        max={PLAYER_VARY_CHANCE_MAX}
        defaultValue={defaults.varyChance}
        onChange={onChance}
      />
    </PlayerMore>
  );
}
