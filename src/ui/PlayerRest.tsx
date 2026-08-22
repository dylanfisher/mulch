/**
 * @role One yard's wait between jumps: the Rest dial, and behind the marker at its corner the two
 *   amounts saying whether the wait is taken at all and how far it strays (P87). Three fields of
 *   one `deck.player` spec, patched by the card that owns the command.
 * @instead What a wait becomes in the schedule → src/audio/player.ts. What a rest is drawn as →
 *   src/lib/player.ts. The door the two sit behind → src/ui/PlayerMore.tsx.
 */
// One callback per field and one dial per field, and the length is how many fields the wait
// declares rather than how much this component decides — the same waiver the rate group beside
// it carries. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines-per-function
import { useCallback } from "react";

import {
  PLAYER_REST_CHANCE_MAX,
  PLAYER_REST_CHANCE_MIN,
  PLAYER_REST_MAX,
  PLAYER_REST_MIN,
  PLAYER_REST_SPREAD_MAX,
  PLAYER_REST_SPREAD_MIN,
  type PlayerDefaults,
  type PlayerSpec,
} from "@/lib/player";
import { PLAYER_KNOB_LABELS, PLAYER_KNOB_TOOLTIPS } from "@/lib/copy";
import type { DeckId } from "@/state/store";
import { Knob } from "@/ui/Knob";
import { PlayerMore } from "@/ui/PlayerMore";

export function PlayerRest({
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
  const onRest = useCallback(
    (value: number) => {
      patch({ rest: value });
    },
    [patch],
  );
  const onChance = useCallback(
    (value: number) => {
      patch({ restChance: value });
    },
    [patch],
  );
  const onVary = useCallback(
    (value: number) => {
      patch({ restSpread: value });
    },
    [patch],
  );

  return (
    <PlayerMore
      deck={deck}
      title={PLAYER_KNOB_LABELS.rest}
      dial={
        <Knob
          label={PLAYER_KNOB_LABELS.rest}
          says={PLAYER_KNOB_TOOLTIPS.rest}
          size="sm"
          value={player.rest}
          min={PLAYER_REST_MIN}
          max={PLAYER_REST_MAX}
          defaultValue={defaults.rest}
          onChange={onRest}
        />
      }
    >
      <Knob
        label={PLAYER_KNOB_LABELS.restChance}
        says={PLAYER_KNOB_TOOLTIPS.restChance}
        size="sm"
        value={player.restChance}
        min={PLAYER_REST_CHANCE_MIN}
        max={PLAYER_REST_CHANCE_MAX}
        defaultValue={defaults.restChance}
        onChange={onChance}
      />
      <Knob
        label={PLAYER_KNOB_LABELS.restSpread}
        says={PLAYER_KNOB_TOOLTIPS.restSpread}
        size="sm"
        value={player.restSpread}
        min={PLAYER_REST_SPREAD_MIN}
        max={PLAYER_REST_SPREAD_MAX}
        defaultValue={defaults.restSpread}
        onChange={onVary}
      />
    </PlayerMore>
  );
}
