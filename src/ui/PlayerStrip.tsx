/**
 * @role One deck's player as a strip under its loop: the switch that holds the pattern, the
 *   variation it walks by, the three amounts it walks with, and the seed it draws from — one
 *   `deck.player` command per gesture, carrying the whole spec (0089).
 * @instead What a step becomes in sound → src/audio/deck.ts. What a seed unfolds into →
 *   src/lib/player.ts. Nothing here draws a pattern; it only says which one the deck holds.
 */
import { useCallback } from "react";

import type { Instrument } from "@/app/facade";
import {
  PLAYER_DISTANCE_MAX,
  PLAYER_DISTANCE_MIN,
  PLAYER_GATE_MAX,
  PLAYER_GATE_MIN,
  PLAYER_REPEATS_MAX,
  PLAYER_REPEATS_MIN,
  PLAYER_SEED_MAX,
  PLAYER_VARIATIONS,
  type PlayerSpec,
  type PlayerVariation,
} from "@/lib/player";
import type { DeckId, DeckState } from "@/state/store";
import { Button } from "@/ui/components/button";
import { ToggleGroup, ToggleGroupItem } from "@/ui/components/toggle-group";
import { Toggle } from "@/ui/components/toggle";
import { ACTION_ICONS } from "@/ui/icons";
import { Knob } from "@/ui/Knob";

/**
 * What pressing the switch holds: the middle of every range, walking both ways, with nothing
 * cutting a repeat. A performer turns the module on to hear jumps; a stutter is the next gesture.
 */
const PLAYER_DEFAULTS = {
  variation: "wander",
  distance: 4,
  repeats: 4,
  gate: 0,
} as const satisfies Omit<PlayerSpec, "seed">;

/**
 * A seed, drawn once, at the gesture that asks for one. `Math.random()` is exactly right here and
 * exactly wrong a layer down: this runs on a click and its result travels in the command, so the
 * session that was recorded is the session that replays. Nothing on a play-time or render path
 * draws anything (0089, 0068).
 */
const mintSeed = (): number => Math.floor(Math.random() * (PLAYER_SEED_MAX + 1));

/**
 * The group takes an array of selected values, and one built in the render would be a new array
 * on every frame the deck re-renders. There are exactly two, so both are built once.
 */
const VARIATION_VALUES: Record<PlayerVariation, string[]> = {
  forward: ["forward"],
  wander: ["wander"],
};

const VARIATION_ITEMS = PLAYER_VARIATIONS.map((variation) => (
  <ToggleGroupItem key={variation} value={variation}>
    {variation === "forward" ? "Forward" : "Wander"}
  </ToggleGroupItem>
));

/**
 * Controlled by the session throughout: every control reads the deck's own `player` and every
 * gesture sends the whole spec back, so no control can hold an opinion the instrument does not
 * share.
 *
 * A deck with no loop has nowhere to jump, so there is nothing to offer — unless it is already
 * holding a pattern, which a cleared loop leaves durably in place (0089). Hiding that one would
 * make a spec that is saved, archived and captured into every clip, and that silently starts
 * jumping again the moment a loop is set, unreachable by the only control that can clear it.
 */
// One callback per field, and the length is how many fields the module declares rather than how
// much this component decides. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function PlayerStrip({
  instrument,
  deck,
  state,
}: {
  instrument: Instrument;
  deck: DeckId;
  state: DeckState;
}) {
  const player = state.player;
  const send = useCallback(
    (next: PlayerSpec | null) => {
      instrument.send({ t: "deck.player", deck, player: next });
    },
    [instrument, deck],
  );
  const patch = useCallback(
    (fields: Partial<PlayerSpec>) => {
      if (player === null) return;
      send({ ...player, ...fields });
    },
    [player, send],
  );

  const onSwitch = useCallback(
    (pressed: boolean) => {
      send(pressed ? { seed: mintSeed(), ...PLAYER_DEFAULTS } : null);
    },
    [send],
  );
  const onReseed = useCallback(() => {
    patch({ seed: mintSeed() });
  }, [patch]);
  const onVariation = useCallback(
    (value: string[]) => {
      const [picked] = value;
      // Base UI clears the group when the pressed item was already on, and a variation is one of
      // two rather than an optional one: an empty pick is the one it already holds.
      const variation = PLAYER_VARIATIONS.find((declared) => declared === picked);
      if (variation !== undefined) patch({ variation });
    },
    [patch],
  );
  const onDistance = useCallback(
    (value: number) => {
      patch({ distance: Math.round(value) });
    },
    [patch],
  );
  const onRepeats = useCallback(
    (value: number) => {
      patch({ repeats: Math.round(value) });
    },
    [patch],
  );
  const onGate = useCallback(
    (value: number) => {
      patch({ gate: value });
    },
    [patch],
  );

  if (state.loop === null && player === null) return null;

  return (
    <div className="flex items-center gap-3">
      <Toggle size="sm" variant="outline" pressed={player !== null} onPressedChange={onSwitch}>
        <ACTION_ICONS.loop data-icon="inline-start" />
        Player
      </Toggle>
      {player === null ? null : (
        <>
          <ToggleGroup
            value={VARIATION_VALUES[player.variation]}
            onValueChange={onVariation}
            variant="outline"
            size="sm"
            spacing={0}
            aria-label="Player Variation"
          >
            {VARIATION_ITEMS}
          </ToggleGroup>
          <Knob
            label="Distance"
            size="xs"
            value={player.distance}
            min={PLAYER_DISTANCE_MIN}
            max={PLAYER_DISTANCE_MAX}
            defaultValue={PLAYER_DEFAULTS.distance}
            step={1}
            onChange={onDistance}
          />
          <Knob
            label="Repeats"
            size="xs"
            value={player.repeats}
            min={PLAYER_REPEATS_MIN}
            max={PLAYER_REPEATS_MAX}
            defaultValue={PLAYER_DEFAULTS.repeats}
            step={1}
            onChange={onRepeats}
          />
          <Knob
            label="Gate"
            size="xs"
            value={player.gate}
            min={PLAYER_GATE_MIN}
            max={PLAYER_GATE_MAX}
            defaultValue={PLAYER_DEFAULTS.gate}
            onChange={onGate}
          />
          <Button size="sm" variant="outline" onClick={onReseed}>
            <ACTION_ICONS.duplicate data-icon="inline-start" />
            Reseed
          </Button>
        </>
      )}
    </div>
  );
}
