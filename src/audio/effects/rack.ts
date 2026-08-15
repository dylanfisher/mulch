/**
 * @role An ordered effect graph with stable input, O(1) parameter routing, bypass, removal,
 *   reorder, reconnection, and disposal — the one rack every deck's chain performs through.
 * @instead What a rack operation does to the session → src/app/execute.ts. Nothing here knows
 *   about decks, commands or events; every method is a rewire that either takes or throws (0023).
 */
import type { ParamId } from "@/audio/params";
import type { EffectInstance } from "./contract";
import { effectById, effectForParam, type EffectId, type EffectParamId } from "./registry";

export type EffectRack = {
  input: AudioNode;
  add(effect: EffectId, values: Readonly<Record<ParamId, number>>): number;
  /**
   * Take an active effect out of the signal path, or put it back. Its instance is kept either
   * way, so its parameter bindings stay live and unbypassing allocates nothing (0023).
   */
  setBypass(effect: EffectId, bypassed: boolean): void;
  /** Unwire an active effect, then dispose it. A refused rewire disposes nothing. */
  remove(effect: EffectId): void;
  /** Rewire the rack into `order`, which must be a permutation of the effects it already holds. */
  reorder(order: readonly EffectId[]): void;
  setParam(param: EffectParamId, value: number, when: number): void;
  reconnect(): void;
  dispose(): void;
};

// The closure owns the rack's order and instance map; splitting it would expose the invariants
// reconnection and disposal exist to keep together (0007).
// oxlint-disable-next-line max-lines-per-function
export function createEffectRack(ctx: BaseAudioContext, destination: AudioNode): EffectRack {
  const input = ctx.createGain();
  let order: EffectId[] = [];
  const instances = new Map<EffectId, EffectInstance<EffectParamId>>();
  /** Built, parameterised and held — just not a link in the chain below (0023). */
  const bypassed = new Set<EffectId>();

  const reconnect = (): void => {
    input.disconnect();
    for (const instance of instances.values()) instance.output.disconnect();

    let tail: AudioNode = input;
    for (const id of order) {
      const instance = instances.get(id);
      if (instance === undefined) throw new Error(`rack is missing effect instance: ${id}`);
      if (bypassed.has(id)) continue;
      tail.connect(instance.input);
      tail = instance.output;
    }
    tail.connect(destination);
  };

  /** Rewire, or put the rack back the way it was and say why it could not be (0023). */
  const rewire = (restore: () => void): void => {
    try {
      reconnect();
    } catch (error) {
      restore();
      reconnect();
      throw error;
    }
  };

  const active = (id: EffectId): EffectInstance<EffectParamId> => {
    const instance = instances.get(id);
    if (instance === undefined) throw new Error(`effect is not active: ${id}`);
    return instance;
  };

  reconnect();

  return {
    input,
    add: (id, values) => {
      if (instances.has(id)) throw new Error(`effect already active: ${id}`);
      const plugin = effectById(id);
      const instance = plugin.build(ctx, values);
      instances.set(id, instance);
      order.push(id);
      try {
        reconnect();
      } catch (error) {
        order.pop();
        instances.delete(id);
        instance.dispose();
        reconnect();
        throw error;
      }
      return order.length - 1;
    },
    setBypass: (id, off) => {
      active(id);
      if (bypassed.has(id) === off) return;
      if (off) bypassed.add(id);
      else bypassed.delete(id);
      rewire(() => {
        if (off) bypassed.delete(id);
        else bypassed.add(id);
      });
    },
    remove: (id) => {
      const instance = active(id);
      const previous = order;
      const wasBypassed = bypassed.has(id);
      // Its output leaves the graph here rather than in reconnect(), which only knows the
      // instances the rack still holds — an unremoved edge would keep feeding the next effect.
      instance.output.disconnect();
      order = order.filter((current) => current !== id);
      instances.delete(id);
      bypassed.delete(id);
      rewire(() => {
        order = previous;
        instances.set(id, instance);
        if (wasBypassed) bypassed.add(id);
      });
      instance.dispose();
    },
    reorder: (next) => {
      if (
        next.length !== order.length ||
        next.some((id) => !instances.has(id)) ||
        new Set(next).size !== next.length
      ) {
        throw new Error(`rack order is not a permutation of its effects: ${next.join(",")}`);
      }
      const previous = order;
      order = [...next];
      rewire(() => {
        order = previous;
      });
    },
    setParam: (param, value, when) => {
      const instance = instances.get(effectForParam(param));
      instance?.setParam(param, value, when);
    },
    reconnect,
    dispose: () => {
      input.disconnect();
      for (const instance of instances.values()) instance.dispose();
      instances.clear();
      bypassed.clear();
      order = [];
    },
  };
}
