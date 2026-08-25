/**
 * @role The transport's fake graph — a context with only the factories `buildDeckChain` and the
 *   voice ask of one, and the call schedule each of its params records. Shared, because the
 *   deck's tests and the player's are two files over exactly one fixture (0089).
 * @instead The engine's stand-in a tier up → src/app/engineDouble.ts. Nothing here is production
 *   code; it exists so a test can read a schedule of calls instead of listening to a graph.
 *   Building the voice itself stays in each test file: `createDeckVoice` has one production
 *   owner and scripts/arch exempts only test files from saying so.
 */

export type Call = [method: string, ...args: number[]];

/** Only what the chain schedules through — the point is the call schedule, not a graph. */
function fakeParam(calls: Call[]): AudioParam {
  const param = {
    value: 0,
    cancelScheduledValues: (when: number) => calls.push(["cancelScheduledValues", when]),
    cancelAndHoldAtTime: (when: number) => calls.push(["cancelAndHoldAtTime", when]),
    setValueAtTime: (value: number, when: number) => calls.push(["setValueAtTime", value, when]),
    linearRampToValueAtTime: (value: number, when: number) =>
      calls.push(["linearRampToValueAtTime", value, when]),
    // The curve is recorded by the value it starts at — 0 opens and 1 closes — because what a
    // fade test asks is which direction the seam went and when, never the shape between (0089).
    setValueCurveAtTime: (curve: Float32Array, when: number, over: number) =>
      calls.push(["setValueCurveAtTime", curve[0] ?? 0, when, over]),
  };
  // oxlint-disable-next-line no-unsafe-type-assertion -- only the scheduling surface is faked
  return param as unknown as AudioParam;
}

/** `disconnected` counts teardowns, so a test can see a node let go of rather than dropped. */
const fakeNode = () => {
  const node = {
    disconnected: 0,
    connect: (destination: unknown) => destination,
    disconnect: () => {
      node.disconnected += 1;
    },
  };
  return node;
};

/** A destination for the chain's output; nothing is ever read back off it. */
// oxlint-disable-next-line no-unsafe-type-assertion -- only ever connected to
export const destination = (): AudioNode => fakeNode() as unknown as AudioNode;

/**
 * A buffer with samples in it, for the tests that read them: a reversed landing plays a copy of
 * the deck's audio, so a fake of `{ duration }` alone cannot say which end it started at. The ramp
 * is the frame index itself, which makes a mirrored read legible as a number rather than as a
 * waveform (P121). Everything that only ever asks a buffer its duration goes on casting a literal
 * rather than calling this: a second of samples is a megabyte a fixture, and the transport's other
 * suites build one per case.
 */
export function fakeBuffer(secs: number, sampleRate = 48_000): AudioBuffer {
  const length = Math.round(secs * sampleRate);
  const data = Float32Array.from({ length }, (_sample, frame) => frame);
  const buffer = {
    duration: length / sampleRate,
    length,
    sampleRate,
    numberOfChannels: 1,
    getChannelData: () => data,
    copyToChannel: (from: Float32Array) => {
      data.set(from);
    },
  };
  // oxlint-disable-next-line no-unsafe-type-assertion -- only the fields above are ever read
  return buffer as unknown as AudioBuffer;
}

/** A context with only what buildDeckChain and the transport ask of one. */
// One fake graph: every factory the chain reaches for is part of the same object. See 0007.
// oxlint-disable-next-line max-lines-per-function
export function fakeContext() {
  /** The deck fader is the first gain the chain builds, and where the gain lane lands. */
  const gainCalls: Call[] = [];
  /**
   * Every gain in creation order. The chain builds two — the deck fader and the rack's input —
   * and each player step builds one fader of its own after that, so a step's seams are the log
   * at `PRE_PLAYER_GAINS + its own index` (0089) — on a pattern that sparks nothing. A sparking
   * landing builds a second gain for its companion's level, so the stride is two and a step's
   * seams are at `PRE_PLAYER_GAINS + 2 × its own index` (P123).
   */
  const gainLogs: Call[][] = [gainCalls];
  /**
   * And the nodes themselves, in the same order — so a test can read a level the transport wrote
   * straight onto a gain rather than only the curves it scheduled onto one. A spark's level is one
   * of those: the node is minted per landing and held at its value, so there is no call to read it
   * off (P123).
   */
  const gainNodes: { gain: AudioParam }[] = [];
  let gains = 0;
  /** Every buffer source the transport built, newest last — where speed and pitch land (0031). */
  /** `started` is one [when, offset] pair per start — both halves of what a resume moves. */
  const sources: {
    playbackRate: AudioParam;
    detune: AudioParam;
    started: [when: number, offset: number][];
    /** Every stop asked for, with its time — a jumping deck stops each step a seam past its end. */
    stopped: (number | undefined)[];
    /** How many times this source was let go of — a step dropped without one is still wired in. */
    disconnected: number;
    /** What the chain scheduled onto this source's own rate — which source it is holding (P123). */
    rateCalls: Call[];
    loop: boolean;
    loopStart: number;
    loopEnd: number;
  }[] = [];

  /** Every compressor the rack built, newest last — where a meter's reading is written from. */
  const compressors: { reduction: number }[] = [];

  /** Every buffer the transport minted, newest last: the reversed copy a reversed landing reads is
   *  the only thing that ever asks this context for one, so the length of this list is how many
   *  copies a pass made (P121). */
  const buffers: AudioBuffer[] = [];

  const context = {
    currentTime: 0,
    sampleRate: 48_000,
    createGain: () => {
      const calls = gains++ === 0 ? gainCalls : [];
      if (gains > 1) gainLogs.push(calls);
      const node = Object.assign(fakeNode(), { gain: fakeParam(calls) });
      gainNodes.push(node);
      return node;
    },
    createBuffer: (channels: number, length: number, sampleRate: number) => {
      if (channels !== 1) throw new Error(`the fake context makes mono buffers, not ${channels}`);
      const buffer = fakeBuffer(length / sampleRate, sampleRate);
      buffers.push(buffer);
      return buffer;
    },
    createStereoPanner: () => Object.assign(fakeNode(), { pan: fakeParam([]) }),
    // The one effect node with a reading of its own, so a test can ask what a rack's meter puts
    // on the deck's per-frame read (0128 amended). `reduction` is writable here and read-only on
    // the real node, which is the whole point of a double.
    createDynamicsCompressor: () => {
      const node = Object.assign(fakeNode(), {
        threshold: fakeParam([]),
        ratio: fakeParam([]),
        attack: fakeParam([]),
        release: fakeParam([]),
        knee: fakeParam([]),
        reduction: 0,
      });
      compressors.push(node);
      return node;
    },
    createAnalyser: () =>
      Object.assign(fakeNode(), { fftSize: 0, getFloatTimeDomainData: () => {} }),
    createBufferSource: () => {
      const started: [when: number, offset: number][] = [];
      const stopped: (number | undefined)[] = [];
      /** What the chain scheduled onto this source's own rate. The chain holds one source at a
       *  time and writes a live speed change onto that one (0031), so this is how a test asks
       *  which source it is holding — and a companion is never the answer (P123). */
      const rateCalls: Call[] = [];
      const node = Object.assign(fakeNode(), {
        buffer: null,
        loop: false,
        loopStart: 0,
        loopEnd: 0,
        rateCalls,
        playbackRate: fakeParam(rateCalls),
        detune: fakeParam([]),
        addEventListener: () => {},
        start: (when: number, offset: number) => started.push([when, offset]),
        stop: (when?: number) => stopped.push(when),
        started,
        stopped,
      });
      // The node itself, so a test reads the loop points the transport wrote onto it rather than
      // a copy taken before it did.
      sources.push(node);
      return node;
    },
  };

  /** The clock, writable: `BaseAudioContext.currentTime` is read-only, and a test moves time. */
  const now = (at: number): void => {
    context.currentTime = at;
  };
  return {
    // oxlint-disable-next-line no-unsafe-type-assertion -- the chain uses only the factories above
    context: context as unknown as BaseAudioContext,
    buffers,
    compressors,
    gainCalls,
    gainLogs,
    gainNodes,
    now,
    sources,
  };
}
