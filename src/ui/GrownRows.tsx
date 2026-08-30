/**
 * @role The run an automator is holding, a row apiece: what each grown effect is, and how far in
 *   it stands. Painted from the per-frame read rather than from the session, because nothing here
 *   is stored — the run is drawn from a seed and re-derived (0204, 0205).
 * @instead The knobs that shape the run → the ordinary ParameterKnob row its card already draws in
 *   src/ui/EffectRack.tsx. What the run *is* → src/lib/effectGrowth.ts.
 */
// One import per thing a row says — the registry it reads an effect out of, the pool reading it
// labels a dial from, and the words — so the count tracks what a row shows. 0007.
// oxlint-disable import/max-dependencies
import { useCallback, useRef } from "react";

import type { Instrument } from "@/app/facade";
import type { EffectInstanceId } from "@/audio/effects/contract";
import { drawnParamIds } from "@/audio/effects/automator";
import {
  EFFECTS,
  effectById,
  isBoundableParam,
  isEffectId,
  isGrowable,
} from "@/audio/effects/registry";
import { PARAMS } from "@/audio/params";
import { GROWTH_COUNT_MAX } from "@/lib/effectGrowth";
import { effectName } from "@/lib/copyNames";
import { AUTOMATOR_EMPTY, AUTOMATOR_RUN_LABEL, growthLeft } from "@/lib/copyAuto";
import type { DeckId } from "@/state/store";
import { useOnFrame } from "@/ui/frame";
import { START, SWEEP } from "@/ui/Knob";
// oxlint-enable import/max-dependencies

/**
 * Every row the run could ever hold is mounted once and keeps its place whether or not it is
 * holding anything, so a population turning over is a visibility flag and a transform rather than
 * a React render — and the box is the same height however many places are filled, because a run
 * growing and letting go is not a reason for the page under it to move. Nothing per-frame goes
 * through state (docs/boundaries.md, 0070).
 */
const SLOTS = Array.from({ length: GROWTH_COUNT_MAX }, (_, at) => at);

/**
 * How many of a grown effect's own knobs one row draws: as many as the widest entry in the pool is
 * drawn at. Counted off that pool rather than written down, because what an arrival draws is a
 * fact about the plugins — a knob added to the tape tomorrow would otherwise be drawn into a row
 * with nowhere to put it, and dropped without a word (principle 1, 0208).
 */
const VALUE_SLOTS = Math.max(
  0,
  ...EFFECTS.filter((effect) => isGrowable(effect)).map((plugin) => drawnParamIds(plugin).length),
);

/** What one row is made of, found once off the box and kept — a query per frame is a query too many. */
type Row = {
  row: HTMLElement;
  name: HTMLElement;
  bar: HTMLElement;
  left: HTMLElement;
  /** The dial per drawn value, in the order the plugin declares them, and the pointer in each. */
  values: HTMLElement[];
  fills: HTMLElement[];
};

/**
 * Which parameter each of a row's dials is, in the order the arrival drew them — which is the
 * order that effect's own card draws them. Read off the one shared answer the run itself is drawn
 * through, never a second list here: two readings of which parameters an arrival draws is a row
 * whose dials are labelled with the wrong ones (`drawnParamIds`, principle 1, 0208).
 */
function drawnLabels(effect: string): string[] {
  if (!isEffectId(effect)) return [];
  const plugin = effectById(effect);
  if (!isGrowable(plugin)) return [];
  // The registry's own word for the knob, so a dial and the card's knob above it are one noun,
  // narrowed through the same list the pool's own windows are checked against (0208).
  return drawnParamIds(plugin).map((id) => (isBoundableParam(id) ? PARAMS[id].label : id));
}

export function GrownRows({
  instrument,
  deck,
  instance,
  playing,
}: {
  instrument: Instrument;
  deck: DeckId;
  instance: EffectInstanceId;
  playing: boolean;
}) {
  const box = useRef<HTMLDivElement | null>(null);
  /** The rows, resolved on the first paint and reused by every one after it. */
  const found = useRef<Row[] | null>(null);
  /** What each row last said, so a frame that changes nothing writes nothing (0070). */
  const said = useRef<string[]>([]);
  /** The same, for the time each row has left — which changes at most once a second. */
  const told = useRef<string[]>([]);
  /** And for the knobs it was drawn at, which do not move at all once it has arrived. */
  const drew = useRef<string[]>([]);

  const paint = useCallback(() => {
    const holder = box.current;
    if (holder === null) return;
    found.current ??= [...holder.querySelectorAll<HTMLElement>('[data-slot="grown-row"]')].flatMap(
      (row): Row[] => {
        // Queried rather than asserted: a row whose shape has moved is dropped rather than painted
        // through a cast that would be wrong at runtime (principle 5).
        // Addressed by their own slots rather than by shape: `div > div` also matches the track
        // whose parent is the row, so the first hit was the groove and never the bar inside it.
        const name = row.querySelector<HTMLElement>('[data-slot="grown-name"]');
        const bar = row.querySelector<HTMLElement>('[data-slot="grown-bar"]');
        const left = row.querySelector<HTMLElement>('[data-slot="grown-left"]');
        const values = [...row.querySelectorAll<HTMLElement>('[data-slot="grown-value"]')];
        const fills = [...row.querySelectorAll<HTMLElement>('[data-slot="grown-value-fill"]')];
        return name === null || bar === null || left === null
          ? []
          : [{ row, name, bar, left, values, fills }];
      },
    );
    const grown = instrument.peek(deck).grown.get(instance);
    for (const [at, each] of found.current.entries()) {
      const held = grown?.[at];
      // Made invisible rather than hidden: the row keeps its line either way, so the run turning
      // over never shifts what is under it.
      const showing = held !== undefined;
      if (each.row.classList.contains("invisible") === showing)
        each.row.classList.toggle("invisible", !showing);
      if (held === undefined) continue;
      // The name is a fold of the instance's own id, so it is the same word every reload (0076).
      const label = isEffectId(held.effect)
        ? `${effectById(held.effect).label} · ${effectName(held.effect, held.instance)}`
        : held.effect;
      if (said.current[at] !== label) {
        each.name.textContent = label;
        said.current[at] = label;
      }
      // The bar drains over the whole life rather than riding the fade: what a row is watched for
      // is when the thing goes, and the fade is already legible as the row's own strength.
      // `scale`, not `transform`: the utility below sets the standalone scale property, and a
      // transform written here would compose with it rather than replace it — leaving the bar at
      // nothing however far in the effect actually is.
      const left = held.life > 0 ? held.remain / held.life : 0;
      each.bar.style.scale = `${Math.min(Math.max(left, 0), 1).toFixed(3)} 1`;
      each.row.style.opacity = Math.max(held.presence, 0).toFixed(2);
      // The knobs the automator drew for this one, each at where it stands in its own range: the
      // row says what was done to the effect and not only that something was (P48).
      const shape = `${held.effect}:${held.values.join(",")}`;
      if (drew.current[at] !== shape) {
        const labels = drawnLabels(held.effect);
        for (const [which, tick] of each.values.entries()) {
          const value = held.values[which];
          tick.hidden = value === undefined;
          const fill = each.fills[which];
          if (value === undefined || fill === undefined) continue;
          // Unlabelled, because six words across a row is a table: which parameter it is is what a
          // resting pointer asks for, and the keyboard reaches the same sentence through the name.
          const says = labels[which] ?? "";
          if (tick.title !== says) {
            tick.title = says;
            tick.ariaLabel = says;
          }
          const at01 = Math.min(Math.max(value, 0), 1);
          fill.style.rotate = `${(START + at01 * SWEEP).toFixed(1)}deg`;
        }
        drew.current[at] = shape;
      }
      const clock = growthLeft(held.remain);
      if (told.current[at] !== clock) {
        each.left.textContent = clock;
        told.current[at] = clock;
      }
    }
    const none = (grown?.length ?? 0) === 0;
    const empty = holder.querySelector<HTMLElement>('[data-slot="grown-empty"]');
    if (empty !== null && empty.hidden === none) empty.hidden = !none;
  }, [instrument, deck, instance]);

  // Only while something is going: a halted yard's run is standing still, and the rows already say
  // where it stopped.
  useOnFrame(paint, playing);

  return (
    <div
      ref={box}
      data-slot="grown-rows"
      className="flex w-full flex-col gap-1 p-2 ring-1 ring-foreground/10"
      aria-label={AUTOMATOR_RUN_LABEL}
    >
      <span className="type-eyebrow text-muted-foreground">{AUTOMATOR_RUN_LABEL}</span>
      {/* The word for an empty run is laid over the rows rather than among them, so saying it
          costs no height and stopping saying it gives none back. */}
      <div className="relative flex w-full flex-col gap-1">
        <p
          data-slot="grown-empty"
          className="absolute inset-x-0 top-0 type-body text-muted-foreground"
        >
          {AUTOMATOR_EMPTY}
        </p>
        {SLOTS.map((at) => (
          <div
            key={at}
            data-slot="grown-row"
            className="invisible flex h-[1lh] w-full items-center gap-2 type-body"
          >
            <span data-slot="grown-name" className="w-2/5 shrink-0 truncate" />
            {/* What the automator drew this effect's own knobs at, a dial apiece and in the order
                its own card draws them. Painted, not turnable, for the same reason the bar beside
                it is — and unlabelled, saying which parameter it is only on hover (0208). */}
            <div
              data-slot="grown-values"
              className="flex h-3 w-[5.25rem] shrink-0 items-center justify-start gap-[2px]"
            >
              {Array.from({ length: VALUE_SLOTS }, (_, tick) => (
                <span
                  key={tick}
                  data-slot="grown-value"
                  className="relative block size-3 shrink-0 rounded-full ring-1 ring-foreground/20"
                >
                  {/* The ring says the dial is there at all and the pointer says where it stands,
                      so a knob turned right down still counts among them. */}
                  <span data-slot="grown-value-fill" className="absolute inset-0 rotate-0">
                    <span className="absolute inset-x-1/2 top-0 h-1/2 w-px -translate-x-1/2 bg-primary" />
                  </span>
                </span>
              ))}
            </div>
            {/* A bar rather than a dial: a row says how far in something is, and nothing here is a
              control anyone may turn — what it paints is drawn, not set (0128). */}
            <div className="h-1 grow bg-foreground/10">
              <div data-slot="grown-bar" className="h-full origin-left scale-x-0 bg-primary" />
            </div>
            {/* Its own column, wide enough for the longest thing it says, so a row counting down
                never moves the bar beside it. */}
            <span
              data-slot="grown-left"
              className="w-20 shrink-0 text-right text-muted-foreground tabular-nums"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
