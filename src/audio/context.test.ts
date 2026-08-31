/**
 * @role What the master bus does to everything that lands in it: where the meter is tapped, and
 *   the ceiling the output cannot pass.
 * @instead The live AudioContext itself → src/audio/context.ts, the one thing here no fake stands
 *   in for; the browser scenarios drive that.
 */
import { describe, expect, it } from "vitest";

import { METER_WINDOW } from "./chain";
import { SPECTRUM_FLOOR_DB } from "@/lib/peaks";

import { createMasterBus, emptyMasterPeek, type MasterPeek, SOFT_CLIP_CEILING } from "./context";

/**
 * What a bin with nothing in it reads at: under the floor the reading itself keeps, which is what
 * an analyser's own `minDecibels` leaves in a window nobody can hear (`SPECTRUM_FLOOR_DB`).
 */
const SILENT_BIN_DB = SPECTRUM_FLOOR_DB - 10;

/** The brightest thing a window can hold, sample by sample: every other one the other way up. */
const bright = (at: number): number => (at % 2 === 0 ? 1 : -1);

/** What each analyser reports, so the two channels are told apart by what comes back. */
const CHANNEL_PEAKS = [0.5, 0.75];

type Edge = [from: string, to: string, channel?: number];

/** Every AudioParam the limiter is set through — only the value is ever written. */
const param = () => ({ value: 0 });

/** Only the factories the master bus reaches for, each recording the edges it is wired into. */
// A stub of the context, not logic: one factory per node the master bus reaches for, each recording
// the edges it is wired into. Its length is how many nodes that is, and splitting it would scatter
// one fake across helpers with one caller each.
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
function fakeContext(
  fill: (channel: number, at: number) => number = (channel) => CHANNEL_PEAKS[channel] ?? 0,
  bin: (channel: number, at: number) => number = () => SILENT_BIN_DB,
) {
  const edges: Edge[] = [];
  /** The length of the scratch each tap reads into — the meter window, once per channel. */
  const windows: number[] = [];
  /** And every spectrum fetch that happened, as the channel it was taken on and its bin count. */
  const spectra: [channel: number, bins: number][] = [];
  const shapers: { curve: Float32Array | null }[] = [];
  /** Every analyser the bus built, so what it set on them can be read back. */
  const taps: { smoothingTimeConstant: number }[] = [];
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
      const analyser = Object.assign(node(`analyser-${index}`), {
        fftSize: 0,
        smoothingTimeConstant: 0.8,
        // Half the window, which is what an analyser answers and what the spectrum scratch is cut to.
        frequencyBinCount: METER_WINDOW / 2,
        getFloatTimeDomainData: (out: Float32Array) => {
          windows.push(out.length);
          for (let at = 0; at < out.length; at++) out[at] = fill(index, at);
        },
        getFloatFrequencyData: (out: Float32Array) => {
          spectra.push([index, out.length]);
          for (let at = 0; at < out.length; at++) out[at] = bin(index, at);
        },
      });
      taps.push(analyser);
      return analyser;
    },
  };

  return {
    // oxlint-disable-next-line no-unsafe-type-assertion -- the bus uses only the factories above
    context: context as unknown as BaseAudioContext,
    edges,
    windows,
    spectra,
    shapers,
    taps,
  };
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
    const out: MasterPeek = emptyMasterPeek();
    bus.peek(out);
    expect([out.left, out.right]).toEqual(CHANNEL_PEAKS);
    // Each tap reads the chain's own meter window, so a deck's level and the master's agree.
    expect(windows).toEqual([METER_WINDOW, METER_WINDOW]);
  });

  /**
   * P167: and what the same two windows say about the sound in them rather than about the meter.
   * A picture of the output cannot rest on a peak — it flickers on every transient — so the peek
   * carries the power the window holds and how bright it is, both off the window already fetched
   * and neither of them a spectrum (`rmsMagnitude`, `spectralTilt`, src/lib/peaks.ts).
   */
  it("says what is in the two windows and not only how loud their loudest sample was", () => {
    // A window at one level all the way across: its power is that level, well under the peak a
    // struck window of the same peak would report, and there is nothing in it to be bright.
    const { context } = fakeContext();
    const flat = emptyMasterPeek();
    createMasterBus(context).peek(flat);
    // The louder channel's, whole — a mono summary is the loudest of the two, the way `peaks`
    // answers one for a waveform.
    expect(flat.level).toBeCloseTo(Math.max(...CHANNEL_PEAKS), 6);
    expect(flat.tilt).toBe(0);

    // And the brightness comes off the same window the power does rather than off two spectra that
    // need not agree: the quiet channel is as bright as a window can be and the loud one is not,
    // so the answer is the loud one's.
    const loudAndDark = fakeContext((channel, at) => (channel === 0 ? 0.1 * bright(at) : 0.5));
    const dark = emptyMasterPeek();
    createMasterBus(loudAndDark.context).peek(dark);
    expect(dark.level).toBeCloseTo(0.5, 6);
    expect(dark.tilt).toBe(0);
    // Swap which of them is louder and the reading swaps with it.
    const loudAndBright = fakeContext((channel, at) => (channel === 0 ? 0.5 * bright(at) : 0.1));
    const lit = emptyMasterPeek();
    createMasterBus(loudAndBright.context).peek(lit);
    expect(lit.level).toBeCloseTo(0.5, 6);
    expect(lit.tilt).toBeCloseTo(1, 6);
  });

  /**
   * P178: and the one read that is a spectrum. A wash and a resonance are the same level and nearly
   * the same tilt, so what tells them apart is how the energy is distributed — and the bill is paid
   * once a frame rather than once a channel, on whichever channel the two peak reads already found
   * louder (`spectralFlatness`, `spectralEdge`, src/lib/peaks.ts).
   */
  it("fetches one spectrum a frame, on the channel it already found louder", () => {
    // A tone on the left and noise on the right, with the right the louder of the two: one bin at
    // full scale is a narrow spectrum, every bin at one level is the broadest there is.
    const tone = (at: number) => (at === 8 ? 0 : SILENT_BIN_DB);
    const noisy = fakeContext(
      (channel) => (channel === 0 ? 0.2 : 0.6),
      (channel, at) => (channel === 0 ? tone(at) : -30),
    );
    const broad = emptyMasterPeek();
    createMasterBus(noisy.context).peek(broad);
    // One fetch, on the loud channel, into a scratch of that analyser's own bin count.
    expect(noisy.spectra).toEqual([[1, METER_WINDOW / 2]]);
    // And unsmoothed on both taps: an analyser blends each frequency read into the last one it took
    // on that analyser, and only one of the two is ever read — so a pan that moved which channel
    // that is would answer most of a spectrum the other channel last saw.
    expect(noisy.taps.map((tap) => tap.smoothingTimeConstant)).toEqual([0, 0]);
    expect(broad.flatness).toBeCloseTo(1, 6);
    // Every bin carries the same power, so the energy sits in the middle of the band.
    expect(broad.edge).toBeCloseTo(0.5, 1);

    // Swap which of them is louder and the reading swaps with it: the same two channels read as a
    // narrow peak low in the band rather than as a wash across it.
    const ringing = fakeContext(
      (channel) => (channel === 0 ? 0.6 : 0.2),
      (channel, at) => (channel === 0 ? tone(at) : -30),
    );
    const narrow = emptyMasterPeek();
    createMasterBus(ringing.context).peek(narrow);
    expect(ringing.spectra).toEqual([[0, METER_WINDOW / 2]]);
    expect(narrow.flatness).toBeLessThan(0.05);
    expect(narrow.edge).toBeCloseTo(8 / (METER_WINDOW / 2 - 1), 6);

    // And an output with nothing in it says it measured nothing, rather than saying that silence is
    // the flattest spectrum there is — which is what a floored array reads as (0063).
    const silent = fakeContext(() => 0);
    const nothing = emptyMasterPeek();
    createMasterBus(silent.context).peek(nothing);
    expect([nothing.flatness, nothing.edge]).toEqual([0, 0]);
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
