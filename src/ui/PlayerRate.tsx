/**
 * @role One yard's read-rate walk: the Hold dial, and behind the marker at its corner the three
 *   amounts saying how often the rate lets go, how far it may stray and how far one change leaps
 *   (0118). Four fields of one `deck.player` spec, patched by the card that owns the command.
 * @instead What a hold unfolds into — which rung a change lands on → src/lib/player.ts. The rest
 *   of the module's dials, and the one `deck.player` send they all go through →
 *   src/ui/PlayerCard.tsx. The door the three sit behind → src/ui/PlayerMore.tsx.
 */
// One callback per field and one dial per field, and the length is how many fields the rate walk
// declares rather than how much this component decides — the same waiver the card it was split out
// of carries. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines-per-function
import { useCallback } from "react";

import {
  PLAYER_CHANCE_MAX,
  PLAYER_CHANCE_MIN,
  PLAYER_DRIFT_MAX,
  PLAYER_DRIFT_MIN,
  PLAYER_HOLD_MAX,
  PLAYER_HOLD_MIN,
  PLAYER_SPREAD_MAX,
  PLAYER_SPREAD_MIN,
  type PlayerDefaults,
  type PlayerSpec,
} from "@/lib/player";
import { PLAYER_KNOB_LABELS, PLAYER_KNOB_TOOLTIPS, PLAYER_RATE_LABEL } from "@/lib/copy";
import type { DeckId } from "@/state/store";
import { Knob } from "@/ui/Knob";
import { PlayerMore } from "@/ui/PlayerMore";

export function PlayerRate({
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
  const onHold = useCallback(
    (value: number) => {
      patch({ hold: Math.round(value) });
    },
    [patch],
  );
  const onChance = useCallback(
    (value: number) => {
      patch({ chance: value });
    },
    [patch],
  );
  const onSpread = useCallback(
    (value: number) => {
      patch({ spread: Math.round(value) });
    },
    [patch],
  );
  const onDrift = useCallback(
    (value: number) => {
      patch({ drift: Math.round(value) });
    },
    [patch],
  );

  return (
    <PlayerMore
      deck={deck}
      title={PLAYER_RATE_LABEL}
      dial={
        <Knob
          label={PLAYER_KNOB_LABELS.hold}
          says={PLAYER_KNOB_TOOLTIPS.hold}
          size="sm"
          value={player.hold}
          min={PLAYER_HOLD_MIN}
          max={PLAYER_HOLD_MAX}
          defaultValue={defaults.hold}
          step={1}
          onChange={onHold}
        />
      }
    >
      <Knob
        label={PLAYER_KNOB_LABELS.chance}
        says={PLAYER_KNOB_TOOLTIPS.chance}
        size="sm"
        value={player.chance}
        min={PLAYER_CHANCE_MIN}
        max={PLAYER_CHANCE_MAX}
        defaultValue={defaults.chance}
        onChange={onChance}
      />
      <Knob
        label={PLAYER_KNOB_LABELS.spread}
        says={PLAYER_KNOB_TOOLTIPS.spread}
        size="sm"
        value={player.spread}
        min={PLAYER_SPREAD_MIN}
        max={PLAYER_SPREAD_MAX}
        defaultValue={defaults.spread}
        step={1}
        onChange={onSpread}
      />
      <Knob
        label={PLAYER_KNOB_LABELS.drift}
        says={PLAYER_KNOB_TOOLTIPS.drift}
        size="sm"
        value={player.drift}
        min={PLAYER_DRIFT_MIN}
        max={PLAYER_DRIFT_MAX}
        defaultValue={defaults.drift}
        step={1}
        onChange={onDrift}
      />
    </PlayerMore>
  );
}
