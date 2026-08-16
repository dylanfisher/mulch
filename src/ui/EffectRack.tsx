/** @role One deck's registry-rendered ordered effect rack and its performance commands. */
// Every import is either a registry the rack renders from or a control it renders with, so the
// count tracks the rack's surface rather than this file's complexity. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import { useCallback } from "react";

import { yardLabel } from "@/lib/copy";
import type { Instrument } from "@/app/facade";
import type { EffectInstanceId } from "@/audio/effects/contract";
import { effectById } from "@/audio/effects/registry";
import { isAutomationParam, paramIn } from "@/audio/params";
import type { SessionEffect } from "@/state/session";
import type { DeckId, DeckState } from "@/state/store";
import { Button } from "@/ui/components/button";
import { Card, CardAction, CardContent, CardHeader } from "@/ui/components/card";
import { Toggle } from "@/ui/components/toggle";
import { EffectPicker } from "@/ui/EffectPicker";
import { ACTION_ICONS } from "@/ui/icons";
import { ParameterKnob } from "@/ui/ParameterKnob";
import { type DragHandleProps, useRackDrag } from "@/ui/rackDrag";
// oxlint-enable import/max-dependencies

/**
 * The two operations a performer reaches for on a card's head. Every one of them is the ordinary
 * serialisable command ./scripts/drive can send too — a control needing any other path would mean
 * the seam is wrong (0023, docs/plan.md §4). Reordering is the third and is a gesture rather than
 * a button, so it lives on the handle beside the label instead (0062).
 */
function SlotControls({
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
  const toggleBypass = useCallback(() => {
    instrument.send({ t: "effect.bypass", deck, instance, bypassed: !bypassed });
  }, [instrument, deck, instance, bypassed]);
  const remove = useCallback(() => {
    instrument.send({ t: "effect.remove", deck, instance });
  }, [instrument, deck, instance]);

  return (
    <>
      {/* Trash first and bypass after it, reading left to right along the card's head. */}
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label={`Remove ${label} from ${yardLabel(deck)}`}
        onClick={remove}
      >
        <ACTION_ICONS.remove />
      </Button>
      {/* Bypass is a state the instance is left in, so it is a Toggle and says so in
          `aria-pressed`; the one beside it happens once per press and stays a Button (P25). */}
      <Toggle
        size="sm"
        pressed={bypassed}
        aria-label={`Bypass ${label} on ${yardLabel(deck)}`}
        onPressedChange={toggleBypass}
      >
        <ACTION_ICONS.bypass data-icon="inline-start" />
        Bypass
      </Toggle>
    </>
  );
}

/** One card of the rack: its head, then its instance's registry-driven knobs. */
// One card's props, its head and its knobs. See 0007.
// oxlint-disable-next-line max-lines-per-function
function EffectCard({
  instrument,
  deck,
  entry,
  index,
  handle,
  playing,
}: {
  instrument: Instrument;
  deck: DeckId;
  entry: SessionEffect;
  index: number;
  handle: DragHandleProps;
  playing: boolean;
}) {
  const plugin = effectById(entry.effect);
  // Two delays are two cards with the same plugin label, so the position disambiguates every
  // control name — an instance id is opaque and says nothing a performer could read (0030).
  const label = `${plugin.label} ${index + 1}`;

  return (
    <Card
      size="sm"
      aria-label={label}
      className="w-full data-[dragging=true]:relative data-[dragging=true]:z-10"
    >
      <CardHeader>
        {/* The grip is the leftmost thing on the card because it is what a pointer aims at; the
            label reads out of it. Both the drag and the arrow keys on it send one reorder. */}
        <div className="flex items-center gap-2">
          <Button
            size="icon-sm"
            variant="ghost"
            className="cursor-grab touch-none"
            aria-label={`Reorder ${label} on ${yardLabel(deck)}`}
            {...handle}
          >
            <ACTION_ICONS.reorder />
          </Button>
          <div className="type-readout text-muted-foreground">{label}</div>
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

export function EffectRack({
  instrument,
  deck,
  state,
}: {
  instrument: Instrument;
  deck: DeckId;
  state: DeckState;
}) {
  const { listRef, listProps, dragHandle } = useRackDrag(instrument, deck);

  return (
    // One instance per card, stacked: two delays are two cards a person can tell apart by
    // position and label, which a single wrapping line of controls could not do (0030).
    <section className="flex flex-col items-start gap-2" aria-label={`${yardLabel(deck)} Effects`}>
      <div className="type-eyebrow text-muted-foreground">Effects</div>
      {/* Exactly the cards, in order: the drag measures its geometry from these children, so
          anything else in here would be a card the gesture thought it could move. */}
      <div ref={listRef} className="flex w-full flex-col gap-2" {...listProps}>
        {state.effects.map((entry, index) => (
          <EffectCard
            key={entry.id}
            instrument={instrument}
            deck={deck}
            entry={entry}
            index={index}
            handle={dragHandle(index, entry.id, state.effects.length - 1)}
            playing={state.playing}
          />
        ))}
      </div>
      {/* The add affordance is its own control outside the instance cards, and it is one picker
          rendered from the registry rather than a button per entry (P26). */}
      <EffectPicker instrument={instrument} deck={deck} />
    </section>
  );
}
