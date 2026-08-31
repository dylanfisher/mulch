/**
 * @role The effect automator: one full-width entry that holds a rack of its own and grows effects
 *   in it over time, each one faded in from its plugin's own silence and faded back out before it
 *   is taken away. Its population is drawn from its seed and never stored, the way a jumping
 *   pattern is (0089, 0203, 0204).
 * @instead What the population *is*, as pure maths → src/lib/effectGrowth.ts. How an entry says it
 *   is turned down to nothing → the `presence` field in ./contract.ts (0202).
 */
// One import per thing the run reaches for — the ramp road, the pump's cadence, the maths, the
// seed, this entry's own declarations, the place record and the rack it fills. The eleventh is
// ./automatorPlace, which is forty lines this file no longer holds; folding it back to satisfy a
// count would put the record of a place away from nothing and this file back over the hard cap.
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
// And over the 400-line soft cap, well under the hard one: the run, the rack it fills and the fades
// either side of a place are one mechanism read top to bottom, and the last split it took —
// ./automatorPlace — is the one that brought it back under the hard cap. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
import { SparkleIcon } from "@phosphor-icons/react/Sparkle";

import { bindParam, rampFrom, rampTo, type ParamBinding } from "@/audio/ramp";
import { AUTOMATION_REARM_SECS } from "@/audio/transport";
import {
  createGrowth,
  GROWTH_COUNT_MAX,
  wanderSecs,
  type GrowthBounds,
  type GrowthCursor,
  type GrowthEntry,
  type GrowthChange,
  type GrowthParam,
} from "@/lib/effectGrowth";
import { mulberry32 } from "@/lib/random";
import { clamp } from "@/lib/range";
import {
  AUTO_UNREACHED,
  FADE_MIN,
  params,
  stirSecs,
  TICK_MIN_SECS,
  WAIT_MAX,
  WEIGHT_OF,
  type AutoParamId,
} from "./automatorParams";
import {
  defineEffect,
  instanceFromBindings,
  type Effect,
  type EffectInstance,
  type EffectInstanceId,
  type ParamDeclaration,
} from "./contract";
import {
  drawnAt,
  fadeAt,
  departing,
  leavesAt,
  presenceAt,
  LEAVE_GRACE_SECS,
  type Fade,
  type Standing,
} from "./automatorPlace";
import { createEffectRack } from "./rack";
import type { EffectParamId } from "./registry";
// oxlint-enable import/max-dependencies

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

/**
 * Where a poolable entry stands when it is all the way in: what it declared, or its presence
 * parameter's own default where that already says something (0202). Read here rather than at the
 * arrival, because it is also the point a bound widens away from.
 */
function fullOf(plugin: GrowablePlugin): number {
  if (plugin.presence.full !== undefined) return plugin.presence.full;
  const declared: readonly ParamDeclaration[] = plugin.params;
  return declared.find((param) => param.id === plugin.presence.param)?.default ?? 0;
}

/**
 * One pool entry as the maths sees it: a weight, and every parameter of it with the window a hand
 * has put on it. The one reading of which parameters an arrival actually draws — the run itself
 * takes it, and so does the surface painting a row of what was drawn, because two readings of that
 * is a row whose knobs are labelled with the wrong parameters (principle 1).
 */
export function growthEntryOf(
  plugin: GrowablePlugin,
  weight: number,
  bounds: GrowthBounds,
): GrowthEntry {
  const holdIds = new Set<string>(plugin.presence.held ?? []);
  const declared: readonly ParamDeclaration[] = plugin.params;
  return {
    id: plugin.id,
    weight,
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
      if (param.automation === "linear") range.lane = true;
      const bound = bounds[param.id];
      if (param.id === plugin.presence.param) {
        range.presence = true;
        // Absent, a presence is not a range at all: it is the one point the plugin declares full
        // at, which is exactly today's fade target written as a window (0208).
        range.bound = bound ?? { min: fullOf(plugin), max: fullOf(plugin) };
      } else if (bound !== undefined) range.bound = bound;
      return range;
    }),
  };
}

/** The parameters one arrival of this entry is drawn at, in the order it draws them. */
export function drawnParamIds(plugin: GrowablePlugin): string[] {
  return growthEntryOf(plugin, 0, {})
    .params.filter((param) => param.held !== true)
    .map((param) => param.id);
}

export const AUTOMATOR_ID = "automator";

/**
 * Built by the registry, which hands in the entries it may draw. A factory rather than a plain
 * entry because the alternative does not load: this file would have to import the registry to see
 * the pool, the registry imports this file to put it in `EFFECTS`, and `params.ts` reads the
 * registry at module scope — so the cycle resolves in the TDZ and the whole graph throws (0203).
 */
// One entry's whole declaration: what it is, how it draws the picture, what it says nothing with,
// and its presence. Every line is a field, so the length tracks how much this entry declares. 0007.
// oxlint-disable-next-line max-lines-per-function
export function createAutomator(
  pool: readonly GrowablePlugin[],
): Effect<typeof AUTOMATOR_ID, typeof params> {
  // Every entry in the pool has a weight, checked at load the way the drift declarations are. A
  // pool entry `WEIGHT_OF` has no line for is not drawn at all (`weightOf` reads it as nothing),
  // wears no control of its own on the card, and still mounts its picture in the run's rows —
  // three surfaces degrading in three directions from one missing line (principle 5, 0233).
  for (const plugin of pool) {
    if (WEIGHT_OF[plugin.id] === undefined) {
      throw new Error(`a pool entry declares no weight: ${plugin.id}`);
    }
  }
  return defineEffect({
    id: AUTOMATOR_ID,
    label: "Automator",
    // The first entry to claim the whole row: it holds a run of effects rather than a set of
    // knobs, and a run laid two abreast is two half-stories (P48).
    width: "full",
    // The one entry with something under its knobs: the run it is holding, a row apiece (0205).
    face: "grown",
    // What it runs is a draw from a pool rather than a period, so a yard holding one never comes
    // round (0080, 0208).
    grows: true,
    icon: SparkleIcon,
    drift: "swarm",
    geometry: "fan",
    // What it holds and how fast it turns over is what it does to a yard; how far it strays is how
    // finely it is drawn.
    driftFrom: [
      { param: "auto.most", into: "depth" },
      { param: "auto.stays", into: "period" },
      { param: "auto.drift", into: "pitch" },
    ],
    driftUnreached: AUTO_UNREACHED,
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
    "auto.least": bind(),
    "auto.most": bind(),
    "auto.odds": bind(),
    "auto.stays": bind(),
    "auto.wait": bind(),
    "auto.fade": bind(),
    "auto.drift": bind(),
    "auto.wander": bind(),
    "auto.filter": bind(),
    "auto.delay": bind(),
    "auto.eq": bind(),
    "auto.compressor": bind(),
    "auto.reverb": bind(),
    "auto.tape": bind(),
    "auto.pop": bind(),
    "auto.scatter": bind(),
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
  /**
   * The windows a hand has put on the pool. Pushed down rather than read up, the way the shared
   * clock is (`setSync`, ./contract.ts): this tier may not import the session, and what a run may
   * draw is durable on the instance that holds the run (0208).
   */
  let bounds: GrowthBounds = {};
  let growth = draw();
  /** Which change tick and which wander tick have been realized; both start before the first. */
  let realized = -1;
  let stirred = -1;
  let born = ctx.currentTime;
  /**
   * The instant the standing hold began, and — as the pumps go by — how far its push onto `born`
   * has already been paid. A hold stands exactly while `waitUntil > waitFrom`, so nought is not
   * waiting and a hold that has run out clears itself the first pump past its end.
   */
  let waitFrom = 0;
  /**
   * The context time the hold runs to, `Infinity` at the top of the knob's range — a wait with no
   * end, held until the knob comes back down (0215).
   */
  let waitUntil = 0;

  /**
   * Arm the hold from the instant the command arrived rather than from the value it carries: the
   * run is held until `at + wait`, so setting the knob to the number it already reads adds the
   * time again. That is what makes the hourglass a control and not a display (0215).
   */
  function hold(value: number, at: number): void {
    // A fresh hold starts its push here; one arriving over a hold that still stands keeps the
    // push already owed, so the time under the standing hold is never counted twice.
    if (waitUntil <= waitFrom) waitFrom = at;
    waitUntil = value >= WAIT_MAX ? Number.POSITIVE_INFINITY : at + value;
  }

  /**
   * How long the hold has left at `when` — nought where none stands, `Infinity` under the lock.
   * Derived and never stored: a durable value that counted itself down would be a command a
   * second (docs/plan.md §2).
   */
  function waitLeft(when: number): number {
    return waitUntil > waitFrom ? Math.max(waitUntil - when, 0) : 0;
  }

  /**
   * How much of the standing hold no place has been credited with yet. `pushClock` below credits
   * `waited` at the pump's own cadence — four seconds live — and a row is read sixty times a
   * second, so a countdown that trusted `waited` alone would fall for four seconds and jump back
   * on every pump for the whole of a hold. Derived here for the same reason how long is left is
   * derived: the pump is when the run moves, and this is read whenever a surface asks.
   */
  function unpaid(when: number): number {
    return waitUntil > waitFrom ? Math.max(Math.min(waitUntil, when) - waitFrom, 0) : 0;
  }

  /**
   * Stand the run's own clock still for as long as the hold covers. `born` is what every tick's
   * instant is measured from, so pushing it out by exactly the time held is what makes the ticks
   * a wait covers *unlaid* rather than laid late: nothing is realized under the hold, and the
   * released run lays its next place a full turnover on rather than catching up in one pump
   * (0204, 0215).
   */
  function pushClock(now: number): void {
    if (waitUntil <= waitFrom) return;
    const through = Math.min(waitUntil, now);
    if (through <= waitFrom) return;
    const by = through - waitFrom;
    born += by;
    // And every place the hold is standing over: what a hold takes is the run's clock, so a place
    // it covers has exactly that much more of its own life left than it did.
    for (const place of laid) if (place.departure === null) place.waited += by;
    waitFrom = through;
  }

  // A rack built from what the session holds — a reload, and the offline render an export is —
  // arms the hold it was carrying from the instant it is built: a run locked when the page closed
  // comes back locked, and a wait that was standing is asked for again (0215).
  hold(values["auto.wait"], ctx.currentTime);

  function entryOf(id: string): GrowablePlugin | undefined {
    return pool.find((plugin) => plugin.id === id);
  }

  /** The pool as the maths sees it: a weight off the knobs, and every value it may draw. */
  function poolFor(): GrowthEntry[] {
    return pool.map((plugin) => {
      const weightId = WEIGHT_OF[plugin.id];
      return growthEntryOf(plugin, weightId === undefined ? 0 : held[weightId], bounds);
    });
  }

  /** A fresh cursor at the seed and shape currently held. Every knob that shapes the run rebuilds it. */
  function draw(): GrowthCursor {
    return createGrowth(
      {
        least: held["auto.least"],
        most: held["auto.most"],
        odds: held["auto.odds"],
        drift: held["auto.drift"],
        wander: held["auto.wander"],
      },
      mulberry32(held["auto.seed"]),
      poolFor(),
    );
  }

  /** How many places the run holds, filled or not, as the maths rounds it. */
  function placesHeld(): number {
    return Math.max(1, Math.round(held["auto.most"]));
  }

  /** How long one place stands: the life asked for, or the floor where that is shorter. */
  function lifeSecs(): number {
    return Math.max(held["auto.stays"], TICK_MIN_SECS * placesHeld());
  }

  /**
   * How long one tick is. A place lives exactly `Most` ticks, so the interval between one arrival
   * and the next is the life divided among the places the run is holding — turn `Most` up and the
   * same life turns over more often, which is the whole relation between the two knobs. It is the
   * ceiling and not the standing population, so a run the odds have thinned still ticks at the
   * rate the two knobs name (0210).
   */
  function tickSecs(): number {
    return lifeSecs() / placesHeld();
  }

  /**
   * How long a fade may be. A place lives exactly `Most` ticks, and a fade longer than that would
   * still be arriving when it was asked to leave — which `rampTo` pins to the value it is at,
   * turning a retire into a step. Bounded here rather than at the knob so a rate change cannot
   * outrun a fade already declared (0204).
   */
  function fadeSecs(): number {
    return clamp(held["auto.fade"], FADE_MIN, Math.max(FADE_MIN, lifeSecs() / 2));
  }

  /** Lay a ramp onto one place's presence, and remember it so a row can be painted without the graph. */
  function fade(place: Standing, to: number, at: number, over: number, leaving: boolean): void {
    const plugin = entryOf(place.effect);
    if (plugin === undefined) return;
    const laidFade: Fade = { at, over, from: presenceAt(place, at), to };
    // Which ramp this is, said by the caller rather than read off the number it ends at: a hand
    // may bound a presence onto its own silent point, and an arrival that happens to be inaudible
    // is still an arrival — filed as a departure it would make the row read as leaving from the
    // instant it was laid, for its whole life (0208).
    if (leaving) place.departure = laidFade;
    else place.arrival = laidFade;
    // The pool proved this names one of that plugin's own declared, automatable parameters (0202);
    // the union it belongs to cannot be named here without making the registry's ids circular.
    // oxlint-disable-next-line no-unsafe-type-assertion
    const presence = plugin.presence.param as EffectParamId;
    rampTo(inner.automationTarget(place.id, presence), to, at, over);
  }

  /**
   * Take one place away the only way anything is taken away here: a fade to its plugin's own
   * silence, and its nodes let go once that fade is done. A retire calls it, a knob that redraws
   * the whole run calls it, and so does a hand asking for sooner — nothing this entry holds is
   * ever cut off (0202).
   *
   * Refused only once the fade has actually begun. A departure the clock has merely *scheduled* is
   * not one that has started: the run is laid ahead across the pump's horizon, so a place with
   * seconds still to run usually carries a retire already (0204). Asked again before that instant,
   * the fade is re-laid from where the place stands now — `rampTo` cancels from `when`, so the
   * later one it replaces never fires.
   */
  function leave(place: Standing, when: number, over: number): void {
    const plugin = entryOf(place.effect);
    if (plugin === undefined || departing(place, when)) return;
    fade(place, plugin.presence.silent, when, over, true);
    place.goneAt = when + over + LEAVE_GRACE_SECS;
  }

  /**
   * One standing place's drawn values moved to where they were redrawn, over the time the Wander
   * dial's own curve gives them. Every one of them declared a lane, so each is a schedule on a
   * bound AudioParam rather than a step — the same road a fade rides (0024, 0202).
   *
   * What is written here is the ramp and never the destination: a dial is read off it at every
   * frame, so it travels while the value does instead of arriving a whole ramp before the sound
   * (`drawnAt`, 0202, 0204).
   */
  function wander(
    place: Standing,
    moved: readonly { param: string; value: number }[],
    when: number,
    fine: number,
  ): void {
    const over = wanderSecs(held["auto.wander"], fine);
    for (const { param, value } of moved) {
      const at = place.specs.findIndex((each) => each.id === param);
      const ramp = place.fades[at];
      if (ramp === undefined) continue;
      // Where this value will actually be when the ramp begins, which is not where the knob reads
      // now: a stir is realized across the pump's own horizon, so it is laid ahead of its instant.
      const from = fadeAt(ramp, when);
      place.fades[at] = { at: when, over, from, to: value };
      // The pool proved this names one of that plugin's own automatable parameters; the union it
      // belongs to cannot be named here without making the registry's ids circular (0203).
      // oxlint-disable-next-line no-unsafe-type-assertion
      rampFrom(inner.automationTarget(place.id, param as EffectParamId), from, value, when, over);
    }
  }

  /**
   * The whole run again, from the seed, crossfaded into: everything the old run was holding leaves
   * the way anything leaves — over the fade knob, from wherever it had got to — and the fresh run
   * starts at this instant, so its first place is laid at once rather than every tick since the
   * boot being realized. A reshaped or rebounded run is a crossfade between two populations and
   * not a graph edit anyone hears, which is the whole of what this entry is for (0202, 0207).
   */
  function redraw(): void {
    const when = ctx.currentTime;
    const over = fadeSecs();
    for (const place of laid) leave(place, when, over);
    standing.clear();
    generation++;
    growth = draw();
    realized = -1;
    stirred = -1;
    // Settle what the standing hold owes before the clock it is owed against is replaced. A pump
    // runs every re-arm and a halted deck runs none at all, so the debt here can be the whole hold
    // so far — charged to the fresh `born` below it would push the run out by the wait twice
    // (0215).
    pushClock(when);
    born = when;
  }

  /** What one change becomes in the graph: a place let go, a value moved, or a place laid. */
  function apply(change: GrowthChange, when: number, over: number, fine: number): void {
    if (change.t === "grow") {
      grow(change, when, over);
      return;
    }
    if (change.t === "retire") {
      const place = standing.get(change.place.place);
      if (place === undefined || place.id !== instanceId(change.place, generation)) return;
      leave(place, when, over);
      // Out of the run, but not out of the rack: it goes on sounding until its fade is done, and
      // `laid` is what remembers that.
      if (standing.get(change.place.place) === place) standing.delete(change.place.place);
      return;
    }
    const place = standing.get(change.place.place);
    if (place === undefined || place.id !== instanceId(change.place, generation)) return;
    // On its way out already: what it is doing now is leaving, and a value ramped into that fade
    // is a movement nobody hears.
    if (place.goneAt !== null) return;
    wander(place, change.values, when, fine);
  }

  /**
   * One place laid: the entry built at its own silence and at every value it was drawn at, then
   * faded up. Nothing is ever switched into the path at strength, which is the whole of what this
   * entry is for (0202).
   */
  function grow(change: GrowthChange & { t: "grow" }, when: number, over: number): void {
    const plugin = entryOf(change.place.effect);
    if (plugin === undefined) return;
    const id = instanceId(change.place, generation);
    const built: Record<string, number> = {};
    for (const param of plugin.params) built[param.id] = param.default;
    // Each drawn value's own ramp, standing still at what it was drawn at: an arrival is honestly
    // instant, because a grown effect is *built* at its drawn values and only its presence is
    // faded (0202). Kept beside the declaration each one is of, so a read can put the ramp back
    // into that knob's own space — a row paints the draw, and the number a hertz reads as is not
    // where the dial stands (0128).
    const drawnSpecs: ParamDeclaration[] = [];
    const drawnFades: Fade[] = [];
    for (const { param, value } of change.values) {
      built[param] = value;
      const spec = plugin.params.find((each) => each.id === param);
      if (spec === undefined) continue;
      drawnSpecs.push(spec);
      drawnFades.push({ at: when, over: 0, from: value, to: value });
    }
    // Where the entry stands when it is all the way in: the point the draw landed on inside the
    // window this presence carries, which is the plugin's own declared `full` until a hand widens
    // that window into a range (0202, 0208).
    const full = built[plugin.presence.param] ?? fullOf(plugin);
    built[plugin.presence.param] = plugin.presence.silent;
    // The plugin itself, which this already holds — no lookup, and so no reach back into the
    // registry that is in the middle of building this very entry (0203).
    inner.add(id, plugin, built);
    const place: Standing = {
      id,
      effect: plugin.id,
      born: change.place.born,
      arrived: when,
      arrival: { at: when, over: 0, from: plugin.presence.silent, to: plugin.presence.silent },
      departure: null,
      waited: 0,
      goneAt: null,
      // One reading per ramp, filled in before any row reads them: where a drawn value stands has
      // one owner and it is that value's ramp (`drawnAt`, 0234).
      values: drawnSpecs.map(() => 0),
      fades: drawnFades,
      specs: drawnSpecs,
    };
    standing.set(change.place.place, place);
    laid.push(place);
    fade(place, full, when, over, false);
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
      // The one knob armed by the command and not by the number it carries: a repeat of the value
      // already held is a hand asking for that time again (0215).
      if (param === "auto.wait") hold(value, when);
    },
    // Every knob that shapes the run is declared `rebuild`, so a drag pays for the redraw once
    // when the hand lets go rather than on each of its pointer events (0090). The run is then
    // re-derived from the seed rather than continued, which is what keeps it a function of the
    // spec and the tick count alone (0204).
    endGesture: redraw,
    // A window on the pool is durable and is not a parameter, so it arrives the way the shared
    // clock does rather than through `setParam` — and it redraws by the same crossfade a knob that
    // reshapes the run does, because what may be drawn has changed (0207, 0208).
    setBounds: (next) => {
      bounds = next;
      redraw();
    },
    pump: (now, horizon) => {
      const step = tickSecs();
      const fine = stirSecs(step);
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
      // Everything above is a place already scheduled finishing rather than being cut, which a
      // hold never interrupts (0202). The hold's own work is here, before a single tick is
      // realized: the run's clock stands still, so nothing is laid and nothing is let go.
      pushClock(now);
      // Realize every tick and every stir whose instant falls inside the horizon. Decisions are
      // taken off the indices and never off `now`, so an interval and a render's suspensions agree.
      // Far enough ahead that everything arriving before the next pump is already scheduled, and
      // no further: each place laid ahead is an audio graph built early and standing silent until
      // its own instant, so a long horizon over a short tick is a rack of unheard reverbs (0204).
      const until = now + Math.min(horizon, AUTOMATION_REARM_SECS + step);
      // The run's own clock and the wander's, realized in the order their instants fall and spent
      // through the one generator: what a seed promises is the order of the draws (0134, 0204).
      for (;;) {
        const tickAt = born + (realized + 1) * step;
        const stirAt = born + (stirred + 1) * fine;
        if (Math.min(tickAt, stirAt) > until) break;
        // A stir falling at the same instant as a tick goes first, so a place laid at that tick is
        // not also moved at it: what a stir moves is exactly what the tick before it left standing.
        const ticking = tickAt < stirAt;
        if (ticking) realized++;
        else stirred++;
        // A pump that arrives late schedules into the past otherwise, which lands as a step.
        const when = Math.max(ticking ? tickAt : stirAt, now);
        for (const change of ticking ? growth.tick(realized) : growth.stir()) {
          apply(change, when, over, fine);
        }
      }
    },
    // A hand asking for a departure sooner than the clock would have taken it. It is asking for
    // sooner and not for a click, so what it performs is the ordinary retire — the same fade and
    // the same teardown — and the slot is left out of `standing`, which is what makes it empty
    // until its own tick lays into it (0202, 0210).
    dismiss: (place) => {
      const when = ctx.currentTime;
      // What a hand can let go of is what a hand can hear: arrived — a place laid ahead across
      // the horizon is scheduled and not yet audible, which is why `grown` refuses to report one,
      // and a departure ramped in before its arrival had run would cut it off — and not already
      // leaving. The row it is pressed on is exactly one `grown` wrote.
      const found = laid.find(
        (each) => each.id === place && each.arrived <= when && !departing(each, when),
      );
      if (found === undefined) return false;
      leave(found, when, fadeSecs());
      // Out of the run, but not out of the rack: it goes on sounding until its fade is done, and
      // `laid` is what remembers that — exactly as the clock's own retire leaves it.
      for (const [slot, there] of standing) if (there === found) standing.delete(slot);
      return true;
    },
    waiting: () => waitLeft(ctx.currentTime),
    grown: (out) => {
      const when = ctx.currentTime;
      const life = lifeSecs();
      // The hold the pump has not credited to these places yet, so a row between two pumps reads
      // the same life as a row on one.
      const owed = unpaid(when);
      let written = 0;
      const write = (place: Standing): void => {
        // Laid ahead but not yet arrived: scheduled, and not something a row may claim is playing.
        if (place.arrived > when || written >= GROWTH_COUNT_MAX) return;
        const remain = Math.max(
          leavesAt(place, life) + (place.departure === null ? owed : 0) - when,
          0,
        );
        // Every dial where its own ramp has got to, written back into the array the row shares:
        // a wander is a ramp, so the dial travels while the value does (0202).
        drawnAt(place, when);
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
