/**
 * @role The effect automator: one full-width entry that holds a rack of its own and grows effects
 *   in it over time, each one faded in from its plugin's own silence and faded back out before it
 *   is taken away. Its population is drawn from its seed and never stored, the way a jumping
 *   pattern is (0089, 0203, 0204).
 * @instead What the population *is*, as pure maths → src/lib/effectGrowth.ts. How an entry says it
 *   is turned down to nothing → the `presence` field in ./contract.ts (0202).
 */
import { SparkleIcon } from "@phosphor-icons/react/Sparkle";

import { bindParam, rampTo, type ParamBinding } from "@/audio/ramp";
import { AUTOMATION_REARM_SECS } from "@/audio/transport";
import {
  createGrowth,
  GROWTH_COUNT_MAX,
  GROWTH_COUNT_MIN,
  GROWTH_DRIFT_MAX,
  GROWTH_DRIFT_MIN,
  type GrowthEntry,
  type GrowthChange,
  type GrowthParam,
} from "@/lib/effectGrowth";
import { mulberry32 } from "@/lib/random";
import { clamp, normalize } from "@/lib/range";
import {
  defineEffect,
  instanceFromBindings,
  type Effect,
  type EffectInstance,
  type EffectInstanceId,
  type ParamDeclaration,
} from "./contract";
import { createEffectRack } from "./rack";
import type { EffectParamId } from "./registry";

/**
 * How long one grown effect stands, in seconds: from the moment it begins to arrive to the moment
 * it begins to leave. The floor is a few seconds, because an effect that arrives and goes inside
 * one is a graph edit rather than a sound; the ceiling is an hour, because a run of six at an hour
 * apiece is a set that turns over across a whole session and there is nothing longer to say (0206).
 */
const STAYS_MIN = 4;
const STAYS_MAX = 60 * 60;

/**
 * The shortest a turnover may be, however short a life is asked for over however many places. A
 * whole effect arriving and leaving is not a sixteenth-note gesture: below about this the run is a
 * burst of graph edits nobody can hear as anything, and — because the population has to be laid
 * ahead across the pump's own horizon (0204) — every one of them is a reverb built and thrown away
 * inside one pump.
 */
const TICK_MIN_SECS = 1;

/**
 * How long an arrival or a departure takes. The floor is short enough to be a swell and not a
 * switch; the ceiling is long enough that an effect can take most of a phrase to appear.
 */
const FADE_MIN = 0.05;
const FADE_MAX = 16;

const params = [
  {
    id: "auto.seed",
    label: "Seed",
    min: 0,
    max: 0xff_ff_ff_ff,
    default: 1,
    precision: 0,
    step: 1,
    // The 32 bits mulberry32 has state for, exactly as a player's seed is (0089). It is not a
    // lane: a seed is which performance this is, and ramping between two of them is not a sound.
    rebuild: true,
    // And never the declared default: a fresh automator is a run nobody has heard, drawn from the
    // id the gesture that added it minted (0076, 0089).
    seeded: true,
  },
  {
    id: "auto.count",
    label: "Held",
    min: GROWTH_COUNT_MIN,
    max: GROWTH_COUNT_MAX,
    default: 3,
    precision: 0,
    step: 1,
    rebuild: true,
  },
  {
    // The one knob that says when: how long each grown effect stands, said as the time it stands
    // and not as a rate to divide in your head. What turns over is derived from it — a place is
    // let go and another laid every `stays / count` (0206).
    id: "auto.stays",
    label: "Stays",
    min: STAYS_MIN,
    max: STAYS_MAX,
    default: 60,
    precision: 0,
    curve: "log",
  },
  {
    id: "auto.fade",
    label: "Fade",
    min: FADE_MIN,
    max: FADE_MAX,
    default: 2,
    precision: 2,
    curve: "log",
  },
  {
    id: "auto.drift",
    label: "Stray",
    min: GROWTH_DRIFT_MIN,
    max: GROWTH_DRIFT_MAX,
    default: 0.4,
    precision: 2,
    rebuild: true,
  },
  // One weight per poolable entry. Six literal declarations rather than a list generated off the
  // registry, because this file may not import the registry it is about to be a member of — see
  // the module-order note on `createAutomator` below (0203, 0204).
  { id: "auto.filter", label: "Filter", min: 0, max: 1, default: 1, precision: 2, rebuild: true },
  { id: "auto.delay", label: "Delay", min: 0, max: 1, default: 1, precision: 2, rebuild: true },
  { id: "auto.eq", label: "EQ", min: 0, max: 1, default: 1, precision: 2, rebuild: true },
  {
    id: "auto.compressor",
    label: "Comp",
    min: 0,
    max: 1,
    default: 0.4,
    precision: 2,
    rebuild: true,
  },
  { id: "auto.reverb", label: "Reverb", min: 0, max: 1, default: 1, precision: 2, rebuild: true },
  { id: "auto.tape", label: "Tape", min: 0, max: 1, default: 1, precision: 2, rebuild: true },
] as const satisfies readonly ParamDeclaration[];

type AutoParamId = (typeof params)[number]["id"];

/** The weight knob that decides how often each entry is drawn, by that entry's own id. */
const WEIGHT_OF: Record<string, AutoParamId> = {
  filter: "auto.filter",
  delay: "auto.delay",
  eq: "auto.eq",
  compressor: "auto.compressor",
  reverb: "auto.reverb",
  tape: "auto.tape",
};

/** An entry this automator may grow: one the registry proved declares a presence (0202). */
/**
 * An entry this automator may grow: one the registry proved declares a presence (0202).
 *
 * Its parameter ids are plain strings rather than `EffectParamId`, and deliberately: that union is
 * derived from `EFFECTS`, `EFFECTS` is built by calling `createAutomator`, and a parameter of that
 * call naming the union would be a type that depends on itself — which TypeScript resolves by
 * widening the whole registry's parameter ids to `string`, quietly, everywhere. The narrowing is
 * done at the two call sites that need it instead (0203).
 */
export type GrowablePlugin = Effect & {
  presence: { param: string; silent: number; held?: readonly string[]; full?: number };
};

/** One ramp on a place's presence: where it starts, where it ends, and over what. */
type Fade = { at: number; over: number; from: number; to: number };

/**
 * One place the automator is holding, and the two ramps it rides. Two rather than one, because the
 * run is laid ahead across the pump's horizon: a place's departure is often scheduled while its
 * arrival is still in the future, and a single record of "the last fade" would forget the arrival
 * and report a place as fully in from the moment it was drawn.
 */
type Standing = {
  id: EffectInstanceId;
  effect: string;
  born: number;
  /**
   * When it first begins to sound. Its own field rather than the arrival's `at`, so that reading
   * it is never confused by a departure that has already been written.
   */
  arrived: number;
  arrival: Fade;
  departure: Fade | null;
  /**
   * Where every knob this arrival had drawn for it stands, as a fraction of that knob's own range
   * — the picture a row paints of what the automator did to this effect. Held per place and never
   * rebuilt, so a frame reading it allocates nothing (0070).
   */
  values: number[];
  /** Set when it is on its way out: the context time past which its nodes may go. */
  goneAt: number | null;
};

export const AUTOMATOR_ID = "automator";

/**
 * Built by the registry, which hands in the entries it may draw. A factory rather than a plain
 * entry because the alternative does not load: this file would have to import the registry to see
 * the pool, the registry imports this file to put it in `EFFECTS`, and `params.ts` reads the
 * registry at module scope — so the cycle resolves in the TDZ and the whole graph throws (0203).
 */
export function createAutomator(
  pool: readonly GrowablePlugin[],
): Effect<typeof AUTOMATOR_ID, typeof params> {
  return defineEffect({
    id: AUTOMATOR_ID,
    label: "Automator",
    // The first entry to claim the whole row: it holds a run of effects rather than a set of
    // knobs, and a run laid two abreast is two half-stories (P48).
    width: "full",
    // The one entry with something under its knobs: the run it is holding, a row apiece (0205).
    face: "grown",
    icon: SparkleIcon,
    drift: "swarm",
    geometry: "fan",
    // What it holds and how fast it turns over is what it does to a yard; how far it strays is how
    // finely it is drawn.
    driftFrom: [
      { param: "auto.count", into: "depth" },
      { param: "auto.stays", into: "period" },
      { param: "auto.drift", into: "pitch" },
    ],
    driftUnreached: [
      {
        param: "auto.seed",
        because: "a seed says which performance this is, never what it is like",
      },
      { param: "auto.fade", because: "a fade is how long an arrival takes, which is not a shape" },
      { param: "auto.filter", because: "a weight is one voice in a pool, and no row is a pool" },
      { param: "auto.delay", because: "a weight is one voice in a pool, and no row is a pool" },
      { param: "auto.eq", because: "a weight is one voice in a pool, and no row is a pool" },
      {
        param: "auto.compressor",
        because: "a weight is one voice in a pool, and no row is a pool",
      },
      { param: "auto.reverb", because: "a weight is one voice in a pool, and no row is a pool" },
      { param: "auto.tape", because: "a weight is one voice in a pool, and no row is a pool" },
    ],
    // An automator holding nothing is already inaudible, but it is not a thing another automator
    // may fade: one growing inside another is refused by the pool it draws from, which holds only
    // the entries that declared a presence of their own (0202).
    presence: {
      none: "an automator is the thing doing the fading, and it draws from a pool it is not in",
    },
    params,
    build: (ctx, values) => buildAutomator(ctx, values, pool),
  });
}

// The closure owns the inner rack, the run standing in it and the ticks already realized; those
// three are the invariant this plugin exists to keep, and splitting them would put a population in
// one place and the graph holding it in another (0007).
// oxlint-disable-next-line max-lines-per-function
function buildAutomator(
  ctx: BaseAudioContext,
  values: Readonly<Record<AutoParamId, number>>,
  pool: readonly GrowablePlugin[],
): EffectInstance<AutoParamId> {
  const output = ctx.createGain();
  // A rack inside a rack: the same chain, one level in, built on the same context and disposed by
  // the instance holding it (0203).
  const inner = createEffectRack(ctx, output);

  const held: Record<AutoParamId, number> = { ...values };
  // Every one of this entry's parameters is a number it reads rather than a node it drives, so
  // each binds to a parked ConstantSourceNode's offset: the declaration road stays the ordinary
  // one and nothing here special-cases a knob (0049).
  const bind = (): ParamBinding => {
    const source = ctx.createConstantSource();
    source.start();
    return bindParam(source.offset);
  };
  const bindings: Record<AutoParamId, ParamBinding> = {
    "auto.seed": bind(),
    "auto.count": bind(),
    "auto.stays": bind(),
    "auto.fade": bind(),
    "auto.drift": bind(),
    "auto.filter": bind(),
    "auto.delay": bind(),
    "auto.eq": bind(),
    "auto.compressor": bind(),
    "auto.reverb": bind(),
    "auto.tape": bind(),
  };

  /**
   * Which place each slot of the run currently belongs to, for matching a retire to what it
   * retires. It holds whatever was laid *last*, which — because the run is laid ahead across the
   * pump's horizon — is often something that has not arrived yet.
   */
  const standing = new Map<number, Standing>();
  /**
   * Every place that has been laid and whose nodes are still in the rack, in the order it was laid.
   * This, and not the map above, is what is *sounding*: a place laid ahead is scheduled and not yet
   * audible, and one that has been retired goes on being audible until its fade has finished. The
   * map cannot answer either question, because the tick that retires a slot fills it again in the
   * same breath — so the thing being retired is overwritten by its own replacement.
   */
  const laid: Standing[] = [];
  /**
   * Which redraw the run standing now belongs to. It rides in every instance id, because a knob
   * that reshapes the run no longer takes the old one out of the rack — the places it drew are
   * still fading, and a redraw at the same seed would otherwise lay their own ids on top of them.
   */
  let generation = 0;
  let growth = draw();
  let realized = -1;
  let born = ctx.currentTime;

  function entryOf(id: string): GrowablePlugin | undefined {
    return pool.find((plugin) => plugin.id === id);
  }

  /** The pool as the maths sees it: a weight off the knobs, and every value it may draw. */
  function poolFor(): GrowthEntry[] {
    return pool.map((plugin) => {
      const weightId = WEIGHT_OF[plugin.id];
      const holdIds = new Set<string>([plugin.presence.param, ...(plugin.presence.held ?? [])]);
      const declared: readonly ParamDeclaration[] = plugin.params;
      return {
        id: plugin.id,
        weight: weightId === undefined ? 0 : held[weightId],
        params: declared.map((param): GrowthParam => {
          const range: GrowthParam = {
            id: param.id,
            min: param.min,
            max: param.max,
            default: param.default,
          };
          if (param.curve !== undefined) range.curve = param.curve;
          // A rebuild is a buffer built at the end of a gesture, and nothing here makes a gesture —
          // so a drawn one would be recorded and never paid for (0090).
          if (holdIds.has(param.id) || param.rebuild === true) range.held = true;
          return range;
        }),
      };
    });
  }

  /** A fresh cursor at the seed and shape currently held. Every knob that shapes the run rebuilds it. */
  function draw(): (tick: number) => readonly GrowthChange[] {
    return createGrowth(
      { count: held["auto.count"], drift: held["auto.drift"] },
      mulberry32(held["auto.seed"]),
      poolFor(),
    );
  }

  /** How many places the run holds, as the maths rounds it. */
  function countHeld(): number {
    return Math.max(1, Math.round(held["auto.count"]));
  }

  /** How long one place stands: the life asked for, or the floor where that is shorter. */
  function lifeSecs(): number {
    return Math.max(held["auto.stays"], TICK_MIN_SECS * countHeld());
  }

  /**
   * How long one tick is. A place lives exactly `count` ticks, so the interval between one arrival
   * and the next is the life divided among the places the run is holding — turn `Held` up and the
   * same life turns over more often, which is the whole relation between the two knobs.
   */
  function tickSecs(): number {
    return lifeSecs() / countHeld();
  }

  /**
   * How long a fade may be. A place lives exactly `count` ticks, and a fade longer than that would
   * still be arriving when it was asked to leave — which `rampTo` pins to the value it is at,
   * turning a retire into a step. Bounded here rather than at the knob so a rate change cannot
   * outrun a fade already declared (0204).
   */
  function fadeSecs(): number {
    return clamp(held["auto.fade"], FADE_MIN, Math.max(FADE_MIN, lifeSecs() / 2));
  }

  /** Lay a ramp onto one place's presence, and remember it so a row can be painted without the graph. */
  function fade(place: Standing, to: number, at: number, over: number): void {
    const plugin = entryOf(place.effect);
    if (plugin === undefined) return;
    const laidFade: Fade = { at, over, from: presenceAt(place, at), to };
    // A ramp back to the entry's own silence is the departure; anything else is the arrival.
    if (to === plugin.presence.silent) place.departure = laidFade;
    else place.arrival = laidFade;
    // The pool proved this names one of that plugin's own declared, automatable parameters (0202);
    // the union it belongs to cannot be named here without making the registry's ids circular.
    // oxlint-disable-next-line no-unsafe-type-assertion
    const presence = plugin.presence.param as EffectParamId;
    rampTo(inner.automationTarget(place.id, presence), to, at, over);
  }

  /**
   * Take one place away the only way anything is taken away here: a fade to its plugin's own
   * silence, and its nodes let go once that fade is done. A retire calls it, and so does a knob
   * that redraws the whole run — nothing this entry holds is ever cut off (0202).
   */
  function leave(place: Standing, when: number, over: number): void {
    const plugin = entryOf(place.effect);
    if (plugin === undefined || place.goneAt !== null) return;
    fade(place, plugin.presence.silent, when, over);
    place.goneAt = when + over + LEAVE_GRACE_SECS;
  }

  /** How far in a place stands, as a fraction of its own arrival — what a row is painted from. */
  function reach(place: Standing, when: number): number {
    const plugin = entryOf(place.effect);
    if (plugin === undefined) return 0;
    const silent = plugin.presence.silent;
    // All the way in is where its arrival was headed, which no departure since has changed.
    const full = place.arrival.to;
    if (full === silent) return 0;
    return clamp((presenceAt(place, when) - silent) / (full - silent), 0, 1);
  }

  return {
    input: inner.input,
    output,
    ...instanceFromBindings(params, bindings, values),
    setParam: (param, value, when) => {
      bindings[param].set(value, when);
      held[param] = value;
      void when;
    },
    // Every knob that shapes the run is declared `rebuild`, so a drag pays for the redraw once
    // when the hand lets go rather than on each of its pointer events (0090). The run is then
    // re-derived from the seed rather than continued, which is what keeps it a function of the
    // spec and the tick count alone (0204).
    endGesture: () => {
      const when = ctx.currentTime;
      const over = fadeSecs();
      // Everything the old run was holding leaves the way anything leaves — over the fade knob,
      // from wherever it had got to. A reshaped run is a crossfade into a new population and not a
      // graph edit anyone hears, which is the whole of what this entry is for (0202).
      for (const place of laid) leave(place, when, over);
      standing.clear();
      generation++;
      growth = draw();
      realized = -1;
      // The fresh run starts here rather than at the boot: its first tick is this instant, so a
      // knob that redraws lays its first place at once instead of realizing every tick since.
      born = when;
    },
    pump: (now, horizon) => {
      const step = tickSecs();

      const over = fadeSecs();
      // Everything whose fade has finished and whose place has been taken may leave the graph now.
      // A late removal is inaudible — the instance has been transparent since its fade ended — and
      // that is exactly what lets the two pump cadences differ (0204).
      for (let at = laid.length - 1; at >= 0; at--) {
        const place = laid[at];
        if (place === undefined || place.goneAt === null || place.goneAt > now) continue;
        inner.remove(place.id);
        laid.splice(at, 1);
      }
      // Realize every tick whose instant falls inside the horizon. Decisions are taken off the
      // tick index and never off `now`, so an interval and a render's suspensions agree.
      // Far enough ahead that every tick arriving before the next pump is already scheduled, and
      // no further: each one laid ahead is an audio graph built early and standing silent until
      // its own instant, so a long horizon over a short tick is a rack of unheard reverbs (0204).
      const lead = Math.min(horizon, AUTOMATION_REARM_SECS + step);
      const due = Math.floor((now + lead - born) / step);
      while (realized < due) {
        realized++;
        const at = born + realized * step;
        // A pump that arrives late schedules into the past otherwise, which lands as a step.
        const when = Math.max(at, now);
        for (const change of growth(realized)) {
          if (change.t === "retire") {
            const place = standing.get(change.place.place);
            if (place === undefined || place.id !== instanceId(change.place, generation)) continue;
            leave(place, when, over);
            // Out of the run, but not out of the rack: it goes on sounding until its fade is done,
            // and `laid` is what remembers that.
            if (standing.get(change.place.place) === place) standing.delete(change.place.place);
            continue;
          }
          const plugin = entryOf(change.place.effect);
          if (plugin === undefined) continue;
          const id = instanceId(change.place, generation);
          // Built at its own silence, then faded up: nothing is ever switched into the path at
          // strength, which is the whole of what this entry is for (0202).
          const built: Record<string, number> = {};
          for (const param of plugin.params) built[param.id] = param.default;
          // Kept beside the values themselves, each in its own knob's space: a row paints the
          // draw, and the number a hertz reads as is not where the dial stands (0128).
          const drawn: number[] = [];
          for (const { param, value } of change.values) {
            built[param] = value;
            const spec = plugin.params.find((each) => each.id === param);
            if (spec === undefined) continue;
            drawn.push(clamp(normalize(value, spec.min, spec.max, spec.curve), 0, 1));
          }
          // Where the entry stands when it is all the way in: what it declared, or its own
          // default where that already says something (0202).
          const full = plugin.presence.full ?? built[plugin.presence.param] ?? 0;
          built[plugin.presence.param] = plugin.presence.silent;
          // The plugin itself, which this already holds — no lookup, and so no reach back into the
          // registry that is in the middle of building this very entry (0203).
          inner.add(id, plugin, built);
          const place: Standing = {
            id,
            effect: plugin.id,
            born: realized,
            arrived: when,
            arrival: {
              at: when,
              over: 0,
              from: plugin.presence.silent,
              to: plugin.presence.silent,
            },
            departure: null,
            goneAt: null,
            values: drawn,
          };
          standing.set(change.place.place, place);
          laid.push(place);
          fade(place, full, when, over);
        }
      }
    },
    grown: (out) => {
      const when = ctx.currentTime;
      const life = lifeSecs();
      let written = 0;
      const write = (place: Standing): void => {
        // Laid ahead but not yet arrived: scheduled, and not something a row may claim is playing.
        if (place.arrived > when || written >= GROWTH_COUNT_MAX) return;
        const remain = Math.max(leavesAt(place, life) - when, 0);
        // Overwritten in place: a row object per frame is the allocation 0070 exists to refuse.
        const row = out[written];
        if (row === undefined) {
          out.push({
            effect: place.effect,
            instance: place.id,
            presence: reach(place, when),
            remain,
            life,
            values: place.values,
          });
        } else {
          row.effect = place.effect;
          row.instance = place.id;
          row.presence = reach(place, when);
          row.remain = remain;
          row.life = life;
          row.values = place.values;
        }
        written++;
      };
      // The run first and what is on its way out after it, as far as there is room for it: a
      // crossfade holds twice the places for as long as a fade lasts, and the ones still arriving
      // are the ones a surface with a fixed set of lines is for (0205).
      for (const place of laid) if (place.goneAt === null) write(place);
      for (const place of laid) if (place.goneAt !== null) write(place);
      return written;
    },
    dispose: () => {
      inner.dispose();
      output.disconnect();
    },
  };
}

/**
 * When a place begins to leave: the departure it has already been given, or — while that tick is
 * still ahead — the life it was laid for. Read rather than stored, so a row can say how long
 * something has left before anything has been scheduled to take it away.
 */
function leavesAt(place: Standing, life: number): number {
  return place.departure?.at ?? place.arrived + life;
}

/** Where one ramp has got to at `when`. */
function fadeAt(fade: Fade, when: number): number {
  if (when <= fade.at) return fade.from;
  if (when >= fade.at + fade.over) return fade.to;
  return fade.from + (fade.to - fade.from) * ((when - fade.at) / fade.over);
}

/**
 * Where a place's presence stands at `when`, read off its ramps rather than out of the graph — so
 * it answers the same offline, where there is no live AudioParam to ask.
 */
function presenceAt(place: Standing, when: number): number {
  const leaving = place.departure;
  if (leaving !== null && when >= leaving.at) return fadeAt(leaving, when);
  return fadeAt(place.arrival, when);
}

/**
 * How long after a fade has finished the nodes may go. One ordinary re-arm, so a removal always
 * lands on a later pump than the fade it is waiting on however the two cadences fall.
 */
const LEAVE_GRACE_SECS = 0.25;

/**
 * A grown instance's id, folded out of the place and the tick it was laid at rather than minted.
 * A minted id would be a fresh one on every reload, and the run would not be the run its seed
 * promised — the same reason a card reads its name out of its own id rather than storing one
 * (0076, 0204).
 */
function instanceId(
  place: { effect: string; place: number; born: number },
  generation: number,
): EffectInstanceId {
  return `${AUTOMATOR_ID}:${generation}:${place.place}:${place.born}:${place.effect}`;
}
