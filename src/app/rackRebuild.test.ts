/**
 * @role That a rack rebuilt is the rack the session says, in the one order a rebuild may use —
 *   and that a Stop pressed on a session already stopped rebuilds every one of them, the yards'
 *   and the one that is no yard's, so no tail outlives it (0390).
 * @instead What a restore does with the same walk, and the comparison that stops it running at
 *   all → src/app/restoreMaster.test.ts. Where the press decides to ask → src/ui/GlobalTransport.test.tsx.
 */
import { describe, expect, it } from "vitest";

import { effectById } from "@/audio/effects/registry";
import type { SessionEffect } from "@/state/session";
import { createSessionStore, patchDeck } from "@/state/store";
import { rebuildRack, silenceRacks, type SilencedRack } from "./rackRebuild";

const instance = (
  id: string,
  effect: SessionEffect["effect"] = "delay",
  over: Partial<SessionEffect> = {},
): SessionEffect => ({
  id,
  effect,
  bypassed: false,
  params: Object.fromEntries(effectById(effect).params.map((param) => [param.id, param.default])),
  automation: {},
  drawn: {},
  laneBounds: {},
  bounds: {},
  ...over,
});

/** A rack that records what it was asked and answers with the ids it is standing with. */
function fakeRack(standing: string[] = []) {
  const calls: string[] = [];
  let held = [...standing];
  const rack = {
    held: () => [...held],
    addEffect: (id: string, effect: string) => {
      calls.push(`add:${id}:${effect}`);
      held.push(id);
      return held.length - 1;
    },
    removeEffect: (id: string) => {
      calls.push(`remove:${id}`);
      held = held.filter((current) => current !== id);
    },
    setEffectBounds: (id: string) => {
      calls.push(`bounds:${id}`);
    },
    setEffectBypass: (id: string, off: boolean) => {
      calls.push(`bypass:${id}:${String(off)}`);
    },
    setAutomation: (
      id: string | null,
      param: string,
      lane: readonly { at: number; value: number }[],
    ) => {
      calls.push(`lane:${String(id)}:${param}:${lane.map((point) => point.value).join(",")}`);
    },
    setSync: (sync: number | null) => {
      calls.push(`sync:${String(sync)}`);
    },
    setTempo: (bpm: number) => {
      calls.push(`tempo:${String(bpm)}`);
    },
  } satisfies SilencedRack & { held(): string[] };
  return { rack, calls };
}

/** A session on a shared clock, with a beat for the yards and the clock's own for the master. */
const CLOCKS = { sync: 2, tempo: (deck: string | null) => (deck === null ? 30 : 90) };

describe("a rack emptied and built again", () => {
  it("takes away what it was holding before it stands anything up", () => {
    const { rack, calls } = fakeRack(["one", "two"]);
    rebuildRack(rack, rack.held(), [instance("one"), instance("two", "eq", { bypassed: true })]);
    expect(calls).toEqual([
      "remove:one",
      "remove:two",
      "add:one:delay",
      "bounds:one",
      "add:two:eq",
      "bounds:two",
      "bypass:two:true",
    ]);
  });

  /** A lane names an instance the rack has to be holding already, so it comes last (0023). */
  it("arms each instance's lanes after every instance is standing", () => {
    const { rack, calls } = fakeRack();
    rebuildRack(
      rack,
      [],
      [instance("one", "delay", { automation: { "delay.mix": [{ at: 0, value: 1 }] } })],
    );
    expect(calls).toEqual(["add:one:delay", "bounds:one", "lane:one:delay.mix:1"]);
  });
});

/**
 * A rebuild is one of the roads to the graph that never sees a command, so a squeeze honoured
 * only in the reducer would come off the moment a Stop, an undo or an import stood a rack up
 * again (0393). Its own block, for the reason every other one here has its own.
 */
describe("a rebuilt lane under its own floor and ceiling", () => {
  it("is armed squeezed into the window its instance holds it inside", () => {
    const { rack, calls } = fakeRack();
    rebuildRack(
      rack,
      [],
      [
        instance("one", "delay", {
          automation: {
            "delay.mix": [
              { at: 0, value: 0 },
              { at: 1, value: 1 },
            ],
          },
          laneBounds: { "delay.mix": { min: 0.25, max: 0.75 } },
        }),
      ],
    );
    expect(calls.at(-1)).toBe("lane:one:delay.mix:0.25,0.75");
  });
});

/**
 * The second Stop's whole job below the seam. Fresh nodes are the only thing a delay line or a
 * reverb cannot ring through — there is no parameter that means "forget what you are holding" —
 * so every rack is torn down and stood back up out of the entries the session already holds.
 */
describe("every rack silenced", () => {
  it("rebuilds each yard's rack and the one that is no yard's, and moves nothing durable", () => {
    const store = createSessionStore();
    store.setState({ master: { effects: [instance("m1", "reverb")] } });
    patchDeck(store, "a", { effects: [instance("a1"), instance("a2", "eq")] });
    const before = JSON.stringify(store.getState());

    const yard = fakeRack(["a1", "a2"]);
    const master = fakeRack(["m1"]);
    silenceRacks(master.rack, [["a", yard.rack]], store.getState(), CLOCKS);

    // The clocks last, because a rack remembers neither and the instances they reach have to be
    // standing: an entry pacing itself by the session's beat would come back at nought (0390).
    expect(yard.calls).toEqual([
      "remove:a1",
      "remove:a2",
      "add:a1:delay",
      "bounds:a1",
      "add:a2:eq",
      "bounds:a2",
      "sync:2",
      "tempo:90",
    ]);
    expect(master.calls).toEqual(["remove:m1", "add:m1:reverb", "bounds:m1", "sync:2", "tempo:30"]);
    expect(JSON.stringify(store.getState())).toEqual(before);
  });

  it("asks a rack holding nothing for nothing, and still asks the master", () => {
    const store = createSessionStore();
    store.setState({ master: { effects: [instance("m1")] } });

    const yard = fakeRack();
    const master = fakeRack(["m1"]);
    silenceRacks(master.rack, [["a", yard.rack]], store.getState(), CLOCKS);

    // Its clock all the same: the rack is standing, and nothing else will push one down at it.
    expect(yard.calls).toEqual(["sync:2", "tempo:90"]);
    expect(master.calls).toEqual(["remove:m1", "add:m1:delay", "bounds:m1", "sync:2", "tempo:30"]);
  });
});
