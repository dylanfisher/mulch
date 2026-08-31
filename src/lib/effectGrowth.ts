/**
 * @role What an automator grows, as a cursor over its own ticks: a run of places, one laid per
 *   tick until the run is full and then the oldest let go and a fresh one drawn in its stead — or
 *   the place left empty, where the odds said so and the floor did not insist — with the values
 *   each arrival is drawn at. Pure maths — no clock, no context, and no generator of
 *   its own: `random` is the caller's, because the order of the draws is the whole of what a seed
 *   promises (0089, 0204).
 * @instead The graph a change is performed on, and the fades that carry it → the automator plugin
 *   in src/audio/effects/automator.ts. The one generator a seed is spent through →
 *   src/lib/random.ts.
 */
import { DRIFT_OCTAVES_REACH, LINEAR_GEOMETRY, type DriftGeometry } from "./moire.ts";
import { clamp, denormalize, normalize, type RangeCurve } from "./range.ts";

/**
 * How many effects an automator may hold at once — the range both ends of the run are said in.
 * Zero grows nothing; the ceiling is the rack's.
 */
export const GROWTH_COUNT_MIN = 0;
export const GROWTH_COUNT_MAX = 6;

/**
 * The odds a tick lays the place whose turn it is. All of the way up is a run that is always as
 * wide as it may be, which is the only size a run had before there was a dial for it; down the
 * dial the run breathes between its floor and its ceiling, because a population that is always
 * the same size is the one thing a drawn run cannot be mistaken for.
 */
export const GROWTH_ODDS_MIN = 0;
export const GROWTH_ODDS_MAX = 1;

/** How far a drawn value may stray from its plugin's own default: none of the way, or all of it. */
export const GROWTH_DRIFT_MIN = 0;
export const GROWTH_DRIFT_MAX = 1;

/**
 * How alive a drawn value is once it has been drawn: never moved again, or moved at every tick it
 * stands. One dial, because the odds a knob moves and how fast it moves are one question asked
 * twice — a knob that moves constantly and takes a whole tick to get there is a knob nobody heard
 * move (`wanderSecs` below).
 */
export const GROWTH_WANDER_MIN = 0;
export const GROWTH_WANDER_MAX = 1;

/**
 * The shortest a wander may take. A value that steps is a graph edit and not a movement, which is
 * the one thing this whole entry exists to refuse (0202), so the fastest end of the dial is still
 * a ramp.
 */
export const WANDER_MIN_SECS = 0.05;

/**
 * How long one wandering value takes to reach where it was redrawn. The whole tick at the bottom
 * of the dial, where a knob that does move has all the time there is to get there, down to a swell
 * at the top — which is what makes one dial say both halves of "how alive".
 *
 * The tick here is the wander's own and not the run's (`stirSecs`, in automatorParams.ts):
 * a ramp that outlasted the next chance would be two ramps laid ahead on one knob, and the second
 * of those pins the value the knob is at rather than the one it is headed for (src/audio/ramp.ts).
 */
export function wanderSecs(wander: number, tickSecs: number): number {
  const at = clamp(wander, GROWTH_WANDER_MIN, GROWTH_WANDER_MAX);
  return Math.max(WANDER_MIN_SECS, tickSecs * (1 - at));
}

/**
 * How many scales one row an automator grew is drawn at: as many as the run is holding, so a rack
 * that got six times busier gets deeper as well as wider rather than six rows at one scale each.
 *
 * **The claim lands on the rows it grew and never on the automator's own.** `octaves` is a
 * `STRAIGHT_DIMENSIONS` claim the registry refuses a curved entry at load, the automator's own
 * geometry is `fan`, and a curved copy would need a picture-sized tile of its own — so a curved
 * row is one scale here as the answer rather than as a claim quietly dropped in the painter
 * (0142, 0143). Bounded by `DRIFT_OCTAVES_REACH`: past three held effects a straight row is
 * already at every scale the picture can carry, and further complexity is more rows and not more
 * depth. How many rows may go that deep at once is the row set's own bound
 * (`DRIFT_SCALES_BUDGET`), because the number of automators is not bounded by this.
 */
export function grownOctaves(held: number, geometry: DriftGeometry): number {
  if (geometry !== LINEAR_GEOMETRY) return 1;
  return clamp(Math.round(held), 1, DRIFT_OCTAVES_REACH);
}

/**
 * A window on one parameter: where a draw of it may land, in that parameter's own units. Absent
 * is the parameter's whole declared range, and for a presence parameter the single point its
 * plugin declares `full` at — which is why the two ends may be equal.
 */
export type GrowthBound = { min: number; max: number };

/**
 * Every window a hand has put on the pool, by the parameter's own id. Read off the pool's own
 * declarations rather than declared a second time as one automator parameter per pool parameter,
 * so a parameter added to a plugin tomorrow is bounded by construction (0208).
 */
export type GrowthBounds = Readonly<Record<string, GrowthBound>>;

/**
 * One parameter of a poolable entry, as much of it as a draw needs. `held` is the pair of facts
 * 0202 declares — whatever must stand at its default for the presence to be silent, and whatever
 * a draw may not spend at all — folded into one flag, because from here they are the same
 * instruction: do not draw this one, the automator is driving it.
 */
export type GrowthParam = {
  id: string;
  min: number;
  max: number;
  default: number;
  curve?: RangeCurve;
  held?: true;
  /**
   * This entry's own presence. Drawn like any other value — its window is the point the plugin
   * declares `full` at until a hand widens it — and never moved afterwards: how far in a place
   * stands is the automator's fade and not something the run may wander (0202).
   */
  presence?: true;
  /**
   * Present where the parameter declared a lane, which is the only kind a wander can move: a
   * value with nothing to schedule onto can be stepped and not ramped (0024, src/audio/ramp.ts).
   */
  lane?: true;
  /** Where a draw of it may land. The whole declared range where no hand has said otherwise. */
  bound?: GrowthBound;
};

/** One entry an automator may draw, and how often against the others. A weight of 0 is never. */
export type GrowthEntry = {
  id: string;
  weight: number;
  params: readonly GrowthParam[];
};

/** One place in the run: which entry stands in it, where it stands, and the tick it was laid at. */
export type GrowthPlace = { effect: string; place: number; born: number };

/** One value an arrival is drawn at — every parameter of it that is not held. */
export type GrowthValue = { param: string; value: number };

/** What becomes of the run at one tick. A roll is a retire and a grow at the same one. */
export type GrowthChange =
  | { t: "grow"; place: GrowthPlace; values: readonly GrowthValue[] }
  /** A place already standing, with the values that wandered off where they were drawn. */
  | { t: "move"; place: GrowthPlace; values: readonly GrowthValue[] }
  | { t: "retire"; place: GrowthPlace };

/**
 * Which entry a draw of `draw` lands on, or null where every weight is zero. Weights need not sum
 * to one — they are proportions against each other, so a hand may turn one up without turning the
 * rest down. A negative weight is nothing, not a subtraction.
 */
export function drawWeighted(weights: readonly number[], draw: number): number | null {
  let total = 0;
  for (const weight of weights) total += Math.max(0, weight);
  if (total <= 0) return null;
  let at = clamp(draw, 0, 1) * total;
  for (const [index, weight] of weights.entries()) {
    at -= Math.max(0, weight);
    if (at < 0) return index;
  }
  // Only reachable on a rounding tail: the last entry with any weight at all owns it.
  for (let index = weights.length - 1; index >= 0; index--) {
    if (Math.max(0, weights[index] ?? 0) > 0) return index;
  }
  return null;
}

/**
 * One value, drawn `drift` of the way from its own default toward wherever `draw` fell in the
 * window it is allowed. Drawn in the parameter's own space, so a log range strays by octaves
 * rather than by hertz and a cutoff wanders as the ear hears it rather than as the number reads.
 *
 * At a drift of nothing this is exactly the default, which is what makes the amount honest: the
 * knob's bottom is the plugin as its author shipped it, not "very nearly". Where a hand has put a
 * window that does not hold the default, the window wins and the bottom of the dial is its nearer
 * edge — a bound is what a hand said, and a default is what nobody said.
 */
export function drawValue(param: GrowthParam, drift: number, draw: number): number {
  const curve = param.curve ?? "linear";
  const bound = param.bound;
  const at = (value: number): number => normalize(value, param.min, param.max, curve);
  const low = bound === undefined ? 0 : clamp(at(bound.min), 0, 1);
  const high = bound === undefined ? 1 : clamp(at(bound.max), low, 1);
  const home = clamp(at(param.default), low, high);
  const away = low + (high - low) * clamp(draw, 0, 1);
  const drawn = home + (away - home) * clamp(drift, GROWTH_DRIFT_MIN, GROWTH_DRIFT_MAX);
  return denormalize(drawn, param.min, param.max, curve);
}

export type GrowthSpec = {
  /**
   * The fewest that stand at once, and the most: the run's floor and its ceiling. Both whole and
   * both clamped into the run this module allows, and a floor above the ceiling is the ceiling —
   * a range said backwards is one size, not an empty one.
   */
  least: number;
  most: number;
  /**
   * The odds a tick lays at all. The floor beats them: a tick that would take the run below
   * `least` lays whatever the roll said, because a bound is a promise and a chance is a texture
   * (0210).
   */
  odds: number;
  /** How far a drawn value strays from its plugin's default. */
  drift: number;
  /** The odds one drawn value moves again at each tick it stands. */
  wander: number;
};

/**
 * The cursor over one run, on the two clocks the run keeps: `tick` lays and lets go, and `stir` —
 * the wander's own, faster clock — moves what is standing. Both spend from the one generator, and
 * the caller realizes them in the order their instants fall, so the stream is a function of the
 * spec, the two cadences and the seed alone (0134, 0204). A stir takes no index because it takes
 * no decision off one: what it answers is which standing values moved, and the call itself is the
 * clock.
 */
export type GrowthCursor = {
  tick: (tick: number) => readonly GrowthChange[];
  stir: () => readonly GrowthChange[];
};

/**
 * The cursor. Call `tick` once per change tick, with consecutive indices from zero, and it answers
 * everything that becomes of the run at that tick; call `stir` once per wander tick, whenever one
 * falls, and it answers what moved.
 *
 * A place is laid per tick until the run is full, so a fresh automator fades its effects in one at
 * a time rather than opening with all of them at once; after that each tick rolls the oldest place
 * — retire and grow together, which is a crossfade in the same breath rather than a hole. Every
 * place therefore lives exactly `most` ticks, which is what lets the caller guarantee a life
 * longer than a fade by clamping the tick against it and nothing else.
 *
 * A tick may also lay nothing, at the odds the spec carries, and then the slot whose turn it was
 * stands empty until its turn comes round again — so the run is a size range rather than a
 * population, and `most` is how many slots there are rather than how many are filled. The floor
 * beats the odds: a tick that would leave fewer than `least` standing lays whatever the roll said.
 *
 * Every draw is taken whenever it is due and whatever it says, so the stream is a function of the
 * spec and the tick count alone — adding a field, or a weight of zero, never shifts it (0134). A
 * tick the odds left empty is the one exception and is a spec change like any other: it lays
 * nothing, so it spends nothing on an entry, and a thinned run is its own population (0210).
 */
// The closure owns the run's places and the one generator every draw is spent through, and the
// order of those draws is the whole of what a seed promises: a helper taking the generator would
// be a second author of that order. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function createGrowth(
  spec: GrowthSpec,
  random: () => number,
  pool: readonly GrowthEntry[],
): GrowthCursor {
  const held = (size: number): number =>
    clamp(Math.round(size), GROWTH_COUNT_MIN, GROWTH_COUNT_MAX);
  const most = held(spec.most);
  const least = Math.min(held(spec.least), most);
  const odds = clamp(spec.odds, GROWTH_ODDS_MIN, GROWTH_ODDS_MAX);
  const wander = clamp(spec.wander, GROWTH_WANDER_MIN, GROWTH_WANDER_MAX);
  const weights = pool.map(({ weight }) => weight);
  const entries = new Map(pool.map((entry) => [entry.id, entry] as const));
  const places: (GrowthPlace | null)[] = Array.from({ length: most }, () => null);

  /**
   * What wanders at this stir, one place at a time — every place standing, with no slot held back.
   * Both draws are spent for every value that *could* move whatever the dial says, so the stream
   * stays a function of the spec and the call count alone: turning Wander down is a quieter run
   * and never a different one (0134, 0204).
   *
   * A place on its way out is not skipped here and does not need to be. On one clock the skip cost
   * the oldest place its last chance; on two it would freeze it for the whole tick window before
   * its retire — a third of its life at the defaults — while its row still counted down. What a
   * value must not do is ramp into a fade that has already begun, and that is the automator's own
   * refusal, taken against the departure it has actually scheduled (`goneAt`, in the automator).
   */
  const stir = (): readonly GrowthChange[] => {
    if (most === 0) return [];
    const changes: GrowthChange[] = [];
    for (const place of places) {
      if (place === null) continue;
      const entry = entries.get(place.effect);
      if (entry === undefined) continue;
      const values: GrowthValue[] = [];
      for (const param of entry.params) {
        if (param.held === true || param.presence === true || param.lane !== true) continue;
        const moves = random() < wander;
        const value = drawValue(param, spec.drift, random());
        if (moves) values.push({ param: param.id, value });
      }
      if (values.length > 0) changes.push({ t: "move", place, values });
    }
    return changes;
  };

  /** Draw an entry and the values it arrives at. One draw for the entry, one per drawn value. */
  const lay = (place: number, born: number): GrowthChange | null => {
    const index = drawWeighted(weights, random());
    const entry = index === null ? undefined : pool[index];
    if (entry === undefined) return null;
    const values: GrowthValue[] = [];
    for (const param of entry.params) {
      // A held value is not drawn and its draw is not spent: it is the automator's to move, so
      // there was never a choice here to make (0202).
      if (param.held === true) continue;
      values.push({ param: param.id, value: drawValue(param, spec.drift, random()) });
    }
    const laid: GrowthPlace = { effect: entry.id, place, born };
    places[place] = laid;
    return { t: "grow", place: laid, values };
  };

  const tick = (index: number): readonly GrowthChange[] => {
    if (most === 0) return [];
    const changes: GrowthChange[] = [];
    const place = index % most;
    // Rolling: the place whose turn it is has stood the longest, because they were laid in order.
    // Until the run has been round once there is nothing in that slot to let go of, which is what
    // makes the opening one arrival at a time rather than a set.
    if (index >= most) {
      const going = places[place] ?? null;
      if (going !== null) changes.push({ t: "retire", place: going });
      places[place] = null;
    }
    // Spent at every tick and whatever it says, before the draws it precedes, so a seed still
    // names one performance. Unlike a wander's roll it gates draws rather than only their use —
    // a tick that lays nothing spends nothing on an entry — so a thinned run is a different
    // population from the same seed and not the full one with places missing (0210).
    const rolled = random() < odds;
    let standing = 0;
    for (const stood of places) if (stood !== null) standing++;
    // The floor beats the odds, on the way up as much as afterwards: a run under its floor lays
    // whatever the roll said, so a floor at the ceiling opens a place per tick however they fall.
    if (!rolled && standing >= least) return changes;
    const grown = lay(place, index);
    if (grown !== null) changes.push(grown);
    return changes;
  };

  return { tick, stir };
}
