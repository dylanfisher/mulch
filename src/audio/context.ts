/**
 * @role The output side of the graph: the AudioContext's lifecycle and the master bus every deck
 *   lands in — limiter then soft clip, present from the first sound so nothing downstream is ever
 *   written against an unbounded output.
 * @instead A deck's own nodes → src/audio/chain.ts. Nothing here knows what a deck is.
 */

/** Where the limiter starts working, in dB. Below it the bus is transparent. */
export const LIMITER_THRESHOLD_DB = -3;
/** The soft clip's asymptote: the bus cannot output more than this, however many decks play. */
export const SOFT_CLIP_CEILING = 0.98;
const SOFT_CLIP_STEPS = 2048;

/**
 * The live context. `interactive` asks for the smallest buffer the device will give, which is
 * what makes schedule-ahead transport feel immediate rather than merely be correct.
 *
 * Constructed suspended when the browser has not seen a gesture yet — the unlock gate below.
 * Its clock does not advance while suspended, and since that clock is the one every envelope's
 * `at` is stated against (src/app/clock.ts), a suspended context means scheduled commands wait
 * rather than fire early. That is the honest behaviour: no audio time has passed.
 */
export function createLiveContext(): AudioContext {
  return new AudioContext({ latencyHint: "interactive" });
}

/**
 * tanh, sampled. Past the limiter this is the last thing between a sum of decks and the device,
 * so it saturates rather than wrapping: the failure mode of too much gain becomes a squashed
 * transient you can hear, never the digital tearing of a hard clip.
 */
function softClipCurve(): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(SOFT_CLIP_STEPS);
  for (let i = 0; i < SOFT_CLIP_STEPS; i++) {
    const x = (i / (SOFT_CLIP_STEPS - 1)) * 2 - 1;
    curve[i] = SOFT_CLIP_CEILING * Math.tanh(x / SOFT_CLIP_CEILING);
  }
  return curve;
}

/**
 * The master bus, returned as the node everything connects into. Takes a `BaseAudioContext`, so
 * the live context and an OfflineAudioContext render through the same protection — a limiter
 * that exists only live would make the offline fingerprint a measurement of a different signal.
 */
export function createMasterBus(ctx: BaseAudioContext): GainNode {
  const input = ctx.createGain();
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = LIMITER_THRESHOLD_DB;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.1;
  const clip = ctx.createWaveShaper();
  clip.curve = softClipCurve();
  clip.oversample = "4x";

  input.connect(limiter).connect(clip).connect(ctx.destination);
  return input;
}
