/**
 * @role The shift stage's kernels, driven in Node: what an interval is as a rate, what the pair of
 *   heads comes to at any point of their walk, and the stage itself — transparent at a mix of
 *   nothing, and putting a tone's dominant bin exactly where the interval says it is — plus the
 *   declaration the processor's descriptors are the other half of.
 * @instead The seam that gets this processor onto a context → src/audio/worklet.test.ts. Nothing
 *   here needs an AudioContext, which is the whole reason these are functions and not methods.
 */
// Over the soft cap because this stage's correctness is a claim about a frequency, so most of its
// cases carry a measurement rather than an expectation: a scan for a dominant bin, an envelope, a
// biggest step. Splitting it would mean a second module duplicating the worklet globals and the
// tone builder this file shares with ./crush.test.ts, ./pop.test.ts, ./scatter.test.ts and
// ./tape.test.ts — one more copy of what is already too many, to move a warning. The rule reports
// at the file, so the waiver is the file's, exactly as ../effects/rackPlugins.test.ts's is (0007).
// oxlint-disable max-lines
import { beforeAll, describe, expect, it } from "vitest";

import { shiftEffect } from "@/audio/effects/shift";

// Type-only, and the runtime import is the one in `beforeAll`: importing a processor module for
// real at the top of the file would run `registerProcessor` before the stubs exist.
import type * as Kernels from "./shift.js";

const RATE = 48_000;

let shift: typeof Kernels;

/**
 * A worklet is its own module graph: `AudioWorkletProcessor`, `registerProcessor` and `sampleRate`
 * are globals the browser supplies. Standing them up is what lets the real file — rather than a
 * second copy of its arithmetic — be driven from here (./crush.test.ts stubs the same shape).
 */
beforeAll(async () => {
  Object.assign(globalThis, {
    AudioWorkletProcessor: class {
      port = {
        addEventListener: () => {},
        start: () => {},
        postMessage: () => {},
      };
    },
    registerProcessor: () => {},
    sampleRate: RATE,
  });
  shift = await import("./shift.js");
});

/** A sine at `hz`, `length` samples long. */
const tone = (hz: number, length: number, amplitude = 0.5) =>
  Float32Array.from({ length }, (_, i) => amplitude * Math.sin((2 * Math.PI * hz * i) / RATE));

/**
 * One signal through a stage, block by block at the render quantum — because that is how the
 * processor hands it over, and a stage that only worked when given the whole thing at once would
 * pass a single-call test and fail on the audio thread.
 */
const through = (
  stage: Kernels.ShiftStage,
  left: Float32Array,
  right: Float32Array,
  at: { semitones: number; cents?: number; window?: number; mix?: number | Float32Array },
) => {
  const outLeft = new Float32Array(left.length);
  const outRight = new Float32Array(left.length);
  const mix = at.mix ?? 1;
  const block = 128;
  for (let from = 0; from < left.length; from += block) {
    const to = Math.min(left.length, from + block);
    stage.run(
      left.subarray(from, to),
      right.subarray(from, to),
      outLeft.subarray(from, to),
      outRight.subarray(from, to),
      at.semitones,
      at.cents ?? 0,
      at.window ?? 0.06,
      typeof mix === "number" ? Float32Array.from([mix]) : mix.subarray(from, to),
    );
  }
  return { outLeft, outRight };
};

/**
 * How much of `block` stands at `hz` — one Goertzel bin, which is all a dominant needs. The
 * recurrence rather than a sum of cosines, because the scan below asks for hundreds of bins over
 * tens of thousands of samples and two multiplies a sample is what makes that a test rather than a
 * wait.
 */
const binAt = (block: Float32Array, hz: number): number => {
  const angle = (2 * Math.PI * hz) / RATE;
  const coefficient = 2 * Math.cos(angle);
  let previous = 0;
  let older = 0;
  for (const sample of block) {
    const held = sample + coefficient * previous - older;
    older = previous;
    previous = held;
  }
  return (
    (2 * Math.hypot(previous - older * Math.cos(angle), older * Math.sin(angle))) / block.length
  );
};

/** The quietest and loudest twentieth of a second of `block` from `from` on — several windows
 * even at the longest window this stage takes. */
const envelope = (block: Float32Array, from: number) => {
  const span = 2400;
  let quietest = Number.POSITIVE_INFINITY;
  let loudest = 0;
  for (let at = from; at + span <= block.length; at += span) {
    let squares = 0;
    for (const sample of block.subarray(at, at + span)) squares += sample * sample;
    const rms = Math.sqrt(squares / span);
    if (rms < quietest) quietest = rms;
    if (rms > loudest) loudest = rms;
  }
  return { quietest, loudest };
};

/** The largest step between two neighbouring samples — a discontinuity, read the way a
 * fingerprint's click count reads one (src/lib/fingerprint.ts). */
const biggestStep = (block: Float32Array): number => {
  let most = 0;
  for (let i = 1; i < block.length; i++) {
    most = Math.max(most, Math.abs((block[i] ?? 0) - (block[i - 1] ?? 0)));
  }
  return most;
};

/** Where the most of `block` stands, scanned across `from`..`to` hertz at `step`. */
const dominantHz = (block: Float32Array, from: number, to: number, step: number): number => {
  let best = from;
  let most = -1;
  for (let hz = from; hz <= to; hz += step) {
    const size = binAt(block, hz);
    if (size > most) {
      most = size;
      best = hz;
    }
  }
  return best;
};

describe("headRate", () => {
  it("is the interval as a rate, with the cents on the same exponent", () => {
    expect(shift.headRate(0, 0)).toBeCloseTo(1, 12);
    expect(shift.headRate(12, 0)).toBeCloseTo(2, 12);
    expect(shift.headRate(-12, 0)).toBeCloseTo(0.5, 12);
    // A perfect fifth, which is the ratio the row this entry draws is built out of.
    expect(shift.headRate(7, 0)).toBeCloseTo(1.498_307, 6);
    // A hundred cents is exactly the step the interval moves in, so the two knobs meet.
    expect(shift.headRate(0, 100)).toBeCloseTo(shift.headRate(1, 0), 12);
    expect(shift.headRate(11, 100)).toBeCloseTo(2, 12);
  });
});

describe("the pair of heads", () => {
  it("is constant power wherever in the window it stands", () => {
    // The whole of why the wrap is not heard: each head is silent at both ends of its own window,
    // and the two of them square to one everywhere in between — so a steady tone comes out as
    // steady as it went in rather than pumping once a window.
    expect(shift.headGain(0)).toBeCloseTo(0, 12);
    expect(shift.headGain(1)).toBeCloseTo(0, 12);
    expect(shift.headGain(0.5)).toBeCloseTo(1, 12);
    for (let phase = 0; phase < 1; phase += 1 / 64) {
      const pair = shift.headGain(phase) ** 2 + shift.headGain(shift.turn(phase + 0.5)) ** 2;
      expect(pair, `phase ${phase}`).toBeCloseTo(1, 12);
    }
  });

  it("brings a walk in either direction back onto its own window", () => {
    // The heads walk backwards for an interval up and forwards for one down, so the wrap has to
    // answer for a phase below nothing as well as one past one.
    expect(shift.turn(0.25)).toBeCloseTo(0.25, 12);
    expect(shift.turn(1.25)).toBeCloseTo(0.25, 12);
    expect(shift.turn(-0.25)).toBeCloseTo(0.75, 12);
    expect(shift.turn(-2.25)).toBeCloseTo(0.75, 12);
  });
});

describe("the stage", () => {
  it("writes the input straight back out at a mix of nothing", () => {
    // The presence this entry declares, held in the one place it is decided: the blend is in the
    // kernel, so a mix of nought has to be the untouched input and not merely a quiet shifter.
    const left = tone(220, 4096);
    const right = tone(330, 4096);
    const { outLeft, outRight } = through(new shift.ShiftStage(RATE), left, right, {
      semitones: 24,
      mix: 0,
    });
    for (let i = 0; i < left.length; i++) {
      expect(outLeft[i]).toBeCloseTo(left[i] ?? 0, 12);
      expect(outRight[i]).toBeCloseTo(right[i] ?? 0, 12);
    }
  });

  it("puts the dominant bin where the interval says it is", () => {
    // The one thing this processor is for, and the claim the whole entry rests on: a tone in at
    // 400Hz is a tone out at whatever the interval multiplies it by, and nothing else in the rack
    // can say that. Read past the first window, where the heads are still walking out of the
    // silence the capture began as.
    const hz = 400;
    const left = tone(hz, RATE / 2);
    const skip = Math.round(0.15 * RATE);
    for (const [semitones, ratio] of [
      [12, 2],
      [7, 1.498_307],
      [0, 1],
      [-12, 0.5],
    ] as const) {
      const { outLeft } = through(new shift.ShiftStage(RATE), left, left, { semitones });
      const heard = outLeft.subarray(skip);
      const want = hz * ratio;
      // Scanned across the whole band the four intervals reach rather than compared against two
      // candidates: an argmax that landed on the input's own pitch is the failure this is for.
      const loudest = dominantHz(heard, 150, 1000, 2);
      expect(loudest, `${semitones} semitones`).toBeGreaterThan(want - 8);
      expect(loudest, `${semitones} semitones`).toBeLessThan(want + 8);
      // And the transposed bin actually carries the signal: it stands well above what is left at
      // the pitch that went in, except at the interval that is the identity.
      if (semitones !== 0) {
        expect(binAt(heard, want), `${semitones} semitones`).toBeGreaterThan(4 * binAt(heard, hz));
      }
    }
  });
});

// Five cases against one stage, and over the line cap by the last of them: what each measures is a
// different reading of the same crossfade, and a describe per reading would say four times that
// these are one stage's behaviour (0007).
// oxlint-disable-next-line max-lines-per-function
describe("the stage's cents, and the crossfade between its heads", () => {
  it("carries the cents at the same rate the semitones are on", () => {
    // The second knob, and the reason it is a knob: a hundred cents is one semitone, so a shift of
    // eleven and a hundred is the octave.
    const hz = 400;
    const left = tone(hz, RATE / 2);
    const skip = Math.round(0.15 * RATE);
    const { outLeft } = through(new shift.ShiftStage(RATE), left, left, {
      semitones: 11,
      cents: 100,
    });
    const loudest = dominantHz(outLeft.subarray(skip), 150, 1000, 2);
    expect(loudest).toBeGreaterThan(2 * hz - 8);
    expect(loudest).toBeLessThan(2 * hz + 8);
  });

  it("holds its level across the wrap where the heads sum in step", () => {
    // The crossfade doing its job: the heads jump a whole window's worth of capture once per
    // window, and a pair that was not constant power would pump at exactly that rate. Measured as
    // the spread of the envelope across the render rather than as a click, because a crossfade
    // that dipped would leave no discontinuity to count.
    //
    // The windows are chosen and not arbitrary: constant power is not constant amplitude, because
    // the two heads read one signal half a window apart and are coherent. Where the input's period
    // divides that half window an even number of times they sum in step, which is the case here and
    // the case the wrap has to survive; the odd case is the one below.
    for (const window of [0.01, 0.06, 0.2]) {
      const left = tone(400, RATE);
      expect(((400 * window) / 2) % 1, `window ${window}`).toBeCloseTo(0, 9);
      const { outLeft } = through(new shift.ShiftStage(RATE), left, left, {
        semitones: 12,
        window,
      });
      const { quietest, loudest } = envelope(outLeft, Math.round(0.3 * RATE));
      expect(quietest, `window ${window}`).toBeGreaterThan(0.1);
      expect(loudest / quietest, `window ${window}`).toBeLessThan(2);
    }
  });

  it("combs where the two heads stand antiphase, which is the comb it has", () => {
    // The other side of the same fact, pinned rather than left to be rediscovered: two heads half a
    // window apart are one signal read twice, so where the input's period divides that half window
    // an odd number of times they cancel where their gains are equal. This is what every two-head
    // shifter does and the reason Window is a knob a hand moves; the case above is what the wrap
    // itself has to survive, and this one says the pair are not the same claim (0265).
    const hz = 220;
    const window = 0.05;
    expect(((hz * window) / 2) % 1).toBeCloseTo(0.5, 9);
    const left = tone(hz, RATE);
    const { outLeft } = through(new shift.ShiftStage(RATE), left, left, { semitones: 1, window });
    const { quietest, loudest } = envelope(outLeft, Math.round(0.3 * RATE));
    expect(loudest / quietest).toBeGreaterThan(4);
  });

  it("opens on the oldest sample it holds rather than on the tail it never wrote", () => {
    // A head reads at most as far back as the stage has been given, and while that clamp binds it
    // holds the oldest sample it has. Counted a sample wrong it reaches one lap further, onto the
    // untouched tail of the capture, and a fresh instance opens with a whole window of the silence
    // the buffer began as — a fifth of a second of nothing at the top of Window.
    //
    // Read with a cosine and not the sine every other case here uses: a sine's own first sample is
    // nought, so a stage holding it and a stage holding the silence it never wrote sound alike, and
    // the difference this case is for would not be there to see.
    const length = Math.round(RATE / 2);
    const left = Float32Array.from(
      { length },
      (_, i) => 0.5 * Math.cos((2 * Math.PI * 400 * i) / RATE),
    );
    const { outLeft } = through(new shift.ShiftStage(RATE), left, left, {
      semitones: 12,
      window: 0.2,
    });
    let peak = 0;
    for (const sample of outLeft.subarray(0, Math.round(0.05 * RATE))) {
      peak = Math.max(peak, Math.abs(sample));
    }
    expect(peak).toBeGreaterThan(0.4);
  });

  it("bends rather than cuts when the window is swept under a sounding tone", () => {
    // A window is a read *position*, so one that arrived between two blocks would move both heads
    // by up to the whole of the change at whatever gain they stand at — and the crossfade cannot
    // hide a jump it did not make. Glided, the sweep is a bend the size of the steady render's own
    // steps rather than a run of near-full-scale discontinuities.
    const left = tone(400, RATE);
    const steady = through(new shift.ShiftStage(RATE), left, left, { semitones: 7, window: 0.01 });
    const stage = new shift.ShiftStage(RATE);
    const swept = new Float32Array(left.length);
    const block = 128;
    for (let from = 0; from < left.length; from += block) {
      const to = Math.min(left.length, from + block);
      // The whole of Window in a fifth of a second, which is faster than a hand and as fast as a
      // lane laid across it.
      const window = 0.01 + Math.min(1, from / (0.2 * RATE)) * 0.19;
      stage.run(
        left.subarray(from, to),
        left.subarray(from, to),
        swept.subarray(from, to),
        swept.subarray(from, to),
        7,
        0,
        window,
        Float32Array.from([1]),
      );
    }
    expect(biggestStep(swept)).toBeLessThan(3 * biggestStep(steady.outLeft));
  });
});

describe("the stage's two channels, and its own boundaries", () => {
  it("keeps the two channels on one walk, so the image does not move", () => {
    // One phase over the pair rather than one per channel: a stage that walked twice would
    // transpose the left channel from a different instant than the right, and the image would move
    // with the interval.
    const stage = new shift.ShiftStage(RATE);
    const left = tone(400, 8192);
    const { outLeft, outRight } = through(stage, left, left, { semitones: 7 });
    expect([...outRight]).toEqual([...outLeft]);
  });

  it("carries its walk across the block boundary", () => {
    // A stage is handed 128 frames at a time and a window is far longer than that, so a phase or a
    // write pointer reset per block would make the transposition the block's rate rather than the
    // knob's.
    const left = tone(400, 4096);
    const whole = through(new shift.ShiftStage(RATE), left, left, { semitones: 12 });
    const stage = new shift.ShiftStage(RATE);
    const halves: number[] = [];
    for (const piece of [left.slice(0, 2048), left.slice(2048)]) {
      halves.push(...through(stage, piece, piece, { semitones: 12 }).outLeft);
    }
    expect(halves).toEqual([...whole.outLeft]);
  });
});

describe("the a-rate mix", () => {
  it("reads the blend per sample when the parameter arrives as a block", () => {
    // The whole reason `shift.mix` is a-rate and this stage blends in its own kernel (0209): a
    // fade laid on the presence has to be read once per sample, not once per 128-frame block.
    const left = tone(220, 4096);
    const blend = Float32Array.from({ length: 4096 }, (_, i) => i / 4095);
    const run = (mix: number | Float32Array) =>
      through(new shift.ShiftStage(RATE), left, left, { semitones: 12, mix }).outLeft;
    const dry = run(0);
    const wet = run(1);
    const mixed = run(blend);
    for (let i = 0; i < 4096; i++) {
      const want = (dry[i] ?? 0) + ((wet[i] ?? 0) - (dry[i] ?? 0)) * (blend[i] ?? 0);
      expect(mixed[i], `sample ${i}`).toBeCloseTo(want, 6);
    }
  });
});

describe("the shift processor's parameter descriptors", () => {
  it("declares each of the plugin's parameters at the plugin's own range", () => {
    // Every bound is written twice — once as the declaration the knob, the automation lane and the
    // session read, once as a descriptor the AudioParam clamps to. A descriptor whose maximum sat
    // under the declaration would make the knob read past what is heard, silently.
    const descriptors = shift.ShiftPitch.parameterDescriptors;
    for (const declared of shiftEffect.params) {
      const descriptor = descriptors.find(({ name }) => name === declared.id);
      expect(descriptor, `the processor declares no ${declared.id}`).toEqual({
        name: declared.id,
        minValue: declared.min,
        maxValue: declared.max,
        defaultValue: declared.default,
        // The mix is the one value read per sample rather than per block: it is this entry's own
        // presence, and an automator fades a whole effect in on it (0202, 0209).
        automationRate: declared.id === "shift.mix" ? "a-rate" : "k-rate",
      });
    }
    expect(descriptors.length).toBe(shiftEffect.params.length);
    // And the capture is the window's own maximum: the stage keeps exactly as much of the past as
    // the longest window may reach back into, so the number lives on the declaration and here.
    const window = shiftEffect.params.find(({ id }) => id === "shift.window");
    expect(window?.max).toBe(shift.WINDOW_MAX_SECS);
  });

  it("declares a settle that is the window the kernel reads plus the crossfade it stands in", () => {
    // The other number written on both sides of the seam: how far apart the two heads stand is what
    // the plugin calls the crossfade, and its `settle` is a window plus that share of one. Moved in
    // the kernel alone it would be a warm-up quietly stated against a stage that no longer has it.
    for (const secs of [0.01, 0.06, 0.2]) {
      // The other three are whatever, and deliberately not their defaults: how long this stage
      // remembers is the window and the crossfade, and nothing else it is set to.
      const settle = shiftEffect.settle({
        "shift.interval": -7,
        "shift.detune": 40,
        "shift.window": secs,
        "shift.mix": 0.3,
      });
      expect(settle).toBeCloseTo(secs * (1 + shift.HEAD_OFFSET), 12);
    }
  });
});
