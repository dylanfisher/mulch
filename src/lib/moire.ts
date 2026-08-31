/**
 * @role What a row of the picture is made of that is not its period: the lane's own shape, sampled
 *   once, the profile its grating is cut to — the shape of the wave an effect impresses itself on
 *   the picture with — how many scales it is drawn at, and the whole of what an effect's own values
 *   may reach. Pure maths: no context, no DOM, no clock.
 * @instead A lane's own period → laneSpan in src/lib/automation.ts, which this reads rather than
 *   restates. How long the whole loop takes, and the estimate of when every period lines up →
 *   src/lib/recurrence.ts. The wave each profile is → src/lib/moireProfiles.ts.
 *   Drawing the rows these describe → src/ui/moireCanvas.ts.
 */
import { automationValueAt, laneSpan, type AutomationPoint } from "./automation.ts";
import { clamp, denormalize, normalize } from "./range.ts";
// Type-only, so the pair is one module at compile time and two at runtime: moireProfiles.ts
// value-imports the cosine and the wrap below, and a value import back would be a cycle (0045).
import type { DriftProfile } from "./moireProfiles.ts";

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
 * How many times a second the drift is drawn — its own cadence, declared here and nowhere else. The
 * picture is a visualization of the sound and never the sound: it may lag, drop frames and arrive
 * late, and nothing about the instrument may wait on it. A drift at a third of sixty is a drift; a
 * knob at a third of sixty is a broken knob, so the painter takes a *budget* on the one frame loop
 * rather than a frame of it (src/ui/frame.ts) — the hand, the playheads and the meters go on at the
 * loop's own rate whatever this is set to.
 */
export const DRIFT_PAINT_HZ = 24;

/** The same cadence as the gap between two paintings, in milliseconds — what the budget is spent in. */
export const DRIFT_PAINT_MS = 1000 / DRIFT_PAINT_HZ;

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
 * and `pulse` are per-frame reads (0070) — every other field is the row's identity or what its
 * effect is set to, and neither of those changes between frames.
 */
export type MoireRow = {
  period: number;
  phase: number;
  /**
   * How hard the instance this row belongs to is working right now, 0..1, read off its own meter
   * and off no parameter — the second per-frame field, refilled beside `phase` and resting at 0
   * for every row nothing is metering (0128 amended).
   */
  pulse: number;
  /**
   * Whether this row is an axis the others are read against rather than one of the rows fanned
   * either side of them: the loop's row, and the session's own layer over it (`gratingTurns`).
   */
  reference: boolean;
  shape: number;
  bend: readonly number[];
  profile: DriftProfile;
  /** The coordinate this row's grating is cut along — its effect's own, declared beside the wave. */
  geometry: DriftGeometry;
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
  /** Where on the picture this row is anchored — the point its own axis is measured from. */
  centre: number;
  /**
   * How hard its pitch is swept across the picture rather than held at one spacing. A straight
   * row's, and only a straight one's: a curved row's spacing already opens out across the picture,
   * which the registry refuses a curved entry a claim on rather than dropping it here (0142).
   */
  chirp: number;
  /** How far it asks the finished field to be drawn back through a lens, as a slide. */
  lens: number;
  /**
   * How many scales this row is drawn at: one copy at the pitch it asked for, and each further one
   * an octave coarser and half as deep. A straight row's, and only a straight one's, for the reason
   * `chirp` is (0143).
   */
  octaves: number;
  /** How much of the last frame's field this row asks to be cut into this one, as a share. */
  feedback: number;
};

/**
 * The twelve things about a row an effect's own values may reach, and the whole of what one may
 * say: how long its cycle is, how deep it cuts, how fine it is drawn, how hard it surges and
 * stalls across that cycle, the three that are colour rather than shape — how far the three channels of its
 * ink stand apart, how far their own pitches and angles diverge, and where between the picture's
 * two inks it is drawn — and the three that are where and how its own axis lies: where on the
 * picture it is anchored, how hard its pitch is swept across that picture rather than held at one
 * spacing, and how far the finished field is drawn back through a lens
 * ([0142](../../docs/decisions/0142-a-row-is-cut-on-a-coordinate-of-its-own.md)). A registry entry
 * declares one parameter into each of the ones it claims
 * ([0139](../../docs/decisions/0139-a-row-is-what-an-effect-is-set-to.md)), so a value reaches the
 * picture by being declared rather than by a painter growing a branch for the effect it belongs
 * to. Nothing here names an effect, and none of them is another in disguise: `pitch` is how far
 * apart the fringes stand and `bend` is how evenly the row travels through them
 * ([0146](../../docs/decisions/0146-a-rows-own-gesture-moves-its-phase.md)); `fringe` is how far the three
 * channels stand apart and `disperse` is whether they are still the same lattice at all
 * ([0141](../../docs/decisions/0141-colour-is-something-an-effect-turns.md)). The last two are the
 * picture inside the picture: `octaves` draws one row at several scales at once and `feedback` cuts
 * the frame before this one back into it
 * ([0143](../../docs/decisions/0143-a-row-is-drawn-at-more-than-one-scale.md)).
 *
 * **Five of them are read per picture and not per row.** The ink every row is cut out of is one
 * tile over the whole canvas, the lens is one bend of the finished field and the last frame is one
 * field, so a row claiming one of them speaks for all of them: `screenFringe`, `screenDisperse` and
 * `screenHue` (src/ui/moireScreen.ts), the lens the painter draws its slices through and the
 * feedback it cuts the last frame back in at each take the boldest claim any row makes. The other
 * seven are the row's own and are read by the painter per row.
 */
export const DRIFT_DIMENSIONS = [
  "period",
  "depth",
  "pitch",
  "bend",
  "fringe",
  "disperse",
  "hue",
  "centre",
  "chirp",
  "lens",
  "octaves",
  "feedback",
] as const;

export type DriftDimension = (typeof DRIFT_DIMENSIONS)[number];

/**
 * The dimensions only a straight row may claim, and why there are any: both of them are a second
 * spacing across the picture, which a straight row gets from a matrix on a tile it shares and a
 * curved one could only get from a tile of its own — a picture-sized bake per copy, which is the
 * one thing that must never reach a frame (0142, 0143). The registry refuses a curved entry a claim
 * on one of these rather than the painter dropping it.
 */
export const STRAIGHT_DIMENSIONS: readonly DriftDimension[] = ["chirp", "octaves"];

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
 * How far a value may carry the picture between its two inks: one by definition, a blend having no
 * further to go, and named beside the other two so the three read alike where they are spent.
 */
export const DRIFT_HUE_REACH = 1;

/**
 * The three dimensions that are colour rather than shape, at the reaches above. Together because a
 * colour is read twice: when a row is built out of what its instance is set to, and again per frame
 * where a lane rides the parameter claiming one (0150) — the only thing about a row a lane moves.
 */
export const COLOUR_REACH = {
  fringe: DRIFT_FRINGE_REACH,
  disperse: DRIFT_DISPERSE_REACH,
  hue: DRIFT_HUE_REACH,
} as const;
export type ColourDimension = keyof typeof COLOUR_REACH;
/** Where a turn of the value claiming one of them lands in it. */
export const colourReached = (into: ColourDimension, turn: number): number =>
  denormalize(turn, 0, COLOUR_REACH[into]);

/**
 * How far a value may carry its row's anchor across the picture. One by definition, the anchor
 * being read as a turn of the picture's own diagonal — how far in from the edges that turn actually
 * lands is `CENTRE_INSET` (src/lib/moireGeometry.ts) and not this.
 */
export const DRIFT_CENTRE_REACH = 1;

/**
 * How hard a value may sweep its row's pitch across the picture. Not the whole way: a sweep of one
 * holds still at the crowded end and is no longer a grating there. The end of the travel is the
 * band a lattice actually happens in — `gratingPitch` bands every row's spacing to `PITCH_SPREAD`
 * either way of the pitch a lattice reads best at, and a sweep of three fifths stands its two ends
 * exactly that band apart, which is as broad a sweep as the picture can carry and still fringe at
 * both ends of it.
 */
export const DRIFT_CHIRP_REACH = 0.6;

/**
 * How far a value may bend the finished field through its lens. One by definition — how far a slice
 * actually slides at that is `LENS_SPAN` (src/lib/moireGeometry.ts), the same division of labour
 * the centre's reach above is split on.
 */
export const DRIFT_LENS_REACH = 1;

/**
 * How many scales a value may draw its row at. Three: a copy is drawn an octave coarser than the
 * one below it and deliberately outside the band `gratingPitch` holds a row's own pitch inside —
 * what a copy beats with is every other row's copy at its own octave, which is the same ratio those
 * two rows already stood at and so is still a ratio near enough one to fringe. Three copies reach
 * four times the coarsest spacing the picture reads at, which is a broad texture; a fourth would be
 * sixteen, which is one bar across the picture and not a texture at all. Each copy is a fill of its
 * own, so this is also how many extra fills the deepest row in a rack costs.
 */
export const DRIFT_OCTAVES_REACH = 3;

/**
 * How far a value may drive the frame feedback — the whole of the ceiling below, which is where the
 * bound actually lives. One by definition, the same division of labour the centre's reach is split
 * on: this is the travel, `DRIFT_FEEDBACK_CEILING` is what the travel comes to.
 */
export const DRIFT_FEEDBACK_REACH = 1;

/**
 * The most of the last frame's field a frame may lay back into its own. **A hard ceiling and not a
 * tuning**: each frame carries the one before it, which carried the one before that, so a share of
 * one would fill the field to opaque after enough frames however shallow each one was — and a field
 * filled to opaque is a picture with nothing left in it. Under one, the stack settles at
 * `feedbackSettles` instead of running away, and this is what makes that fraction bounded (0143).
 */
export const DRIFT_FEEDBACK_CEILING = 0.5;

/** How much of the last frame's field a row asking `amount` lays into this one. Never past it. */
export const feedbackAlpha = (amount: number): number =>
  DRIFT_FEEDBACK_CEILING * clamp(amount, 0, 1);

/**
 * Where a field under frame feedback settles: the fixed point of "what this frame's own gratings
 * let through, and `alpha` of what the last frame came to laid back into the rest of it". One frame
 * keeps `keep`; a frame that also takes the settled field back in keeps
 * `keep + alpha × settled × (1 - keep)`, and this is that solved for `settled`.
 *
 * Its denominator is at least `1 - alpha`, which is why the ceiling being under one is the whole
 * bound: at an alpha of one the fixed point is a field that keeps everything, which is the picture
 * whited out a few seconds after a knob was turned.
 */
export const feedbackSettles = (keep: number, alpha: number): number =>
  keep / (1 - alpha * (1 - keep));

/** How many scales a row is actually drawn at — a whole number of copies, and never none. */
export const octavesOf = (row: MoireRow): number => Math.max(1, Math.round(row.octaves));

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
  /** The middle of the picture: a row nothing anchors is measured from where it is drawn. */
  centre: 0.5,
  chirp: 0,
  lens: 0,
  /** One scale: the picture a row was drawn at before an effect could ask for more than one. */
  octaves: 1,
  /** No frame feedback: a picture of this frame and of no frame before it. */
  feedback: 0,
} as const satisfies Omit<Pick<MoireRow, DriftDimension>, "period" | "bend">;

/**
 * A row that surges and stalls by `amount` across its own cycle: the same table `laneBend` samples
 * a gesture into, filled instead from one value — so a declared bend carries the row forward and
 * back around its own turn, where a declared pitch says how far apart its fringes stand (0146). An
 * amount of nothing is a row that travels evenly, which is the flat table a row no value reaches
 * carries.
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
  const centre = turnOf("centre");
  const chirp = turnOf("chirp");
  const lens = turnOf("lens");
  const octaves = turnOf("octaves");
  const feedback = turnOf("feedback");
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
    fringe: fringe === undefined ? DRIFT_REST.fringe : colourReached("fringe", fringe),
    disperse: disperse === undefined ? DRIFT_REST.disperse : colourReached("disperse", disperse),
    hue: hue === undefined ? DRIFT_REST.hue : colourReached("hue", hue),
    centre: centre === undefined ? DRIFT_REST.centre : denormalize(centre, 0, DRIFT_CENTRE_REACH),
    chirp: chirp === undefined ? DRIFT_REST.chirp : denormalize(chirp, 0, DRIFT_CHIRP_REACH),
    lens: lens === undefined ? DRIFT_REST.lens : denormalize(lens, 0, DRIFT_LENS_REACH),
    // Rounded here rather than at the painter, so what a row says about itself is the number of
    // copies it is drawn in and not a fraction nobody can draw.
    octaves:
      octaves === undefined
        ? DRIFT_REST.octaves
        : Math.round(denormalize(octaves, DRIFT_REST.octaves, DRIFT_OCTAVES_REACH)),
    feedback:
      feedback === undefined ? DRIFT_REST.feedback : denormalize(feedback, 0, DRIFT_FEEDBACK_REACH),
  };
}

export const TAU = 2 * Math.PI;

/** The six numbers a canvas transform is, and the shape both painters refill in place (0070). */
export type Aim = { a: number; b: number; c: number; d: number; e: number; f: number };

/**
 * Turn `into` by `angle` and scale it by `scale`, leaving where it is pointed alone. The one
 * rotation-and-scale this app has: a straight row's grating, the frame laid back into this one and
 * the screen's own tile are three things at three angles and one matrix (principle 1). Only the
 * four cells that turn are written — the screen adds its shear onto `c` afterwards, and every
 * caller places the tile itself through `e` and `f`.
 */
export const turnedScale = (into: Aim, scale: number, angle: number): void => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  into.a = scale * cos;
  into.b = scale * sin;
  into.c = -scale * sin;
  into.d = scale * cos;
};

/**
 * `value` inside one span of `span`, never negative — a turn as a fraction of itself, a device
 * pixel as its place in a tile. Here rather than in either painter because both of them wrap, and
 * the two would drift apart the first time one of them was tightened (principle 1).
 */
export const wrap = (value: number, span: number): number => ((value % span) + span) % span;

/**
 * The coordinates a row's grating may be cut along. Where a profile is the shape of the wave, this
 * is the shape of the axis it runs down: a straight comb, a family of rings, a fan of spokes, or
 * the two together as a spiral. **A geometry is not a second profile** — two straight rows beat
 * into straight fringes whatever waves they are cut to, and a ring family crossed with any straight
 * row is a set of hyperbolic arcs no pair of straight ones can make.
 *
 * Declared by a registry entry beside its wave, and refused at load for one the picture cannot draw
 * (0122, 0137). Unlike a profile it is not claimed exclusively: two rooms are both radial, and two
 * ring families at different centres are the picture two sources make
 * ([0142](../../docs/decisions/0142-a-row-is-cut-on-a-coordinate-of-its-own.md)).
 */
export const DRIFT_GEOMETRIES = ["linear", "radial", "spiral", "fan"] as const;

export type DriftGeometry = (typeof DRIFT_GEOMETRIES)[number];

/** The coordinate a row no effect bends is cut along: the straight grating every row used to be. */
export const LINEAR_GEOMETRY: DriftGeometry = "linear";

/** Whether a declaration names a coordinate the picture can actually cut a row along. */
export const isDriftGeometry = (value: unknown): value is DriftGeometry =>
  DRIFT_GEOMETRIES.some((geometry) => geometry === value);

/**
 * The `harmonic`th cosine of a cycle at `turn`. The one cosine this app's gratings are built out
 * of: both painters, the plain profile and every harmonic below go through it, so there is one
 * wave here and not a copy per caller (principle 1).
 */
export const cosTurn = (turn: number, harmonic = 1): number => Math.cos(TAU * harmonic * turn);

/** The plain grating's own share of the ink at `turn`: half a cosine, and the mean of every one. */
export const halfCosine = (turn: number): number => 0.5 - 0.5 * cosTurn(turn);

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

/**
 * How far either way a row's own gesture may carry it around its cycle, in turns. **Derived, not
 * chosen**: a row must never run backwards — a picture whose rows reverse is a picture that
 * stopped being of a playhead — and what decides that is the *slope* of the bend table rather than
 * its size. `bendAt` interpolates `BEND_SAMPLES` points across one turn, so a gesture that falls
 * its whole range between two of them reaches a slope of `BEND_SAMPLES`, and the warped turn
 * advances at `1 + BEND_TURNS × slope`. Half the reciprocal of the sample count therefore holds
 * every possible lane between half speed and one and a half — a real surge and a real stall, and
 * monotone by construction rather than by hoping no gesture is that fast (0146).
 */
const BEND_TURNS = 1 / (2 * BEND_SAMPLES);

/**
 * Where a row stands in its own cycle, in turns — what every motion in the picture is read off,
 * and the one place a row's own gesture is spent (0146). The read position is linear and this is
 * not: the lane's value where the row has reached carries it forward and back around its cycle, so
 * a row surges where its gesture swept and stalls where it held, and the fringe families two rows
 * make reorganise in bursts rather than sliding at one rate. A row no lane drives carries
 * `FLAT_BEND`, reads the middle of the table everywhere, and turns linearly as it always did.
 */
export const turnsOf = (row: MoireRow): number => {
  const linear = wrap(row.phase / row.period, 1);
  return wrap(linear + BEND_TURNS * (bendAt(row.bend, linear) - 0.5), 1);
};

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
 * A reference row is an axis itself and is never fanned: it is what the others are read
 * against, which is the whole of what being the reference means now that no row is drawn on top of
 * another. Two rows carry the flag — the loop's, which the band also rolls on, and the session's
 * own, which lies along it and beats against it rather than crossing it (`sessionInto`,
 * src/ui/moireRowsField.ts).
 */
export const gratingTurns = (row: MoireRow): number =>
  row.reference ? 0 : (rowOffset(row.shape) - 0.5) * FAN_TURNS;

/**
 * The pitch a lattice reads best at, in CSS pixels, and the most a period may move it either way,
 * as a ratio. CSS pixels for the reason `GRID_PX` is: how coarse the lattice looks is a
 * proportion, and one that moved with the display would draw a different picture on every screen.
 */
const PITCH_PX = 7;
export const PITCH_SPREAD = 2;

/**
 * The ratio that puts a row at the coarse end of that band whatever its period: `gratingPitch`
 * multiplies a row's own ratio into the spacing its period sets and clamps the product to the band,
 * so a ratio of the band's own spread lands at the top of it from anywhere inside. The broadest a
 * row is ever drawn, which is what the field's own row is drawn at so that what it makes with the
 * rest is a larger moiré over their small ones rather than a second hatch among them (0213).
 */
export const DRIFT_BROADEST_PITCH = PITCH_SPREAD;

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
/**
 * The finest a row is ever drawn, in device pixels — the floor of the band above, named so that a
 * row whose spacing is swept across the picture can be held to the same floor at its crowded end
 * rather than sweeping through it (0142).
 */
export const gratingFloor = (dpr: number): number => (PITCH_PX * Math.max(1, dpr)) / PITCH_SPREAD;

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
