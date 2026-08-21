/**
 * @role One deck's jumps as a card in the rack's own language: a heading that folds it, the
 *   switch that holds the pattern, the variation it walks by, the amounts it walks and clocks
 *   itself with, and the seed it draws from — one `deck.player` command per gesture, carrying
 *   the whole spec (0089, P74).
 * @instead What a step becomes in sound → src/audio/deck.ts. What a seed unfolds into →
 *   src/lib/player.ts. Nothing here draws a pattern; it only says which one the deck holds.
 */
// Over the cap, and everything over it is either a word this card says or a control it says it
// with: the words the two variations are told apart by, the card's own primitives, and the
// registry-free knobs. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import { useCallback } from "react";

import type { Instrument } from "@/app/facade";
import {
  PLAYER_BURST_MAX,
  PLAYER_BURST_MIN,
  PLAYER_DISTANCE_MAX,
  PLAYER_DISTANCE_MIN,
  PLAYER_DRIFT_MAX,
  PLAYER_DRIFT_MIN,
  PLAYER_GATE_MAX,
  PLAYER_GATE_MIN,
  PLAYER_REPEATS_MAX,
  PLAYER_REPEATS_MIN,
  PLAYER_REST_MAX,
  PLAYER_REST_MIN,
  PLAYER_SEED_MAX,
  PLAYER_VARIATIONS,
  PLAYER_VARY_MAX,
  PLAYER_VARY_MIN,
  type PlayerSpec,
  type PlayerVariation,
} from "@/lib/player";
import {
  ACTION_TOOLTIPS,
  PLAYER_KNOB_LABELS,
  PLAYER_KNOB_TOOLTIPS,
  PLAYER_LABEL,
  PLAYER_TOOLTIP,
  PLAYER_VARIATION_TOOLTIPS,
  RESEED_LABEL,
  yardLabel,
} from "@/lib/copy";
import type { DeckId, DeckState } from "@/state/store";
import { Button } from "@/ui/components/button";
import { Card, CardAction, CardContent, CardHeader } from "@/ui/components/card";
import { Switch } from "@/ui/components/switch";
import { ToggleGroup, ToggleGroupItem } from "@/ui/components/toggle-group";
import { Toggle } from "@/ui/components/toggle";
import { ACTION_ICONS } from "@/ui/icons";
import { Knob } from "@/ui/Knob";
import { Says } from "@/ui/Says";
// oxlint-enable import/max-dependencies

/**
 * What pressing the switch holds: the middle of every range, walking both ways, with nothing
 * cutting a repeat. A performer turns the module on to hear jumps; a stutter is the next gesture.
 *
 * The player's own clock starts switched off in the same sense — a burst that is exactly the slot
 * it started in, nothing varying it, no rest between jumps and no drift — so the module still
 * sounds like plain jumps until a knob asks for something else (P67).
 */
const PLAYER_DEFAULTS = {
  variation: "wander",
  distance: 4,
  repeats: 4,
  gate: 0,
  burst: 1,
  vary: 0,
  rest: 0,
  drift: 0,
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

/**
 * Both walks, each saying which one it is. A `Tooltip` root draws no element of its own and the
 * popup is portalled away, so the group still holds exactly its two items and the roving focus
 * across them is untouched. The words are the only thing telling these two apart — a variation is
 * a choice between two named things and carries no icon (0055, P65).
 */
const VARIATION_ITEMS = PLAYER_VARIATIONS.map((variation) => (
  <Says key={variation} what={PLAYER_VARIATION_TOOLTIPS[variation]}>
    <ToggleGroupItem value={variation}>
      {variation === "forward" ? "Forward" : "Wander"}
    </ToggleGroupItem>
  </Says>
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
export function PlayerCard({
  instrument,
  deck,
  state,
  fold,
}: {
  instrument: Instrument;
  deck: DeckId;
  state: DeckState;
  /**
   * Whether this card is folded shut, and the call that changes it — held by the yard rather than
   * here, for the reason the rack's own fold is (src/ui/EffectRack.tsx). A view preference either
   * way: no command, nothing durable, no history entry (plan §2). It is a separate thing from the
   * switch beside it, which is durable and re-arms the transport: folding must never be a way of
   * silencing this, and silencing it must never be the only way of putting it away (P74).
   */
  fold: [folded: boolean, setFolded: (folded: boolean) => void];
}) {
  const [folded, setFolded] = fold;
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
  const onBurst = useCallback(
    (value: number) => {
      patch({ burst: value });
    },
    [patch],
  );
  const onVary = useCallback(
    (value: number) => {
      patch({ vary: value });
    },
    [patch],
  );
  const onRest = useCallback(
    (value: number) => {
      patch({ rest: value });
    },
    [patch],
  );
  const onDrift = useCallback(
    (value: number) => {
      patch({ drift: Math.round(value) });
    },
    [patch],
  );

  if (state.loop === null && player === null) return null;

  return (
    // Full width, below the drift and above the rack, because what it moves is where inside the
    // loop the deck is reading — the transport's, never an effect's (0089) — but it is a card in
    // the same language every other thing a yard holds is drawn in (P74).
    <Card size="sm" className="w-full" aria-label={`${yardLabel(deck)} ${PLAYER_LABEL}`}>
      <CardHeader>
        {/* The heading is the fold, the word inside the control and the caret beside it, the way
            the rack's is (0106). Folding hides the numbers and leaves the switch: putting the
            card away and silencing it are two different things and this is the one that is not
            durable. */}
        <Says what={ACTION_TOOLTIPS.collapse}>
          <Toggle
            size="sm"
            className="-ml-2.5 text-muted-foreground"
            pressed={folded}
            // Nothing under it to fold while the switch is off: the card is then its own heading
            // and that one switch, so the fold is offered but cannot be pressed into doing
            // nothing.
            disabled={player === null}
            onPressedChange={setFolded}
          >
            <span className="type-eyebrow">{PLAYER_LABEL}</span>
            <ACTION_ICONS.collapse
              data-icon="inline-end"
              className="transition-transform group-aria-pressed/toggle:rotate-180"
            />
          </Toggle>
        </Says>
        <CardAction className="flex items-center gap-1">
          {/* Holding a pattern is a state the yard is left in and it is on or it is off, which is
              what a Switch is — the rack card's own switch, one card along (0055). */}
          <Says what={PLAYER_TOOLTIP}>
            <Switch
              size="sm"
              checked={player !== null}
              aria-label={`Enable ${PLAYER_LABEL} on ${yardLabel(deck)}`}
              onCheckedChange={onSwitch}
            />
          </Says>
        </CardAction>
      </CardHeader>
      {folded || player === null ? null : (
        <CardContent className="flex flex-wrap items-end gap-2">
          <ToggleGroup
            value={VARIATION_VALUES[player.variation]}
            onValueChange={onVariation}
            variant="outline"
            size="sm"
            spacing={0}
            aria-label={`${PLAYER_LABEL} Variation`}
          >
            {VARIATION_ITEMS}
          </ToggleGroup>
          {/* Every dial at the rack's own size, saying what it is and in what unit — so the two
              line boxes a caption spends are spent here too and a row holding this card measures
              one height (0093, P65). */}
          <Knob
            label={PLAYER_KNOB_LABELS.distance}
            says={PLAYER_KNOB_TOOLTIPS.distance}
            size="sm"
            value={player.distance}
            min={PLAYER_DISTANCE_MIN}
            max={PLAYER_DISTANCE_MAX}
            defaultValue={PLAYER_DEFAULTS.distance}
            step={1}
            onChange={onDistance}
          />
          <Knob
            label={PLAYER_KNOB_LABELS.repeats}
            says={PLAYER_KNOB_TOOLTIPS.repeats}
            size="sm"
            value={player.repeats}
            min={PLAYER_REPEATS_MIN}
            max={PLAYER_REPEATS_MAX}
            defaultValue={PLAYER_DEFAULTS.repeats}
            step={1}
            onChange={onRepeats}
          />
          <Knob
            label={PLAYER_KNOB_LABELS.gate}
            says={PLAYER_KNOB_TOOLTIPS.gate}
            size="sm"
            value={player.gate}
            min={PLAYER_GATE_MIN}
            max={PLAYER_GATE_MAX}
            defaultValue={PLAYER_DEFAULTS.gate}
            onChange={onGate}
          />
          <Knob
            label={PLAYER_KNOB_LABELS.burst}
            says={PLAYER_KNOB_TOOLTIPS.burst}
            size="sm"
            value={player.burst}
            min={PLAYER_BURST_MIN}
            max={PLAYER_BURST_MAX}
            defaultValue={PLAYER_DEFAULTS.burst}
            onChange={onBurst}
          />
          <Knob
            label={PLAYER_KNOB_LABELS.vary}
            says={PLAYER_KNOB_TOOLTIPS.vary}
            size="sm"
            value={player.vary}
            min={PLAYER_VARY_MIN}
            max={PLAYER_VARY_MAX}
            defaultValue={PLAYER_DEFAULTS.vary}
            onChange={onVary}
          />
          <Knob
            label={PLAYER_KNOB_LABELS.rest}
            says={PLAYER_KNOB_TOOLTIPS.rest}
            size="sm"
            value={player.rest}
            min={PLAYER_REST_MIN}
            max={PLAYER_REST_MAX}
            defaultValue={PLAYER_DEFAULTS.rest}
            onChange={onRest}
          />
          <Knob
            label={PLAYER_KNOB_LABELS.drift}
            says={PLAYER_KNOB_TOOLTIPS.drift}
            size="sm"
            value={player.drift}
            min={PLAYER_DRIFT_MIN}
            max={PLAYER_DRIFT_MAX}
            defaultValue={PLAYER_DEFAULTS.drift}
            step={1}
            onChange={onDrift}
          />
          <Says what={ACTION_TOOLTIPS.reseed}>
            <Button size="sm" variant="outline" onClick={onReseed}>
              <ACTION_ICONS.reseed data-icon="inline-start" />
              {RESEED_LABEL}
            </Button>
          </Says>
        </CardContent>
      )}
    </Card>
  );
}
