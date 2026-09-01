/**
 * @role The fake AudioContext an effect graph is built against in a test: one recording node per
 *   factory a plugin calls, its AudioParams, and the two readers a case needs to index them.
 * @instead The cases asserted on it → ./rack.test.ts, which is the rewiring matrix, and
 *   ./rackPlugins.test.ts, which is each entry's own graph. Nothing here knows what an effect is.
 */
export type FakeParam = {
  value: number;
  ramps: [value: number, when: number][];
};

export type FakeNode = {
  name: string;
  connections: Set<FakeNode>;
};

export const asFakeNode = (node: AudioNode): FakeNode => {
  // oxlint-disable-next-line no-unsafe-type-assertion -- the context below creates every node
  return node as unknown as FakeNode;
};

export function fakeParam(): AudioParam & FakeParam {
  const ramps: FakeParam["ramps"] = [];
  const param = {
    value: 0,
    ramps,
    cancelAndHoldAtTime: () => {},
    cancelScheduledValues: () => {},
    setValueAtTime: () => {},
    linearRampToValueAtTime: (value: number, when: number) => {
      ramps.push([value, when]);
      return param;
    },
  };
  // oxlint-disable-next-line no-unsafe-type-assertion -- only the plugin and ramp surface is faked
  return param as unknown as AudioParam & FakeParam;
}

/** Every AudioParam the two biquad plugins bind, on one fake node. */
export type FakeBiquad = FakeNode & {
  frequency: AudioParam & FakeParam;
  gain: AudioParam & FakeParam;
  Q: AudioParam & FakeParam;
  type: BiquadFilterType;
};

/** Every AudioParam the compressor binds, plus the one number it only reads (P60). */
export type FakeCompressor = {
  threshold: AudioParam & FakeParam;
  knee: AudioParam & FakeParam;
  ratio: AudioParam & FakeParam;
  attack: AudioParam & FakeParam;
  release: AudioParam & FakeParam;
  reduction: number;
};

/** What the reverb writes its generated response into — one array per channel, recorded. */
export type FakeBuffer = {
  channels: Float32Array[];
  copyToChannel(samples: Float32Array, channel: number): void;
};

/** The rate the reverb's impulse is generated at: a context fact, not a parameter. */
export const FAKE_SAMPLE_RATE = 48_000;

// One fake context, over the cap by the two nodes the delay's mix derives from: splitting it
// would separate a factory from the list it pushes to (0007).
// oxlint-disable-next-line max-lines-per-function
export function fakeContext() {
  const gains: (FakeNode & { gain: AudioParam & FakeParam })[] = [];
  const delays: (FakeNode & { delayTime: AudioParam & FakeParam; maxDelayTime: number })[] = [];
  const filters: FakeBiquad[] = [];
  const constants: (FakeNode & { offset: AudioParam & FakeParam; started: boolean })[] = [];
  const shapers: (FakeNode & { curve: Float32Array | null })[] = [];
  const oscillators: (FakeNode & {
    frequency: AudioParam & FakeParam;
    type: OscillatorType;
    started: boolean;
    stopped: boolean;
  })[] = [];
  const compressors: (FakeNode & FakeCompressor)[] = [];
  const convolvers: (FakeNode & { buffer: FakeBuffer | null; normalize: boolean })[] = [];
  const buffers: FakeBuffer[] = [];

  const node = (name: string): FakeNode & AudioNode => {
    const connections = new Set<FakeNode>();
    const value = {
      name,
      connections,
      connect: (destination: AudioNode) => {
        connections.add(asFakeNode(destination));
        return destination;
      },
      disconnect: () => {
        connections.clear();
      },
    };
    // oxlint-disable-next-line no-unsafe-type-assertion -- only connect/disconnect are exercised
    return value as unknown as FakeNode & AudioNode;
  };

  const context = {
    createGain: () => {
      const gain = Object.assign(node(`gain-${gains.length}`), { gain: fakeParam() });
      gains.push(gain);
      return gain;
    },
    createDelay: (maxDelayTime: number) => {
      const delay = Object.assign(node(`delay-${delays.length}`), {
        delayTime: fakeParam(),
        // What the node will actually hold, which a real one clamps `delayTime` to: the sway's
        // modulation is read against it, so the fake carries the number it was built with.
        maxDelayTime,
      });
      delays.push(delay);
      return delay;
    },
    // The delay's mix is one AudioParam both of its crossfade gains derive from, so the fake
    // carries the DC source and the two shapers that derivation is made of (0049).
    createConstantSource: () => {
      const constant = Object.assign(node(`constant-${constants.length}`), {
        offset: fakeParam(),
        started: false,
        start: () => {
          constant.started = true;
        },
        stop: () => {},
      });
      constants.push(constant);
      return constant;
    },
    // The one oscillating source in the rack: the sway's wander, whose rate is a bound parameter
    // and whose output is the whole of what carries a delay's own time (../effects/sway.ts).
    createOscillator: () => {
      const type: OscillatorType = "sine";
      const oscillator = Object.assign(node(`oscillator-${oscillators.length}`), {
        frequency: fakeParam(),
        type,
        started: false,
        stopped: false,
        start: () => {
          oscillator.started = true;
        },
        stop: () => {
          oscillator.stopped = true;
        },
      });
      oscillators.push(oscillator);
      return oscillator;
    },
    createWaveShaper: () => {
      const curve: Float32Array | null = null;
      const shaper = Object.assign(node(`shaper-${shapers.length}`), { curve });
      shapers.push(shaper);
      return shaper;
    },
    createDynamicsCompressor: () => {
      const compressor = Object.assign(node(`compressor-${compressors.length}`), {
        threshold: fakeParam(),
        knee: fakeParam(),
        ratio: fakeParam(),
        attack: fakeParam(),
        release: fakeParam(),
        // Whatever the node happens to be pulling down by — written by the graph, read by a
        // meter, and never by anything durable.
        reduction: -6,
      });
      compressors.push(compressor);
      return compressor;
    },
    createConvolver: () => {
      const buffer: FakeBuffer | null = null;
      const convolver = Object.assign(node(`convolver-${convolvers.length}`), {
        buffer,
        normalize: true,
      });
      convolvers.push(convolver);
      return convolver;
    },
    sampleRate: FAKE_SAMPLE_RATE,
    createBuffer: (channelCount: number, length: number) => {
      const buffer: FakeBuffer = {
        channels: Array.from({ length: channelCount }, () => new Float32Array(length)),
        copyToChannel: (samples, channel) => {
          buffer.channels[channel] = Float32Array.from(samples);
        },
      };
      buffers.push(buffer);
      return buffer;
    },
    createBiquadFilter: () => {
      const type: BiquadFilterType = "lowpass";
      const filter = Object.assign(node(`filter-${filters.length}`), {
        frequency: fakeParam(),
        gain: fakeParam(),
        Q: fakeParam(),
        type,
      });
      filters.push(filter);
      return filter;
    },
  };

  return {
    // oxlint-disable-next-line no-unsafe-type-assertion -- the plugins use only the factories above
    context: context as unknown as BaseAudioContext,
    gains,
    delays,
    filters,
    constants,
    shapers,
    oscillators,
    compressors,
    convolvers,
    buffers,
    node,
  };
}

/** One shaping curve read at a mix value — the WaveShaper's own [-1, 1] domain, indexed. */
export function at(curve: Float32Array | null, mix: number): number {
  if (curve === null) throw new Error("shaper has no curve");
  const sample = curve[Math.round(((mix + 1) / 2) * (curve.length - 1))];
  if (sample === undefined) throw new Error("curve is shorter than its own length");
  return sample;
}

export function required<T>(values: readonly T[], index: number): T {
  const value = values[index];
  if (value === undefined) throw new Error(`missing fake at index ${index}`);
  return value;
}
