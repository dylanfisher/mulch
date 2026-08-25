/**
 * @role The synthetic sources as pure maths — the samples behind a `{"gen":…}` load, generated
 *   identically live and offline so an agent needs no audio fixtures in the repo.
 * @instead Turning these samples into a graph node → src/audio/sources.ts. Anything that needs
 *   an AudioContext does not belong here; this file is the part Node can test in milliseconds.
 */
import { positive } from "./guards.ts";
import { mulberry32 } from "./random.ts";

/** The generators, in the order the UI offers them. The one list — commands, UI and tests all read it. */
export const GEN_KINDS = ["sine", "click-train", "sweep", "noise", "silence", "tone"] as const;
export type GenKind = (typeof GEN_KINDS)[number];

/**
 * What `hz` means per generator, and what it is when a command omits it: the pitch of a sine,
 * clicks per second for a click train, the low end a sweep starts from. Noise and silence have no
 * frequency at all, and a command that sets one for them is ignored rather than refused — and
 * neither has the tone, whose pitch is the deck parameter `deck.tone` rather than an argument of
 * the load that made it (0110). Zero is how a generator says it has none.
 */
export const DEFAULT_HZ: Record<GenKind, number> = {
  sine: 440,
  "click-train": 4,
  sweep: 40,
  noise: 0,
  silence: 0,
  tone: 0,
};

/** Every generator peaks here, so swapping sources never changes the gain staging under test. */
export const AMPLITUDE = 0.5;
/** A sweep runs from its `hz` up to here, exponentially — one octave-per-second-ish ramp. */
export const SWEEP_END_HZ = 8000;
/** The click's decay. Long enough to hear, short enough that its onset is still the timing edge. */
export const CLICK_SECS = 0.002;

/**
 * The `hz` a load may carry — any frequency, or zero for the generators that have none. A
 * fraction of a hertz is a frequency: two yards a quarter of a hertz apart beat against each
 * other four seconds apart, and a rule that took whole numbers only would step over every
 * dissonance between them (P70). So this is the whole of how fine a pitch may be dialled, and
 * the step below is only how far one press of a field's own spinner moves it.
 */
export const isGenHz = (hz: number): boolean => Number.isFinite(hz) && hz >= 0;

/**
 * The tone is rendered once, at this pitch, and played back at whatever ratio `deck.tone` asks
 * for — so the pitch is a rate on a reference rather than a buffer regenerated per load, and a
 * move bends the wave instead of restarting it (0110).
 */
export const TONE_REF_HZ = 440;

/**
 * How long that reference is. One second holds a whole number of cycles of TONE_REF_HZ, so the
 * loop join is silent at every rate — which is why a tone loads at length 1 and loads looped.
 */
export const TONE_SECS = 1;

/**
 * How long every other drawn source is. A load carries what it sounds like and nothing about how
 * long it is (P127): the length was a field beside the one source control that nobody set to
 * anything else, and a generator is a fixture to play against rather than a clip to trim — the
 * loop handles under it are what cuts one to length.
 */
export const GEN_SECS = 4;

/**
 * The length a kind renders at. The tone is the one exception and it is not a preference: one
 * second is a whole number of cycles of its own reference, so its loop join is silent at every
 * rate (0110).
 */
export const genSecs = (kind: GenKind): number => (kind === "tone" ? TONE_SECS : GEN_SECS);

/**
 * How far one press of the frequency field's spinner moves a click rate or a sweep's low end. A
 * hundredth of a hertz, so a fraction is dialled rather than jumped over, and typing reaches
 * anything `isGenHz` accepts whatever this is. The tone no longer reaches this field at all: its
 * pitch is `deck.tone`, and what a hundredth of a hertz means there is that parameter's own
 * `precision` (0110).
 */
export const GEN_HZ_STEP = 0.01;

/** The frequency a generator renders: zero and an omitted value both mean its default. */
export const effectiveGenHz = (kind: GenKind, hz?: number): number =>
  hz === undefined || hz === 0 ? DEFAULT_HZ[kind] : hz;

export type GenSpec = { secs: number; sampleRate: number; hz?: number };

/**
 * Samples in a plain, never-shared buffer — the narrower of the two Float32Array shapes, and
 * the one Web Audio's `copyToChannel` and `WaveShaperNode.curve` will actually take.
 */
export type Samples = Float32Array<ArrayBuffer>;

const NOISE_SEED = 0x9e_37_79_b9;

function sine(out: Samples, hz: number, sampleRate: number): void {
  const step = (2 * Math.PI * hz) / sampleRate;
  for (let i = 0; i < out.length; i++) out[i] = AMPLITUDE * Math.sin(step * i);
}

/**
 * How far the tone's own second harmonic bends its phase, in radians. At one the wave carries a
 * strong fundamental and the odd harmonics above it and nothing at DC, which is what makes it an
 * instrument rather than the sine's laboratory fixture — and because the whole shape is still one
 * sine of a bent phase, it peaks at exactly AMPLITUDE like every other generator here.
 */
export const TONE_INDEX = 1;

/**
 * One sample of the tone at `phase` radians. Exported because the deck draws this wave live
 * rather than reducing it to peaks (P70): the picture and the samples are one function, so a
 * drawing can never show a wave the render does not make.
 */
export const toneSample = (phase: number): number =>
  AMPLITUDE * Math.sin(phase + TONE_INDEX * Math.sin(2 * phase));

/**
 * The tone at TONE_REF_HZ exactly, from a phase multiplied out of the sample index rather than
 * accumulated, so the last cycle in the buffer is as true as the first. It takes no frequency: a
 * tone is pitched by the rate it is read at, which is `deck.tone` (0110).
 */
function tone(out: Samples, sampleRate: number): void {
  const step = (2 * Math.PI * TONE_REF_HZ) / sampleRate;
  for (let i = 0; i < out.length; i++) out[i] = toneSample(step * i);
}

/**
 * One click every `1/hz` seconds, each a short linear decay. The onset lands on an exact
 * sample, which is what makes a click train the source that shows a timing error: a loop point
 * off by a millisecond moves a visible edge, where a sine only changes phase. The grid is
 * `n · round(rate/hz)` — exact only when `rate/hz` is whole; otherwise the train runs at the
 * rounded period (~1 frame/s of drift at 48kHz/7Hz), deterministically, and the golden's
 * silence spans are the rounded ones.
 */
function clickTrain(out: Samples, hz: number, sampleRate: number): void {
  const period = Math.max(1, Math.round(sampleRate / hz));
  const decay = Math.max(1, Math.round(sampleRate * CLICK_SECS));
  for (let start = 0; start < out.length; start += period) {
    for (let j = 0; j < decay && start + j < out.length; j++) {
      out[start + j] = AMPLITUDE * (1 - j / decay);
    }
  }
}

/**
 * Exponential sweep from `hz` to SWEEP_END_HZ. Two things are deliberate. Phase is integrated
 * rather than computed per sample — `sin(2π f(t) t)` is the classic bug, and it sweeps at twice
 * the rate it claims to. And the frequency advances by a constant ratio per sample rather than
 * by `ratio ** (i / length)`, which is the same curve for one multiply instead of a pow: at
 * a long sweep the closed form is millions of calls to buy nothing.
 */
function sweep(out: Samples, hz: number, sampleRate: number): void {
  const step = (SWEEP_END_HZ / hz) ** (1 / out.length);
  const radiansPerCycle = (2 * Math.PI) / sampleRate;
  let frequency = hz;
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    out[i] = AMPLITUDE * Math.sin(phase);
    phase += frequency * radiansPerCycle;
    frequency *= step;
  }
}

function noise(out: Samples): void {
  const random = mulberry32(NOISE_SEED);
  for (let i = 0; i < out.length; i++) out[i] = AMPLITUDE * (random() * 2 - 1);
}

/**
 * The samples for one synthetic source. `hz` comes from a command and is validated here — the
 * single place every generated buffer is made. `secs` no longer does: a load carries no length,
 * so every caller in the app passes `genSecs(kind)` and the only rule left is the one below,
 * that a buffer is at least one sample long.
 */
export function renderGen(kind: GenKind, spec: GenSpec): Samples {
  positive(spec.secs, "gen secs");
  const hz = spec.hz ?? DEFAULT_HZ[kind];
  if (!isGenHz(hz)) throw new RangeError(`gen hz is not a frequency: ${hz}`);

  // Before `frames`: a NaN rate makes `frames` NaN, `NaN < 1` is false, and `new Float32Array(NaN)`
  // is the silent zero-length buffer the guard below exists to prevent.
  positive(spec.sampleRate, "gen sampleRate");
  const frames = Math.round(spec.secs * spec.sampleRate);
  // `secs > 0` is not enough: below half a sample period the rounded frame count is zero, and
  // a zero-length buffer is a DOMException later, in createBuffer — not this file's loud no.
  if (frames < 1) {
    throw new RangeError(`gen secs is shorter than one sample: ${String(spec.secs)}`);
  }
  const out = new Float32Array(frames);
  // A generator with no frequency ignores one; a tonal generator given zero would divide by it.
  const pitch = effectiveGenHz(kind, hz);
  switch (kind) {
    case "silence":
      return out;
    case "sine":
      sine(out, pitch, spec.sampleRate);
      return out;
    case "tone":
      tone(out, spec.sampleRate);
      return out;
    case "click-train":
      clickTrain(out, pitch, spec.sampleRate);
      return out;
    case "sweep":
      sweep(out, pitch, spec.sampleRate);
      return out;
    case "noise":
      noise(out);
      return out;
    default:
      // `kind` arrived as JSON, so this is reachable however exhaustive the union looks.
      throw new TypeError(`unknown generator: ${String(kind)}`);
  }
}
