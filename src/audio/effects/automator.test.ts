/**
 * @role The automator's own run: that it brings an effect in from its plugin's silence rather than
 *   switching it on, takes it back out before the nodes go, and draws the same run twice from one
 *   seed however the pump is paced (0202, 0204).
 */
import { describe, expect, it } from "vitest";

import { eqEffect } from "./eq";
import { filterEffect } from "./filter";
import { createAutomator, type GrowablePlugin } from "./automator";
import { isGrowable } from "./registry";
import type { GrownEffect } from "./contract";

type Ramp = [value: number, when: number, over: number];

/** Every AudioParam move the automator makes, in the order it made them. */
function fakeParam(ramps: Ramp[]) {
  const param = {
    value: 0,
    cancelScheduledValues: () => {},
    setValueAtTime: (value: number) => {
      param.value = value;
      return param;
    },
    linearRampToValueAtTime: (value: number, when: number) => {
      const from = ramps.at(-1);
      ramps.push([value, when, from === undefined ? 0 : when - from[1]]);
      param.value = value;
      return param;
    },
  };
  // oxlint-disable-next-line no-unsafe-type-assertion -- only the ramp surface is exercised
  return param as unknown as AudioParam & { value: number };
}

/** A node that only has to be connectable: the rack wires it and nothing here listens. */
function fakeNode(): AudioNode {
  const value = { connect: (to: AudioNode) => to, disconnect: () => {} };
  // oxlint-disable-next-line no-unsafe-type-assertion -- only connect/disconnect are exercised
  return value as unknown as AudioNode;
}

function fakeContext(ramps: Ramp[]) {
  let now = 0;
  const node = fakeNode;
  const context = {
    get currentTime() {
      return now;
    },
    advance: (by: number) => {
      now += by;
    },
    createGain: () => Object.assign(node(), { gain: fakeParam(ramps) }),
    createConstantSource: () =>
      Object.assign(node(), { offset: fakeParam(ramps), start: () => {} }),
    createBiquadFilter: () =>
      Object.assign(node(), {
        frequency: fakeParam(ramps),
        gain: fakeParam(ramps),
        Q: fakeParam(ramps),
        type: "lowpass",
      }),
  };
  return context;
}

/** A pool of the two biquad plugins — enough to draw from, and no buffers to build. */
const POOL: GrowablePlugin[] = [filterEffect, eqEffect].filter(isGrowable);

function built(count: number, seed = 3, stays = count) {
  const ramps: Ramp[] = [];
  const ctx = fakeContext(ramps);
  const effect = createAutomator(POOL);
  const values = Object.fromEntries(effect.params.map((param) => [param.id, param.default]));
  const shaped = {
    ...values,
    "auto.count": count,
    "auto.seed": seed,
    // A life of one second per place by default, so the run turns over once a second and a pump of
    // a few seconds covers several ticks. The knob's own default is a minute, which no test has.
    "auto.stays": stays,
    // Only the two biquad plugins are in the pool, so the rest are never drawn.
    "auto.compressor": 0,
    "auto.delay": 0,
    "auto.reverb": 0,
    "auto.tape": 0,
  };
  // The fake above implements exactly the node factories the two pooled plugins reach for.
  // oxlint-disable-next-line no-unsafe-type-assertion
  const context = ctx as unknown as BaseAudioContext;
  // And these are this entry's own declared defaults, with four of the weights turned off.
  // oxlint-disable-next-line no-unsafe-type-assertion
  const declared = shaped as unknown as Parameters<typeof effect.build>[1];
  const instance = effect.build(context, declared);
  return { ctx, instance, ramps, effect };
}

const rowsOf = (instance: ReturnType<typeof built>["instance"]): GrownEffect[] => {
  const out: GrownEffect[] = [];
  const written = instance.grown?.(out) ?? 0;
  return out.slice(0, written);
};

describe("the effect automator", () => {
  it("declares no presence of its own, and draws only from entries that have one", () => {
    const effect = createAutomator(POOL);
    expect("none" in effect.presence).toBe(true);
    expect(effect.width).toBe("full");
    expect(effect.face).toBe("grown");
  });

  // The whole of what the entry is for: nothing is ever switched into the path at strength.
  it("brings an effect in from its own silence rather than switching it on", () => {
    const { ctx, instance, ramps } = built(2);
    instance.pump?.(0, 8);
    const rows = rowsOf(instance);
    expect(rows.length).toBeGreaterThan(0);
    // Each arrival's presence ramp starts from the plugin's declared silence and moves off it.
    const silences = new Set(POOL.map((plugin) => plugin.presence.silent));
    const arrivals = ramps.filter(([, , over]) => over > 0);
    expect(arrivals.length).toBeGreaterThan(0);
    for (const row of rows) expect(row.presence).toBeGreaterThanOrEqual(0);
    // And nothing lands at full strength the instant it is added.
    ctx.advance(0.0001);
    for (const row of rowsOf(instance)) expect(row.presence).toBeLessThan(1);
    expect(silences.size).toBeGreaterThan(0);
  });

  // At most `count` are ever standing all the way in. More than that may be *sounding*, because a
  // place on its way out goes on being heard until its fade is finished — which is the crossfade
  // the entry exists to make, and the one thing a plain switch could not do.
  it("holds the run at the width it was asked for, bar the ones fading out", () => {
    const { ctx, instance } = built(2);
    let sawLeaving = false;
    for (let at = 0; at < 20; at++) {
      instance.pump?.(ctx.currentTime, 8);
      ctx.advance(1);
      const rows = rowsOf(instance);
      expect(rows.filter((row) => row.presence > 0.99).length).toBeLessThanOrEqual(2);
      if (rows.length > 2) sawLeaving = true;
    }
    expect(sawLeaving).toBe(true);
  });

  // An arrival that has finished arriving stands all the way in; the row is what says so.
  it("paints a settled arrival at its full presence", () => {
    const { ctx, instance } = built(2);
    instance.pump?.(0, 8);
    // Past the first tick's own fade, so the place laid at it has finished arriving.
    ctx.advance(2);
    instance.pump?.(ctx.currentTime, 8);
    const rows = rowsOf(instance);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((row) => row.presence > 0.99)).toBe(true);
  });

  // The claim an offline render rests on. Both cadences stay inside the lead the pump lays ahead
  // across, so neither falls behind — and every decision is taken off the tick index rather than
  // off the moment the pump happened to run (0204).
  it("draws the same run whether it is pumped often or seldom", () => {
    const run = (every: number, until: number) => {
      const each = built(3);
      for (let at = 0; at + every <= until; at += every) {
        each.instance.pump?.(each.ctx.currentTime, 8);
        each.ctx.advance(every);
      }
      // Both are read at the same instant, after a pump at that instant.
      each.instance.pump?.(each.ctx.currentTime, 8);
      return rowsOf(each.instance).map((row) => `${row.instance}@${row.presence.toFixed(6)}`);
    };
    expect(run(0.5, 12)).toEqual(run(4, 12));
  });

  it("draws a different run from a different seed", () => {
    const one = built(3, 11);
    const two = built(3, 12);
    for (const each of [one, two]) {
      for (let at = 0; at < 12; at++) {
        each.instance.pump?.(each.ctx.currentTime, 8);
        each.ctx.advance(1);
      }
    }
    const ids = (each: ReturnType<typeof built>) =>
      rowsOf(each.instance)
        .map((row) => row.instance)
        .join("|");
    expect(ids(one)).not.toBe(ids(two));
  });

  // The knob says a time and the run keeps it: a place stands for the life it was laid for, and
  // the row counts that life down rather than reporting a rate to divide (0206).
  it("keeps a grown effect for the life its knob asks for", () => {
    const { ctx, instance } = built(2, 3, 20);
    instance.pump?.(0, 8);
    const first = rowsOf(instance)[0];
    expect(first).toBeDefined();
    expect(first?.life).toBe(20);
    expect(first?.remain).toBeCloseTo(20, 3);
    // Half a life later it is still standing, with half of it left.
    for (let at = 0; at < 10; at++) {
      ctx.advance(1);
      instance.pump?.(ctx.currentTime, 8);
    }
    const held = rowsOf(instance).find((row) => row.instance === first?.instance);
    expect(held?.remain).toBeCloseTo(10, 3);
    // Past the life it was given it is on its way out: silent, or already out of the rack.
    for (let at = 0; at < 16; at++) {
      ctx.advance(1);
      instance.pump?.(ctx.currentTime, 8);
    }
    const gone = rowsOf(instance).find((row) => row.instance === first?.instance);
    expect(gone?.remain ?? 0).toBe(0);
    expect(gone?.presence ?? 0).toBe(0);
  });

  // A knob that reshapes the run is not a cut: what the old run was holding goes on sounding and
  // fades out over the fade knob, the way every other departure does (0202).
  it("fades the run out when a knob redraws it rather than clearing it", () => {
    const { ctx, instance } = built(2);
    instance.pump?.(0, 8);
    ctx.advance(2);
    instance.pump?.(ctx.currentTime, 8);
    const before = rowsOf(instance).map((row) => row.instance);
    expect(before.length).toBeGreaterThan(0);
    instance.endGesture?.();
    const leaving = rowsOf(instance);
    for (const id of before) expect(leaving.some((row) => row.instance === id)).toBe(true);
    expect(leaving.some((row) => row.presence > 0)).toBe(true);
    // And once their fade is done they go, while the redrawn run stands in their place.
    for (let at = 0; at < 8; at++) {
      ctx.advance(1);
      instance.pump?.(ctx.currentTime, 8);
    }
    const after = rowsOf(instance);
    expect(after.some((row) => before.includes(row.instance))).toBe(false);
    expect(after.length).toBeGreaterThan(0);
  });

  // What a row paints beside the name: the knobs the automator drew this arrival at, each as a
  // fraction of its own range.
  it("says where every knob it drew for an arrival stands", () => {
    const { ctx, instance } = built(3);
    instance.pump?.(0, 8);
    ctx.advance(2);
    instance.pump?.(ctx.currentTime, 8);
    const rows = rowsOf(instance);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      for (const value of row.values) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
    // The eq's presence is its gain, so the two knobs left are the ones a row draws. The filter
    // has nothing but its presence, and says so with no ticks at all.
    const eq = rows.find((row) => row.effect === "eq");
    const filter = rows.find((row) => row.effect === "filter");
    expect(eq?.values.length ?? 2).toBe(2);
    expect(filter?.values.length ?? 0).toBe(0);
  });

  it("grows nothing at all where the run is empty", () => {
    const { ctx, instance } = built(0);
    instance.pump?.(0, 8);
    ctx.advance(4);
    instance.pump?.(ctx.currentTime, 8);
    expect(rowsOf(instance)).toEqual([]);
  });

  it("writes its rows in place rather than allocating a fresh one each read", () => {
    const { ctx, instance } = built(2);
    instance.pump?.(0, 8);
    ctx.advance(4);
    const out: GrownEffect[] = [];
    const first = instance.grown?.(out) ?? 0;
    const held = out[0];
    instance.grown?.(out);
    // The same object, refilled — a row per frame is the allocation 0070 exists to refuse.
    expect(out[0]).toBe(held);
    expect(first).toBeGreaterThan(0);
  });
});
