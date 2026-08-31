/**
 * @role The run an automator is holding: the hourglass at its head that holds it still and asks
 *   for the wait again (0215), then a row per grown effect saying what it is and how far in it
 *   stands. Painted from the per-frame read rather than from the session, because nothing the run
 *   holds is stored — it is drawn from a seed and re-derived (0204, 0205).
 * @instead The knobs that shape the run → the ordinary ParameterKnob row its card already draws in
 *   src/ui/EffectRack.tsx. What the run *is* → src/lib/effectGrowth.ts.
 */
// Over the soft cap and read: what is here is one box — the hourglass at its head and the rows
// under it — mounted once and painted by one frame callback. Splitting it puts half a subscriber
// in another file and the templates a row is made of away from the painter that writes into them.
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
// One import per thing a row says — the registry it reads an effect out of, the pool reading it
// labels a dial from, and the words — so the count tracks what a row shows. 0007.
// oxlint-disable import/max-dependencies
import { HourglassIcon } from "@phosphor-icons/react/Hourglass";
import { XIcon } from "@phosphor-icons/react/X";
import { useCallback, useMemo, useRef } from "react";

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
import { PARAMS, paramIn, type EffectParamValues } from "@/audio/params";
import { GROWTH_COUNT_MAX } from "@/lib/effectGrowth";
import { effectName } from "@/lib/copyNames";
import {
  AUTOMATOR_EMPTY,
  AUTOMATOR_HOLD_LABEL,
  AUTOMATOR_RUN_LABEL,
  dismissLabel,
  GROWTH_LEFT_LABEL,
  growthLeft,
  holdLeft,
} from "@/lib/copyAuto";
import type { DeckId } from "@/state/store";
import { Button } from "@/ui/components/button";
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
 * Every entry a row could ever hold, in registry order — the pictures a row wears one of, mounted
 * with it. Which one is showing is a hidden flag per frame, for the same reason the row itself is
 * a visibility flag: nothing per-frame goes through state (docs/boundaries.md, 0070). The picture
 * is the registry's own `icon` field, which is the point of the field (0055, P172).
 */
const POOL = EFFECTS.filter((effect) => isGrowable(effect));

/**
 * How many of a grown effect's own knobs one row draws: as many as the widest entry in the pool is
 * drawn at. Counted off that pool rather than written down, because what an arrival draws is a
 * fact about the plugins — a knob added to the tape tomorrow would otherwise be drawn into a row
 * with nowhere to put it, and dropped without a word (principle 1, 0208).
 */
const VALUE_SLOTS = Math.max(0, ...POOL.map((plugin) => drawnParamIds(plugin).length));

/**
 * Which of a row's mounted pictures is showing: the one whose entry the row is holding, and none
 * for a row holding nothing. Every index is written on every call, so the invariant is exactly one
 * or none — and the pictures are mounted, so this is a flag and never a render (0070).
 */
function wearIcon(icons: readonly HTMLElement[], effect: string | null): void {
  for (const [which, icon] of icons.entries()) {
    const wearing = POOL[which]?.id === effect;
    if (icon.hidden === wearing) icon.hidden = !wearing;
  }
}

/** What one row is made of, found once off the box and kept — a query per frame is a query too many. */
type Row = {
  row: HTMLElement;
  name: HTMLElement;
  bar: HTMLElement;
  left: HTMLElement;
  /** The × at the end of the name, named again on every frame the row's place changes. */
  go: HTMLElement;
  /** One picture per pool entry, in `POOL` order; the one this row is holding is the shown one. */
  icons: HTMLElement[];
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

/**
 * The picture of what one row is holding: every pool entry's is mounted with the row and hidden,
 * and the frame shows the one. Decoration beside a name that says the same thing in words, so it
 * is hidden from a reader that would say it twice (0055, P172).
 */
function HeldIcon() {
  return (
    <>
      {POOL.map((plugin) => (
        <span
          key={plugin.id}
          data-slot="grown-icon"
          aria-hidden="true"
          hidden
          className="shrink-0 text-muted-foreground"
        >
          <plugin.icon />
        </span>
      ))}
    </>
  );
}

/**
 * What the automator drew one arrival's own knobs at, a dial apiece and in the order that effect's
 * own card draws them. Painted, not turnable, for the same reason the bar beside it is — and
 * unlabelled, saying which parameter it is only on hover (0208). As many dials as the widest entry
 * in the pool is drawn at, so every row is the same width whatever rolls into it.
 */
function ValueDials() {
  return (
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
          {/* The ring says the dial is there at all and the pointer says where it stands, so a
              knob turned right down still counts among them. */}
          <span data-slot="grown-value-fill" className="absolute inset-0 rotate-0">
            <span className="absolute inset-x-1/2 top-0 h-1/2 w-px -translate-x-1/2 bg-primary" />
          </span>
        </span>
      ))}
    </div>
  );
}

/** The hourglass's two painted parts, or null where the box has not drawn them yet. */
function foundGlass(holder: HTMLElement): { sand: HTMLElement; says: HTMLElement } | null {
  const sand = holder.querySelector<HTMLElement>('[data-slot="grown-hold-glass"]');
  const says = holder.querySelector<HTMLElement>('[data-slot="grown-hold-left"]');
  return sand === null || says === null ? null : { sand, says };
}

export function GrownRows({
  instrument,
  deck,
  instance,
  params,
  playing,
}: {
  instrument: Instrument;
  deck: DeckId;
  instance: EffectInstanceId;
  params: EffectParamValues;
  playing: boolean;
}) {
  const box = useRef<HTMLDivElement | null>(null);
  /** The hourglass and the words beside it, found the way the rows below are and painted per frame. */
  const glass = useRef<{ sand: HTMLElement; says: HTMLElement } | null>(null);
  /** What it last said, so a frame that changes nothing writes nothing (0070). */
  const holding = useRef<string>("");
  /** The rows, resolved on the first paint and reused by every one after it. */
  const found = useRef<Row[] | null>(null);
  /** What each row last said, so a frame that changes nothing writes nothing (0070). */
  const said = useRef<string[]>([]);
  /** The same, for the time each row has left — which changes at most once a second. */
  const told = useRef<string[]>([]);
  /** And for the knobs it was drawn at, which do not move at all once it has arrived. */
  const drew = useRef<string[]>([]);

  /**
   * The wait the knob is set to. Read off the durable values rather than the peek: how much of it
   * is left is derived, and how much was asked for is what is stored (0215).
   */
  const wait = paramIn(params, "auto.wait");

  /**
   * Pressing the hourglass sends exactly the `param.set` the Wait knob sends, at the value it
   * already reads — the hold is armed by the command's own instant, so asking for the number that
   * is already there is asking for that time over again (0215).
   */
  const press = useCallback(() => {
    instrument.send({ t: "param.set", deck, instance, param: "auto.wait", value: wait });
  }, [instrument, deck, instance, wait]);

  /**
   * The press on one row's ×, one stable handler per slot: every row is mounted once, so its
   * control is written once too rather than minted afresh in the markup (0070).
   *
   * Which place a press names is read off `peek()` at the press and never off a prop — a row
   * addressed by its slot alone would let go of whatever had rolled into that slot while the
   * pointer travelled. The id read here carries the tick the place was laid at, so a command
   * whose place has already gone is refused rather than applied to its successor (0204).
   */
  const goes = useMemo(
    () =>
      SLOTS.map((at) => () => {
        const place = instrument.peek(deck).grown.get(instance)?.[at]?.instance;
        // A row holding nothing has nothing to let go of, and a press on one says nothing.
        if (place === undefined) return;
        instrument.send({ t: "effect.dismiss", deck, instance, place });
      }),
    [instrument, deck, instance],
  );

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
        const go = row.querySelector<HTMLElement>('[data-slot="grown-go"]');
        const values = [...row.querySelectorAll<HTMLElement>('[data-slot="grown-value"]')];
        const fills = [...row.querySelectorAll<HTMLElement>('[data-slot="grown-value-fill"]')];
        const icons = [...row.querySelectorAll<HTMLElement>('[data-slot="grown-icon"]')];
        return name === null || bar === null || left === null || go === null
          ? []
          : [{ row, name, bar, left, go, values, fills, icons }];
      },
    );
    const read = instrument.peek(deck);
    const grown = read.grown.get(instance);
    // The hourglass: the sand runs out over the hold the knob asked for, and when there is none
    // left the glass turns over. A hold with no end never empties, and one nobody asked for is
    // already turned over.
    const holdSecs = read.waits.get(instance) ?? 0;
    glass.current ??= foundGlass(holder);
    if (glass.current !== null) {
      const { sand, says } = glass.current;
      const words = holdLeft(holdSecs);
      if (holding.current !== words) {
        says.textContent = words;
        holding.current = words;
      }
      const run =
        Number.isFinite(holdSecs) && wait > 0 ? Math.min(holdSecs / wait, 1) : Number(holdSecs > 0);
      sand.style.opacity = (0.35 + 0.65 * run).toFixed(2);
      sand.style.rotate = run > 0 ? "0deg" : "180deg";
    }
    for (const [at, each] of found.current.entries()) {
      const held = grown?.[at];
      // Made invisible rather than hidden: the row keeps its line either way, so the run turning
      // over never shifts what is under it.
      const showing = held !== undefined;
      if (each.row.classList.contains("invisible") === showing)
        each.row.classList.toggle("invisible", !showing);
      if (held === undefined) {
        // Forget the name it was showing, so its × does not go on offering to let go of a place
        // that has already left. The row is invisible either way, which takes the button out of
        // the tab order — but a control naming something gone is one a script could still read
        // (principle 5).
        if (said.current[at] !== "") {
          each.go.ariaLabel = dismissLabel(null);
          // And it wears no picture, for the same reason: a row is wound back to what it says
          // holding nothing, not left showing the last thing it held.
          wearIcon(each.icons, null);
          said.current[at] = "";
        }
        continue;
      }
      // The name is a fold of the instance's own id, so it is the same word every reload (0076).
      const label = isEffectId(held.effect)
        ? `${effectById(held.effect).label} · ${effectName(held.effect, held.instance)}`
        : held.effect;
      if (said.current[at] !== label) {
        each.name.textContent = label;
        // The control says which place it lets go of, so a keyboard reaching it out of order
        // hears the row it is on rather than eight buttons with one name (§4).
        each.go.ariaLabel = dismissLabel(label);
        // And the row wears what it is holding, the same picture the card that grew it wears.
        wearIcon(each.icons, held.effect);
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
  }, [instrument, deck, instance, wait]);

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
      {/* The head of the run: what the box holds, and the one control that is about the run
          rather than about any place in it — pressing it asks for the wait again (0215). */}
      <div className="flex w-full items-center gap-2">
        <span className="min-w-0 grow truncate type-eyebrow text-muted-foreground">
          {AUTOMATOR_RUN_LABEL}
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="h-5 shrink-0 gap-1 px-1 type-eyebrow text-muted-foreground"
          aria-label={AUTOMATOR_HOLD_LABEL}
          onClick={press}
        >
          <span data-slot="grown-hold-glass" className="block rotate-0">
            <HourglassIcon />
          </span>
          <span data-slot="grown-hold-left" className="tabular-nums" />
        </Button>
      </div>
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
            className="group/grown-row invisible flex h-[1lh] w-full items-center gap-2 type-body"
          >
            <HeldIcon />
            {/* The name gives before the dials or the clock do, and it gives by truncating: a
                basis of two fifths at the widths there is room for it, and less than that on a
                phone rather than a column running into the one beside it (P24). */}
            <span data-slot="grown-name" className="min-w-0 basis-2/5 truncate" />
            {/* The × at the end of the name, mounted with the row rather than added to it — every
                row is already mounted once whether or not it is holding anything, and nothing
                per-frame may go through state (docs/boundaries.md, 0070). Shown on hover *and* on
                focus, because a control only a hovering pointer can reach is one no keyboard and
                no ./scripts/drive can press (docs/plan.md §4); an empty row is `invisible`, which
                takes the button out of the tab order with it. */}
            <Button
              data-slot="grown-go"
              size="sm"
              variant="ghost"
              aria-label={dismissLabel(null)}
              className="size-4 shrink-0 p-0 text-muted-foreground opacity-0 group-hover/grown-row:opacity-100 focus-visible:opacity-100"
              onClick={goes[at]}
            >
              <XIcon />
            </Button>
            <ValueDials />
            {/* A bar rather than a dial: a row says how far in something is, and nothing here is a
              control anyone may turn — what it paints is drawn, not set (0128). */}
            {/* The one column that absorbs the slack: the two beside it are fixed at what they
                have to draw, so this is what a narrow card takes its width out of. */}
            <div className="h-1 min-w-2 shrink grow bg-foreground/10">
              <div data-slot="grown-bar" className="h-full origin-left scale-x-0 bg-primary" />
            </div>
            {/* Its own column, wide enough for the longest thing it says, so a row counting down
                never moves the bar beside it. What the number counts is said here at mount and
                never again: the painting writes a clock and nothing else (P162, 0070). */}
            <span
              data-slot="grown-left"
              className="w-20 shrink-0 text-right text-muted-foreground tabular-nums"
              title={GROWTH_LEFT_LABEL}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
