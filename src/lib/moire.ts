/**
 * @role How long the whole loop takes: the periods a deck is running on — one per active lane, one
 *   per instance in its rack, plus the deck's own loop — the estimate of when they next line up,
 *   and the one human unit
 *   that estimate is said in. Plus what a row of the picture is made of that is not its period:
 *   the lane's own shape, sampled once, and the profile its grating is cut to — the shape of the
 *   wave an effect impresses itself on the picture with. Pure maths: no context, no DOM, no clock.
 * @instead A lane's own period → laneSpan in src/lib/automation.ts, which this reads rather than
 *   restates. The words each unit is said in → DURATION_SCALE in src/lib/copy.ts. Drawing the
 *   rows these periods describe → src/ui/moireCanvas.ts.
 */
import { automationValueAt, laneSpan, type AutomationPoint } from "./automation";
import { DURATION_SCALE, type DurationUnit } from "./copy";
import { clamp, denormalize, normalize } from "./range";
import type { Loop } from "./timeline.ts";

/**
 * The loop's period in real seconds. Rate scales buffer time and not lane time, so the loop is
 * the one row of the strip that has to be divided by it (0035). A deck with no loop, or one read
 * at no rate at all, is running on no period rather than on a zero-length one.
 */
export function loopPeriodSecs(loop: Loop | null, rate: number): number {
  if (loop === null || rate <= 0) return 0;
  return (loop.out - loop.in) / rate;
}

/**
 * How many divisions of the shortest period the estimate is quantized onto. Relative rather than
 * absolute: a fixed grid fine enough for a 0.1s lane cannot reach far enough for a ten-minute
 * one, and this is an estimate whose whole job is to be free (P54).
 */
export const RECURRENCE_DIVISIONS = 16;

/** The finest grid the quantization will use, whatever the shortest period is. */
export const MIN_RECURRENCE_GRID_SECS = 0.01;

/**
 * Where the exact integers stop, in grid ticks. Under 2**53, so every product accepted below it
 * is an exact integer; past it the multiple is carried as a sum of logarithms instead, because a
 * figure computed on inexact integers is a lie with decimal places (principle 5) — and the
 * magnitude of a least common multiple needs no 2**53 (0080).
 */
export const MAX_RECURRENCE_TICKS = 2 ** 52;

/**
 * How long the pattern takes: the exact seconds while the multiple is still an exact integer, or
 * the base-ten logarithm of those seconds once it is not. Never both, never neither — the caller
 * cannot read a magnitude as a length by accident.
 */
export type RecurrenceLength = { readonly secs: number } | { readonly log10Secs: number };

/**
 * The largest power of each prime that divides `value`, folded into `into` as the running maximum
 * — which is exactly the factorisation of the least common multiple of everything folded in so
 * far. Trial division to the square root, so what is left over at the end is prime.
 *
 * A factorisation is the one form of a multiple that is both exact and unbounded: the product may
 * be past 2**53, the sum of its logs never is.
 */
function foldFactors(value: number, into: Map<number, number>): void {
  const raise = (prime: number, power: number): void => {
    into.set(prime, Math.max(into.get(prime) ?? 0, power));
  };
  let rest = value;
  for (let prime = 2; prime * prime <= rest; prime += prime === 2 ? 1 : 2) {
    let power = 0;
    while (rest % prime === 0) {
      rest /= prime;
      power++;
    }
    if (power > 0) raise(prime, power);
  }
  if (rest > 1) raise(rest, 1);
}

/**
 * When every period next lines up — in real seconds while that is exact, and as a magnitude once
 * it is not. The periods are quantized onto one coarse grid and the least common multiple is
 * taken on that, so two periods that are nearly commensurate are treated as commensurate: crude
 * beats slow, and the number this produces is read as an order of magnitude rather than as a
 * countdown.
 *
 * Periods that are not a positive finite length — a lane that never moved, a loop of no length,
 * a deck stopped dead at no rate — hold no cycle and take no part. No periods at all is not a
 * recurrence of forever; it is nothing going round, which is zero seconds.
 */
export function recurrenceLength(periods: readonly number[]): RecurrenceLength {
  const usable = periods.filter((period) => Number.isFinite(period) && period > 0);
  const shortest = usable[0] === undefined ? 0 : Math.min(...usable);
  if (shortest <= 0) return { secs: 0 };
  const grid = Math.max(MIN_RECURRENCE_GRID_SECS, shortest / RECURRENCE_DIVISIONS);
  const powers = new Map<number, number>();
  // A period whose tick count is past the safe integers has no factorisation to take: it is
  // already a magnitude, so it joins the multiple as its own log — coprime with everything, which
  // is this estimate erring the way it always errs. Divided in logs rather than before them,
  // because `period / grid` is the thing that overflowed.
  let log10Loose = 0;
  for (const period of usable) {
    const step = Math.round(period / grid);
    if (Number.isSafeInteger(step)) foldFactors(Math.max(1, step), powers);
    else log10Loose += Math.log10(period) - Math.log10(grid);
  }
  // The crossing, and the only one: the product is carried exactly for as long as it fits under
  // the cap, and the sum of logs is carried the whole way regardless, so the two agree either
  // side of the step rather than meeting at it.
  let ticks = 1;
  let log10Ticks = log10Loose;
  let exact = log10Loose === 0;
  for (const [prime, power] of powers) {
    log10Ticks += power * Math.log10(prime);
    if (!exact) continue;
    const next = ticks * prime ** power;
    if (next > MAX_RECURRENCE_TICKS) exact = false;
    else ticks = next;
  }
  // An exact tick count can still be more seconds than a double holds, and a length that is not a
  // length is no answer at all (principle 5): the logs were kept for exactly this.
  const secs = ticks * grid;
  return exact && Number.isFinite(secs) ? { secs } : { log10Secs: log10Ticks + Math.log10(grid) };
}

/**
 * One unit and one figure, never a breakdown. Three readings and no others: how many of the
 * largest unit the duration fills, how many of the last unit it is once the scale has run out of
 * names, and — once even that multiple has stopped being a number a person can hold — what power
 * of ten it is. The unit does the work in all three.
 */
export type Recurrence =
  | { readonly figure: number; readonly unit: string }
  | { readonly multiple: number; readonly unit: string }
  | { readonly exponent: number; readonly unit: string };

/**
 * The two ends of the scale: what a figure too small for any unit is still said in, and the last
 * one. The scale is a non-empty tuple, so both ends are the type system's rather than a check's.
 */
const [smallest] = DURATION_SCALE;

/**
 * The last unit on the scale. It is not an answer of its own any more: it is the unit a multiple
 * — and past that an exponent — counts in, so the estimate keeps counting past where a duration
 * is a duration instead of flattening onto it (0080).
 */
export const BEYOND_MEASURE: DurationUnit = DURATION_SCALE.at(-1) ?? smallest;

/** That unit's own magnitude, so a length already in logs never has to leave them to be placed. */
const LOG10_BEYOND = Math.log10(BEYOND_MEASURE[1]);

/**
 * How many of the last unit are still said as a figure, and how many decimals a figure carries.
 * At ten the figure is said as its own order of magnitude instead, which is where the decimal had
 * stopped meaning anything anyway.
 */
const EXPONENT_FROM = 10;
const FIGURE_DECIMALS = 1;

/**
 * The duration a length is, in the largest unit that fits it — and, past the largest unit there
 * is, in multiples of that one. A length carried as a magnitude is placed on the scale by its
 * logarithm rather than by leaving logs to be compared, which is the whole reason it is in them.
 */
export function describeRecurrence(length: RecurrenceLength): Recurrence {
  const log10Secs = "secs" in length ? Math.log10(length.secs) : length.log10Secs;
  if (log10Secs < LOG10_BEYOND) {
    const secs = "secs" in length ? length.secs : 10 ** log10Secs;
    let chosen: DurationUnit = smallest;
    for (const entry of DURATION_SCALE) {
      if (secs < entry[1]) break;
      chosen = entry;
    }
    return { figure: secs / chosen[1], unit: chosen[0] };
  }
  const log10Multiple = log10Secs - LOG10_BEYOND;
  // Decided on the figure as it will be read, not on the one behind it: 9.99 of them rounds to ten
  // on the way to the screen, and two adjacent answers must not both say ten in two notations.
  const multiple = 10 ** log10Multiple;
  if (Number(multiple.toFixed(FIGURE_DECIMALS)) < EXPONENT_FROM) {
    return { multiple, unit: BEYOND_MEASURE[0] };
  }
  return { exponent: Math.round(log10Multiple), unit: BEYOND_MEASURE[0] };
}

/**
 * The estimate as the one line beside the strip. Deadpan: the unit does the work, so the figure
 * is one decimal while it is small enough to matter, a whole number once it is not, and a power
 * of ten once the unit itself is the thing being counted. The exponent reads as a plain unit.
 */
export function recurrenceLabel(recurrence: Recurrence): string {
  if ("exponent" in recurrence) return `10^${recurrence.exponent} × ${recurrence.unit}`;
  const figure = "figure" in recurrence ? recurrence.figure : recurrence.multiple;
  const said =
    figure < EXPONENT_FROM ? figure.toFixed(FIGURE_DECIMALS) : String(Math.round(figure));
  return "figure" in recurrence ? `${said} ${recurrence.unit}` : `${said} × ${recurrence.unit}`;
}

/**
 * How many loop periods a window shows — one number, at both sizes. The strip once asked for a
 * few and the overlay for many, which made the small picture a different picture rather than a
 * smaller one: at four cycles across a strip's height the rows are wide enough to fill their own
 * band and read as a blob. The finer lines follow from the window, not from a second set of
 * drawing rules (0098).
 */
export const MOIRE_CYCLES = 48;

/**
 * How many cycles of the slowest row a window shows however few loop periods that is. Below two
 * the slowest row never repeats inside the picture, and a row that ticks once is a line rather
 * than a band — which is the one thing this picture must not read as.
 */
export const MIN_ROW_CYCLES = 2;

/**
 * How wide a window the rows are drawn across, in real seconds: a few periods of `reference` —
 * the deck's own loop, which is what a listener is counting in — pulled back where that would not
 * be enough for the slowest row to come round twice. A deck with no loop has no reference and
 * falls back to its slowest row. At close zoom the pattern reads as static, which is why the
 * cycles asked for are many rather than few — and why both sizes ask for the same number.
 */
export function moireWindowSecs(
  reference: number,
  periods: readonly number[],
  cycles: number,
): number {
  const usable = periods.filter((period) => Number.isFinite(period) && period > 0);
  const longest = usable[0] === undefined ? 0 : Math.max(...usable);
  if (longest <= 0) return 0;
  const base = Number.isFinite(reference) && reference > 0 ? reference : longest;
  return Math.max(base * cycles, longest * MIN_ROW_CYCLES);
}

/**
 * The band an instance in the rack draws its own row's period from, in real seconds: short enough
 * to beat against a bar and long enough to drift across several, so a rack of two is two rows that
 * cross rather than two of the same.
 */
export const EFFECT_ROW_PERIOD_SECS: readonly [number, number] = [0.75, 12];

/**
 * How many periods that band is divided into. Coarse on purpose: two rows a fraction of a percent
 * apart beat once every few thousand seconds, which is no fringe inside any window the strip draws
 * and reads as one row drawn twice. A grid of this many is a real ratio between neighbours.
 */
const EFFECT_ROW_PERIODS = 12;

/** How far up the fold the choice is read from: the low bits are already spent on the waveform. */
const EFFECT_ROW_SHIFT = 1024;

/**
 * The period an instance's own row runs on, folded out of the same number its name and its shape
 * are (0076): an effect is drawn whether or not anything is automating it, so a rack contributes
 * rows to the picture on its own. Read from the fold's quotient, because its remainder is already
 * spent picking the row's waveform — one fold, two independent halves, exactly as an effect's two
 * name pools are drawn (src/lib/copy.ts). Geometric across the band: what one period does to
 * another is a ratio, so an even spread of ratios is an even spread of beats.
 */
export function effectRowPeriod(seed: number): number {
  const turn = (Math.floor(seed / EFFECT_ROW_SHIFT) % EFFECT_ROW_PERIODS) / EFFECT_ROW_PERIODS;
  return denormalize(turn, ...EFFECT_ROW_PERIOD_SECS, "log");
}

/** How many samples of its own shape a row carries: enough to bend a wave, not to redraw a lane. */
export const BEND_SAMPLES = 16;

/** What a row with no shape of its own carries: the middle of the range, so it bends nothing. */
export const FLAT_BEND: readonly number[] = [0.5];

/**
 * A lane's own gesture across one cycle, normalized onto 0..1 — what bends a row's wave, so the
 * period sets the fringe pitch and the values decide where the fringes crowd. Read through
 * `automationValueAt`, which is the one reading of a lane there is (0035), and sampled once when
 * the rows are built: a lane's shape does not move, only its phase does, so nothing here is
 * per-frame work (0070). A lane holding one value bends nothing and reads flat.
 */
export function laneBend(lane: readonly AutomationPoint[]): readonly number[] {
  const span = laneSpan(lane);
  const base = lane[0]?.value ?? 0;
  if (span <= 0) return FLAT_BEND;
  const samples = Array.from({ length: BEND_SAMPLES }, (_, index) =>
    automationValueAt(lane, (index / BEND_SAMPLES) * span, base),
  );
  const low = Math.min(...samples);
  const high = Math.max(...samples);
  if (high <= low) return FLAT_BEND;
  return samples.map((value) => normalize(value, low, high));
}

/**
 * One row of the picture: how long its cycle is in real seconds, how far into that cycle it has
 * reached, the fold it is drawn from — its parameter's, or its instance's own id — which picks
 * both the waveform and where in its cycle it starts, the lane's own gesture across that cycle,
 * the profile its grating is cut to — the effect's own, or the plain one for a row no effect owns
 * — whether it is the reference the others are read against, and the two ratios an effect's own
 * values reach it through. Allocated once per set of rows and refilled in place, because `phase`
 * is a per-frame read (0070) — every other field is the row's identity or what its effect is set
 * to, and neither of those changes between frames.
 */
export type MoireRow = {
  period: number;
  phase: number;
  reference: boolean;
  shape: number;
  bend: readonly number[];
  profile: DriftProfile;
  /** How much of its own depth this row cuts, as a fraction of the depth every row is cut at. */
  depth: number;
  /** How much finer or coarser than its period alone this row is drawn, as a ratio. */
  pitch: number;
  /** How far apart this row asks the three channels of the picture's ink to stand, as a ratio. */
  fringe: number;
  /** How far it asks those three channels' pitches and angles to diverge, nothing to wholly. */
  disperse: number;
  /** Where between the picture's cool ink and its hot one it asks to be drawn, as a blend. */
  hue: number;
};

/**
 * The seven things about a row an effect's own values may reach, and the whole of what one may
 * say: how long its cycle is, how deep it cuts, how fine it is drawn, how much it breathes across
 * that cycle, and the three that are colour rather than shape — how far the three channels of its
 * ink stand apart, how far their own pitches and angles diverge, and where between the picture's
 * two inks it is drawn. A registry entry declares one parameter into each of the ones it claims
 * ([0139](../../docs/decisions/0139-a-row-is-what-an-effect-is-set-to.md)), so a value reaches the
 * picture by being declared rather than by a painter growing a branch for the effect it belongs
 * to. Nothing here names an effect, and none of them is another in disguise: `pitch` is a fixed
 * spacing and `bend` is a spacing that moves as the row turns; `fringe` is how far the three
 * channels stand apart and `disperse` is whether they are still the same lattice at all
 * ([0141](../../docs/decisions/0141-colour-is-something-an-effect-turns.md)).
 *
 * **The last three are read per picture and not per row.** The ink every row is cut out of is one
 * tile over the whole canvas, so a row claiming one of them speaks for all of them:
 * `screenFringe`, `screenDisperse` and `screenHue` (src/ui/moireScreen.ts) each take the loudest
 * claim any row makes. The first four are the row's own and are read by the painter per row.
 */
export const DRIFT_DIMENSIONS = [
  "period",
  "depth",
  "pitch",
  "bend",
  "fringe",
  "disperse",
  "hue",
] as const;

export type DriftDimension = (typeof DRIFT_DIMENSIONS)[number];

/**
 * One of an instance's values on its way into the picture: which dimension it reaches, and where
 * it stands in its own declared range, as a turn on 0..1. The reading is the parameter's value and
 * not whether a lane is riding it — a knob at rest still says what its effect is doing.
 */
export type DriftReach = { readonly into: DriftDimension; readonly turn: number };

/**
 * What a row is once its effect's values have reached it — the rest of it is its identity. Derived
 * from the dimensions rather than restating them, so a fifth one is declared once (principle 1).
 */
export type DriftReached = Pick<MoireRow, DriftDimension>;

/**
 * The shallowest a value may cut its own row, as a fraction of the depth the picture is cut at. Not
 * zero: an effect turned all the way down is still in the signal path, and a row that vanishes at
 * one end of a knob's travel is the bypass switch saying something a knob is not allowed to say.
 */
export const DRIFT_DEPTH_FLOOR = 0.4;

/** How far either way a value may take its row's fringes, as a ratio on the pitch its period sets. */
export const DRIFT_PITCH_REACH = 1.35;

/**
 * How far a value may stand the three channels of its row's ink apart, as a ratio on the lag the
 * picture rests at (`CHANNEL_LAG`, src/ui/moireScreen.ts). Nothing at one end — the three lattices
 * on top of each other, which is a row in one flat hue — and twice the resting lag at the other,
 * which is a third of a beat cell each and the furthest three lattices can stand before they begin
 * closing on each other again. So one knob's travel takes the picture from near-monochrome to
 * strongly chromatic, which is what colour being something an effect turns means (0141).
 */
export const DRIFT_FRINGE_REACH = 2;

/**
 * How far a value may drive the three channels' own lattices apart in pitch and in angle: nothing
 * at one end, wholly at the other. Its own dimension and not a deeper `fringe`, because the two
 * say different things — a lag is three copies of one lattice offset, and this is three lattices.
 */
export const DRIFT_DISPERSE_REACH = 1;

/**
 * How far a value may carry the picture between its two inks. One by definition — a blend has no
 * further to go — and named beside the other two so the three read alike where they are spent.
 */
export const DRIFT_HUE_REACH = 1;

/**
 * What a row no value of an effect's reaches carries in every dimension but its own period and its
 * own bend: cut at the one depth, drawn at the pitch its period sets, its channels at the lag the
 * picture rests at, still one lattice, and in the picture's own ink. Declared once and read by
 * `driftReached` and by every row no effect owns (principle 1).
 */
export const DRIFT_REST = {
  depth: 1,
  pitch: 1,
  fringe: 1,
  disperse: 0,
  /** Halfway between the two inks is the ink the caller resolved, and neither of them. */
  hue: 0.5,
} as const satisfies Omit<Pick<MoireRow, DriftDimension>, "period" | "bend">;

/**
 * A row that breathes by `amount` across its own cycle: the same table `laneBend` samples a
 * gesture into, filled instead from one value — so a declared bend crowds and opens the fringes as
 * the row turns, where a declared pitch holds them at one spacing. An amount of nothing is a row
 * that does not breathe, which is the flat table a row no value reaches carries.
 */
export function bendSwing(amount: number): readonly number[] {
  if (!(amount > 0)) return FLAT_BEND;
  return Array.from(
    { length: BEND_SAMPLES },
    (_, index) => 0.5 + 0.5 * clamp(amount, 0, 1) * cosTurn(index / BEND_SAMPLES),
  );
}

/**
 * What an instance's own row is, given the fold of its id and every value its registry entry
 * declared a way into the picture for. A dimension no value reaches keeps what a row has always
 * had: the period the fold picks, the depth every row is cut at, the pitch its period sets, and no
 * bend. A dimension a value reaches is that value, so two instances of one effect set alike draw
 * alike and two set differently do not — which is the whole of what this step is (0139).
 *
 * A dimension is reached at most once per entry, which the registry refuses at load rather than
 * resolving here.
 */
export function driftReached(seed: number, reach: readonly DriftReach[]): DriftReached {
  const turnOf = (into: DriftDimension): number | undefined =>
    reach.find((each) => each.into === into)?.turn;
  const period = turnOf("period");
  const depth = turnOf("depth");
  const pitch = turnOf("pitch");
  const bend = turnOf("bend");
  const fringe = turnOf("fringe");
  const disperse = turnOf("disperse");
  const hue = turnOf("hue");
  return {
    period:
      period === undefined
        ? effectRowPeriod(seed)
        : denormalize(period, ...EFFECT_ROW_PERIOD_SECS, "log"),
    depth: depth === undefined ? DRIFT_REST.depth : denormalize(depth, DRIFT_DEPTH_FLOOR, 1),
    pitch:
      pitch === undefined
        ? DRIFT_REST.pitch
        : denormalize(pitch, 1 / DRIFT_PITCH_REACH, DRIFT_PITCH_REACH, "log"),
    bend: bend === undefined ? FLAT_BEND : bendSwing(bend),
    fringe: fringe === undefined ? DRIFT_REST.fringe : denormalize(fringe, 0, DRIFT_FRINGE_REACH),
    disperse:
      disperse === undefined ? DRIFT_REST.disperse : denormalize(disperse, 0, DRIFT_DISPERSE_REACH),
    hue: hue === undefined ? DRIFT_REST.hue : denormalize(hue, 0, DRIFT_HUE_REACH),
  };
}

export const TAU = 2 * Math.PI;

/**
 * `value` inside one span of `span`, never negative — a turn as a fraction of itself, a device
 * pixel as its place in a tile. Here rather than in either painter because both of them wrap, and
 * the two would drift apart the first time one of them was tightened (principle 1).
 */
export const wrap = (value: number, span: number): number => ((value % span) + span) % span;

/**
 * The shapes a row's grating is cut to across one of its own cycles. **A row's pitch says how fast
 * something is running and its angle says which parameter it is; neither says what kind of thing
 * is doing it** — a filter and a delay were one more cosine each and read alike. A profile is the
 * dimension an effect impresses itself on: two gratings beat into the fringes their harmonics
 * share, so a crest with an echo behind it and a crest clipped flat cross into different families
 * of fringes at the same pitch and the same angle.
 *
 * `plain` belongs to no effect: it is what the loop's reference row and a deck's own lanes are
 * cut to. Every other one is claimed by exactly one registry entry, beside its icon and its
 * parameters, and the registry throws at load for two that claim the same (0122) — so an effect
 * added without a look of its own fails rather than drawing as one that already exists.
 */
export const DRIFT_PROFILES = ["plain", "slope", "peak", "flat", "twin", "lobe", "split"] as const;

export type DriftProfile = (typeof DRIFT_PROFILES)[number];

/** The profile a row no effect owns is cut to: the plainest grating there is. */
export const PLAIN_PROFILE: DriftProfile = "plain";

/**
 * The `harmonic`th cosine of a cycle at `turn`. The one cosine this app's gratings are built out
 * of: both painters, the plain profile and every harmonic below go through it, so there is one
 * wave here and not a copy per caller (principle 1).
 */
export const cosTurn = (turn: number, harmonic = 1): number => Math.cos(TAU * harmonic * turn);

/** The plain grating's own share of the ink at `turn`: half a cosine, and the mean of every one. */
const halfCosine = (turn: number): number => 0.5 - 0.5 * cosTurn(turn);

/**
 * How much of its own share the second or third harmonic carries when a profile is built out of
 * one. A quarter each, so the fundamental and the harmonic still swing the whole way between an
 * open slit and a shut one, and neither buries the other.
 */
const HARMONIC_SHARE = 0.25;

/**
 * How much of a cycle a `slope`'s fall takes, and how sharply a `flat`'s edges stand up. The fall
 * is a fraction rather than nothing because the tile is sampled at sixty-four points and drawn at
 * between three and sixteen: an instantaneous edge is the one thing that shimmers under that
 * filtering rather than beating. An eighth of a cycle is a third of a device pixel at the band's
 * finest pitch and two at its coarsest — a fall the eye reads as an edge and the filter does not.
 */
const SLOPE_FALL = 0.12;
const FLAT_EDGE = 3;

/**
 * A ramp that rises across the cycle and falls back over `fall` of it. Its mean is exactly a half
 * whatever `fall` is — a triangle of any skew averages its own ends — which is what lets `slope`
 * and `peak` be the same line twice.
 */
const rampBlock = (turn: number, fall: number): number => {
  const at = wrap(turn, 1);
  return at < 1 - fall ? at / (1 - fall) : (1 - at) / fall;
};

/**
 * One wave per profile, and the whole of what a profile is.
 *
 * **Every one of them averages exactly a half over a cycle**, which is not decoration:
 * `gratingDepth` solves for a depth on the assumption that one grating keeps `1 - depth / 2`, so a
 * profile with a mean of its own would make the picture's brightness say which effects a yard
 * holds rather than how deep its gratings are cut. Each is therefore written as a half plus a term
 * that integrates to nothing — a cosine and its harmonics, or a ramp, both zero-mean by
 * construction.
 */
const PROFILE_WAVES: Record<DriftProfile, (turn: number) => number> = {
  // The plain wave a row no effect owns is cut to: the loop's reference row, and a deck's own
  // knobs. One entry per profile and the record is total, so a profile added without a wave of its
  // own fails to compile rather than quietly drawing as this one.
  plain: (turn) => halfCosine(turn),
  // A slope: the spectrum falling away past a cutoff, cut off and begun again.
  slope: (turn) => rampBlock(turn, SLOPE_FALL),
  // One band lifted and its skirts either side of it — the same ramp, fallen symmetrically.
  peak: (turn) => rampBlock(turn, 0.5),
  // A crest clipped flat, which is what a compressor does to one.
  flat: (turn) => 0.5 - 0.5 * clamp(FLAT_EDGE * cosTurn(turn), -1, 1),
  // A crest with its echo behind it: the second harmonic in step, sharpening the crest.
  twin: (turn) => 0.5 - HARMONIC_SHARE * (cosTurn(turn) + cosTurn(turn, 2)),
  // A crest ringing out into side lobes: the third harmonic, which is what a tail sounds like.
  lobe: (turn) => 0.5 - HARMONIC_SHARE * (cosTurn(turn) + cosTurn(turn, 3)),
  // A crest wandering into two — wow and flutter, the tape's own instability.
  split: (turn) => 0.5 - HARMONIC_SHARE * (cosTurn(turn) - cosTurn(turn, 2)),
};

/**
 * How much of the ink a grating cut to `profile` takes at `turn` of its own cycle — the tile a
 * painter writes, and the only place a profile is a number.
 */
export const profileBlock = (profile: DriftProfile, turn: number): number =>
  PROFILE_WAVES[profile](turn);

/** The width of the fold, so the whole of it is spread across one cycle rather than a corner. */
const FOLD_TURNS = 2 ** 32;

/**
 * Where in its own cycle a row starts, in turns. There are more parameters than there are
 * waveforms, so the waveform alone cannot keep two of them apart: the fold picks the waveform by
 * its remainder and the whole of it turns the row, exactly as an effect's two pools are drawn from
 * one fold (src/lib/copy.ts). Two parameters draw the same row only if they fold to the same
 * number, which is what the fold exists not to do — and it is the same turn the screen slices to
 * decide which parameter owns which of its motions (0128).
 */
export const rowOffset = (shape: number): number => (shape % FOLD_TURNS) / FOLD_TURNS;

/** Where a row stands in its own cycle, in turns — what every motion in the picture is read off. */
export const turnsOf = (row: MoireRow): number => wrap(row.phase / row.period, 1);

/**
 * How much light a whole stack of gratings lets through on average — and so, since the picture is
 * one minus that, how much of it is a window rather than ink. Not a tuning: it is what
 * `gratingDepth` solves for, so how many rows a yard has does not say what the picture weighs.
 */
export const PICTURE_FLOOR = 0.3;

/**
 * How deep each of `count` gratings cuts, so that all of them multiplied leave `floor` of the ink
 * standing whatever `count` is. One grating keeps `1 - depth / 2` on average, so `count` of them
 * keep that to the power of `count`; this is that solved for the depth.
 *
 * Without it the picture's brightness would say how many rows a yard has — measured in headless
 * Chromium, five gratings at full depth leave 3% of the ink standing and eight leave 0.4%, which
 * is a black rectangle. It is also the answer to the depth² objection that kept the beat out of
 * the screen (0129): that held while a picture had to survive underneath the gratings, and here
 * the gratings *are* the picture. Measured across two to twelve rows, the field's mean holds at
 * the floor and the beat's own swing does not fall with it.
 *
 * Never past one: a grating cannot cut deeper than its own trough. A picture of one row is
 * therefore lighter than the floor, which is right — one grating has nothing to beat against.
 *
 * What this solves is the share the *count* takes, which is the part a yard's contents must not
 * say. A row then cuts its own fraction of that share (`MoireRow.depth`, 0139), so a yard whose
 * effects are turned down sits above the floor — that is the effect being heard less, which is a
 * thing the picture is supposed to say, where the number of rows is not.
 */
export const gratingDepth = (count: number, floor = PICTURE_FLOOR): number =>
  Math.min(1, 2 * (1 - floor ** (1 / Math.max(1, count))));

/**
 * One grating's transmission `at` a distance along its own axis, on `pitch`, cutting `depth`: a
 * soft cosine rather than an unlit bar, which is why crossings read as round blobs and not as a
 * mesh of squares. Here rather than in either painter because the picture and the screen over it
 * are both built out of these, and two copies would drift apart the first time one was tightened
 * (principle 1).
 */
export const gratingKeep = (at: number, pitch: number, depth: number): number =>
  1 - depth * halfCosine(at / pitch);

/** How wide a fan the picture's gratings are spread through, in turns of a circle. */
const FAN_TURNS = 0.05;

/**
 * How far off the reference axis a row's grating lies, in turns. The fold spreads the row through
 * the fan exactly as it used to spread it through the waveforms, and as 0128 slices the same turn
 * to hand out the screen's motions — so a row's angle is its parameter's identity, and two
 * parameters cross at an angle neither of them picked.
 *
 * The reference row is the axis itself and is never fanned: it is what the others are read
 * against, which is the whole of what being the reference means now that no row is drawn on top of
 * another.
 */
export const gratingTurns = (row: MoireRow): number =>
  row.reference ? 0 : (rowOffset(row.shape) - 0.5) * FAN_TURNS;

/**
 * The pitch a lattice reads best at, in CSS pixels, and the most a period may move it either way,
 * as a ratio. CSS pixels for the reason `GRID_PX` is: how coarse the lattice looks is a
 * proportion, and one that moved with the display would draw a different picture on every screen.
 */
const PITCH_PX = 7;
const PITCH_SPREAD = 2;

/**
 * How much of the window's own spread of pitches survives into the picture. **Two gratings only
 * beat into something slow when their pitches are close**: at ten and eleven pixels they come back
 * into step over a hundred and ten, and at ten and a hundred and sixty they come back over eleven,
 * which is not a lattice but a second hatch. A yard's periods span better than tenfold — three
 * quarters of a second against twelve — and carried straight across the canvas they draw exactly
 * that: a fine comb over a coarse one, with no fringe anywhere in it. Measured in the real app,
 * which is the only way this was going to be found.
 */
const PITCH_COMPRESS = 0.25;

/**
 * How far apart one row's fringes stand, in device pixels. The window still carries the row's
 * period across the canvas — a row that comes round often is drawn finer than a slow one, and the
 * order is never disturbed — but the spread of it is pulled into the band a lattice actually
 * happens in, and clamped there. So what two rows beat into is still the ratio of their periods,
 * and it is now a ratio near enough one to be seen.
 *
 * `ratio` is what the row's own effect is set to, where the period is what the deck is running
 * (0139) — it moves the row inside the band rather than out of it, which is why it is an argument
 * here rather than a multiplication at the call site: the band has one owner.
 *
 * The band's own floor is what keeps a grating off the pixel grid: nothing here is ever drawn
 * finer than `PITCH_PX / PITCH_SPREAD`, which is why this needs no separate bound to decline a
 * tightening the pixels could not carry (0098 amended).
 */
export const gratingPitch = (
  period: number,
  windowSecs: number,
  width: number,
  dpr: number,
  ratio = 1,
): number => {
  const middle = PITCH_PX * Math.max(1, dpr);
  const band = (pitch: number): number =>
    Math.min(middle * PITCH_SPREAD, Math.max(middle / PITCH_SPREAD, pitch));
  if (!(period > 0) || !(windowSecs > 0) || !(width > 0)) return band(middle * ratio);
  const across = (width * period) / windowSecs;
  return band(middle * (across / middle) ** PITCH_COMPRESS * ratio);
};

/**
 * The lane's normalized value a fraction `turns` of the way through its cycle, read out of the
 * table sampled when the row was built and interpolated, so what bends a grating is continuous
 * too. A table of one value is a lane that never moved and bends nothing.
 */
export function bendAt(bend: readonly number[], turns: number): number {
  const first = bend[0] ?? 0.5;
  if (bend.length < 2) return first;
  const at = wrap(turns, 1) * bend.length;
  const low = Math.floor(at);
  const lower = bend[low % bend.length] ?? first;
  const upper = bend[(low + 1) % bend.length] ?? first;
  return lower + (at - low) * (upper - lower);
}

/** How far a lane's own value may crowd its fringes, as a fraction of the pitch it would have. */
const BEND_PITCH = 0.35;

/**
 * What a row's own gesture does to its pitch: the lane's value where it stands right now, so a
 * grating breathes tighter and looser as the gesture sweeps rather than carrying one fixed bend
 * baked in when the row was built. A pattern holds one matrix and cannot vary its pitch across the
 * canvas, so a gesture that used to crowd fringes along the row now crowds all of them at once —
 * which is the reading that moves, and the one a still picture could not have shown.
 *
 * A lane holding one value bends nothing, and a row no lane drives carries `FLAT_BEND`.
 */
export const gratingBend = (row: MoireRow): number =>
  1 + BEND_PITCH * (bendAt(row.bend, turnsOf(row)) - 0.5);
