/** @role One deck's registry-rendered ordered effect rack and its performance commands. */
// Every import is either a registry the rack renders from or a control it renders with, so the
// count tracks the rack's surface rather than this file's complexity. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import { useCallback } from "react";

import { ACTION_TOOLTIPS, BYPASS_TOOLTIP, effectName, yardLabel } from "@/lib/copy";
import type { Instrument } from "@/app/facade";
import type { EffectInstanceId, EffectWidth } from "@/audio/effects/contract";
import { effectById } from "@/audio/effects/registry";
import { isAutomationParam, paramIn } from "@/audio/params";
import type { SessionEffect } from "@/state/session";
import type { DeckId, DeckState } from "@/state/store";
import { Button } from "@/ui/components/button";
import { Card, CardAction, CardContent, CardHeader } from "@/ui/components/card";
import { Switch } from "@/ui/components/switch";
import { Toggle } from "@/ui/components/toggle";
import { duplicateEffectCommand } from "@/ui/actions";
import { EffectPicker } from "@/ui/EffectPicker";
import { ACTION_ICONS } from "@/ui/icons";
import { ParameterKnob } from "@/ui/ParameterKnob";
import { Says } from "@/ui/Says";
import { RACK_CARD_ATTRIBUTE, type DragHandleProps, useRackDrag } from "@/ui/rackDrag";
// oxlint-enable import/max-dependencies

/**
 * The three operations a performer reaches for on a card's head. Every one of them is the ordinary
 * serialisable command ./scripts/drive can send too — a control needing any other path would mean
 * the seam is wrong (0023, docs/plan.md §4). Reordering is the fourth and is a gesture rather than
 * a button, so it lives on the handle beside the label instead (0062).
 */
// Three sibling controls and the handler each one sends: the length tracks how many operations
// a card's head offers, and splitting it means a component per button. See 0007.
// oxlint-disable-next-line max-lines-per-function
export function SlotControls({
  instrument,
  deck,
  instance,
  label,
  bypassed,
}: {
  instrument: Instrument;
  deck: DeckId;
  instance: EffectInstanceId;
  label: string;
  bypassed: boolean;
}) {
  const toggleRunning = useCallback(
    (running: boolean) => {
      instrument.send({ t: "effect.bypass", deck, instance, bypassed: !running });
    },
    [instrument, deck, instance],
  );
  const remove = useCallback(() => {
    instrument.send({ t: "effect.remove", deck, instance });
  }, [instrument, deck, instance]);
  // One command for one press: the copy's values and its bypass are the reducer's, so this
  // control never sends the three commands a copy expands into (0078, 0092).
  const duplicate = useCallback(() => {
    instrument.send(duplicateEffectCommand(deck, instance));
  }, [instrument, deck, instance]);

  return (
    <>
      {/* Copy, then trash, then the on switch, reading left to right along the card's head — the
          same order and the same icons the yard's own group carries (0055, 0078). */}
      <Says what={ACTION_TOOLTIPS.duplicate}>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={`Duplicate ${label} on ${yardLabel(deck)}`}
          onClick={duplicate}
        >
          <ACTION_ICONS.duplicate />
        </Button>
      </Says>
      <Says what={ACTION_TOOLTIPS.remove}>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={`Remove ${label} from ${yardLabel(deck)}`}
          onClick={remove}
        >
          <ACTION_ICONS.remove />
        </Button>
      </Says>
      {/* Running is a state the instance is left in and it is on or it is off, which is what a
          Switch is; a state does not also carry an icon (0055). On is the effect running and off
          is the effect bypassed, which is the way round every switch reads — so it stands with no
          word beside it, the meaning being in its name. The control beside it happens once per
          press and stays a Button (P25). */}
      <Says what={BYPASS_TOOLTIP}>
        <Switch
          size="sm"
          checked={!bypassed}
          aria-label={`Enable ${label} on ${yardLabel(deck)}`}
          onCheckedChange={toggleRunning}
        />
      </Says>
    </>
  );
}

/**
 * How much of the rack a card of each declared width takes. The gap is `gap-2`, so two halves and
 * the space between them are the row — subtracting half of it is what makes two abreast fit.
 */
const WIDTH_CLASS: Record<EffectWidth, string> = {
  half: "w-full sm:w-[calc(50%-0.25rem)]",
  full: "w-full",
};

/**
 * Which of this effect's instances this one is, counted over the rack's ids rather than over its
 * order: the ordinal is the number of instances of the same effect whose opaque durable id sorts
 * before this one, plus one. Reordering moves the cards and never the ids, so a drag cannot
 * renumber a card (0076).
 */
function effectOrdinal(effects: readonly SessionEffect[], entry: SessionEffect): number {
  return effects.filter((other) => other.effect === entry.effect && other.id < entry.id).length + 1;
}

/** One card of the rack: its head, then its instance's registry-driven knobs. */
// One card's props, its head and its knobs. See 0007.
// oxlint-disable-next-line max-lines-per-function
function EffectCard({
  instrument,
  deck,
  entry,
  ordinal,
  handle,
  playing,
}: {
  instrument: Instrument;
  deck: DeckId;
  entry: SessionEffect;
  ordinal: number;
  handle: DragHandleProps;
  playing: boolean;
}) {
  const plugin = effectById(entry.effect);
  // Two delays are two cards with the same plugin label, so the ordinal disambiguates every
  // control name — an instance id is opaque and says nothing a performer could read (0030).
  const label = `${plugin.label} ${ordinal}`;

  return (
    <Card
      size="sm"
      aria-label={label}
      {...{ [RACK_CARD_ATTRIBUTE]: "" }}
      className={`${WIDTH_CLASS[plugin.width]} data-[dragging=true]:relative data-[dragging=true]:z-10`}
    >
      <CardHeader>
        {/* The grip is the leftmost thing on the card because it is what a pointer aims at; the
            label reads out of it. Both the drag and the arrow keys on it send one reorder. */}
        <div className="flex items-center gap-2">
          <Says what={ACTION_TOOLTIPS.reorder}>
            <Button
              size="icon-sm"
              variant="ghost"
              className="cursor-grab touch-none"
              aria-label={`Reorder ${label} on ${yardLabel(deck)}`}
              {...handle}
            >
              <ACTION_ICONS.reorder />
            </Button>
          </Says>
          {/* What it is and which one it is, then the name that instance wears — one reading,
              two weights, so the card can be found by either half (0076). */}
          <div className="type-readout">{label}</div>
          <div className="type-readout text-muted-foreground">
            {effectName(entry.effect, entry.id)}
          </div>
        </div>
        <CardAction className="flex items-center gap-1">
          <SlotControls
            instrument={instrument}
            deck={deck}
            instance={entry.id}
            label={label}
            bypassed={entry.bypassed}
          />
        </CardAction>
      </CardHeader>
      {/* A bypassed effect keeps its knobs live: the values it comes back at are set here. */}
      <CardContent
        className={
          entry.bypassed
            ? "flex flex-wrap items-end gap-2 opacity-50"
            : "flex flex-wrap items-end gap-2"
        }
      >
        {plugin.params.map((param) => (
          <ParameterKnob
            key={param.id}
            instrument={instrument}
            deck={deck}
            instance={entry.id}
            name={label}
            param={param.id}
            value={paramIn(entry.params, param.id)}
            lane={(isAutomationParam(param.id) ? entry.automation[param.id] : undefined) ?? null}
            playing={playing}
          />
        ))}
      </CardContent>
    </Card>
  );
}

// The rack's whole layout: one heading, the cards, the drop slot they land in and the picker.
// It is JSX with one `map` in it and nothing to lift out that would not need the drag's refs
// threaded after it. See 0007.
// oxlint-disable-next-line max-lines-per-function
export function EffectRack({
  instrument,
  deck,
  state,
  fold,
}: {
  instrument: Instrument;
  deck: DeckId;
  state: DeckState;
  /**
   * Whether this yard's effects are folded shut, and the call that changes it — held by the yard
   * rather than here, because this rack is rendered under the yard's own fold and state living
   * in it would be thrown away every time that one is used. The pair is passed whole because the
   * rack both reads it and sets it. A view preference either way: no command, nothing durable,
   * no history entry (plan §2).
   */
  fold: [folded: boolean, setFolded: (folded: boolean) => void];
}) {
  const [folded, setFolded] = fold;
  const { listRef, slotRef, listProps, dragHandle, abandon } = useRackDrag(instrument, deck);
  /**
   * Folding takes the list the gesture captured on with it, which is the one thing that capture
   * does not survive, so a drag in flight is dropped here rather than left in a ref no later
   * press can get past (src/ui/rackDrag.ts).
   */
  const onFold = useCallback(
    (next: boolean) => {
      abandon();
      setFolded(next);
    },
    [abandon, setFolded],
  );

  return (
    // One instance per card, each declaring its own width: two halves lay abreast on a wide
    // viewport and stack on a narrow one, and either way a card is one labelled thing a person
    // can tell from its neighbour (0030, P48).
    <section className="flex flex-col items-start gap-2" aria-label={`${yardLabel(deck)} Effects`}>
      {/* The heading and the fold that shuts everything under it. Folded or open is a state the
          section is left in, so it is a Toggle reporting `aria-pressed`, and the caret turns with
          the state rather than being a second icon (0055) — the yard's own fold again, one level
          in. Named "Collapse Effects on Yard A" rather than "…Yard A Effects": the section itself
          carries that name, and a control whose label contains another's is two things one query
          finds. */}
      <div className="flex items-center gap-1">
        <div className="type-eyebrow text-muted-foreground">Effects</div>
        <Toggle
          size="sm"
          pressed={folded}
          aria-label={`Collapse Effects on ${yardLabel(deck)}`}
          onPressedChange={onFold}
        >
          <ACTION_ICONS.collapse className="transition-transform group-aria-pressed/toggle:rotate-180" />
        </Toggle>
      </div>
      {folded ? null : (
        <>
          {/* Exactly the cards, in order, plus the one placeholder they are dropped onto — which is
          why the gesture reads the cards by their own attribute rather than by being children. */}
          <div
            ref={listRef}
            className="relative flex w-full flex-wrap items-start gap-2"
            {...listProps}
          >
            {state.effects.map((entry, index) => (
              <EffectCard
                key={entry.id}
                instrument={instrument}
                deck={deck}
                entry={entry}
                ordinal={effectOrdinal(state.effects, entry)}
                handle={dragHandle(index, entry.id, state.effects.length - 1)}
                playing={state.playing}
              />
            ))}
            {/* The slot a live drag would land in, filled and sized from the layout the gesture
            measured. Hidden between drags, so it costs a hidden div and nothing else. */}
            <div
              ref={slotRef}
              hidden
              aria-hidden="true"
              data-slot="rack-landing"
              className="pointer-events-none absolute bg-accent"
            />
          </div>
          {/* The add affordance is its own control outside the instance cards, and it is one
              picker rendered from the registry rather than a button per entry (P26). */}
          <EffectPicker instrument={instrument} deck={deck} />
        </>
      )}
    </section>
  );
}
