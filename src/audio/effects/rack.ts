/**
 * @role An ordered effect graph with stable input, O(1) parameter routing, reconnection, and
 *   disposal — the internal rack seam future remove and reorder operations can reuse.
 */
import type { ParamId } from "@/audio/params";
import type { EffectInstance } from "./contract";
import { effectById, effectForParam, type EffectId, type EffectParamId } from "./registry";

export type EffectRack = {
  input: AudioNode;
  add(effect: EffectId, values: Readonly<Record<ParamId, number>>): number;
  setParam(param: EffectParamId, value: number, when: number): void;
  reconnect(): void;
  dispose(): void;
};

// The closure owns the rack's order and instance map; splitting it would expose the invariants
// reconnection and disposal exist to keep together (0007).
// oxlint-disable-next-line max-lines-per-function
export function createEffectRack(ctx: BaseAudioContext, destination: AudioNode): EffectRack {
  const input = ctx.createGain();
  const order: EffectId[] = [];
  const instances = new Map<EffectId, EffectInstance<EffectParamId>>();

  const reconnect = (): void => {
    input.disconnect();
    for (const instance of instances.values()) instance.output.disconnect();

    let tail: AudioNode = input;
    for (const id of order) {
      const instance = instances.get(id);
      if (instance === undefined) throw new Error(`rack is missing effect instance: ${id}`);
      tail.connect(instance.input);
      tail = instance.output;
    }
    tail.connect(destination);
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
    setParam: (param, value, when) => {
      const instance = instances.get(effectForParam(param));
      instance?.setParam(param, value, when);
    },
    reconnect,
    dispose: () => {
      input.disconnect();
      for (const instance of instances.values()) instance.dispose();
      instances.clear();
      order.length = 0;
    },
  };
}
