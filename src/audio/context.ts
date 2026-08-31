/**
 * @role The output side of the graph: the live AudioContext, and the master bus every deck lands
 *   in — limiter then soft clip, present from the first sound so nothing downstream is ever
 *   written against an unbounded output.
 * @instead A deck's own nodes → src/audio/chain.ts. Nothing here knows what a deck is. Resuming
 *   a suspended context → src/app/engine.ts, where the command that needs it lives.
 */
import { peakMagnitude, rmsMagnitude, spectralTilt } from "@/lib/peaks";
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
export type MasterPeek = {
  left: number;
  right: number;
  /**
   * And what the same two windows say about the sound itself rather than about the meter: how much
   * power the louder of them carries, on the scale its peak is on, and how bright it is on 0..1
   * (`rmsMagnitude`, `spectralTilt`, src/lib/peaks.ts). A meter shows a peak; a picture rests on
   * these, because a row driven off an instantaneous peak flickers on every transient.
   */
  level: number;
  tilt: number;
  /**
   * And when it was read, on the context's own clock — the one time every yard shares, which is
   * what the session's row in the drift runs its phase on: a layer in two pictures at once has to
   * be at the same place in both, and a deck's playhead is not (0228, src/app/clock.ts).
   */
  at: number;
};

/** One channel's window, reduced — the three numbers a tap answers, refilled in place. */
type ChannelRead = { peak: number; rms: number; tilt: number };

/**
 * A read of an output with nothing in it, and the same fact written once — the pair
 * `emptyDeckPeek` and `clearDeckPeek` are for a deck's own read (src/audio/deckPeek.ts). The
 * facade mints one and empties it in place; a test that stands in for the bus starts from one.
 */
export const emptyMasterPeek = (): MasterPeek => ({ left: 0, right: 0, level: 0, tilt: 0, at: 0 });

/** What a session with no engine behind it reads as. Emptied in place, never replaced. */
export function clearMasterPeek(out: MasterPeek): void {
  out.left = 0;
  out.right = 0;
  out.level = 0;
  out.tilt = 0;
  out.at = 0;
}

/** The master bus: the node everything connects into, and the meter tapped off it. */
export type MasterBus = {
  input: GainNode;
  /**
   * The per-frame read: fills `out` with the loudest |sample| in each channel's meter window.
   * Allocation-free after construction, the same contract `DeckChain.level()` has.
   */
  peek(out: MasterPeek): void;
};

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
// Two lines over, and it is one graph: every node is built, wired and handed back together, so a
// helper would take the half-built bus as a parameter and give it back. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
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
    // One read object per tap, filled in place: three numbers off one fetched window, and no
    // allocation after construction — the contract the peek above states (0070).
    const read: ChannelRead = { peak: 0, rms: 0, tilt: 0 };
    return (): ChannelRead => {
      analyser.getFloatTimeDomainData(scratch);
      read.peak = peakMagnitude(scratch);
      read.rms = rmsMagnitude(scratch);
      read.tilt = spectralTilt(scratch, read.rms);
      return read;
    };
  };
  const readLeft = tap(0);
  const readRight = tap(1);

  return {
    input,
    peek: (out) => {
      const left = readLeft();
      const right = readRight();
      out.left = left.peak;
      out.right = right.peak;
      // The louder channel's, whole: a mono summary is the loudest of the two, which is what
      // `peaks` already answers for a waveform, and the brightness comes off the same window as
      // the power rather than being averaged across two spectra that need not agree.
      const louder = left.rms >= right.rms ? left : right;
      out.level = louder.rms;
      out.tilt = louder.tilt;
      out.at = ctx.currentTime;
    },
  };
}
