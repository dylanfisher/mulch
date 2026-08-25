/**
 * @role What a synthetic source becomes on a context: the generator's own samples, mono, at that
 *   context's own rate rather than resampled into it.
 */
import { describe, expect, it } from "vitest";

import { GEN_SECS, renderGen } from "@/lib/waveform";
import { renderSourceBuffer } from "./sources";

/** Deliberately not the render's 48k: the rate has to come from the context, not from a default. */
const FAKE_SAMPLE_RATE = 44_100;

function fakeContext() {
  const context = {
    sampleRate: FAKE_SAMPLE_RATE,
    createBuffer: (numberOfChannels: number, length: number, sampleRate: number) => {
      const data = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
      return {
        numberOfChannels,
        length,
        sampleRate,
        copyToChannel: (samples: Float32Array, channel: number) => data[channel]?.set(samples),
        getChannelData: (channel: number) => data[channel],
      };
    },
  };
  // oxlint-disable-next-line no-unsafe-type-assertion -- only createBuffer and the rate are used
  return context as unknown as BaseAudioContext;
}

describe("the buffer a synthetic source renders into", () => {
  it("carries the generator's own samples, mono, at the context's rate", () => {
    const buffer = renderSourceBuffer(fakeContext(), { gen: "sine", hz: 440 });

    // The length is the kind's own, not the load's: a load carries none (P127).
    const expected = renderGen("sine", { secs: GEN_SECS, sampleRate: FAKE_SAMPLE_RATE, hz: 440 });
    expect([buffer.numberOfChannels, buffer.length, buffer.sampleRate]).toEqual([
      1,
      expected.length,
      FAKE_SAMPLE_RATE,
    ]);
    // The samples themselves: a buffer sized right and left empty is a deck that plays silence.
    expect([...buffer.getChannelData(0)]).toEqual([...expected]);
  });
});
