/**
 * @role The window a hand puts on what an automator's run may draw: one popover per pool entry on
 *   the automator's card, wearing that entry's own icon, holding one range per parameter that
 *   entry's arrivals are actually drawn at (0208).
 * @instead What the run does with a window → src/audio/effects/automator.ts. Which parameters an
 *   arrival draws → `drawnParamIds` there, which this reads rather than restates. What an entry's
 *   icon is → its own plugin file in src/audio/effects/ (0055).
 */
// Every import is either a registry this menu is built from or a control it is built with, so the
// count tracks the pool's surface rather than this file's complexity, exactly as the rack's own
// does. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import { useCallback, useState } from "react";

import type { Instrument } from "@/app/facade";
import { drawnParamIds } from "@/audio/effects/automator";
import type { EffectInstanceId } from "@/audio/effects/contract";
import {
  EFFECTS,
  isBoundableParam,
  isGrowable,
  type EffectParamId,
} from "@/audio/effects/registry";
import { PARAMS } from "@/audio/params";
import { BOUNDS_ANY, BOUNDS_MENU, boundsLabel } from "@/lib/copyAuto";
import { denormalize, normalize } from "@/lib/range";
import type { EffectBound, EffectBounds } from "@/state/session";
import type { DeckId } from "@/state/store";
import { Button } from "@/ui/components/button";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/ui/components/popover";
import { Slider } from "@/ui/components/slider";
import { INSTANT_POPUP } from "@/ui/shell";
// oxlint-enable import/max-dependencies

/** The pool a run draws from, which is every entry that says how it is turned down to nothing. */
const POOL = EFFECTS.filter((effect) => isGrowable(effect));

/** How finely a window's ends move. The dial's own space, so a log range is bounded by octaves. */
const BOUND_STEP = 0.01;

/**
 * One parameter's window, in that parameter's own space rather than its units: a cutoff bounded
 * between two thumbs travels by octaves the way its knob does, so the two ends of the window mean
 * what the dial they bound means (0035, `normalize`).
 *
 * The whole range is not a window at all: dragged wide open the command clears the entry, so a
 * parameter with nothing to say about it stores nothing and draws inside its own declaration.
 */
// One window: its two ends, the sentence it reads as and the one command a released drag sends.
// Splitting it means handing the parameter's own space between helpers with one caller each. 0007.
// oxlint-disable-next-line max-lines-per-function
function BoundRow({
  instrument,
  deck,
  instance,
  param,
  bound,
  name,
}: {
  instrument: Instrument;
  deck: DeckId;
  instance: EffectInstanceId;
  param: EffectParamId;
  bound: EffectBound | undefined;
  name: string;
}) {
  const spec = PARAMS[param];
  const held: readonly number[] =
    bound === undefined
      ? [0, 1]
      : [
          normalize(bound.min, spec.min, spec.max, spec.curve),
          normalize(bound.max, spec.min, spec.max, spec.curve),
        ];
  const [range, setRange] = useState<readonly number[]>(held);
  const move = useCallback((value: number | readonly number[]) => {
    setRange(typeof value === "number" ? [value, value] : value);
  }, []);
  // One command per gesture, never one per pointer event: a window is a durable edit and a drag
  // that wrote one per frame would be a history nobody can walk back (0065, 0090).
  const commit = useCallback(
    (value: number | readonly number[]) => {
      const next = typeof value === "number" ? [value, value] : value;
      const low = next[0] ?? 0;
      const high = next[1] ?? 1;
      instrument.send({
        t: "effect.bounds",
        deck,
        instance,
        param,
        bounds:
          low <= 0 && high >= 1
            ? null
            : {
                min: denormalize(low, spec.min, spec.max, spec.curve),
                max: denormalize(high, spec.min, spec.max, spec.curve),
              },
      });
    },
    [instrument, deck, instance, param, spec],
  );

  return (
    <div className="flex w-full flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="type-readout">{spec.label}</span>
        <span className="type-readout text-muted-foreground tabular-nums">
          {range[0] !== undefined && range[1] !== undefined && range[0] <= 0 && range[1] >= 1
            ? BOUNDS_ANY
            : boundsLabel(
                denormalize(range[0] ?? 0, spec.min, spec.max, spec.curve),
                denormalize(range[1] ?? 1, spec.min, spec.max, spec.curve),
                spec.precision,
              )}
        </span>
      </div>
      <Slider
        value={range}
        min={0}
        max={1}
        step={BOUND_STEP}
        aria-label={`${name} ${spec.label} bounds`}
        onValueChange={move}
        onValueCommitted={commit}
      />
    </div>
  );
}

/** One pool entry's popover: its own icon, and a window per parameter its arrivals are drawn at. */
// A trigger, a title and one row per drawn parameter: the length tracks how many parameters the
// widest entry in the pool draws, not how much logic there is. 0007.
// oxlint-disable-next-line max-lines-per-function
function BoundsEntry({
  instrument,
  deck,
  instance,
  plugin,
  bounds,
  name,
}: {
  instrument: Instrument;
  deck: DeckId;
  instance: EffectInstanceId;
  plugin: (typeof POOL)[number];
  bounds: EffectBounds;
  name: string;
}) {
  const Icon = plugin.icon;
  const label = `${name} ${plugin.label} ${BOUNDS_MENU}`;
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button size="icon-sm" variant="ghost" aria-label={label}>
            <Icon />
          </Button>
        }
      />
      {/* Opens instantly, for the reason the effect picker's does: ./scripts/drive presses it. */}
      <PopoverContent side="bottom" align="start" className={`w-64 gap-3 ${INSTANT_POPUP}`}>
        <PopoverTitle>{`${plugin.label} ${BOUNDS_MENU}`}</PopoverTitle>
        {/* Exactly the parameters this entry's arrivals are drawn at, narrowed through the one
            list the durable shape and the wire are both checked against (0208). */}
        {drawnParamIds(plugin)
          .flatMap((id) => (isBoundableParam(id) ? [id] : []))
          .map((id) => (
            <BoundRow
              // Keyed on the window itself, not only the parameter: the thumbs are local state
              // seeded from the durable value, so a window that moves under this row — an undo of
              // the drag that set it, a clip applied behind the popover — remounts it rather than
              // leaving two thumbs the next drag would commit straight back (0026, plan §2).
              key={`${id}:${bounds[id]?.min ?? ""}:${bounds[id]?.max ?? ""}`}
              instrument={instrument}
              deck={deck}
              instance={instance}
              param={id}
              bound={bounds[id]}
              name={name}
            />
          ))}
      </PopoverContent>
    </Popover>
  );
}

/**
 * The whole menu: one popover per entry in the pool, in the order the pool holds them. Built from
 * the registry rather than from a list here, so an effect that joins the pool tomorrow is bounded
 * by existing — the same rule the picker follows for adding one (0016, 0208).
 */
export function BoundsMenu({
  instrument,
  deck,
  instance,
  bounds,
  name,
}: {
  instrument: Instrument;
  deck: DeckId;
  instance: EffectInstanceId;
  bounds: EffectBounds;
  name: string;
}) {
  return (
    <div data-slot="bounds-menu" className="flex items-center gap-1" aria-label={BOUNDS_MENU}>
      <span className="type-eyebrow text-muted-foreground">{BOUNDS_MENU}</span>
      {POOL.map((plugin) => (
        <BoundsEntry
          key={plugin.id}
          instrument={instrument}
          deck={deck}
          instance={instance}
          plugin={plugin}
          bounds={bounds}
          name={name}
        />
      ))}
    </div>
  );
}
