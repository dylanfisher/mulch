/**
 * @role What an automator grows, as a cursor over its own ticks: a run of places, one laid per
 *   tick until the run is full and then the oldest let go and a fresh one drawn in its stead, with
 *   the values each arrival is drawn at. Pure maths — no clock, no context, and no generator of
 *   its own: `random` is the caller's, because the order of the draws is the whole of what a seed
 *   promises (0089, 0204).
 * @instead The graph a change is performed on, and the fades that carry it → the automator plugin
 *   in src/audio/effects/automator.ts. The one generator a seed is spent through →
 *   src/lib/random.ts.
 */
import { clamp, denormalize, normalize, type RangeCurve } from "./range.ts";

/** How many effects an automator may hold at once. Zero grows nothing; the ceiling is the rack's. */
export const GROWTH_COUNT_MIN = 0;
export const GROWTH_COUNT_MAX = 6;

/** How far a drawn value may stray from its plugin's own default: none of the way, or all of it. */
export const GROWTH_DRIFT_MIN = 0;
export const GROWTH_DRIFT_MAX = 1;

/**
 * One parameter of a poolable entry, as much of it as a draw needs. `held` is the pair of facts
 * 0202 declares — the presence itself, and whatever must stand at its default for the presence to
 * be silent — folded into one flag, because from here they are the same instruction: do not draw
 * this one, the automator is driving it.
 */
export type GrowthParam = {
  id: string;
  min: number;
  max: number;
  default: number;
  curve?: RangeCurve;
  held?: true;
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
 * One value, drawn `drift` of the way from its own default toward wherever `draw` fell in its
 * range. Drawn in the parameter's own space, so a log range strays by octaves rather than by hertz
 * and a cutoff wanders as the ear hears it rather than as the number reads.
 *
 * At a drift of nothing this is exactly the default, which is what makes the amount honest: the
 * knob's bottom is the plugin as its author shipped it, not "very nearly".
 */
export function drawValue(param: GrowthParam, drift: number, draw: number): number {
  const curve = param.curve ?? "linear";
  const home = normalize(param.default, param.min, param.max, curve);
  const away = clamp(draw, 0, 1);
  const at = home + (away - home) * clamp(drift, GROWTH_DRIFT_MIN, GROWTH_DRIFT_MAX);
  return denormalize(at, param.min, param.max, curve);
}

export type GrowthSpec = {
  /** How many stand at once. Whole, and clamped into the run this module allows. */
  count: number;
  /** How far a drawn value strays from its plugin's default. */
  drift: number;
};

/**
 * The cursor. Call it once per change tick, with consecutive indices from zero, and it answers
 * everything that becomes of the run at that tick.
 *
 * A place is laid per tick until the run is full, so a fresh automator fades its effects in one at
 * a time rather than opening with all of them at once; after that each tick rolls the oldest place
 * — retire and grow together, which is a crossfade in the same breath rather than a hole. Every
 * place therefore lives exactly `count` ticks, which is what lets the caller guarantee a life
 * longer than a fade by clamping the tick against it and nothing else.
 *
 * Every draw is taken whenever it is due and whatever it says, so the stream is a function of the
 * spec and the tick count alone — adding a field, or a weight of zero, never shifts it (0134).
 */
export function createGrowth(
  spec: GrowthSpec,
  random: () => number,
  pool: readonly GrowthEntry[],
): (tick: number) => readonly GrowthChange[] {
  const count = Math.max(GROWTH_COUNT_MIN, Math.min(GROWTH_COUNT_MAX, Math.round(spec.count)));
  const weights = pool.map(({ weight }) => weight);
  const places: (GrowthPlace | null)[] = Array.from({ length: count }, () => null);

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

  return (tick) => {
    if (count === 0) return [];
    const changes: GrowthChange[] = [];
    const place = tick % count;
    if (tick < count) {
      // Filling: one place laid per tick, so the run opens one effect at a time.
      const grown = lay(place, tick);
      if (grown !== null) changes.push(grown);
      return changes;
    }
    // Rolling: the place whose turn it is has stood the longest, because they were laid in order.
    const going = places[place] ?? null;
    if (going !== null) changes.push({ t: "retire", place: going });
    places[place] = null;
    const grown = lay(place, tick);
    if (grown !== null) changes.push(grown);
    return changes;
  };
}
