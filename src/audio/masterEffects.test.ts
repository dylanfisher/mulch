/**
 * @role The clock the rack that is no yard's keeps: when it starts arming ahead, when it stops,
 *   and the two moments a rack with no transport under it has to notice for itself (0321).
 * @instead The graph a rack is → src/audio/effects/rack.test.ts. What the commands at that
 *   address do to the session → src/app/effectMaster.test.ts.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AUTOMATION_REARM_SECS } from "./transport";
import type { HoldEdge } from "./effects/contract";
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
  /** What the rack answers the next `holds` with — a case sets it, the tick hands it up. */
  let asking: HoldEdge[] = [];
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
    holds: (_until, out) => {
      for (const [at, edge] of asking.entries()) out[at] = edge;
      return asking.length;
    },
    holding: () => false,
    resetHolds: () => {},
    setTempo: () => {},
    setParam: () => false,
    endGesture: () => false,
    automationTarget: () => {
      throw new Error("no case here arms a lane against a target");
    },
    reconnect: () => {},
    dispose: () => {},
  };
  return {
    rack,
    calls,
    grows: (now: boolean) => (growing = now),
    asks: (edges: HoldEdge[]) => (asking = edges),
  };
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

    // An add arms at once, so an instance that asks for rests counts its first gap from now
    // (0371), and the tick arms again after it.
    grows(true);
    master.addEffect("auto", "automator", {});
    expect(calls.pumps).toBe(1);
    vi.advanceTimersByTime(TICK_MS);
    expect(calls.pumps).toBe(2);

    // Bypassed: the rack is skipping it, so there is nothing to lay ahead on the tick. Each write
    // still arms once, and the tick only notices at the next write, which is the second add.
    grows(false);
    master.setEffectBypass("auto", true);
    master.addEffect("eq", "eq", {});
    expect(calls.pumps).toBe(4);
    vi.advanceTimersByTime(TICK_MS);
    expect(calls.pumps).toBe(4);

    grows(true);
    master.setEffectBypass("auto", false);
    expect(calls.pumps).toBe(5);
    vi.advanceTimersByTime(TICK_MS);
    expect(calls.pumps).toBe(6);
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
    expect(calls.pumps).toBe(2);

    held.state = "closed";
    vi.advanceTimersByTime(TICK_MS * 4);
    // The first tick after the close is the one that clears the interval, and it arms nothing.
    expect(calls.pumps).toBe(2);
    expect(vi.getTimerCount()).toBe(0);
  });
});

// The rack with no transport hands its asks up whole, on the tick, to whoever the host said (0371).
describe("the rests a rack with no transport asks for", () => {
  it("hands every ask gathered on a tick to the listener, and none on a quiet tick", () => {
    const { rack, grows, asks } = fakeRack();
    const { ctx } = fakeContext();
    const master = createMasterEffects(ctx, rack);
    const heard: (readonly HoldEdge[])[] = [];
    let playing = false;
    master.onHolds(
      (edges) => {
        heard.push([...edges]);
      },
      () => playing,
    );

    grows(true);
    master.addEffect("l1", "lull", {});
    asks([
      { t: "hold", at: 2 },
      { t: "release", at: 3, jump: 0 },
    ]);
    // Nothing plays, so nothing is spent: the same asks are still there for the first yard.
    master.armAutomation();
    expect(heard).toEqual([]);
    playing = true;
    master.armAutomation();
    expect(heard).toEqual([
      [
        { t: "hold", at: 2 },
        { t: "release", at: 3, jump: 0 },
      ],
    ]);
    asks([]);
    master.armAutomation();
    expect(heard).toHaveLength(1);
  });
});
