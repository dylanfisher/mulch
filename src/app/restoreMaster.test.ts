/**
 * @role What a restored session does to the rack that is no yard's: rebuild it where it differs,
 *   and leave it standing where it does not (0321).
 * @instead The rest of what a restore prepares — one voice per deck, crossfaded — is inside
 *   `prepareRestore` and needs a real AudioContext; the browser lane drives that.
 */
import { describe, expect, it } from "vitest";

import type { MasterEffects } from "@/audio/masterEffects";
import { effectById } from "@/audio/effects/registry";
import type { SessionEffect } from "@/state/session";
import { restoreMaster } from "./engine";

/**
 * What the rack's input is here: nothing, because a rebuild never touches it. Asserted at one site
 * with the reason the rack's own fake gives — the node is never connected to (src/audio/effects/rackFake.ts).
 */
// oxlint-disable-next-line no-unsafe-type-assertion
const NOWHERE = {} as AudioNode;

const instance = (
  id: string,
  effect: SessionEffect["effect"] = "delay",
  over: Partial<SessionEffect> = {},
): SessionEffect => ({
  id,
  effect,
  bypassed: over.bypassed ?? false,
  params: Object.fromEntries(effectById(effect).params.map((param) => [param.id, param.default])),
  automation: {},
  drawn: {},
  bounds: {},
  ...over,
});

/** A master rack that records what it was asked, and answers with the ids it has been given. */
const fakeMaster = () => {
  const calls: string[] = [];
  let held: string[] = [];
  const master: MasterEffects = {
    input: NOWHERE,
    held: () => [...held],
    setTempo: () => {},
    holding: () => false,
    onHolds: () => {},
    addEffect: (id, effect) => {
      calls.push(`add:${id}:${effect}`);
      held.push(id);
      return held.length - 1;
    },
    removeEffect: (id) => {
      calls.push(`remove:${id}`);
      held = held.filter((current) => current !== id);
    },
    setEffectBounds: (id) => {
      calls.push(`bounds:${id}`);
    },
    setEffectBypass: (id, off) => {
      calls.push(`bypass:${id}:${String(off)}`);
    },
    setAutomation: (id, param) => {
      calls.push(`lane:${id}:${param}`);
    },
    // The rest of the contract, which a rebuild never reaches: written out rather than asserted
    // past, so a method added to the rack fails to compile here instead of being missed.
    setParam: () => {},
    dismissGrown: () => false,
    reorderEffects: () => {},
    endGesture: () => {},
    setSync: () => {},
    armAutomation: () => {},
    peek: () => {},
  };
  return { master, calls, stood: (ids: string[]) => (held = ids) };
};

describe("the master rack under a restored session", () => {
  it("builds the instances the session holds, with their windows, switches and lanes", () => {
    const { master, calls } = fakeMaster();
    restoreMaster(master, [], [instance("one"), instance("two", "eq", { bypassed: true })]);
    expect(calls).toEqual([
      "add:one:delay",
      "bounds:one",
      "add:two:eq",
      "bounds:two",
      "bypass:two:true",
    ]);
  });

  /**
   * A checkpoint is the whole session, so an undo of a knob on one yard reaches this too. There is
   * one master bus, so nothing can be prepared beside it and crossfaded — and a rebuild that ran
   * anyway would cut a master reverb's tail on an edit that was nothing to do with it (0321).
   */
  it("leaves a rack that is already what the session says exactly where it stands", () => {
    const { master, calls, stood } = fakeMaster();
    const held = [instance("one"), instance("two", "eq", { bypassed: true })];
    stood(["one", "two"]);
    restoreMaster(master, held, [instance("one"), instance("two", "eq", { bypassed: true })]);
    expect(calls).toEqual([]);
  });

  it("rebuilds it whole where one value differs, because a rack is compared as one shape", () => {
    const { master, calls, stood } = fakeMaster();
    stood(["one"]);
    const moved = instance("one");
    restoreMaster(
      master,
      [instance("one")],
      [{ ...moved, params: { ...moved.params, "delay.mix": 0.9 } }],
    );
    expect(calls).toEqual(["remove:one", "add:one:delay", "bounds:one"]);
  });
});
