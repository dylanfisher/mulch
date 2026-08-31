/**
 * @role The pool a card reaches: a grid of buttons, one per entry, each wearing that entry's own
 *   icon and label and opening a popover that says how often it is drawn and inside what — its
 *   weight at the head, then one range per parameter its arrivals are actually drawn at (0208,
 *   P172).
 * @instead What the run does with a weight or a window → src/audio/effects/automator.ts. Which
 *   parameters an arrival draws → `drawnParamIds` there, which this reads rather than restates.
 *   Which parameter is which entry's weight → `WEIGHT_OF` in ./automatorParams.ts. What an entry's
 *   icon is → its own plugin file in src/audio/effects/ (0055).
 */
// Every import is either a registry this menu is built from or a control it is built with, so the
// count tracks the pool's surface rather than this file's complexity, exactly as the rack's own
// does. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import { useCallback, useState } from "react";

import type { Instrument } from "@/app/facade";
import { drawnParamIds, type GrowablePlugin } from "@/audio/effects/automator";
import type { EffectInstanceId } from "@/audio/effects/contract";
import { WEIGHT_OF } from "@/audio/effects/automatorParams";
import {
  EFFECTS,
  isBoundableParam,
  isGrowable,
  type EffectParamId,
} from "@/audio/effects/registry";
import { PARAMS, paramIn, type EffectParamValues, type ParamId } from "@/audio/params";
import { BOUNDS_ANY, BOUNDS_MENU, boundsLabel, WEIGHT_LABEL } from "@/lib/copyAuto";
import { PARAM_TOOLTIPS, readAt } from "@/lib/copyParams";
import { denormalize, normalize } from "@/lib/range";
import type { EffectBound, EffectBounds } from "@/state/session";
import type { DeckId } from "@/state/store";
import { Button } from "@/ui/components/button";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/ui/components/popover";
import { Says } from "@/ui/Says";
import { Slider } from "@/ui/components/slider";
import { INSTANT_POPUP } from "@/ui/shell";
// oxlint-enable import/max-dependencies

/**
 * How finely a slider in this popover moves — a window's ends and the weight at its head alike.
 * The parameter's own space, so a log range is bounded by octaves.
 */
const SLIDER_STEP = 0.01;

/**
 * How often this entry is drawn, as one slider at the head of its own popover: the weight the pool
 * is sampled by, said where the windows it is drawn inside are said (P172).
 *
 * Exported because its release-only command is what the rack's own suite presses, and a weight
 * committed per pointer event is sixty crossfaded populations rather than one (0065, 0090, 0202).
 */
// One slider: its value, the number beside it and the one command a released drag sends. Splitting
// it means handing the parameter's own space between helpers with one caller each. 0007.
// oxlint-disable-next-line max-lines-per-function
export function WeightRow({
  instrument,
  deck,
  instance,
  param,
  value,
  name,
}: {
  instrument: Instrument;
  deck: DeckId;
  instance: EffectInstanceId;
  param: ParamId;
  value: number;
  name: string;
}) {
  const spec = PARAMS[param];
  /**
   * Where the thumb is while a drag is in flight, and null between drags — never seeded from the
   * durable value and never keyed on it. A row remounted whenever that number moved took its own
   * focused thumb out of the document on the first arrow key, because Base UI commits a keyboard
   * step immediately: the second press reached nothing. Held this way the durable value is what
   * the row draws the moment a gesture ends, so an undo or a clip behind the popover is picked up
   * without the remount that made it (0026, plan §2).
   */
  const [held, setHeld] = useState<number | null>(null);
  const at = held ?? normalize(value, spec.min, spec.max, spec.curve);
  const move = useCallback((next: number | readonly number[]) => {
    setHeld(typeof next === "number" ? next : (next[0] ?? 0));
  }, []);
  // One command per gesture, never one per pointer event: every weight is a `rebuild` parameter,
  // so a drag that wrote one per frame would be a crossfaded population per frame (0065, 0090,
  // 0202) — and a history nobody can walk back.
  const commit = useCallback(
    (next: number | readonly number[]) => {
      const ended = typeof next === "number" ? next : (next[0] ?? 0);
      setHeld(null);
      instrument.send({
        t: "param.set",
        deck,
        instance,
        param,
        value: denormalize(ended, spec.min, spec.max, spec.curve),
      });
    },
    [instrument, deck, instance, param, spec],
  );

  return (
    <div className="flex w-full flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        {/* The word says what the slider is and the sentence says what a weight means — that it is
            against the rest of the pool, and that none is never. A button rather than a plain
            span, so a keyboard reaches the sentence the way a resting pointer does, exactly as a
            dial's own caption does (P65, `Knob`). */}
        <Says what={PARAM_TOOLTIPS[param]!}>
          <button type="button" className="type-readout">
            {WEIGHT_LABEL}
          </button>
        </Says>
        <span className="type-readout text-muted-foreground tabular-nums">
          {readAt(denormalize(at, spec.min, spec.max, spec.curve), spec.precision)}
        </span>
      </div>
      <Slider
        value={at}
        min={0}
        max={1}
        step={SLIDER_STEP}
        aria-label={`${name} ${WEIGHT_LABEL}`}
        onValueChange={move}
        onValueCommitted={commit}
      />
    </div>
  );
}

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
        step={SLIDER_STEP}
        aria-label={`${name} ${spec.label} bounds`}
        onValueChange={move}
        onValueCommitted={commit}
      />
    </div>
  );
}

/**
 * One pool entry, whole: a button in that entry's own icon and word, opening how often it is drawn
 * and inside what. The weight leads, because it is the thing that decides whether the windows
 * under it are ever reached at all; the windows follow under the one word for what they are.
 *
 * The button is the entry rather than a badge on a dial: eight weights among the run's own dials
 * were eight numbers saying nothing about which of them was which, and the row of them said the
 * pool twice — once as knobs and once as badges (P153, P172).
 */
// A trigger, a title, the weight and one row per drawn parameter: the length tracks how many
// parameters the widest entry in the pool draws, not how much logic there is. 0007.
// oxlint-disable-next-line max-lines-per-function
export function PoolEntry({
  instrument,
  deck,
  instance,
  plugin,
  weight,
  value,
  bounds,
  name,
}: {
  instrument: Instrument;
  deck: DeckId;
  instance: EffectInstanceId;
  plugin: GrowablePlugin;
  /** Which parameter this entry's weight is, off `WEIGHT_OF` and never named a second time here. */
  weight: ParamId;
  /** What that weight is holding — the instance's own durable value, read once by the card. */
  value: number;
  bounds: EffectBounds;
  name: string;
}) {
  const Icon = plugin.icon;
  // What this entry is called wherever it is reached: the button's name, and the head of every
  // control's name inside the popover it opens, so two of them can never disagree (principle 1).
  const label = `${name} ${plugin.label}`;
  return (
    <Popover>
      <PopoverTrigger
        render={
          // The word beside the icon, because a grid of eight pictures is a rebus: the icon is what
          // finds the entry at a glance and the word is what settles which one it is (0055).
          <Button size="sm" variant="outline" className="w-full justify-start" aria-label={label}>
            <Icon data-icon="inline-start" />
            {plugin.label}
          </Button>
        }
      />
      {/* Opens instantly, for the reason the effect picker's does: ./scripts/drive presses it. */}
      <PopoverContent side="bottom" align="start" className={`w-64 gap-3 ${INSTANT_POPUP}`}>
        <PopoverTitle>{plugin.label}</PopoverTitle>
        <WeightRow
          // Keyed on the parameter alone and never on its value: the thumb is local only while a
          // drag is in flight, so a row that remounted whenever the number moved would be a row
          // that took its own focused thumb out of the document on the first arrow key.
          key={weight}
          instrument={instrument}
          deck={deck}
          instance={instance}
          param={weight}
          value={value}
          name={label}
        />
        <span className="type-eyebrow text-muted-foreground">{BOUNDS_MENU}</span>
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
              name={label}
            />
          ))}
      </PopoverContent>
    </Popover>
  );
}

/**
 * The pool entry each weight parameter speaks for, by that parameter's own id — off `WEIGHT_OF`,
 * the one list saying which parameter is which entry's weight and never a second one anywhere
 * (principle 1), so an effect joining the pool gets its button by existing, the way 0208 made it
 * bounded by existing. Only the automator declares an `auto.*` parameter, so no other card grows
 * a grid.
 */
const POOL_BY_WEIGHT: ReadonlyMap<string, GrowablePlugin> = new Map(
  EFFECTS.filter((effect) => isGrowable(effect)).flatMap((plugin) => {
    const weight = WEIGHT_OF[plugin.id];
    return weight === undefined ? [] : [[weight, plugin] as [string, GrowablePlugin]];
  }),
);

/**
 * Whether this dial is some pool entry's weight — which is what takes it off the knob row, because
 * a weight is about *which thing* while the dials it sat among are about the *shape* of a run
 * (P172).
 */
export const isPoolWeight = (param: ParamId): boolean => POOL_BY_WEIGHT.has(param);

/**
 * Every pool entry this card's own declaration reaches, as a grid of buttons two or three to a
 * row: a list of named things, read down the way a list is, rather than a row of numbers read
 * across the way dials are. A card declaring no weight grows no grid at all.
 */
export function PoolGrid({
  instrument,
  deck,
  instance,
  plugin,
  params,
  bounds,
  name,
}: {
  instrument: Instrument;
  deck: DeckId;
  instance: EffectInstanceId;
  /** The card's own entry, whose declared parameters say which of the pool it reaches. */
  plugin: (typeof EFFECTS)[number];
  /** That instance's durable values, read once by the card and handed down (principle 1). */
  params: EffectParamValues;
  bounds: EffectBounds;
  name: string;
}) {
  const pooled = plugin.params.flatMap((param) => {
    const entry = POOL_BY_WEIGHT.get(param.id);
    return entry === undefined ? [] : [{ weight: param.id, entry }];
  });
  if (pooled.length === 0) return null;
  return (
    // It takes the whole width, so it sits under the dials rather than among them.
    <div className="grid w-full grid-cols-2 gap-1 sm:grid-cols-3">
      {pooled.map(({ weight, entry }) => (
        <PoolEntry
          key={weight}
          instrument={instrument}
          deck={deck}
          instance={instance}
          plugin={entry}
          weight={weight}
          value={paramIn(params, weight)}
          bounds={bounds}
          name={name}
        />
      ))}
    </div>
  );
}
