/**
 * @role What a render sounded like, as diffable text — length, peak, RMS per window, DC offset,
 *   click count and silence spans, each carrying the tolerance it is compared at (plan §3).
 * @instead The samples themselves → src/lib/wav.ts. Drawing them → src/lib/peaks.ts. Nothing
 *   here hashes: a hash says something changed and nothing about what, which is the opposite
 *   of the point.
 */
import { assertChannels } from "./channels.ts";

/** How long one RMS window is. 100ms is coarse enough to read and fine enough to place a fault. */
export const WINDOW_SECS = 0.1;

/**
 * The first difference that counts as a click. A continuous signal's per-sample step is bounded
 * by its slew: at 48kHz a half-scale sine stays under this up to ~3.8kHz, while the discontinuity
 * a bad edit leaves is the full step. So this counts edits, not brightness.
 */
export const CLICK_DELTA = 0.25;

/** Below this a sample is silence. The graph nulls to exactly zero, so it has 80dB of margin. */
export const SILENCE_FLOOR_DB = -80;

/** Shorter runs are the space between two notes, not a dropout. */
export const MIN_SILENCE_SECS = 0.05;

/** What zero measures as: dB has no value for it, and JSON has no -Infinity. */
export const FLOOR_DB = -120;

/** How far a dB field may differ before it is a difference. Nothing here compares floats. */
export const TOLERANCE_DB = 0.5;

/** Decimals kept on every dB field — enough to see a real change, few enough to diff by eye. */
const DB_DECIMALS = 2;

export type Fingerprint = {
  sampleRate: number;
  /** Frames rendered. Compared exactly — a render is exactly as long as it was asked to be. */
  frames: number;
  /** Peak per channel, dBFS. A pan that moved, or a channel gone missing, shows up here. */
  peakDb: number[];
  /** DC offset per channel, as dBFS of its magnitude. */
  dcDb: number[];
  /** One per WINDOW_SECS window, over every channel — where a gain-staging regression shows. */
  rmsDb: number[];
  /** Samples whose first difference exceeds CLICK_DELTA, summed over channels. Exact. */
  clicks: number;
  /** `[first, past-last)` frames of each run of silence at least MIN_SILENCE_SECS long. Exact. */
  silence: [number, number][];
};

/** Magnitude as dBFS, floored and rounded — the one conversion every field above goes through. */
function toDb(magnitude: number): number {
  // A NaN sample passes every comparison-based measurement above (peak, clicks, silence all
  // compare false), so a broken render would fingerprint as digital silence — and an Infinity
  // would put a value in the JSON that JSON cannot carry. This is the one funnel every field
  // runs through, so it is where "the render is not a number" gets loud.
  if (!Number.isFinite(magnitude)) {
    throw new RangeError(`magnitude is ${magnitude} — the render is broken`);
  }
  if (magnitude <= 0) return FLOOR_DB;
  const db = 20 * Math.log10(magnitude);
  return db <= FLOOR_DB ? FLOOR_DB : Number(db.toFixed(DB_DECIMALS));
}

/**
 * Runs of silence, in frames. The one measurement read frame-major, because it is the one fact
 * about every channel at once: a dropout on one channel alone is not a dropout.
 */
function silentSpans(
  channels: readonly Float32Array[],
  frames: number,
  sampleRate: number,
): [number, number][] {
  const floor = 10 ** (SILENCE_FLOOR_DB / 20);
  const minSilence = Math.round(MIN_SILENCE_SECS * sampleRate);
  const spans: [number, number][] = [];
  let quietFrom = 0;
  for (let i = 0; i < frames; i++) {
    let loud = false;
    for (const data of channels) {
      const x = data[i];
      if (x !== undefined && (x > floor || x < -floor)) {
        loud = true;
        break;
      }
    }
    if (!loud) continue;
    if (i - quietFrom >= minSilence) spans.push([quietFrom, i]);
    quietFrom = i + 1;
  }
  if (frames - quietFrom >= minSilence) spans.push([quietFrom, frames]);
  return spans;
}

/**
 * Measure a rendered buffer. The bulk is one pass per channel over its own samples, which is
 * what a typed array wants; silence is the exception and gets its own (see above).
 */
export function fingerprint(channels: readonly Float32Array[], sampleRate: number): Fingerprint {
  const frames = assertChannels(channels, "a fingerprint");
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
    throw new RangeError(`not a sample rate: ${sampleRate}`);
  }

  const windowFrames = Math.max(1, Math.round(WINDOW_SECS * sampleRate));
  const windows = Math.ceil(frames / windowFrames);
  const sumSquares = new Float64Array(windows);
  const peakDb: number[] = [];
  const dcDb: number[] = [];
  let clicks = 0;

  for (const data of channels) {
    let peak = 0;
    let total = 0;
    // Seeded with the first sample so it compares against itself and cannot be its own click.
    let previous = data[0] ?? 0;
    // Window-major, so the window a sample belongs to is the loop counter rather than a divide,
    // and its running total is a local rather than a bounds-checked read and write into
    // sumSquares. A subarray is a view, so the inner loop is still one pass over the channel;
    // for…of over it also yields a plain number, which indexing does not.
    for (let w = 0; w < windows; w++) {
      const from = w * windowFrames;
      let squares = 0;
      for (const x of data.subarray(from, Math.min(frames, from + windowFrames))) {
        const magnitude = x < 0 ? -x : x;
        if (magnitude > peak) peak = magnitude;
        total += x;
        squares += x * x;
        if (Math.abs(x - previous) > CLICK_DELTA) clicks++;
        previous = x;
      }
      sumSquares[w] = (sumSquares[w] ?? 0) + squares;
    }
    peakDb.push(toDb(peak));
    // A zero-length render has no offset to speak of rather than a division by zero.
    dcDb.push(toDb(frames === 0 ? 0 : Math.abs(total / frames)));
  }

  const rmsDb: number[] = [];
  for (let w = 0; w < windows; w++) {
    const last = Math.min(frames, (w + 1) * windowFrames);
    const samples = (last - w * windowFrames) * channels.length;
    rmsDb.push(toDb(Math.sqrt((sumSquares[w] ?? 0) / samples)));
  }

  const silence = silentSpans(channels, frames, sampleRate);
  return { sampleRate, frames, peakDb, dcDb, rmsDb, clicks, silence };
}

/** One dB field, compared within TOLERANCE_DB and summarised as a line rather than a list. */
function compareDb(name: string, golden: number[], actual: number[], into: string[]): void {
  // A count difference is already reported; comparing element by element would restate it.
  if (golden.length !== actual.length) return;
  let over = 0;
  let worst = 0;
  let worstBy = 0;
  for (const [i, expected] of golden.entries()) {
    const by = Math.abs(expected - (actual[i] ?? 0));
    if (by <= TOLERANCE_DB) continue;
    over++;
    if (by > worstBy) {
      worstBy = by;
      worst = i;
    }
  }
  if (over === 0) return;
  // One line rather than a list: when a whole render shifts, every window shifts with it.
  into.push(
    `${name}: ${over} of ${golden.length} beyond ±${TOLERANCE_DB} dB — worst ${name}[${worst}], ` +
      `golden ${golden[worst]} dB, actual ${actual[worst]} dB`,
  );
}

/** Silence spans, compared frame for frame. A boundary that moved is the timing fact itself. */
function compareSpans(
  golden: [number, number][],
  actual: [number, number][],
  into: string[],
): void {
  if (golden.length !== actual.length) {
    into.push(`silence: golden has ${golden.length} spans, actual ${actual.length}`);
    return;
  }
  let differing = 0;
  let first = -1;
  for (const [i, span] of golden.entries()) {
    const got = actual[i];
    if (span[0] === got?.[0] && span[1] === got[1]) continue;
    differing++;
    if (first === -1) first = i;
  }
  if (first === -1) return;
  // The first one, not all of them: a loop point that moved moves every span after it, and a
  // dump of two whole arrays says less than one pair of numbers does.
  into.push(
    `silence: ${differing} of ${golden.length} spans differ — first silence[${first}], ` +
      `golden [${String(golden[first])}], actual [${String(actual[first])}]`,
  );
}

/**
 * The differences between a golden fingerprint and one just taken, empty when they agree. The
 * tolerances are decided here rather than per test (plan §3): sample counts, click counts and
 * silence spans compare exactly, everything measured in dB compares within TOLERANCE_DB.
 */
export function compareFingerprints(golden: Fingerprint, actual: Fingerprint): string[] {
  const differences: string[] = [];
  const exact = (name: string, expected: unknown, got: unknown): void => {
    if (expected === got) return;
    differences.push(`${name}: golden ${String(expected)}, actual ${String(got)}`);
  };
  exact("sampleRate", golden.sampleRate, actual.sampleRate);
  exact("frames", golden.frames, actual.frames);
  exact("channels", golden.peakDb.length, actual.peakDb.length);
  exact("windows", golden.rmsDb.length, actual.rmsDb.length);
  exact("clicks", golden.clicks, actual.clicks);
  compareSpans(golden.silence, actual.silence, differences);
  compareDb("peakDb", golden.peakDb, actual.peakDb, differences);
  compareDb("dcDb", golden.dcDb, actual.dcDb, differences);
  compareDb("rmsDb", golden.rmsDb, actual.rmsDb, differences);
  return differences;
}
