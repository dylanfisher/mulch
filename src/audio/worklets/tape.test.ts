/**
 * @role The tape loop's kernels, driven in Node: the fractional tap, the glided time, the noise
 *   bands, the antialiased saturator, and one channel proving repeats darken as they compound.
 * @instead The seam that gets this processor onto a context → src/audio/worklet.test.ts. Nothing
 *   here needs an AudioContext, which is the whole reason these are functions and not methods.
 */
import { beforeAll, describe, expect, it } from "vitest";

import { tapeEffect } from "@/audio/effects/tape";

// Type-only, and the runtime import is the one in `beforeAll`: importing a processor module for
// real at the top of the file would run `registerProcessor` before the stubs exist. The types are
// the JSDoc the kernels already carry — `allowJs` is what reaches them (tsconfig.json).
import type * as Kernels from "./tape.js";

const RATE = 48_000;

/** What the processor registered on its port. A worklet's `port` is a global the stub supplies,
 * so the listener is captured here rather than read off a processor the DOM lib does not type. */
const listeners: ((event: { data: unknown }) => void)[] = [];

let tape: typeof Kernels;

/**
 * A worklet is its own module graph: `AudioWorkletProcessor`, `registerProcessor` and
 * `sampleRate` are globals the browser supplies. Standing them up is what lets the real file —
 * rather than a second copy of its arithmetic — be driven from here (../worklets/loop-reporter.test.ts).
 */
beforeAll(async () => {
  Object.assign(globalThis, {
    // Only what a processor touches. The listeners are kept so a test can deliver a message the
    // way the main thread's port does — see ./loop-reporter.test.ts, which stubs the same shape.
    AudioWorkletProcessor: class {
      port = {
        addEventListener: (_type: string, next: (event: { data: unknown }) => void) => {
          listeners.push(next);
        },
        start: () => {},
        postMessage: () => {},
      };
    },
    registerProcessor: () => {},
    sampleRate: RATE,
  });
  tape = await import("./tape.js");
});

describe("cubicTap", () => {
  it("reads the sample itself at a whole position", () => {
    const buffer = Float32Array.from([1, -2, 3, -4, 5, -6, 7, -8]);
    for (let i = 0; i < buffer.length; i++) {
      expect(tape.cubicTap(buffer, i)).toBeCloseTo(buffer[i] ?? 0, 6);
    }
  });

  it("reproduces a straight line exactly between samples", () => {
    // Catmull-Rom is exact on anything linear, which is what makes a moving head a pitch bend
    // rather than a sweeping filter: no fraction is quieter than any other.
    const buffer = Float32Array.from({ length: 16 }, (_, i) => i * 0.25);
    for (const at of [4.25, 5.5, 9.75, 11.1]) {
      expect(tape.cubicTap(buffer, at)).toBeCloseTo(at * 0.25, 5);
    }
  });

  it("wraps the circular buffer in both directions", () => {
    const buffer = Float32Array.from({ length: 8 }, (_, i) => i);
    expect(tape.cubicTap(buffer, 8)).toBeCloseTo(0, 6);
    expect(tape.cubicTap(buffer, -8)).toBeCloseTo(0, 6);
    expect(tape.cubicTap(buffer, 15)).toBeCloseTo(7, 6);
  });
});

describe("the glided time", () => {
  it("resamples toward a new time instead of jumping to it", () => {
    const coefficient = tape.smoothingCoefficient(0.08, RATE);
    let delay = 0.2 * RATE;
    const target = 0.4 * RATE;
    let fastest = 0;
    for (let i = 0; i < RATE; i++) {
      const before = delay;
      delay = tape.glide(delay, target, coefficient);
      fastest = Math.max(fastest, delay - before);
    }
    // The read pointer's velocity is 1 - d(delay)/dn. Below one sample per sample it never
    // reverses and never stalls, so the whole move is heard as a pitch bend.
    expect(fastest).toBeGreaterThan(0);
    expect(fastest).toBeLessThan(1);
    expect(delay).toBeCloseTo(target, 0);
  });

  it("takes a time constant to cover a move the slew limit does not bound", () => {
    const coefficient = tape.smoothingCoefficient(0.08, RATE);
    let delay = 0;
    for (let i = 0; i < 0.08 * RATE; i++) delay = tape.glide(delay, 1, coefficient);
    expect(delay).toBeCloseTo(1 - Math.exp(-1), 2);
  });

  it("never runs the head backwards, however far the time jumps", () => {
    // A one-pole alone steps by (distance × coefficient), so a big enough jump would overtake
    // the write head — read velocity is 1 − d(delay)/dn, and past 1 that is playing in reverse.
    const coefficient = tape.smoothingCoefficient(0.08, RATE);
    for (const [from, to] of [
      [0.005, 2],
      [2, 0.005],
    ]) {
      let delay = (from ?? 0) * RATE;
      for (let i = 0; i < RATE; i++) {
        const before = delay;
        delay = tape.glide(delay, (to ?? 0) * RATE, coefficient);
        expect(Math.abs(delay - before)).toBeLessThanOrEqual(0.5);
      }
    }
  });
});

// The band measurement is one loop over forty seconds of noise with four claims read off it;
// splitting it would run that loop four times to assert it four ways (0007).
// oxlint-disable-next-line max-lines-per-function
describe("the noise bands", () => {
  it("draws the same sequence from the same seed and a different one from another", () => {
    // A render is a spec: two runs of one session are one file, so nothing here may be random.
    const a = tape.noiseSource(12345);
    const b = tape.noiseSource(12345);
    const c = tape.noiseSource(12346);
    const first = Array.from({ length: 32 }, () => a());
    expect(Array.from({ length: 32 }, () => b())).toEqual(first);
    expect(Array.from({ length: 32 }, () => c())).not.toEqual(first);
    expect(Math.max(...first.map((value) => Math.abs(value)))).toBeLessThanOrEqual(1);
  });

  it("wobbles at about a hertz for wow and an order above it for flutter", () => {
    const measure = (lowHz: number, highHz: number) => {
      const white = tape.noiseSource(99);
      const state = tape.bandState();
      const low = tape.cornerCoefficient(lowHz, RATE);
      const high = tape.cornerCoefficient(highHz, RATE);
      const gain = tape.bandGain(low);
      const secs = 40;
      let crossings = 0;
      let previous = 0;
      let peak = 0;
      let square = 0;
      let counted = 0;
      for (let i = 0; i < secs * RATE; i++) {
        const value = tape.bandStep(state, white(), low, high) * gain;
        if (i > RATE) {
          if (previous <= 0 && value > 0) crossings++;
          square += value * value;
          counted++;
          peak = Math.max(peak, Math.abs(value));
        }
        previous = value;
      }
      return { hz: crossings / (secs - 1), peak, std: Math.sqrt(square / counted) };
    };
    const wow = measure(1.5, 0.3);
    const flutter = measure(15, 3);
    expect(wow.hz).toBeGreaterThan(0.3);
    expect(wow.hz).toBeLessThan(3);
    expect(flutter.hz).toBeGreaterThan(wow.hz * 4);
    expect(flutter.hz).toBeLessThan(30);
    // `bandGain` claims unit variance for both bands off one measured constant; if that drifts,
    // the depth in seconds drifts with it and the wobble stops being the depth that was declared.
    expect(wow.std).toBeGreaterThan(0.8);
    expect(wow.std).toBeLessThan(1.25);
    expect(flutter.std).toBeGreaterThan(0.8);
    expect(flutter.std).toBeLessThan(1.25);
    // Bandpassed noise, not a sine: the deviation is bounded but never periodic.
    expect(wow.peak).toBeLessThan(6);
  });
});

describe("the head's room to move", () => {
  it("never asks the head to move further than the buffer was sized for", () => {
    // Twenty seconds of both bands at full wow. `MAX_DEVIATION` is what the buffer's headroom is
    // built from, so if the bands can exceed it the head clamps instead of wobbling.
    const channel = new tape.TapeChannel(RATE, 5);
    let peak = 0;
    for (let i = 0; i < 20 * RATE; i++) {
      peak = Math.max(peak, Math.abs(tape.headDeviation(channel, 1)));
    }
    expect(peak).toBeLessThan(tape.MAX_DEVIATION);
    // And not absurdly under it either: a bound ten times the excursion would be a wasted buffer.
    expect(peak).toBeGreaterThan(tape.MAX_DEVIATION * 0.3);
  });

  it("leaves that much room above the longest tap it offers", () => {
    // The failure this catches: at `tape.time`'s declared maximum the buffer ends four samples
    // above the delay, so the whole positive half of the wobble is clipped flat and the pitch
    // bend stops dead for about half of every second.
    const channel = new tape.TapeChannel(RATE, 3);
    const longest = tape.MAX_DELAY_SECS * RATE;
    // `modulatedTap` clamps at `size - 4`, so that is the whole of the head's positive headroom.
    expect(channel.buffer.length - 4 - longest).toBeGreaterThanOrEqual(
      tape.MAX_DEVIATION * longest,
    );
  });
});

describe("modulatedTap", () => {
  it("moves the head by exactly the deviation it was given", () => {
    const size = 1024;
    expect(tape.modulatedTap(500, 100, 0, size)).toBe(500 - 100 + size);
    expect(tape.modulatedTap(500, 100, 7.5, size)).toBeCloseTo(500 - 107.5 + size, 6);
  });

  it("never lets the head overtake the write pointer or fall off the end", () => {
    const size = 1024;
    expect(tape.modulatedTap(500, 1, -50, size)).toBe(500 - 2 + size);
    expect(tape.modulatedTap(500, size, 500, size)).toBe(500 - (size - 4) + size);
  });
});

describe("adaaTanh", () => {
  it("is tanh where the input is holding still", () => {
    const state = { x1: 0.7, f1: tape.logCosh(0.7) };
    expect(tape.adaaTanh(state, 0.7)).toBeCloseTo(Math.tanh(0.7), 6);
  });

  it("returns the average across a step rather than its endpoint", () => {
    // This is the antialiasing: a jump the loop takes in one sample is integrated instead of
    // sampled, so the harmonics the corner would have folded down are never generated.
    const state = { x1: -3, f1: tape.logCosh(-3) };
    const averaged = tape.adaaTanh(state, 3);
    expect(averaged).toBeGreaterThan(Math.tanh(-3));
    expect(averaged).toBeLessThan(Math.tanh(3));
    expect(Math.abs(averaged)).toBeLessThan(Math.abs(Math.tanh(3)));
  });

  it("bounds a loud loop instead of letting it run away", () => {
    const state = { x1: 0, f1: tape.logCosh(0) };
    for (const x of [12, -40, 400, -5000]) {
      expect(Math.abs(tape.adaaTanh(state, x))).toBeLessThanOrEqual(1);
    }
  });

  it("flushes a denormal to zero and leaves audio alone", () => {
    expect(tape.flush(1e-30)).toBe(0);
    expect(tape.flush(-1e-30)).toBe(0);
    expect(tape.flush(0.5)).toBe(0.5);
  });
});

// One impulse through one loop, with the peak and the brightness of four repeats read off the
// same pass: two tests would be two runs of the same channel (0007).
// oxlint-disable-next-line max-lines-per-function
describe("one tape channel", () => {
  it("darkens and compounds each repeat instead of repeating it unchanged", () => {
    const delaySecs = 0.01;
    const span = Math.round(delaySecs * RATE);
    const channel = new tape.TapeChannel(RATE, 4242);
    const input = new Float32Array(span * 6);
    input[0] = 1;
    const output = new Float32Array(input.length);
    // Wow and hiss off: what is being measured is the loop's filter and saturator, and noise
    // would put the two under the same threshold.
    channel.run(input, output, delaySecs, 0.7, 4000, 1, 0, 0);

    const repeats = [1, 2, 3, 4].map((n) => {
      const from = n * span;
      let peak = 0;
      let energy = 0;
      let difference = 0;
      for (let i = from; i < from + span; i++) {
        const sample = output[i] ?? 0;
        peak = Math.max(peak, Math.abs(sample));
        energy += Math.abs(sample);
        difference += Math.abs(sample - (output[i - 1] ?? 0));
      }
      // Sample-to-sample change over level: a bright repeat moves more between samples than a
      // dull one does, which is the same claim a spectral centroid makes and costs one pass.
      return { peak, brightness: energy > 0 ? difference / energy : 0 };
    });

    for (const repeat of repeats) expect(repeat.peak).toBeGreaterThan(0);
    const first = repeats[0];
    const last = repeats.at(-1);
    if (first === undefined || last === undefined) throw new Error("missing repeat");
    // The fourth repeat has been through the loop's filter pair four times, so it is not merely
    // quieter than the first — it has lost at least half its sample-to-sample movement. Monotone
    // decrease alone does not say that: a loop with no filter at all still loses a little to the
    // fractional tap, and would pass a test that only asked for a downward trend.
    expect(last.brightness).toBeLessThan(first.brightness * 0.5);
    for (let n = 1; n < repeats.length; n++) {
      const previous = repeats[n - 1];
      const current = repeats[n];
      if (previous === undefined || current === undefined) throw new Error("missing repeat");
      expect(current.peak).toBeLessThan(previous.peak);
      expect(current.brightness).toBeLessThan(previous.brightness);
    }
  });

  it("keeps echoing when the source has stopped and never returns a denormal", () => {
    const span = 480;
    const channel = new tape.TapeChannel(RATE, 7);
    const primed = new Float32Array(span);
    primed[0] = 1;
    channel.run(primed, new Float32Array(span), 0.01, 0.7, 4000, 1, 0, 0);
    const silence = new Float32Array(span);
    const output = new Float32Array(span);
    channel.run(silence, output, 0.01, 0.7, 4000, 1, 0, 0);
    expect(Math.max(...output.map((value) => Math.abs(value)))).toBeGreaterThan(0);
  });
});

describe("the processor's own lifetime", () => {
  it("stops pulling once the main thread has disposed it", () => {
    // A processor that always returns true is an active source forever: the node stays on the
    // context's pull list after `dispose` disconnected it, and its two-second buffer stays alive
    // with it. An offline context is never closed (src/app/render.ts), so every export of a
    // session holding a tape would keep one — which is the residue class 0086 exists to prevent.
    const processor = new tape.TapeDelay();
    const parameters = {
      "tape.time": new Float32Array([0.01]),
      "tape.feedback": new Float32Array([0.5]),
      "tape.tone": new Float32Array([4000]),
      "tape.drive": new Float32Array([1]),
      "tape.wow": new Float32Array([0]),
      "tape.hiss": new Float32Array([0]),
    };
    const block = () =>
      processor.process([[new Float32Array(128)]], [[new Float32Array(128)]], parameters);

    expect(block()).toBe(true);
    for (const listener of listeners) listener({ data: { t: "stop" } });
    expect(block()).toBe(false);
  });
});

describe("the processor's declared ranges", () => {
  it("matches the plugin's declarations, which are the other copy of them", () => {
    // A worklet imports nothing, so every range is written twice — once as a `ParamSpec` the knob
    // and the session read, once as a descriptor the AudioParam clamps to. A descriptor whose
    // maximum sat under the declaration would make the knob read past what is heard, silently.
    const descriptors = tape.TapeDelay.parameterDescriptors;
    for (const declared of tapeEffect.params) {
      const descriptor = descriptors.find(({ name }) => name === declared.id);
      // `tape.amount` is the graph-side dry/wet and is deliberately not one of the processor's.
      if (declared.id === "tape.amount") {
        expect(descriptor).toBeUndefined();
        continue;
      }
      expect(descriptor, `the processor declares no ${declared.id}`).toEqual({
        name: declared.id,
        minValue: declared.min,
        maxValue: declared.max,
        defaultValue: declared.default,
        automationRate: "k-rate",
      });
    }
    expect(descriptors.length).toBe(tapeEffect.params.length - 1);
  });
});
