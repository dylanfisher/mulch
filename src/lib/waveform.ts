/**
 * @role The synthetic sources as pure maths — the samples behind a `{"gen":…}` load, generated
 *   identically live and offline so an agent needs no audio fixtures in the repo.
 * @instead Turning these samples into a graph node → src/audio/sources.ts. Anything that needs
 *   an AudioContext does not belong here; this file is the part Node can test in milliseconds.
 */
import { positive } from "./guards.ts";
import { mulberry32 } from "./random.ts";

/** The generators, in the order the UI offers them. The one list — commands, UI and tests all read it. */
export const GEN_KINDS = ["sine", "click-train", "sweep", "noise", "silence"] as const;
export type GenKind = (typeof GEN_KINDS)[number];

/**
 * What `hz` means per generator, and what it is when a command omits it: the pitch of a sine,
 * clicks per second for a click train, the low end a sweep starts from. Noise and silence
 * have no frequency at all, and a command that sets one for them is ignored rather than refused.
 */
export const DEFAULT_HZ: Record<GenKind, number> = {
  sine: 440,
  "click-train": 4,
  sweep: 40,
  noise: 0,
  silence: 0,
};

/** Every generator peaks here, so swapping sources never changes the gain staging under test. */
export const AMPLITUDE = 0.5;
/** A sweep runs from its `hz` up to here, exponentially — one octave-per-second-ish ramp. */
export const SWEEP_END_HZ = 8000;
/** The click's decay. Long enough to hear, short enough that its onset is still the timing edge. */
export const CLICK_SECS = 0.002;

/**
 * A load arrives from the wire, where `secs` is whatever JSON said. 10 minutes of stereo float
 * is ~200MB, so an unbounded value is an allocation an agent can trip over by typo. Refuse it
 * at the point the samples would be made, which is the one place every caller passes through.
 */
export const MAX_SECS = 60;
/** One frame at Web Audio's lowest supported sample rate: the shortest portable load. */
export const MIN_SECS = 1 / 8_000;

/**
 * The `secs` a load may carry. A predicate rather than bounds repeated at each caller: the UI
 * offers the same portable range `renderGen` accepts, because both ask here.
 */
export const isGenSecs = (secs: number): boolean =>
  Number.isFinite(secs) && secs >= MIN_SECS && secs <= MAX_SECS;

/** The `hz` a load may carry — any frequency, or zero for the generators that have none. */
export const isGenHz = (hz: number): boolean => Number.isFinite(hz) && hz >= 0;

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
 * MAX_SECS the closed form is millions of calls to buy nothing.
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
 * The samples for one synthetic source. `secs` and `hz` come from a command, so both are
 * validated here — the single place every generated buffer is made.
 */
export function renderGen(kind: GenKind, spec: GenSpec): Samples {
  if (!isGenSecs(spec.secs)) {
    throw new RangeError(`gen secs must be in [${MIN_SECS}, ${MAX_SECS}]: ${String(spec.secs)}`);
  }
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
  const tone = effectiveGenHz(kind, hz);
  switch (kind) {
    case "silence":
      return out;
    case "sine":
      sine(out, tone, spec.sampleRate);
      return out;
    case "click-train":
      clickTrain(out, tone, spec.sampleRate);
      return out;
    case "sweep":
      sweep(out, tone, spec.sampleRate);
      return out;
    case "noise":
      noise(out);
      return out;
    default:
      // `kind` arrived as JSON, so this is reachable however exhaustive the union looks.
      throw new TypeError(`unknown generator: ${String(kind)}`);
  }
}
