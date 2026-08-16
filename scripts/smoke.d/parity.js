/** @role M7's parity: every sample of an exported WAV against the graph that rendered it. */
import {
  WAV_BITS,
  WAV_BYTES_PER_SAMPLE,
  WAV_HEADER_BYTES,
  WAV_QUANTIZATION_EPSILON,
} from "../../src/lib/wav.ts";
import { fail, PARITY_RENDER_SECS, report } from "./harness.js";

export const exportParity = async ({ page }) => {
  // M7's parity assertion observes the raw output of the exact OfflineAudioContext that
  // renderOffline builds, then compares every sample with the WAV returned by that render.
  // Intercepting startRendering keeps the test independent of render.ts's encoding branch
  // without constructing a second graph or exposing an AudioBuffer through the facade.
  const parity = await page.evaluate(
    async ({ bits, bytesPerSample, epsilon, headerBytes, secs }) => {
      const original = OfflineAudioContext.prototype.startRendering;
      let graphBuffer;
      OfflineAudioContext.prototype.startRendering = async function () {
        const rendered = await original.call(this);
        graphBuffer = rendered;
        return rendered;
      };

      let result;
      try {
        result = await window.mulch.render({
          secs,
          envelopes: [
            { t: "deck.load", deck: "a", source: { gen: "sine", hz: 733, secs: 0.125 } },
            { t: "param.set", deck: "a", param: "deck.gain", value: 0.37 },
            {
              t: "automation.set",
              deck: "a",
              param: "deck.gain",
              // Gesture-relative, and as long as the render: a lane repeats on its own length,
              // so a short one would cross both windows below instead of rising through
              // them (0028, 0035).
              points: [
                { at: 0, value: 0.02 },
                { at: secs, value: 1 },
              ],
            },
            { t: "param.set", deck: "a", param: "deck.pan", value: 0.4 },
            { t: "effect.add", deck: "a", id: "flt", effect: "filter" },
            { t: "param.set", deck: "a", instance: "flt", param: "filter.cutoff", value: 3200 },
            { t: "deck.play", deck: "a" },
          ],
          wav: true,
        });
      } finally {
        OfflineAudioContext.prototype.startRendering = original;
      }
      if (graphBuffer === undefined || result.wav === undefined) {
        throw new Error("offline export did not produce both graph samples and a WAV");
      }

      const binary = atob(result.wav);
      const bytes = Uint8Array.from(binary, (character) => character.codePointAt(0) ?? 0);
      const view = new DataView(bytes.buffer);
      const channels = view.getUint16(22, true);
      const sampleRate = view.getUint32(24, true);
      const dataBytes = view.getUint32(40, true);
      const frames = dataBytes / (channels * bytesPerSample);
      if (
        channels !== graphBuffer.numberOfChannels ||
        sampleRate !== graphBuffer.sampleRate ||
        frames !== graphBuffer.length ||
        bytes.length !== headerBytes + dataBytes
      ) {
        throw new Error("exported WAV shape differs from its rendered AudioBuffer");
      }

      let maxDelta = 0;
      let audible = false;
      const negativeScale = 2 ** (bits - 1);
      const positiveScale = negativeScale - 1;
      for (let frame = 0; frame < frames; frame++) {
        for (let channel = 0; channel < channels; channel++) {
          const at = headerBytes + (frame * channels + channel) * bytesPerSample;
          const pcm = view.getInt16(at, true);
          const exported = pcm / (pcm < 0 ? negativeScale : positiveScale);
          const rendered = graphBuffer.getChannelData(channel)[frame] ?? 0;
          const delta = Math.abs(rendered - exported);
          if (delta > maxDelta) maxDelta = delta;
          if (Math.abs(rendered) > 0.01) audible = true;
          if (delta > epsilon) {
            throw new Error(
              `export sample ${channel}:${frame} differs by ${delta}, above ${epsilon}`,
            );
          }
        }
      }
      const rms = (fromSecs, toSecs) => {
        const from = Math.round(fromSecs * sampleRate);
        const to = Math.round(toSecs * sampleRate);
        let sum = 0;
        let count = 0;
        for (let channel = 0; channel < channels; channel++) {
          const data = graphBuffer.getChannelData(channel);
          for (let frame = from; frame < to; frame++) {
            const sample = data[frame] ?? 0;
            sum += sample * sample;
            count++;
          }
        }
        return Math.sqrt(sum / count);
      };
      // Independent of the WAV parity path: these raw graph windows straddle the scheduled
      // gain ramp on a steady sine source, proving the AudioParam lane changed rendered PCM.
      const automationEarlyRms = rms(0.06, 0.08);
      const automationLateRms = rms(0.13, 0.15);
      return { audible, channels, frames, maxDelta, automationEarlyRms, automationLateRms };
    },
    {
      bits: WAV_BITS,
      bytesPerSample: WAV_BYTES_PER_SAMPLE,
      epsilon: WAV_QUANTIZATION_EPSILON,
      headerBytes: WAV_HEADER_BYTES,
      secs: PARITY_RENDER_SECS,
    },
  );

  if (!parity.audible) fail("offline export parity rendered only silence");
  if (parity.channels < 1 || parity.frames < 1) {
    fail(`offline export parity is empty — ${JSON.stringify(parity)}`);
  }
  if (
    !(parity.automationEarlyRms > 0) ||
    parity.automationLateRms <= parity.automationEarlyRms * 1.75
  ) {
    fail(`offline automation did not raise the rendered gain — ${JSON.stringify(parity)}`);
  }
  report(
    `offline export matches ${parity.frames * parity.channels} shared-graph ` +
      `samples within ${WAV_QUANTIZATION_EPSILON} (max ${parity.maxDelta})`,
  );
};
