/**
 * @role The scatter stage's kernels, driven in Node: what one window draws off a knob, where its
 *   gate stands across it, and the stage itself — transparent at a gate of nothing, and playing
 *   back a piece of what it heard rather than what is passing through — plus the declaration the
 *   processor's descriptors are the other half of.
 * @instead The seam that gets this processor onto a context → src/audio/worklet.test.ts. Nothing
 *   here needs an AudioContext, which is the whole reason these are functions and not methods.
 */
import { beforeAll, describe, expect, it } from "vitest";

import { scatterEffect } from "@/audio/effects/scatter";

// Type-only, and the runtime import is the one in `beforeAll`: importing a processor module for
// real at the top of the file would run `registerProcessor` before the stubs exist.
import type * as Kernels from "./scatter.js";

const RATE = 48_000;

let scatter: typeof Kernels;

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
  scatter = await import("./scatter.js");
});

describe("drawnValue", () => {
  it("holds the knob exactly when nothing is drawn", () => {
    // A Stray of nothing is every window alike, which is what makes the floor of the knob a
    // no-op rather than a very slightly unsteady scatter.
    for (const draw of [0, 0.5, 0.99]) {
      expect(scatter.drawnValue(0.4, 0, draw)).toBeCloseTo(0.4, 12);
    }
  });

  it("reaches from nothing up to the knob as the draw runs its range", () => {
    expect(scatter.drawnValue(0.4, 1, 0)).toBeCloseTo(0.4, 12);
    expect(scatter.drawnValue(0.4, 1, 1)).toBeCloseTo(0, 12);
    // And the knob is the ceiling at every Stray: a draw never asks for more than was set.
    for (const stray of [0.25, 0.5, 1]) {
      for (const draw of [0, 0.3, 0.7, 1]) {
        expect(scatter.drawnValue(0.4, stray, draw)).toBeLessThanOrEqual(0.4 + 1e-12);
        expect(scatter.drawnValue(0.4, stray, draw)).toBeGreaterThanOrEqual(-1e-12);
      }
    }
  });
});

describe("windowGain", () => {
  it("is shut outside the window and open across the middle of it", () => {
    expect(scatter.windowGain(-0.01, 0.2, 0.01)).toBe(0);
    expect(scatter.windowGain(0, 0.2, 0.01)).toBe(0);
    expect(scatter.windowGain(0.2, 0.2, 0.01)).toBe(0);
    expect(scatter.windowGain(0.5, 0.2, 0.01)).toBe(0);
    expect(scatter.windowGain(0.1, 0.2, 0.01)).toBeCloseTo(1, 12);
  });

  it("takes the edge to open and the edge to shut", () => {
    // The click end of Edge: a short ramp either side, and the middle wide open.
    expect(scatter.windowGain(0.005, 0.2, 0.01)).toBeCloseTo(0.5, 12);
    expect(scatter.windowGain(0.195, 0.2, 0.01)).toBeCloseTo(0.5, 12);
  });

  it("never fully opens where the window is shorter than two edges", () => {
    // The swell end, and the reason the ramp is not clamped to the span: a window half an edge
    // long is a shape the gate never finishes drawing, which is what a long Edge sounds like on
    // a short Span rather than an error to refuse.
    const peak = scatter.windowGain(0.01, 0.02, 0.1);
    expect(peak).toBeGreaterThan(0);
    expect(peak).toBeLessThan(0.2);
    // And it is still a triangle: the top of it is the middle of the window.
    expect(scatter.windowGain(0.005, 0.02, 0.1)).toBeLessThan(peak);
    expect(scatter.windowGain(0.015, 0.02, 0.1)).toBeLessThan(peak);
  });
});

/** One block through a stage, at the values given. `gate` is a-rate and arrives as a block. */
const through = (
  stage: Kernels.ScatterStage,
  left: Float32Array,
  right: Float32Array,
  at: { reach: number; span: number; odds: number; gate: number; edge: number; stray: number },
) => {
  const outLeft = new Float32Array(left.length);
  const outRight = new Float32Array(left.length);
  stage.run(
    left,
    right,
    outLeft,
    outRight,
    at.reach,
    at.span,
    at.odds,
    at.edge,
    at.stray,
    Float32Array.from([at.gate]),
  );
  return { outLeft, outRight };
};

/** A sine at `hz`, a block long. */
const tone = (hz: number, length: number, amplitude = 0.5) =>
  Float32Array.from({ length }, (_, i) => amplitude * Math.sin((2 * Math.PI * hz * i) / RATE));

const AT = { reach: 0.05, span: 0.02, odds: 1, gate: 1, edge: 0.001, stray: 0 };

describe("the stage", () => {
  it("writes the input straight back out at a gate of nothing", () => {
    // The presence this entry declares, held in the one place it is decided: the blend is in the
    // kernel, so a gate of nought has to be the untouched input and not merely a quiet window.
    const left = tone(220, 4096);
    const right = tone(330, 4096);
    const { outLeft, outRight } = through(new scatter.ScatterStage(RATE), left, right, {
      ...AT,
      gate: 0,
    });
    for (let i = 0; i < left.length; i++) {
      expect(outLeft[i]).toBeCloseTo(left[i] ?? 0, 12);
      expect(outRight[i]).toBeCloseTo(right[i] ?? 0, 12);
    }
  });

  it("writes the input straight back out when no window is ever taken", () => {
    // The other end of Odds, which is not the presence and is still a floor that has to be a
    // no-op: a run that never opens a window is the signal passing through.
    const left = tone(220, 4096);
    const { outLeft } = through(new scatter.ScatterStage(RATE), left, left, { ...AT, odds: 0 });
    for (let i = 0; i < left.length; i++) expect(outLeft[i]).toBeCloseTo(left[i] ?? 0, 12);
  });

  it("plays a piece of what it heard rather than what is passing through", () => {
    // The whole effect, and the one thing that says this is a capture rather than a gate: the
    // stage is fed a tone and then silence, and what comes out of the silence is the tone again.
    const stage = new scatter.ScatterStage(RATE);
    const at = { ...AT, reach: 0.05, span: 0.05, edge: 0.001, odds: 1 };
    const heard = tone(733, RATE / 10);
    through(stage, heard, heard, at);
    const hush = new Float32Array(RATE / 10);
    const { outLeft } = through(stage, hush, hush, at);
    let loudest = 0;
    for (const sample of outLeft) loudest = Math.max(loudest, Math.abs(sample));
    // The input for this whole block is silence, so anything at all is the capture sounding.
    expect(loudest).toBeGreaterThan(0.2);
  });
});

describe("the stage's own past", () => {
  it("takes every window from exactly as far back as Reach says", () => {
    // What Reach means, read off the output rather than off the trigger: with nothing drawn, every
    // sample the stage writes is somewhere between what is passing through and what passed through
    // `reach` ago, and nowhere else. A window taken from any other distance would put a third
    // signal in here, and one that read at its own speed would slide between the two.
    const stage = new scatter.ScatterStage(RATE);
    const at = { ...AT, reach: 0.05, span: 0.05, edge: 0.001, odds: 1, stray: 0 };
    const back = Math.round(at.reach * RATE);
    const heard = tone(733, RATE / 2);
    const { outLeft } = through(stage, heard, heard, at);
    let widest = 0;
    // Past the capture's own filling: a window opened before the stage had heard `reach` of
    // anything is taken from as far back as it had, which is the one honest answer to a past that
    // is not there yet.
    for (let i = back * 2; i < heard.length; i++) {
      const dry = heard[i] ?? 0;
      const piece = heard[i - back] ?? 0;
      if (Math.abs(piece - dry) < 0.05) continue;
      const blend = ((outLeft[i] ?? 0) - dry) / (piece - dry);
      expect(blend, `sample ${i}`).toBeGreaterThan(-1e-5);
      expect(blend, `sample ${i}`).toBeLessThan(1 + 1e-5);
      widest = Math.max(widest, blend);
    }
    // And the gate does reach the whole way open somewhere, so the bound above is a bound on
    // something rather than on a stage that never opened at all.
    expect(widest).toBeGreaterThan(0.99);
  });
});

describe("the top of Reach", () => {
  it("still plays a piece of the past there", () => {
    // The one extreme this entry advertises — "up to the whole capture" — and the one distance at
    // which a circular buffer wraps a full lap back onto the sample being written. A stage run at
    // a rate low enough for four seconds to be a short array, so the capture fills and then some,
    // and what a window plays after that is the oldest sample there is rather than the newest one
    // again.
    const slow = 4000;
    const stage = new scatter.ScatterStage(slow);
    // Aperiodic, so a piece taken from any distance is unlike the sample beside it.
    const heard = Float32Array.from(
      { length: slow * 5 },
      (_, i) => 0.4 * Math.sin(i / 17.3) + 0.4 * Math.sin(i / 4.1),
    );
    const outLeft = new Float32Array(heard.length);
    const outRight = new Float32Array(heard.length);
    stage.run(heard, heard, outLeft, outRight, 4, 0.05, 1, 0.001, 0, Float32Array.from([1]));
    // One short of the buffer's own length is the whole of what it can address.
    const back = stage.length - 1;
    let widest = 0;
    // Past the point the capture is full, and past the longest window opened before it was.
    for (let i = stage.length + Math.round(0.05 * slow); i < heard.length; i++) {
      const dry = heard[i] ?? 0;
      const piece = heard[i - back] ?? 0;
      if (Math.abs(piece - dry) < 0.05) continue;
      const blend = ((outLeft[i] ?? 0) - dry) / (piece - dry);
      expect(blend, `sample ${i}`).toBeGreaterThan(-1e-5);
      expect(blend, `sample ${i}`).toBeLessThan(1 + 1e-5);
      widest = Math.max(widest, blend);
    }
    // Wrapped a whole lap this reads 0: every window replays the sample it is standing on, and
    // the top of Reach is the effect turned off.
    expect(widest).toBeGreaterThan(0.99);
  });
});

describe("the stage's two channels", () => {
  it("keeps the two channels on one window, so the image does not move", () => {
    // One trigger over the pair rather than one per channel: a stage that drew twice would open a
    // window on the left that the right was not in, which is the image jumping every time one
    // opened.
    const stage = new scatter.ScatterStage(RATE);
    const left = tone(220, 8192);
    const right = tone(220, 8192, 0.25);
    const { outLeft, outRight } = through(stage, left, right, { ...AT, stray: 0.5 });
    for (let i = 0; i < left.length; i++) {
      // Both channels carry the same signal at two sizes, so whatever the window does to one it
      // does to the other in the same proportion.
      expect(outRight[i], `sample ${i}`).toBeCloseTo((outLeft[i] ?? 0) / 2, 6);
    }
  });

  it("draws the same run from the same seed", () => {
    // A render is a spec: nothing here reads Math.random(), so two stages given one signal are
    // one signal out (0068).
    const left = tone(311, 8192);
    const one = through(new scatter.ScatterStage(RATE), left, left, { ...AT, stray: 0.7 });
    const two = through(new scatter.ScatterStage(RATE), left, left, { ...AT, stray: 0.7 });
    expect([...one.outLeft]).toEqual([...two.outLeft]);
  });
});

describe("the a-rate gate", () => {
  it("reads the blend per sample when the parameter arrives as a block", () => {
    // The whole reason `scatter.gate` is a-rate and this stage blends in its own kernel (0209): a
    // fade laid on the presence has to be read once per sample, not once per 128-frame block.
    const left = tone(220, 4096);
    const at = [AT.reach, AT.span, AT.odds, AT.edge, AT.stray] as const;
    const blend = Float32Array.from({ length: 4096 }, (_, i) => i / 4095);
    const run = (gate: Float32Array) => {
      // The gate reaches the blend and nothing else, so all three of these stages stand in the
      // same place after the block they are warmed with: one past, three readings of it.
      const stage = new scatter.ScatterStage(RATE);
      through(stage, left, left, { ...AT, gate: 0 });
      const outLeft = new Float32Array(4096);
      const outRight = new Float32Array(4096);
      stage.run(left, left, outLeft, outRight, ...at, gate);
      return outLeft;
    };
    const dry = run(Float32Array.from([0]));
    const wet = run(Float32Array.from([1]));
    const mixed = run(blend);
    for (let i = 0; i < 4096; i++) {
      const want = (dry[i] ?? 0) + ((wet[i] ?? 0) - (dry[i] ?? 0)) * (blend[i] ?? 0);
      expect(mixed[i], `sample ${i}`).toBeCloseTo(want, 6);
    }
  });
});

describe("the scatter processor's parameter descriptors", () => {
  it("declares each of the plugin's parameters at the plugin's own range", () => {
    // Every bound is written twice — once as the declaration the knob, the automation lane and the
    // session read, once as a descriptor the AudioParam clamps to. A descriptor whose maximum sat
    // under the declaration would make the knob read past what is heard, silently — and the top of
    // Reach is the capture's own length, so this is also what pins the two copies of that.
    const descriptors = scatter.ScatterGrains.parameterDescriptors;
    for (const declared of scatterEffect.params) {
      const descriptor = descriptors.find(({ name }) => name === declared.id);
      expect(descriptor, `the processor declares no ${declared.id}`).toEqual({
        name: declared.id,
        minValue: declared.min,
        maxValue: declared.max,
        defaultValue: declared.default,
        // The gate is the one value read per sample rather than per block: it is this entry's own
        // presence, and an automator fades a whole effect in on it (0202, 0209).
        automationRate: declared.id === "scatter.gate" ? "a-rate" : "k-rate",
      });
    }
    expect(descriptors.length).toBe(scatterEffect.params.length);
    // And the capture is as long as Reach says it may be: the processor's own CAPTURE_SECS is the
    // top of that knob, which is what "up to the whole capture" means.
    const reach = scatterEffect.params.find(({ id }) => id === "scatter.reach");
    expect(reach?.max).toBe(scatter.CAPTURE_SECS);
  });
});
