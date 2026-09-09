/**
 * @role The clock the rack that is no yard's keeps: when it starts arming ahead, when it stops,
 *   and the two moments a rack with no transport under it has to notice for itself (0321).
 * @instead The graph a rack is → src/audio/effects/rack.test.ts. What the commands at that
 *   address do to the session → src/app/effectMaster.test.ts.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AUTOMATION_REARM_SECS } from "./transport";
import type { EffectRack } from "./effects/rack";
import { createMasterEffects } from "./masterEffects";

/**
 * The one node this file needs and never connects: written out at one site with the reason the
 * rack's own fake gives (src/audio/effects/rackFake.ts).
 */
// oxlint-disable-next-line no-unsafe-type-assertion
const NOWHERE = {} as AudioNode;

/** A rack that records what it was asked and answers whatever the case has set on it. */
const fakeRack = () => {
  const calls = { pumps: 0, bypassed: [] as [string, boolean][] };
  let growing = false;
  const rack: EffectRack = {
    input: NOWHERE,
    add: () => 0,
    setBypass: (instance, off) => {
      calls.bypassed.push([instance, off]);
    },
    remove: () => {},
    reorder: () => {},
    held: () => [],
    meters: () => {},
    pump: () => {
      calls.pumps++;
    },
    growth: () => {},
    setSync: () => {},
    setBounds: () => {},
    dismissGrown: () => false,
    pumping: () => growing,
    setParam: () => {},
    endGesture: () => {},
    automationTarget: () => {
      throw new Error("no case here arms a lane against a target");
    },
    reconnect: () => {},
    dispose: () => {},
  };
  return { rack, calls, grows: (now: boolean) => (growing = now) };
};

/**
 * A context whose clock and state a case sets by hand — the two fields this module reads of one.
 * Asserted at one site, the way every fake node above is.
 */
const fakeContext = () => {
  const held = { currentTime: 0, state: "running" as AudioContextState };
  // oxlint-disable-next-line no-unsafe-type-assertion
  const ctx = held as unknown as BaseAudioContext;
  return { held, ctx };
};

const TICK_MS = AUTOMATION_REARM_SECS * 1000;

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

// Two cases and the fake they drive, in one list: both are about the one interval this module
// owns, and the moments it has to notice for itself. See 0007.
// oxlint-disable-next-line max-lines-per-function
describe("the clock a rack with no transport keeps", () => {
  /**
   * A yard reticks on every play and stop, so a bypass it forgot is picked up at the next press.
   * This rack is never played, so the switch is the only thing that can put its one growing
   * instance back in the signal path — and it has to notice.
   */
  it("starts arming again when a bypass puts the only growing instance back", () => {
    const { rack, calls, grows } = fakeRack();
    const { ctx } = fakeContext();
    const master = createMasterEffects(ctx, rack);

    grows(true);
    master.addEffect("auto", "automator", {});
    vi.advanceTimersByTime(TICK_MS);
    expect(calls.pumps).toBe(1);

    // Bypassed: the rack is skipping it, so there is nothing to lay ahead. The tick only notices
    // at the next write, which is what the second add below is.
    grows(false);
    master.setEffectBypass("auto", true);
    master.addEffect("eq", "eq", {});
    vi.advanceTimersByTime(TICK_MS);
    expect(calls.pumps).toBe(1);

    grows(true);
    master.setEffectBypass("auto", false);
    vi.advanceTimersByTime(TICK_MS);
    expect(calls.pumps).toBe(2);
  });

  /**
   * Nothing disposes a master bus and nothing closes an offline context by hand, so a render that
   * has finished would otherwise be pinned by a tick still arming against its clock.
   */
  it("stops itself on a context that has closed", () => {
    const { rack, calls, grows } = fakeRack();
    const { ctx, held } = fakeContext();
    const master = createMasterEffects(ctx, rack);

    grows(true);
    master.addEffect("auto", "automator", {});
    vi.advanceTimersByTime(TICK_MS);
    expect(calls.pumps).toBe(1);

    held.state = "closed";
    vi.advanceTimersByTime(TICK_MS * 4);
    // The first tick after the close is the one that clears the interval, and it arms nothing.
    expect(calls.pumps).toBe(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
