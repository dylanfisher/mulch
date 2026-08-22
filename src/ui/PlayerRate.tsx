/**
 * @role One yard's read-rate walk: the Hold dial, and behind the marker at its corner the three
 *   amounts saying how often the rate lets go, how far it may stray and how far one change leaps
 *   (0118). Four fields of one `deck.player` spec, patched by the card that owns the command.
 * @instead What a hold unfolds into — which rung a change lands on → src/lib/player.ts. The rest
 *   of the module's dials, and the one `deck.player` send they all go through →
 *   src/ui/PlayerCard.tsx.
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
  PLAYER_RATE_KNOBS,
  PLAYER_SPREAD_MAX,
  PLAYER_SPREAD_MIN,
  type PlayerSpec,
} from "@/lib/player";
import { PLAYER_KNOB_LABELS, PLAYER_KNOB_TOOLTIPS, PLAYER_RATE_LABEL, yardLabel } from "@/lib/copy";
import type { DeckId } from "@/state/store";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/ui/components/popover";
import { Knob } from "@/ui/Knob";

/** The three the popover holds, and what a switch pressed now leaves them at (src/ui/PlayerCard.tsx). */
export type RateDefaults = Pick<PlayerSpec, "chance" | "spread" | "drift">;

export function PlayerRate({
  deck,
  player,
  defaults,
  patch,
}: {
  deck: DeckId;
  player: PlayerSpec;
  /** What the marker calls "untouched", so it can say whether this walk has been shaped. */
  defaults: RateDefaults;
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

  /** Whether any of the three has been moved, which is the whole of what the marker reports. */
  const shaped = PLAYER_RATE_KNOBS.some((knob) => player[knob] !== defaults[knob]);

  return (
    <div className="relative">
      <Knob
        label={PLAYER_KNOB_LABELS.hold}
        says={PLAYER_KNOB_TOOLTIPS.hold}
        size="sm"
        value={player.hold}
        min={PLAYER_HOLD_MIN}
        max={PLAYER_HOLD_MAX}
        defaultValue={PLAYER_HOLD_MIN}
        step={1}
        onChange={onHold}
      />
      {/* The marker shape a lane's preview hangs off, one control along (src/ui/ParameterKnob.tsx),
          with two differences this one needs. It is always drawn rather than waiting on a held
          modifier, because it is the only way to the three amounts and a control nothing can open
          is not a control. And it is lit when any of them is off its default, so the card says at
          a glance that this rate walk has been shaped — a dial reading 4 looks the same whether
          the changes it counts are certain or a coin flip. */}
      <Popover>
        <PopoverTrigger
          aria-label={`${yardLabel(deck)} ${PLAYER_RATE_LABEL}`}
          className={`absolute top-0 right-0 size-2 rounded-md ${
            shaped ? "bg-primary" : "bg-muted-foreground"
          }`}
        />
        {/* Opens instantly, for the reason the effect picker's does: ./scripts/drive clicks into
            this popup, and waiting out an enter and an exit costs the gate a scenario's worth of
            time for nothing a person would notice (0056, src/ui/EffectPicker.tsx). */}
        <PopoverContent side="top" align="end" className="w-auto duration-0">
          <PopoverTitle>{PLAYER_RATE_LABEL}</PopoverTitle>
          <div className="flex items-end gap-2">
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
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
