/**
 * @role The output side of the graph: the live AudioContext, and the master bus every deck lands
 *   in — limiter then soft clip, present from the first sound so nothing downstream is ever
 *   written against an unbounded output.
 * @instead A deck's own nodes → src/audio/chain.ts. Nothing here knows what a deck is. Resuming
 *   a suspended context → src/app/engine.ts, where the command that needs it lives.
 */
import { METER_WINDOW } from "./chain";

/** Where the limiter starts working, in dB. Below it the bus is transparent. */
export const LIMITER_THRESHOLD_DB = -3;
/** The soft clip's asymptote: the bus cannot output more than this, however many decks play. */
export const SOFT_CLIP_CEILING = 0.98;
const SOFT_CLIP_STEPS = 2048;

/**
 * The live context. `interactive` asks for the smallest buffer the device will give, which is
 * what makes schedule-ahead transport feel immediate rather than merely be correct.
 *
 * Constructed suspended when the browser has not seen a gesture yet. Its clock does not advance
 * while suspended, and since that clock is the one every envelope's `at` is stated against
 * (src/app/clock.ts), a suspended context means scheduled commands wait rather than fire early.
 * That is the honest behaviour: no audio time has passed. Resuming it is the unlock gate, and
 * it lives with `deck.play` in src/app/engine.ts — the command that is also the gesture.
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
 * The whole output's instantaneous peak, one number per channel. The stereo twin of a deck
 * chain's mono `level()`, and — like it — usually in [0, 1] but free to read hotter, because
 * this is measured where the decks land rather than after the ceiling flattens them.
 */
export type MasterPeek = { left: number; right: number };

/** The master bus: the node everything connects into, and the meter tapped off it. */
export type MasterBus = {
  input: GainNode;
  /**
   * The per-frame read: fills `out` with the loudest |sample| in each channel's meter window.
   * Allocation-free after construction, the same contract `DeckChain.level()` has.
   */
  peek(out: MasterPeek): void;
};

/** The loudest magnitude in `samples`. Indexed, because this runs once per channel per frame. */
function loudest(samples: Float32Array): number {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const magnitude = Math.abs(samples[i] ?? 0);
    if (magnitude > peak) peak = magnitude;
  }
  return peak;
}

/**
 * The master bus, returned with the node everything connects into. Takes a `BaseAudioContext`, so
 * the live context and an OfflineAudioContext render through the same protection — a limiter
 * that exists only live would make the offline fingerprint a measurement of a different signal.
 *
 * The meter is a dead-end tap on the input, before the limiter and the soft clip, for the same
 * reason a console's meter sits before its master fader: past `SOFT_CLIP_CEILING` nothing can
 * read above 0.98, so a post-clip meter could never say that the output was too hot — which is
 * the one thing a clip indicator exists to say. The split is discrete, so a mono sum reads on
 * the left and silence on the right rather than both channels reading the same number.
 */
export function createMasterBus(ctx: BaseAudioContext): MasterBus {
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

  const splitter = ctx.createChannelSplitter(2);
  input.connect(splitter);
  const tap = (channel: number) => {
    const analyser = ctx.createAnalyser();
    analyser.fftSize = METER_WINDOW;
    splitter.connect(analyser, channel);
    const scratch = new Float32Array(analyser.fftSize);
    return () => {
      analyser.getFloatTimeDomainData(scratch);
      return loudest(scratch);
    };
  };
  const leftPeak = tap(0);
  const rightPeak = tap(1);

  return {
    input,
    peek: (out) => {
      out.left = leftPeak();
      out.right = rightPeak();
    },
  };
}
