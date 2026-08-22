/**
 * @role What the master bus does to everything that lands in it: where the meter is tapped, and
 *   the ceiling the output cannot pass.
 * @instead The live AudioContext itself → src/audio/context.ts, the one thing here no fake stands
 *   in for; the browser scenarios drive that.
 */
import { describe, expect, it } from "vitest";

import { METER_WINDOW } from "./chain";
import { createMasterBus, type MasterPeek, SOFT_CLIP_CEILING } from "./context";

/** What each analyser reports, so the two channels are told apart by what comes back. */
const CHANNEL_PEAKS = [0.5, 0.75];

type Edge = [from: string, to: string, channel?: number];

/** Every AudioParam the limiter is set through — only the value is ever written. */
const param = () => ({ value: 0 });

/** Only the factories the master bus reaches for, each recording the edges it is wired into. */
function fakeContext() {
  const edges: Edge[] = [];
  /** The length of the scratch each tap reads into — the meter window, once per channel. */
  const windows: number[] = [];
  const shapers: { curve: Float32Array | null }[] = [];
  let analysers = 0;

  const node = (name: string) => ({
    name,
    connect: (to: { name: string }, channel?: number) => {
      edges.push(channel === undefined ? [name, to.name] : [name, to.name, channel]);
      return to;
    },
    disconnect: () => {},
  });

  const context = {
    destination: node("destination"),
    createGain: () => Object.assign(node("input"), { gain: param() }),
    createDynamicsCompressor: () =>
      Object.assign(node("limiter"), {
        threshold: param(),
        knee: param(),
        ratio: param(),
        attack: param(),
        release: param(),
      }),
    createWaveShaper: () => {
      const curve: Float32Array | null = null;
      const shaper = Object.assign(node("clip"), { curve, oversample: "none" });
      shapers.push(shaper);
      return shaper;
    },
    createChannelSplitter: () => node("splitter"),
    createAnalyser: () => {
      const index = analysers++;
      return Object.assign(node(`analyser-${index}`), {
        fftSize: 0,
        getFloatTimeDomainData: (out: Float32Array) => {
          windows.push(out.length);
          out.fill(CHANNEL_PEAKS[index] ?? 0);
        },
      });
    },
  };

  // oxlint-disable-next-line no-unsafe-type-assertion -- the bus uses only the factories above
  return { context: context as unknown as BaseAudioContext, edges, windows, shapers };
}

/** The curve the bus built, read back off the one shaper it built. */
function softClip(shapers: { curve: Float32Array | null }[]): Float32Array {
  const curve = shapers[0]?.curve;
  if (curve === null || curve === undefined) throw new Error("the bus built no soft clip curve");
  return curve;
}

// One graph, asserted whole: the edges, the discrete split and the two meter windows are three
// parts of one claim about where the tap sits, and splitting them would rebuild the same bus three
// times over to say it (0007).
// oxlint-disable-next-line max-lines-per-function
describe("the master bus", () => {
  it("meters where the decks land, before the ceiling flattens them", () => {
    const { context, edges, windows } = fakeContext();
    const bus = createMasterBus(context);

    // The signal path, and the tap on the input end of it. Past the ceiling nothing can read above
    // it, so a meter taken after the clip could never say the output was too hot — the one thing it
    // exists to say. As a set, sorted: which node feeds which is the claim, and the order the
    // connections happen to be issued in is not.
    expect(new Set(edges.map(String))).toEqual(
      new Set(
        [
          ["input", "limiter"],
          ["limiter", "clip"],
          ["clip", "destination"],
          ["input", "splitter"],
          ["splitter", "analyser-0", 0],
          ["splitter", "analyser-1", 1],
        ].map(String),
      ),
    );

    // The split is discrete: a mono sum reads on the left and silence on the right, rather than
    // both channels reading one number.
    const out: MasterPeek = { left: 0, right: 0 };
    bus.peek(out);
    expect([out.left, out.right]).toEqual(CHANNEL_PEAKS);
    // Each tap reads the chain's own meter window, so a deck's level and the master's agree.
    expect(windows).toEqual([METER_WINDOW, METER_WINDOW]);
  });

  it("saturates toward the ceiling rather than clipping at it", () => {
    const { context, shapers } = fakeContext();
    createMasterBus(context);
    const curve = softClip(shapers);

    // However many decks play, this is the last thing before the device.
    expect(Math.max(...curve)).toBeLessThanOrEqual(SOFT_CLIP_CEILING);
    expect(Math.min(...curve)).toBeGreaterThanOrEqual(-SOFT_CLIP_CEILING);

    // Strictly rising the whole way: a hard clip is flat past its threshold, and a flat stretch
    // here is the digital tearing this curve exists to replace with a squashed transient.
    const steps = Array.from({ length: curve.length - 1 }, (_, i) => curve[i + 1]! - curve[i]!);
    expect(Math.min(...steps)).toBeGreaterThan(0);

    // Transparent where it is quiet and compressive at the top — that is what makes it a
    // saturator rather than a gain stage or a wall.
    const dx = 2 / (curve.length - 1);
    const slope = (index: number) => steps[index]! / dx;
    expect(slope(curve.length / 2)).toBeCloseTo(1, 2);
    expect(slope(curve.length - 2)).toBeLessThan(0.5);
  });
});
