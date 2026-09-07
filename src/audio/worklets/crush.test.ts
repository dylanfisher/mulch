/**
 * @role The crush stage's kernels, driven in Node: what a bit depth is in levels, what one sample
 *   rounds to, and the stage itself — transparent at a mix of nothing, holding its sample at the
 *   rate it is asked to, and taking a countable number of values — plus the declaration the
 *   processor's descriptors are the other half of.
 * @instead The seam that gets this processor onto a context → src/audio/worklet.test.ts. Nothing
 *   here needs an AudioContext, which is the whole reason these are functions and not methods.
 */
import { beforeAll, describe, expect, it } from "vitest";

import { crushEffect } from "@/audio/effects/crush";

// Type-only, and the runtime import is the one in `beforeAll`: importing a processor module for
// real at the top of the file would run `registerProcessor` before the stubs exist.
import type * as Kernels from "./crush.js";

const RATE = 48_000;

let crush: typeof Kernels;

/**
 * A worklet is its own module graph: `AudioWorkletProcessor`, `registerProcessor` and `sampleRate`
 * are globals the browser supplies. Standing them up is what lets the real file — rather than a
 * second copy of its arithmetic — be driven from here (./pop.test.ts stubs the same shape).
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
  crush = await import("./crush.js");
});

/** One block through a stage, at the values given. `mix` is a-rate and arrives as a block. */
const through = (
  stage: Kernels.CrushStage,
  left: Float32Array,
  right: Float32Array,
  at: { bits: number; hz: number; mix: number | Float32Array },
) => {
  const outLeft = new Float32Array(left.length);
  const outRight = new Float32Array(left.length);
  stage.run(
    left,
    right,
    outLeft,
    outRight,
    at.bits,
    at.hz,
    typeof at.mix === "number" ? Float32Array.from([at.mix]) : at.mix,
  );
  return { outLeft, outRight };
};

/** A sine at `hz`, a block long. */
const tone = (hz: number, length: number, amplitude = 0.5) =>
  Float32Array.from({ length }, (_, i) => amplitude * Math.sin((2 * Math.PI * hz * i) / RATE));

/** Where a block's value changes — the instants the hold took a sample, read off the output. */
const risers = (block: Float32Array): number[] => {
  const at: number[] = [];
  for (let i = 1; i < block.length; i++) if (block[i] !== block[i - 1]) at.push(i);
  return at;
};

describe("levelsOf", () => {
  it("is one step either side of nothing at a bit, and thousands at sixteen", () => {
    // A whole bit is the sign and the rest are the resolution, which is what makes the bottom of
    // the knob three values — up, nothing, down — rather than two.
    expect(crush.levelsOf(1)).toBe(1);
    expect(crush.levelsOf(8)).toBe(128);
    expect(crush.levelsOf(16)).toBe(32_768);
    // And a fractional depth is between two whole ones, which is what the lane rides.
    expect(crush.levelsOf(2.5)).toBeGreaterThan(crush.levelsOf(2));
    expect(crush.levelsOf(2.5)).toBeLessThan(crush.levelsOf(3));
  });
});

describe("quantise", () => {
  it("rounds onto the levels it is given, evenly in amplitude", () => {
    expect(crush.quantise(0.3, 1)).toBe(0);
    expect(crush.quantise(0.7, 1)).toBe(1);
    expect(crush.quantise(-0.7, 1)).toBe(-1);
    // Uniform in amplitude and not in decibels: the same step size everywhere, which is what makes
    // it a converter's own dirt rather than a compander's.
    expect(crush.quantise(0.26, 4)).toBeCloseTo(0.25, 12);
    expect(crush.quantise(0.76, 4)).toBeCloseTo(0.75, 12);
  });

  it("is the identity where the signal already sits on a level", () => {
    for (const step of [-1, -0.5, 0, 0.25, 1])
      expect(crush.quantise(step, 4)).toBeCloseTo(step, 12);
  });
});

describe("the stage", () => {
  it("writes the input straight back out at a mix of nothing", () => {
    // The presence this entry declares, held in the one place it is decided: the blend is in the
    // kernel, so a mix of nought has to be the untouched input and not merely a quiet crusher.
    const left = tone(220, 2048);
    const right = tone(330, 2048);
    const { outLeft, outRight } = through(new crush.CrushStage(RATE), left, right, {
      bits: 1,
      hz: 100,
      mix: 0,
    });
    for (let i = 0; i < left.length; i++) {
      expect(outLeft[i]).toBeCloseTo(left[i] ?? 0, 12);
      expect(outRight[i]).toBeCloseTo(right[i] ?? 0, 12);
    }
  });

  it("takes a countable number of distinct values", () => {
    // The one thing this processor is for. A tone that visits hundreds of amplitudes comes out on
    // a handful of them, and never more than there are levels either side of nothing.
    const left = tone(220, 4096);
    const bits = 3;
    const levels = crush.levelsOf(bits);
    const { outLeft } = through(new crush.CrushStage(RATE), left, left, {
      bits,
      hz: RATE,
      mix: 1,
    });
    const seen = new Set(outLeft);
    expect(seen.size).toBeLessThanOrEqual(2 * levels + 1);
    // And it is actually quantising rather than passing a signal that was already coarse: the dry
    // block visits far more values than the wet one does.
    expect(new Set(left).size).toBeGreaterThan(seen.size * 4);
    for (const value of seen) expect(value * levels).toBeCloseTo(Math.round(value * levels), 6);
  });
});

describe("the stage's hold", () => {
  it("holds each sample for as long as the rate says", () => {
    // The other half of the effect, and the one that aliases: at a hold of a sixteenth of the
    // context's rate every run of equal samples is sixteen long, so the stage is a decimator and
    // not only a rounder.
    const hold = 16;
    const left = tone(400, 1024);
    const { outLeft } = through(new crush.CrushStage(RATE), left, left, {
      bits: 16,
      hz: RATE / hold,
      mix: 1,
    });
    const took = risers(outLeft);
    // Every step is exactly a hold from the one before it, so the stage is a decimator running at
    // the knob's rate and not merely a rounder that happens to repeat itself.
    for (let i = 1; i < took.length; i++) {
      expect((took[i] ?? 0) - (took[i - 1] ?? 0), `step ${i}`).toBe(hold);
    }
    expect(took.length).toBeGreaterThan(outLeft.length / hold - 2);
  });

  it("takes every sample where the hold is asked for faster than the context runs", () => {
    // The top of Rate, and the floor of the effect: a hold of less than a sample is no hold, so
    // what comes out is the input rounded and nothing else — the phase may not skip a take.
    const left = tone(400, 512);
    const { outLeft } = through(new crush.CrushStage(RATE), left, left, {
      bits: 16,
      hz: RATE * 4,
      mix: 1,
    });
    for (let i = 0; i < left.length; i++) {
      expect(outLeft[i], `sample ${i}`).toBeCloseTo(crush.quantise(left[i] ?? 0, 32_768), 12);
    }
  });
});

describe("the stage's two channels, and its own boundaries", () => {
  it("keeps the two channels on one hold, so the image does not move", () => {
    // One phase over the pair rather than one per channel: a stage that held twice would take the
    // left channel a sample before the right, and the image would move with the knob. Read as
    // where each channel's steps fall rather than as a ratio between them — the quantiser is
    // uniform in amplitude, so two channels at two sizes land on their own levels by design.
    const stage = new crush.CrushStage(RATE);
    const left = tone(220, 2048);
    const right = tone(220, 2048, 0.25);
    const { outLeft, outRight } = through(stage, left, right, { bits: 16, hz: 3000, mix: 1 });
    expect(risers(outRight)).toEqual(risers(outLeft));
    expect(risers(outLeft).length).toBeGreaterThan(100);
  });

  it("carries its hold across the block boundary", () => {
    // A stage is handed 128 frames at a time and a hold is longer than that at the bottom of Rate,
    // so a phase reset per block would make the decimation the block's rate rather than the knob's.
    const left = tone(400, 512);
    const whole = through(new crush.CrushStage(RATE), left, left, { bits: 6, hz: 1000, mix: 1 });
    const stage = new crush.CrushStage(RATE);
    const halves: number[] = [];
    for (const piece of [left.slice(0, 256), left.slice(256)]) {
      halves.push(...through(stage, piece, piece, { bits: 6, hz: 1000, mix: 1 }).outLeft);
    }
    expect(halves).toEqual([...whole.outLeft]);
  });
});

describe("the a-rate mix", () => {
  it("reads the blend per sample when the parameter arrives as a block", () => {
    // The whole reason `crush.mix` is a-rate and this stage blends in its own kernel (0209): a
    // fade laid on the presence has to be read once per sample, not once per 128-frame block.
    const left = tone(220, 2048);
    const blend = Float32Array.from({ length: 2048 }, (_, i) => i / 2047);
    const at = { bits: 3, hz: 4000 };
    const run = (mix: number | Float32Array) =>
      through(new crush.CrushStage(RATE), left, left, { ...at, mix }).outLeft;
    const dry = run(0);
    const wet = run(1);
    const mixed = run(blend);
    for (let i = 0; i < 2048; i++) {
      const want = (dry[i] ?? 0) + ((wet[i] ?? 0) - (dry[i] ?? 0)) * (blend[i] ?? 0);
      expect(mixed[i], `sample ${i}`).toBeCloseTo(want, 6);
    }
  });
});

describe("the stage as it stood before the quantiser moved to the take", () => {
  it("still draws exactly what it drew then, under a depth that moves mid-hold", () => {
    // The loop as it was, kept here as the statement the shipped one is held to: the held pair
    // rounded again on every sample. The rewrite rounds at the take and again when the depth
    // changes, and nothing else moved — so this is equality, not a tolerance, and the depth is
    // walked across the whole knob under a hold long enough that most changes land mid-hold.
    const was = (
      stage: { phase: number; heldLeft: number; heldRight: number },
      inLeft: Float32Array,
      inRight: Float32Array,
      outLeft: Float32Array,
      outRight: Float32Array,
      bits: number,
      hz: number,
      mix: Float32Array,
    ) => {
      const levels = crush.levelsOf(bits);
      const step = Math.min(hz / RATE, 1);
      for (let i = 0; i < outLeft.length; i++) {
        const left = inLeft[i] ?? 0;
        const right = inRight[i] ?? 0;
        stage.phase += step;
        if (stage.phase >= 1) {
          stage.phase -= 1;
          stage.heldLeft = left;
          stage.heldRight = right;
        }
        const blend = mix.length === 1 ? (mix[0] ?? 0) : (mix[i] ?? 0);
        outLeft[i] = left + (crush.quantise(stage.heldLeft, levels) - left) * blend;
        outRight[i] = right + (crush.quantise(stage.heldRight, levels) - right) * blend;
      }
    };
    let seed = 12345;
    const noise = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296 - 0.5;
    };
    const length = 8192;
    const left = Float32Array.from({ length }, noise);
    const right = Float32Array.from({ length }, noise);
    const blend = Float32Array.from({ length }, (_, i) => i / (length - 1));
    // A block of the render quantum with the depth stepped per block, and a block of one sample
    // with the depth stepped per sample — the finest the processor could ever hand the stage.
    for (const block of [128, 1]) {
      const stage = new crush.CrushStage(RATE);
      const then = { phase: 1, heldLeft: 0, heldRight: 0 };
      const outLeft = new Float32Array(length);
      const outRight = new Float32Array(length);
      const wasLeft = new Float32Array(length);
      const wasRight = new Float32Array(length);
      for (let at = 0, take = 0; at < length; at += block, take++) {
        const bits = 1 + ((take * 0.37) % 15);
        const piece = (buffer: Float32Array) => buffer.subarray(at, at + block);
        stage.run(
          piece(left),
          piece(right),
          piece(outLeft),
          piece(outRight),
          bits,
          100,
          piece(blend),
        );
        was(
          then,
          piece(left),
          piece(right),
          piece(wasLeft),
          piece(wasRight),
          bits,
          100,
          piece(blend),
        );
      }
      expect(outLeft, `left, blocks of ${block}`).toStrictEqual(wasLeft);
      expect(outRight, `right, blocks of ${block}`).toStrictEqual(wasRight);
    }
  });
});

describe("the crush processor's parameter descriptors", () => {
  it("declares each of the plugin's parameters at the plugin's own range", () => {
    // Every bound is written twice — once as the declaration the knob, the automation lane and the
    // session read, once as a descriptor the AudioParam clamps to. A descriptor whose maximum sat
    // under the declaration would make the knob read past what is heard, silently.
    const descriptors = crush.CrushBits.parameterDescriptors;
    for (const declared of crushEffect.params) {
      const descriptor = descriptors.find(({ name }) => name === declared.id);
      expect(descriptor, `the processor declares no ${declared.id}`).toEqual({
        name: declared.id,
        minValue: declared.min,
        maxValue: declared.max,
        defaultValue: declared.default,
        // The mix is the one value read per sample rather than per block: it is this entry's own
        // presence, and an automator fades a whole effect in on it (0202, 0209).
        automationRate: declared.id === "crush.mix" ? "a-rate" : "k-rate",
      });
    }
    expect(descriptors.length).toBe(crushEffect.params.length);
  });
});
