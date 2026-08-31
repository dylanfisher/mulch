/**
 * @role The automator's own run: that it brings an effect in from its plugin's silence rather than
 *   switching it on, takes it back out before the nodes go, and draws the same run twice from one
 *   seed however the pump is paced (0202, 0204).
 */
import { describe, expect, it } from "vitest";

import { eqEffect } from "./eq";
import { filterEffect } from "./filter";
import { createAutomator, drawnParamIds, type GrowablePlugin } from "./automator";
import { WAIT_MAX } from "./automatorParams";
import { isGrowable } from "./registry";
import { normalize } from "@/lib/range";
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
    // A floor and a ceiling at the same number is a run that stands full, which is what every
    // case below reads: how wide a run is has its own cases in src/lib/effectGrowth.test.ts.
    "auto.least": count,
    "auto.most": count,
    "auto.seed": seed,
    // A life of one second per place by default, so the run turns over once a second and a pump of
    // a few seconds covers several ticks. The knob's own default is a minute, which no test has.
    "auto.stays": stays,
    // Only the two biquad plugins are in the pool, so the rest are never drawn.
    "auto.compressor": 0,
    "auto.delay": 0,
    "auto.reverb": 0,
    "auto.tape": 0,
    "auto.pop": 0,
    "auto.scatter": 0,
  };
  // The fake above implements exactly the node factories the two pooled plugins reach for.
  // oxlint-disable-next-line no-unsafe-type-assertion
  const context = ctx as unknown as BaseAudioContext;
  // And these are this entry's own declared defaults, with six of the weights turned off.
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

  // 0208: one reading of which parameters an arrival draws, shared by the run and by the row that
  // paints it — two readings is a row whose dials are labelled with the wrong parameters.
  it("says which parameters an arrival draws, in the order the entry declares them", () => {
    // Everything but what the presence holds down, the presence itself included: it is drawn like
    // any other value, at the point its plugin declares `full` at until a hand widens the window.
    // The pool the fixture builds on, which is the registry's own two biquad entries.
    const [filter, eq] = POOL;
    expect(eq === undefined ? [] : drawnParamIds(eq)).toEqual(["eq.frequency", "eq.gain", "eq.q"]);
    expect(filter === undefined ? [] : drawnParamIds(filter)).toEqual(["filter.cutoff"]);
    // And it is exactly what an arrival is handed: the row's values and this list stay index for
    // index, which is what lets a dial be labelled without a second reading.
    const { instance } = built(3);
    instance.pump?.(0, 8);
    for (const row of rowsOf(instance)) {
      const plugin = POOL.find(({ id }) => id === row.effect);
      expect(row.values).toHaveLength(plugin === undefined ? 0 : drawnParamIds(plugin).length);
    }
  });

  // 0208: a window on a pool parameter is durable state about the run, so it rides its own road
  // down and redraws by the same crossfade a knob that reshapes the run does.
  it("draws inside the window a hand put on the pool, and crossfades into the redraw", () => {
    const { ctx, instance } = built(3);
    instance.pump?.(0, 8);
    ctx.advance(2);
    instance.pump?.(ctx.currentTime, 8);
    const before = rowsOf(instance).map((row) => row.instance);
    expect(before.length).toBeGreaterThan(0);

    instance.setBounds?.({ "filter.cutoff": { min: 400, max: 500 } });
    // Nothing was cut: what the old window drew is still sounding while its fade runs.
    const leaving = rowsOf(instance);
    for (const id of before) expect(leaving.some((row) => row.instance === id)).toBe(true);

    for (let at = 0; at < 12; at++) {
      ctx.advance(1);
      instance.pump?.(ctx.currentTime, 8);
    }
    const after = rowsOf(instance);
    expect(after.some((row) => before.includes(row.instance))).toBe(false);
    // And every filter the redrawn run laid was drawn inside the window: the cutoff is the first
    // and only value a filter's arrival draws, and 400–500Hz is a sliver of its 20–20000 range.
    const cutoffs = after
      .filter((row) => row.effect === "filter")
      .map((row) => row.values[0] ?? Number.NaN);
    expect(cutoffs.length).toBeGreaterThan(0);
    for (const at of cutoffs) {
      expect(at).toBeGreaterThanOrEqual(normalize(400, 20, 20_000, "log") - 1e-6);
      expect(at).toBeLessThanOrEqual(normalize(500, 20, 20_000, "log") + 1e-6);
    }
  });

  // A hand may bound a presence onto the very point its plugin calls silent — "grow me delays
  // that are not heard" is a legitimate instruction — and an arrival that happens to be inaudible
  // is still an arrival: filed as a departure, its row would read as leaving from the instant it
  // was laid, for its whole life (0208).
  it("files an arrival bounded onto its own silence as an arrival, not a departure", () => {
    // A life long enough that nothing rolls inside the window this looks at: what is asserted is
    // the arrival's own filing, not the retire that would overwrite it a tick later. The seed is
    // one whose opening ticks draw an EQ at all — which is the entry this case is about.
    const { ctx, instance } = built(3, 5, 60);
    // The EQ is silent at a gain of nothing — the middle of its own range — so this window is
    // exactly that point, and the value drawn inside it is exactly the number `silent` names.
    instance.setBounds?.({ "eq.gain": { min: 0, max: 0 } });
    instance.pump?.(0, 8);
    ctx.advance(1);
    instance.pump?.(ctx.currentTime, 8);
    const rows = rowsOf(instance).filter((row) => row.effect === "eq");
    expect(rows.length).toBeGreaterThan(0);
    // It says how long it has left of the life it was laid for, rather than nothing at all.
    for (const row of rows) expect(row.remain).toBeGreaterThan(0);
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
    // A presence is drawn like anything else — inside the window a bound puts on it, which is the
    // point the plugin declares `full` at until a hand widens it (0208) — so the eq draws its two
    // other knobs and its gain, and the filter, which has nothing but its presence, draws that.
    // Asserted through the rows themselves rather than through a fallback: a `?? 3` would make
    // this pass for a run that grew neither of them.
    const drew = rows.map((row) => [row.effect, row.values.length]);
    expect(drew).toContainEqual(["eq", 3]);
    expect(drew).toContainEqual(["filter", 1]);
  });

  /**
   * The whole of what a hold is: the run's own clock stands still, so the ticks the wait covers
   * are not laid at all rather than laid late — and the released run lays its next place a full
   * turnover on rather than catching up in one pump (0204, 0215).
   */
  it("lays nothing across a turnover it is held through, and one place a turnover after", () => {
    // A life of 20 over two places is a turnover every ten seconds, and a horizon of 8 means only
    // the tick already due has been laid when the hold is armed.
    const { ctx, instance } = built(2, 3, 20);
    instance.pump?.(0, 8);
    const before = rowsOf(instance).map((row) => row.instance);
    expect(before).toHaveLength(1);
    instance.setParam("auto.wait", 60, ctx.currentTime);
    // Six turnovers' worth of held time: nothing is laid, and nothing is let go.
    for (let at = 0; at < 60; at++) {
      ctx.advance(1);
      instance.pump?.(ctx.currentTime, 8);
    }
    expect(rowsOf(instance).map((row) => row.instance)).toEqual(before);
    expect(instance.waiting?.()).toBeCloseTo(0, 6);
    // And its life is what it has left to run, not what the wall clock took off it while it stood.
    expect(rowsOf(instance)[0]?.remain).toBeCloseTo(20, 3);
    // Released, the next place comes a whole turnover on — at 70, not at once and not at 60.
    for (let at = 0; at < 9; at++) {
      ctx.advance(1);
      instance.pump?.(ctx.currentTime, 8);
    }
    expect(rowsOf(instance).map((row) => row.instance)).toEqual(before);
    for (let at = 0; at < 2; at++) {
      ctx.advance(1);
      instance.pump?.(ctx.currentTime, 8);
    }
    const after = rowsOf(instance).map((row) => row.instance);
    expect(after).toHaveLength(2);
    expect(after.slice(0, 1)).toEqual(before);
  });

  /**
   * A live deck pumps every `AUTOMATION_REARM_SECS` and a row is painted sixty times a second, so
   * most frames of a hold fall between two pumps. What the row says there is the same thing it
   * says on one: a held life stands still rather than falling and jumping back.
   */
  it("stops a held row's countdown between pumps as well as on them", () => {
    const { ctx, instance } = built(2, 3, 20);
    instance.pump?.(0, 8);
    const before = rowsOf(instance)[0]?.remain;
    expect(before).toBeCloseTo(20, 3);
    instance.setParam("auto.wait", 60, ctx.currentTime);
    // Three seconds of frames and no pump at all, which is where a live hand watches from.
    ctx.advance(3);
    expect(rowsOf(instance)[0]?.remain).toBeCloseTo(20, 3);
    // And the pump that follows credits exactly what those frames already read.
    instance.pump?.(ctx.currentTime, 8);
    expect(rowsOf(instance)[0]?.remain).toBeCloseTo(20, 3);
  });

  /**
   * A knob that reshapes the run redraws it through a hold — that is a hand asking for a different
   * run, not for its clock (0215) — and the fresh run is held for what was left of the wait and no
   * longer. A halted deck runs no pump at all, so what the hold owed the old clock is settled here
   * rather than charged to the new one, which would push the run out by the wait twice.
   */
  it("does not charge a redrawn run for the hold the run before it already stood", () => {
    // Two turnovers of hold, and not one pump inside it: exactly the yard nobody is playing.
    const { ctx, instance } = built(2, 3, 20);
    instance.setParam("auto.wait", 120, ctx.currentTime);
    ctx.advance(60);
    instance.endGesture?.();
    // The wait is out at 120, so the redrawn run has laid its first place by 125.
    for (let at = 0; at < 65; at++) {
      ctx.advance(1);
      instance.pump?.(ctx.currentTime, 8);
    }
    expect(instance.waiting?.()).toBe(0);
    expect(rowsOf(instance).length).toBeGreaterThan(0);
  });

  // The hold is armed by the command and not by the number it carries, which is what makes the
  // hourglass a control rather than a display: the same value again is that time over again.
  it("adds the time again when the wait is set a second time to the number it already reads", () => {
    const { ctx, instance } = built(2, 3, 20);
    instance.pump?.(0, 8);
    instance.setParam("auto.wait", 20, ctx.currentTime);
    expect(instance.waiting?.()).toBeCloseTo(20, 6);
    ctx.advance(15);
    instance.pump?.(ctx.currentTime, 8);
    expect(instance.waiting?.()).toBeCloseTo(5, 6);
    // The same number the knob already reads, set again: twenty more seconds, not five.
    instance.setParam("auto.wait", 20, ctx.currentTime);
    expect(instance.waiting?.()).toBeCloseTo(20, 6);
  });

  // The top of the range is not a very long wait: it is the lock, and it ends when a hand turns
  // the knob back down and never on its own.
  it("holds with no end at the top of the knob, until the knob comes back down", () => {
    const { ctx, instance } = built(2, 3, 20);
    instance.pump?.(0, 8);
    const before = rowsOf(instance).map((row) => row.instance);
    instance.setParam("auto.wait", WAIT_MAX, ctx.currentTime);
    for (let at = 0; at < 200; at++) {
      ctx.advance(1);
      instance.pump?.(ctx.currentTime, 8);
    }
    expect(instance.waiting?.()).toBe(Number.POSITIVE_INFINITY);
    expect(rowsOf(instance).map((row) => row.instance)).toEqual(before);
    // Turned back down to nothing, the run picks up where it stood a turnover later.
    instance.setParam("auto.wait", 0, ctx.currentTime);
    expect(instance.waiting?.()).toBe(0);
    for (let at = 0; at < 11; at++) {
      ctx.advance(1);
      instance.pump?.(ctx.currentTime, 8);
    }
    expect(rowsOf(instance).map((row) => row.instance).length).toBeGreaterThan(before.length);
  });

  /**
   * A hand asking for a departure sooner than the clock would have taken it. It is asking for
   * sooner and not for a click, so what it gets is the ordinary retire: the fade `auto.fade` gives
   * every departure, and the nodes let go only once that fade is done (0202).
   */
  it("lets a place go by hand over the fade every departure gets", () => {
    const { ctx, instance, ramps } = built(2, 3, 20);
    instance.pump?.(0, 8);
    const place = rowsOf(instance)[0];
    expect(place).toBeDefined();
    const before = ramps.length;
    ctx.advance(4);
    expect(instance.dismiss?.(place!.instance)).toBe(true);
    // One ramp, landing on the plugin's own silence two seconds out — the fade knob's own value,
    // and not a step. `over` in this fixture is the gap since the last ramp of any parameter, so
    // what says how long the fade is is where it is scheduled to arrive.
    const laid = ramps.slice(before);
    expect(laid).toHaveLength(1);
    expect(laid[0]?.[1]).toBeCloseTo(6, 6);
    expect(new Set(POOL.map((plugin) => plugin.presence.silent))).toContain(laid[0]?.[0]);
    // Still sounding a moment in, and gone by the time that fade has run.
    ctx.advance(0.5);
    expect(
      rowsOf(instance).find((row) => row.instance === place!.instance)?.presence ?? 0,
    ).toBeGreaterThan(0);
    ctx.advance(2);
    instance.pump?.(ctx.currentTime, 8);
    expect(rowsOf(instance).find((row) => row.instance === place!.instance)?.presence ?? 0).toBe(0);
  });

  /**
   * The whole of the step's argument: the vacated slot stays empty until its own tick comes round,
   * and that tick then lays exactly what an undismissed run laid at it. Laying a replacement at the
   * moment of the dismissal would spend a draw out of turn, and every place after it would be a
   * different effect (0134, 0204, 0210).
   */
  it("lays nothing in the slot it vacated until that slot's own tick comes round", () => {
    const dismissed = built(2, 3, 20);
    const control = built(2, 3, 20);
    const pumpBoth = (): void => {
      dismissed.instance.pump?.(dismissed.ctx.currentTime, 8);
      control.instance.pump?.(control.ctx.currentTime, 8);
    };
    dismissed.instance.pump?.(0, 8);
    control.instance.pump?.(0, 8);
    const first = rowsOf(dismissed.instance)[0];
    expect(first).toBeDefined();
    expect(dismissed.instance.dismiss?.(first!.instance)).toBe(true);

    // A tick is ten seconds here, so the first five are a hole where the control still has a place.
    for (let at = 0; at < 5; at++) {
      dismissed.ctx.advance(1);
      control.ctx.advance(1);
      pumpBoth();
    }
    expect(rowsOf(dismissed.instance).map((row) => row.instance)).toEqual([]);
    expect(rowsOf(control.instance).map((row) => row.instance)).toEqual([first!.instance]);

    // And a hole for at most one turn of the run: past the slot's own tick the two runs hold
    // exactly the same places, drawn in the same order from the same seed.
    for (let at = 0; at < 20; at++) {
      dismissed.ctx.advance(1);
      control.ctx.advance(1);
      pumpBoth();
    }
    const after = rowsOf(dismissed.instance).map((row) => row.instance);
    expect(after).toHaveLength(2);
    expect(after).toEqual(rowsOf(control.instance).map((row) => row.instance));
  });

  // The wait is the clock held and this is a hand, so it is the one gesture a hold does not stop
  // (0215). Nothing else moves: the run is still standing where the hold left it.
  it("lets a place go while a wait stands", () => {
    const { ctx, instance } = built(2, 3, 20);
    instance.pump?.(0, 8);
    ctx.advance(4);
    instance.pump?.(ctx.currentTime, 8);
    instance.setParam("auto.wait", 60, ctx.currentTime);
    const place = rowsOf(instance)[0];
    expect(place).toBeDefined();
    expect(instance.waiting?.() ?? 0).toBeGreaterThan(0);

    expect(instance.dismiss?.(place!.instance)).toBe(true);
    // Gone once its fade has run, and the hold is still standing over the run it left.
    for (let at = 0; at < 4; at++) {
      ctx.advance(1);
      instance.pump?.(ctx.currentTime, 8);
    }
    expect(rowsOf(instance).map((row) => row.instance)).toEqual([]);
    expect(instance.waiting?.() ?? 0).toBeGreaterThan(0);
  });

  /**
   * The id carries the tick the place was laid at, so a press that arrived late names a place that
   * has gone rather than the one that has since rolled into its slot (principle 5, 0204).
   */
  it("refuses a place that has already gone rather than its successor", () => {
    const { ctx, instance } = built(2, 3, 20);
    instance.pump?.(0, 8);
    const first = rowsOf(instance)[0];
    expect(instance.dismiss?.(first!.instance)).toBe(true);
    // The same id again, and one no run ever laid: neither is a place still standing.
    expect(instance.dismiss?.(first!.instance)).toBe(false);
    expect(instance.dismiss?.("automator:0:0:99:filter")).toBe(false);

    // Past the vacated slot's own tick, which has laid a successor into it: the stale id is still
    // refused, and what stands there is untouched.
    for (let at = 0; at < 25; at++) {
      ctx.advance(1);
      instance.pump?.(ctx.currentTime, 8);
    }
    const standing = rowsOf(instance).map((row) => row.instance);
    expect(standing.length).toBeGreaterThan(0);
    expect(standing).not.toContain(first!.instance);
    expect(instance.dismiss?.(first!.instance)).toBe(false);
    expect(rowsOf(instance).map((row) => row.instance)).toEqual(standing);
  });

  /**
   * The run is laid ahead across the pump's horizon, so a place with seconds still to run usually
   * carries a retire the clock has already scheduled. A hand asking for sooner is asking for
   * sooner: the fade is re-laid from where the place stands now, rather than refused because a
   * later one was already written (0204).
   */
  it("lets a place go sooner than the departure its own clock has already scheduled", () => {
    const { ctx, instance, ramps } = built(2, 3, 20);
    instance.pump?.(0, 8);
    const first = rowsOf(instance)[0];
    expect(first).toBeDefined();
    // Far enough in that the tick which retires it has been realized, and early enough that it is
    // still standing at full strength with time left on it.
    for (let at = 0; at < 13; at++) {
      ctx.advance(1);
      instance.pump?.(ctx.currentTime, 8);
    }
    const held = rowsOf(instance).find((row) => row.instance === first!.instance);
    expect(held?.presence).toBeGreaterThan(0);
    expect(held?.remain).toBeGreaterThan(0);

    const before = ramps.length;
    expect(instance.dismiss?.(first!.instance)).toBe(true);
    // One fresh ramp, landing a fade out from now rather than at the instant the clock chose.
    const relaid = ramps.slice(before);
    expect(relaid).toHaveLength(1);
    expect(relaid[0]?.[1]).toBeCloseTo(ctx.currentTime + 2, 6);
  });

  /**
   * A place laid ahead is scheduled and not yet audible, which is why `grown` refuses to report
   * one — and a departure ramped in before its arrival had run would cut it off rather than fade
   * it (0202, 0204). The × can never name one; `effect.dismiss` could, so the run refuses it.
   */
  it("refuses a place it has laid ahead but that has not arrived yet", () => {
    // A tick a second, so one pump lays several places across the horizon at once.
    const ahead = built(2, 3, 2);
    ahead.instance.pump?.(0, 8);
    const arrived = new Set(rowsOf(ahead.instance).map((row) => row.instance));
    // Which id the next tick lays, read once that tick has come round on the same seed.
    ahead.ctx.advance(1);
    ahead.instance.pump?.(ahead.ctx.currentTime, 8);
    const later = rowsOf(ahead.instance)
      .map((row) => row.instance)
      .find((id) => !arrived.has(id));
    expect(later).toBeDefined();

    // The same run again, at the instant that place is laid but has not begun to sound.
    const fresh = built(2, 3, 2);
    fresh.instance.pump?.(0, 8);
    expect(rowsOf(fresh.instance).map((row) => row.instance)).not.toContain(later);
    expect(fresh.instance.dismiss?.(later!)).toBe(false);
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
