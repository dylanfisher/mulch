/**
 * @role The pop stage's kernels, driven in Node: the two-sided expander's gain, the mid/side pair
 *   the width is scaled through, the bass the side's high-pass keeps, and the sheen's floor — plus
 *   the declaration the processor's descriptors are the other half of.
 * @instead The seam that gets this processor onto a context → src/audio/worklet.test.ts. Nothing
 *   here needs an AudioContext, which is the whole reason these are functions and not methods.
 */
import { beforeAll, describe, expect, it } from "vitest";

import { popEffect } from "@/audio/effects/pop";

// Type-only, and the runtime import is the one in `beforeAll`: importing a processor module for
// real at the top of the file would run `registerProcessor` before the stubs exist.
import type * as Kernels from "./pop.js";

const RATE = 48_000;

let pop: typeof Kernels;

/**
 * A worklet is its own module graph: `AudioWorkletProcessor`, `registerProcessor` and `sampleRate`
 * are globals the browser supplies. Standing them up is what lets the real file — rather than a
 * second copy of its arithmetic — be driven from here (./tape.test.ts stubs the same shape).
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
  pop = await import("./pop.js");
});

describe("expandGain", () => {
  it("is one at the pivot, whatever the lift is asked for", () => {
    // The knob adds range without moving the level: a sample sitting exactly at the level the
    // effect is tracking comes out at the level it went in at, however hard the expander is set.
    for (const lift of [0, 0.25, 0.5, 1]) {
      for (const at of [-60, -24, -6, 0]) {
        expect(pop.expandGain(at, at, lift)).toBeCloseTo(1, 12);
      }
    }
  });

  it("is one at rest, whatever the level is", () => {
    // And a lift of nothing is transparent from either side of the pivot, so the floor of the
    // knob is a no-op rather than a very quiet expander.
    for (const level of [-90, -40, -12, 0, 6]) {
      expect(pop.expandGain(level, -20, 0)).toBeCloseTo(1, 12);
    }
  });

  it("pushes loud up and quiet down around the pivot", () => {
    // Two-sided, which is the whole effect: the same line answers both directions.
    expect(pop.expandGain(-10, -20, 0.5)).toBeGreaterThan(1);
    expect(pop.expandGain(-30, -20, 0.5)).toBeLessThan(1);
  });

  it("clamps at twelve decibels either way", () => {
    // An expander with no ceiling is a runaway and one with no floor is a gate, so both caps hold
    // however far the follower has run from the pivot.
    const ceiling = 10 ** (pop.MAX_LIFT_DB / 20);
    expect(pop.expandGain(200, -20, 1)).toBeCloseTo(ceiling, 12);
    expect(pop.expandGain(-200, -20, 1)).toBeCloseTo(1 / ceiling, 12);
    // And the cap is the bound rather than a soft knee: past it the answer stops moving.
    expect(pop.expandGain(400, -20, 1)).toBeCloseTo(pop.expandGain(200, -20, 1), 12);
  });
});

describe("widthPair", () => {
  it("is identity at a width of one", () => {
    for (const [left, right] of [
      [0.4, -0.2],
      [-1, 1],
      [0.1, 0.1],
    ]) {
      const mid = ((left ?? 0) + (right ?? 0)) * 0.5;
      const side = ((left ?? 0) - (right ?? 0)) * 0.5;
      const pair = pop.widthPair(mid, 0, side, 1);
      expect(pair.left).toBeCloseTo(left ?? 0, 12);
      expect(pair.right).toBeCloseTo(right ?? 0, 12);
    }
  });

  it("is mono at a width of nought", () => {
    const pair = pop.widthPair(0.3, 0, 0.9, 0);
    expect(pair.left).toBeCloseTo(0.3, 12);
    expect(pair.right).toBeCloseTo(0.3, 12);
  });

  it("keeps the bass the side high-pass left below the cut", () => {
    // The low half of the side never reaches the width at all, so a mono width still leaves the
    // body where it was: this is what stops Width from collapsing the low end into the middle.
    const pair = pop.widthPair(0.3, 0.2, 0.9, 0);
    expect(pair.left).toBeCloseTo(0.5, 12);
    expect(pair.right).toBeCloseTo(0.1, 12);
  });
});

describe("sheenAt", () => {
  it("adds nothing at all at an amount of nought", () => {
    for (const band of [-1, -0.3, 0, 0.2, 1]) {
      // `toBeCloseTo` rather than `toBe`, because a signed zero is still nothing added.
      expect(pop.sheenAt(band, 0)).toBeCloseTo(0, 12);
    }
  });

  it("lifts a quiet band and bends a loud one back", () => {
    // Air, not a softener: a high band at the level one actually lives at comes back bigger, and
    // the saturator only takes over once the band is loud. Normalized by the drive rather than by
    // its own tanh, this whole knob was inaudible everywhere a real high band sits.
    expect(pop.sheenAt(0.02, 1)).toBeGreaterThan(0.02);
    expect(pop.sheenAt(-0.02, 1)).toBeLessThan(-0.02);
    // And it is bounded: at the top of the band's own range it has bent all the way back.
    expect(pop.sheenAt(1, 1)).toBeCloseTo(0, 12);
    expect(Math.abs(pop.sheenAt(0.02, 0.5))).toBeLessThan(Math.abs(pop.sheenAt(0.02, 1)));
  });
});

/** One block of a stereo signal through a stage, at the parameters given. */
const through = (
  stage: Kernels.PopStage,
  left: Float32Array,
  right: Float32Array,
  at: { lift: number; snap: number; width: number; sheen: number; mix: number },
) => {
  const outLeft = new Float32Array(left.length);
  const outRight = new Float32Array(left.length);
  stage.run(
    left,
    right,
    outLeft,
    outRight,
    at.lift,
    at.snap,
    at.width,
    at.sheen,
    Float32Array.from([at.mix]),
  );
  return { outLeft, outRight };
};

/** A sine at `hz`, a block long. */
const tone = (hz: number, length: number, amplitude = 0.5) =>
  Float32Array.from({ length }, (_, i) => amplitude * Math.sin((2 * Math.PI * hz * i) / RATE));

describe("the stage", () => {
  it("writes the input straight back out at a mix of nothing", () => {
    // The presence this entry declares, held in the one place it is decided: the crossfade is in
    // the kernel, so a mix of nought has to be the untouched input and not merely a quiet one.
    const left = tone(220, 512);
    const right = tone(330, 512);
    const { outLeft, outRight } = through(new pop.PopStage(RATE), left, right, {
      lift: 1,
      snap: 0.01,
      width: 2,
      sheen: 1,
      mix: 0,
    });
    for (let i = 0; i < left.length; i++) {
      expect(outLeft[i]).toBeCloseTo(left[i] ?? 0, 12);
      expect(outRight[i]).toBeCloseTo(right[i] ?? 0, 12);
    }
  });

  it("leaves a low side alone when width closes and takes a high one away", () => {
    // The reason the side is split rather than scaled whole: at a width of nothing the top of the
    // image collapses to the middle and the bottom of it does not move.
    const at = { lift: 0, snap: 0.01, width: 0, sheen: 0, mix: 1 };
    const spread = (hz: number) => {
      const carrier = tone(hz, 8192);
      // Pure side: the two channels are opposite, so the mid is nothing and every sample is image.
      const right = Float32Array.from(carrier, (value) => -value);
      const { outLeft } = through(new pop.PopStage(RATE), carrier, right, at);
      let kept = 0;
      let sent = 0;
      // The second half only, so the side's own high-pass has settled before anything is counted.
      for (let i = carrier.length / 2; i < carrier.length; i++) {
        kept += (outLeft[i] ?? 0) ** 2;
        sent += (carrier[i] ?? 0) ** 2;
      }
      return Math.sqrt(kept / sent);
    };
    // Well under the 250Hz cut, and well over it.
    expect(spread(40)).toBeGreaterThan(0.8);
    expect(spread(6000)).toBeLessThan(0.1);
  });
});

describe("the stage's first sound", () => {
  it("does not open at the expander's ceiling on the level it first hears", () => {
    // Both followers start at nothing and climb at their own speeds, so without the warm start
    // their ratio opens forty decibels apart on the first sound and the gain is pinned at +12dB
    // for the first tenth of it. That is a step in level every time a Pop is added to a playing
    // yard, and every time a yard sounds again after a rest.
    const stage = new pop.PopStage(RATE);
    const at = { lift: 1, snap: 0.03, width: 1, sheen: 0, mix: 1 };
    // A block of silence first, the way a render's own leading silence is, then the sound.
    through(stage, new Float32Array(512), new Float32Array(512), at);
    const left = tone(733, 512);
    const { outLeft } = through(stage, left, left, at);
    let loudest = 0;
    for (let i = 0; i < left.length; i++) {
      const was = Math.abs(left[i] ?? 0);
      if (was > 0.01) loudest = Math.max(loudest, Math.abs(outLeft[i] ?? 0) / was);
    }
    // Without the warm start this reads 3.98, which is the +12dB clamp itself.
    expect(loudest).toBeLessThan(1.2);
  });
});

describe("the a-rate mix", () => {
  it("reads the blend per sample when the parameter arrives as a block", () => {
    // The whole reason `pop.mix` is a-rate and this stage crossfades in its own kernel (0209): a
    // fade laid on the mix has to be read once per sample, not once per 128-frame block.
    const left = tone(220, 128);
    const right = tone(330, 128);
    const blend = Float32Array.from({ length: 128 }, (_, i) => i / 127);
    const dry = new Float32Array(128);
    const dryRight = new Float32Array(128);
    const wet = new Float32Array(128);
    const wetRight = new Float32Array(128);
    const at = [1, 0.03, 2, 1] as const;
    new pop.PopStage(RATE).run(left, right, dry, dryRight, ...at, Float32Array.from([0]));
    new pop.PopStage(RATE).run(left, right, wet, wetRight, ...at, Float32Array.from([1]));
    const mixed = new Float32Array(128);
    const mixedRight = new Float32Array(128);
    new pop.PopStage(RATE).run(left, right, mixed, mixedRight, ...at, blend);
    for (let i = 0; i < 128; i++) {
      const want = (dry[i] ?? 0) + ((wet[i] ?? 0) - (dry[i] ?? 0)) * (blend[i] ?? 0);
      expect(mixed[i], `sample ${i}`).toBeCloseTo(want, 6);
    }
    // And the ends are the two constants, so the ramp is genuinely a ramp between them.
    expect(mixed[0]).toBeCloseTo(dry[0] ?? 0, 6);
    expect(mixed[127]).toBeCloseTo(wet[127] ?? 0, 6);
  });
});

describe("the pop processor's parameter descriptors", () => {
  it("declares each of the plugin's parameters at the plugin's own range", () => {
    // Every bound is written twice — once as the declaration the knob, the automation lane and the
    // session read, once as a descriptor the AudioParam clamps to. A descriptor whose maximum sat
    // under the declaration would make the knob read past what is heard, silently.
    const descriptors = pop.PopDynamics.parameterDescriptors;
    for (const declared of popEffect.params) {
      const descriptor = descriptors.find(({ name }) => name === declared.id);
      expect(descriptor, `the processor declares no ${declared.id}`).toEqual({
        name: declared.id,
        minValue: declared.min,
        maxValue: declared.max,
        defaultValue: declared.default,
        // The mix is the one value read per sample rather than per block, which is what let this
        // effect crossfade in its own kernel instead of growing a fourth ConstantSource pair
        // outside it (0209).
        automationRate: declared.id === "pop.mix" ? "a-rate" : "k-rate",
      });
    }
    expect(descriptors.length).toBe(popEffect.params.length);
  });
});
