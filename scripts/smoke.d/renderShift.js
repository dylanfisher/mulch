/**
 * @role The shift offline: the entry's whole claim is a claim about a frequency, so it is proved
 * where the frequency actually exists — a tone rendered through `buildDeckChain` on an
 * OfflineAudioContext, decoded back out of the file that render wrote, and scanned for where its
 * energy stands. A knob cannot say this and neither can a fingerprint: an RMS window is the same
 * whichever pitch it is holding.
 */
import { WAV_BYTES_PER_SAMPLE, WAV_FULL_SCALE, WAV_HEADER_BYTES } from "../../src/lib/wav.ts";
import { fail, report } from "./harness.js";

/** The tone that goes in. Low enough that an octave up is still nowhere near the band's edge. */
const SHIFT_HZ = 400;
/** How long the render runs, and where the scan starts: past the first window, where the heads
 * are still walking out of the silence the stage's capture began as. */
const SHIFT_RENDER_SECS = 0.7;
const SHIFT_FROM_SECS = 0.35;
/** The band the scan covers and how finely it steps, in hertz. */
const SCAN_FROM = 200;
const SCAN_TO = 1600;
const SCAN_STEP = 5;
/** How near the wanted pitch the loudest bin has to land. Two scan steps, so a dominant one step
 * either side of the answer is still the answer. */
const SCAN_NEAR_HZ = 2 * SCAN_STEP;
/** How far the transposed bin has to stand above what is left at the pitch that went in. */
const SHIFT_OVER = 4;

export const renderShift = async ({ page }) => {
  const shifted = await page.evaluate(
    async ({ scale, bytesPerSample, headerBytes, hz, secs, fromSecs, from, to, step }) => {
      // One session, one knob apart: the control is the same rack at a mix of nothing, which this
      // entry declares as its silence — so what the two renders differ by is the effect and not
      // the graph. Both go through `buildDeckChain`, which is the one chain the live path uses.
      const render = (mix) =>
        window.mulch.render({
          secs,
          wav: true,
          envelopes: [
            { t: "deck.load", deck: "a", source: { gen: "sine", hz } },
            // Looped, so the source sounds for the whole render rather than stopping at the end of
            // one clip (P127).
            { t: "deck.loop.toggle", deck: "a" },
            { t: "effect.add", deck: "a", id: "sft", effect: "shift" },
            { t: "param.set", deck: "a", instance: "sft", param: "shift.interval", value: 12 },
            { t: "param.set", deck: "a", instance: "sft", param: "shift.mix", value: mix },
            { t: "deck.play", deck: "a" },
          ],
        });

      /** The left channel of a render's own file, from `fromSecs` on. Read out of the WAV rather
       * than off the graph, because the file is what leaves and a render hands its samples back
       * before it returns (`releaseSamples`, src/app/render.ts). */
      const samplesOf = (result) => {
        if (result.wav === undefined) throw new Error("the shift render produced no file");
        const binary = atob(result.wav);
        const bytes = Uint8Array.from(binary, (character) => character.codePointAt(0) ?? 0);
        const view = new DataView(bytes.buffer);
        const channels = view.getUint16(22, true);
        const sampleRate = view.getUint32(24, true);
        const frames = view.getUint32(40, true) / (channels * bytesPerSample);
        const positiveScale = scale - 1;
        const begin = Math.round(fromSecs * sampleRate);
        const block = new Float32Array(frames - begin);
        for (let frame = begin; frame < frames; frame++) {
          const at = headerBytes + frame * channels * bytesPerSample;
          const pcm = view.getInt16(at, true);
          block[frame - begin] = pcm / (pcm < 0 ? scale : positiveScale);
        }
        return { block, sampleRate };
      };

      /** How much of `block` stands at `at` hertz — one Goertzel bin, which is all a dominant
       * needs, and the same reading src/audio/worklets/shift.test.ts takes of the kernel alone. The
       * recurrence and not a sum of cosines, for the reason that file gives: the scan below asks for
       * hundreds of bins over tens of thousands of samples, twice, inside a lane that runs on a
       * clock (0036). */
      const binAt = (block, sampleRate, at) => {
        const angle = (2 * Math.PI * at) / sampleRate;
        const coefficient = 2 * Math.cos(angle);
        let previous = 0;
        let older = 0;
        for (const sample of block) {
          const held = sample + coefficient * previous - older;
          older = previous;
          previous = held;
        }
        return (
          (2 * Math.hypot(previous - older * Math.cos(angle), older * Math.sin(angle))) /
          block.length
        );
      };

      const measure = (result) => {
        const { block, sampleRate } = samplesOf(result);
        let dominant = from;
        let most = -1;
        for (let at = from; at <= to; at += step) {
          const size = binAt(block, sampleRate, at);
          if (size > most) {
            most = size;
            dominant = at;
          }
        }
        return {
          dominant,
          atInput: binAt(block, sampleRate, hz),
          atOctave: binAt(block, sampleRate, 2 * hz),
        };
      };

      const [wet, dry] = await Promise.all([render(1), render(0)]);
      return {
        wet: { ...measure(wet), clicks: wet.fingerprint.clicks },
        dry: { ...measure(dry), clicks: dry.fingerprint.clicks },
      };
    },
    {
      scale: WAV_FULL_SCALE,
      bytesPerSample: WAV_BYTES_PER_SAMPLE,
      headerBytes: WAV_HEADER_BYTES,
      hz: SHIFT_HZ,
      secs: SHIFT_RENDER_SECS,
      fromSecs: SHIFT_FROM_SECS,
      from: SCAN_FROM,
      to: SCAN_TO,
      step: SCAN_STEP,
    },
  );

  // The control first: at the mix this entry declares as its silence the same rack renders the
  // tone that went in, so a scan that could not find a pitch at all fails here rather than
  // half-passing above.
  if (Math.abs(shifted.dry.dominant - SHIFT_HZ) > SCAN_NEAR_HZ) {
    fail(
      `a shift at a mix of nothing did not render the tone it was given: loudest at ` +
        `${shifted.dry.dominant}Hz against ${SHIFT_HZ}Hz in`,
      shifted,
    );
  }
  // And the claim: an octave asked for is an octave heard, through the one chain the live path
  // uses and out of the file the render wrote.
  if (Math.abs(shifted.wet.dominant - 2 * SHIFT_HZ) > SCAN_NEAR_HZ) {
    fail(
      `an octave up did not land an octave up: loudest at ${shifted.wet.dominant}Hz against ` +
        `${2 * SHIFT_HZ}Hz asked for`,
      shifted,
    );
  }
  if (shifted.wet.atOctave < SHIFT_OVER * shifted.wet.atInput) {
    fail(
      `the octave did not carry the render: ${shifted.wet.atOctave} at ${2 * SHIFT_HZ}Hz against ` +
        `${shifted.wet.atInput} left at ${SHIFT_HZ}Hz`,
      shifted,
    );
  }
  // And the crossfade, which only the render can say: two heads each jump a whole window's worth of
  // capture once per window, so a pair that was not constant power — or a window that moved as a
  // position rather than as a velocity — leaves discontinuities the fingerprint counts. The mix of
  // nothing is the control, because it is the same file with the heads not heard at all.
  if (shifted.wet.clicks > shifted.dry.clicks) {
    fail(
      `the heads were heard arriving: ${shifted.wet.clicks} clicks against ` +
        `${shifted.dry.clicks} in the same session at the mix of nothing`,
      shifted,
    );
  }
  report(
    `offline a ${SHIFT_HZ}Hz tone through the shift came out at ${shifted.wet.dominant}Hz, ` +
      `${(shifted.wet.atOctave / shifted.wet.atInput).toFixed(1)}× what is left at the pitch that ` +
      `went in and ${shifted.wet.clicks} clicks against the ${shifted.dry.clicks} of the same ` +
      `session at the mix of nothing it declares as silence, which rendered ${shifted.dry.dominant}Hz`,
  );
};
