/**
 * @role Tempo and onset candidates as pure maths — one envelope pass over a loaded source's
 *   samples, and the nearest-candidate arithmetic a loop edge snaps with. Analysis produces
 *   data and nothing else: no state, no DOM, no context, no deck (0025).
 * @instead Getting those samples off the main thread → src/workers/analysis.ts, which is a
 *   message shell around this file and holds no arithmetic of its own. Applying a snapped edge
 *   → the ordinary `deck.loop` command; nothing here knows a loop is a thing you can play.
 */
import { assertChannels } from "./channels.ts";

/** What one source measures as. `onsets` is ascending seconds; `bpm` is 0 for "no tempo". */
export type BeatAnalysis = {
  /**
   * One tempo for the whole source, folded into [MIN_BPM, MAX_BPM], or 0 when fewer than two
   * onsets leave nothing to state — the way `duration: 0` means nothing is loaded (0025).
   */
  bpm: number;
  /** Onset positions in seconds, ascending. Each is an exact sample of the analysed buffer. */
  onsets: number[];
};

/**
 * Frames per envelope hop. ~5ms at 48kHz: short enough that two onsets a semiquaver apart at
 * 200bpm land in different hops, long enough that a 60-second source is one cheap linear pass.
 */
export const ANALYSIS_HOP = 256;
/** The tempo range a folded median interval is expressed in. Wider than 2:1, so folding lands. */
export const MIN_BPM = 60;
export const MAX_BPM = 200;
/** Two candidates closer than this are one onset seen twice; the louder of them wins. */
export const MIN_ONSET_GAP_SECS = 0.05;
/**
 * The candidate list is handed out through `probe()`, so it is bounded. A source dense enough
 * to exceed this keeps its strongest candidates, in time order.
 */
export const MAX_ONSETS = 1024;
/**
 * How close, in pixels, a loop edge must be dragged to a candidate to land on it. Pixels rather
 * than seconds so the gesture feels the same on a 2-second loop and a 2-minute one; the surface
 * doing the dragging converts through src/lib/timeline.ts. Shared with scripts/smoke, which
 * aims its drags with it rather than restating a number.
 */
export const SNAP_TOLERANCE_PX = 10;

/** A candidate must clear this share of the detection function's own peak… */
const ONSET_PEAK_FRACTION = 0.2;
/** …plus this multiple of its mean, so a busy source raises its own floor. */
const ONSET_MEAN_FACTOR = 1;

/** Peak |sample| per hop, across every channel — the envelope the rise is measured from. */
function envelope(channels: readonly Float32Array[], frames: number, hops: number): Float64Array {
  const env = new Float64Array(hops);
  for (const data of channels) {
    for (let hop = 0; hop < hops; hop++) {
      const to = Math.min(frames, (hop + 1) * ANALYSIS_HOP);
      let peak = env[hop] ?? 0;
      for (let i = hop * ANALYSIS_HOP; i < to; i++) {
        const level = Math.abs(data[i] ?? 0);
        if (level > peak) peak = level;
      }
      env[hop] = peak;
    }
  }
  return env;
}

/**
 * The loudest frame in `[from, to)`. This is what turns a hop into an onset: a click's first
 * sample is its loudest, so a detected hop refines to the exact sample the transient begins on
 * rather than to the boundary of the window that noticed it. Ties keep the earlier frame.
 */
function loudestFrame(channels: readonly Float32Array[], from: number, to: number): number {
  let best = from;
  let loudest = -1;
  for (let i = from; i < to; i++) {
    let level = 0;
    for (const data of channels) {
      const sample = Math.abs(data[i] ?? 0);
      if (sample > level) level = sample;
    }
    if (level > loudest) {
      loudest = level;
      best = i;
    }
  }
  return best;
}

/** The median gap between consecutive onsets, or 0 when there is no gap to take. */
function medianInterval(onsets: readonly number[]): number {
  if (onsets.length < 2) return 0;
  const gaps: number[] = [];
  for (let i = 1; i < onsets.length; i++) gaps.push((onsets[i] ?? 0) - (onsets[i - 1] ?? 0));
  // ES2022 has no toSorted; `gaps` is freshly built here, so sorting mutates nobody's value.
  // oxlint-disable-next-line unicorn/no-array-sort
  gaps.sort((a, b) => a - b);
  const middle = Math.floor(gaps.length / 2);
  if (gaps.length % 2 === 1) return gaps[middle] ?? 0;
  return ((gaps[middle - 1] ?? 0) + (gaps[middle] ?? 0)) / 2;
}

/**
 * A period expressed as a tempo in range. The range spans more than an octave, so doubling then
 * halving always terminates inside it — this is the one-tempo model the roadmap asked to start
 * with, and it deliberately cannot tell 120 from a half-time 60.
 */
function foldTempo(bpm: number): number {
  if (!Number.isFinite(bpm) || bpm <= 0) return 0;
  let folded = bpm;
  while (folded < MIN_BPM) folded *= 2;
  while (folded > MAX_BPM) folded /= 2;
  return Math.round(folded * 100) / 100;
}

/** Keep only the strongest `MAX_ONSETS`, back in time order. Bounds what `probe()` carries. */
function strongest(onsets: readonly number[], strengths: readonly number[]): number[] {
  const kept = onsets.map((at, index) => ({ at, strength: strengths[index] ?? 0 }));
  // oxlint-disable-next-line unicorn/no-array-sort
  kept.sort((a, b) => b.strength - a.strength || a.at - b.at);
  const top = kept.slice(0, MAX_ONSETS);
  // oxlint-disable-next-line unicorn/no-array-sort
  top.sort((a, b) => a.at - b.at);
  return top.map((candidate) => candidate.at);
}

/**
 * Every local maximum of the detection function that clears `threshold`, refined to the exact
 * sample it began on and thinned to one candidate per MIN_ONSET_GAP_SECS. Strengths come back
 * alongside, because that is what decides which of two crowded candidates survives.
 */
function collectOnsets(
  channels: readonly Float32Array[],
  frames: number,
  rise: Float64Array,
  threshold: number,
  sampleRate: number,
): { onsets: number[]; strengths: number[] } {
  const hops = rise.length;
  const onsets: number[] = [];
  const strengths: number[] = [];
  for (let hop = 0; hop < hops; hop++) {
    const step = rise[hop] ?? 0;
    if (step < threshold) continue;
    // A local maximum, with the rise before hop 0 taken as zero — so a source that begins on a
    // transient reports an onset at its very first sample rather than missing it.
    if (hop > 0 && step <= (rise[hop - 1] ?? 0)) continue;
    if (hop + 1 < hops && step < (rise[hop + 1] ?? 0)) continue;
    const from = Math.max(0, (hop - 1) * ANALYSIS_HOP);
    const to = Math.min(frames, (hop + 2) * ANALYSIS_HOP);
    const at = loudestFrame(channels, from, to) / sampleRate;
    const last = onsets.length - 1;
    if (last >= 0 && at - (onsets[last] ?? 0) < MIN_ONSET_GAP_SECS) {
      // One transient smeared across two hops. Keep the louder reading of it, not both.
      if (step <= (strengths[last] ?? 0)) continue;
      onsets[last] = at;
      strengths[last] = step;
      continue;
    }
    onsets.push(at);
    strengths.push(step);
  }
  return { onsets, strengths };
}

/**
 * One source measured. Split channels and a sample rate in, plain numbers out — the whole of
 * what analysis is allowed to do (0025). Deterministic for identical samples, which is what
 * lets a click train assert BPM and onset positions without a browser.
 */
export function analyzeBeats(channels: readonly Float32Array[], sampleRate: number): BeatAnalysis {
  const frames = assertChannels(channels, "analyzeBeats");
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
    throw new RangeError(`analyzeBeats needs a positive sample rate: ${String(sampleRate)}`);
  }
  // Ceil, not floor: a floored count drops the final partial hop, and with it any transient in
  // the last few milliseconds of a source whose length is not a multiple of ANALYSIS_HOP — which
  // is nearly every real recording. Both readers of `hops` already clamp their reads to `frames`.
  const hops = Math.ceil(frames / ANALYSIS_HOP);
  // Below two hops there is no rise to measure; silence is the honest answer, not a guess.
  if (hops < 2) return { bpm: 0, onsets: [] };

  const env = envelope(channels, frames, hops);
  const rise = new Float64Array(hops);
  let previous = 0;
  let peak = 0;
  let total = 0;
  for (let hop = 0; hop < hops; hop++) {
    const level = env[hop] ?? 0;
    // Rectified: only getting louder is an onset. A decay is the same event ending.
    const step = Math.max(0, level - previous);
    previous = level;
    rise[hop] = step;
    if (step > peak) peak = step;
    total += step;
  }
  if (peak <= 0) return { bpm: 0, onsets: [] };

  const threshold = ONSET_PEAK_FRACTION * peak + ONSET_MEAN_FACTOR * (total / hops);
  const { onsets, strengths } = collectOnsets(channels, frames, rise, threshold, sampleRate);
  const bounded = onsets.length > MAX_ONSETS ? strongest(onsets, strengths) : onsets;
  return { bpm: foldTempo(60 / medianInterval(bounded)), onsets: bounded };
}

/**
 * `secs` moved onto the nearest candidate within `tolerance`, or left exactly where it was.
 * Equidistant candidates keep the earlier one, so a snap is not sensitive to float noise on
 * either side. `onsets` must be ascending — `analyzeBeats` is the only producer.
 */
export function snapSecs(secs: number, onsets: readonly number[], tolerance: number): number {
  if (onsets.length === 0 || !(tolerance > 0)) return secs;
  let low = 0;
  let high = onsets.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if ((onsets[middle] ?? 0) < secs) low = middle + 1;
    else high = middle;
  }
  const after = onsets[low];
  const before = onsets[low - 1];
  let best = secs;
  let distance = tolerance;
  if (before !== undefined && secs - before <= distance) {
    best = before;
    distance = secs - before;
  }
  if (after !== undefined && after - secs < distance) best = after;
  return best;
}

/**
 * Both edges of a loop gesture, snapped together or not at all. A pair that snaps onto one
 * candidate would be an empty range, and an empty range clears the loop — which is never what
 * a drag meant, so the raw edges stand instead (0025).
 */
export function snapLoop(
  inSecs: number,
  outSecs: number,
  onsets: readonly number[],
  tolerance: number,
): { in: number; out: number } {
  const from = snapSecs(inSecs, onsets, tolerance);
  const to = snapSecs(outSecs, onsets, tolerance);
  if (to <= from) return { in: inSecs, out: outSecs };
  return { in: from, out: to };
}
