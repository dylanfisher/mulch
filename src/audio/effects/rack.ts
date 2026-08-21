/**
 * @role An ordered graph of effect instances with stable input, O(1) parameter routing, bypass,
 *   removal, reorder, reconnection, and disposal — the one rack every deck's chain performs
 *   through. A rack holds any number of instances of one registry entry (0030).
 * @instead What a rack operation does to the session → src/app/execute.ts. Nothing here knows
 *   about decks, commands or events; every method is a rewire that either takes or throws (0023).
 */
import { PARAMS, type EffectParamValues } from "@/audio/params";
import type { EffectInstance, EffectInstanceId } from "./contract";
import { effectById, type EffectId, type EffectParamId } from "./registry";

export type EffectRack = {
  input: AudioNode;
  /** Build one instance of `effect` under the caller's own opaque id, at the end of the order. */
  add(instance: EffectInstanceId, effect: EffectId, values: EffectParamValues): number;
  /**
   * Take a held instance out of the signal path, or put it back. Its nodes are kept either way,
   * so its parameter bindings stay live and unbypassing allocates nothing (0023).
   */
  setBypass(instance: EffectInstanceId, bypassed: boolean): void;
  /** Unwire a held instance, then dispose it. A refused rewire disposes nothing. */
  remove(instance: EffectInstanceId): void;
  /** Rewire the rack into `order`, which must be a permutation of the instances it holds. */
  reorder(order: readonly EffectInstanceId[]): void;
  /** The value lookup is the pair: which instance, and which of its plugin's parameters (0030). */
  setParam(instance: EffectInstanceId, param: EffectParamId, value: number, when: number): void;
  /**
   * The hand let go: every instance holding a rebuild does it now, once. See `owing` below.
   */
  endGesture(): void;
  /**
   * The bound AudioParam a held instance's automatable parameter moves. Throws when the rack does
   * not hold that instance, or when the plugin declared automation and bound no target (0024).
   */
  automationTarget(instance: EffectInstanceId, param: EffectParamId): AudioParam;
  reconnect(): void;
  dispose(): void;
};

// The closure owns the rack's order and instance map; splitting it would expose the invariants
// reconnection and disposal exist to keep together (0007).
// oxlint-disable-next-line max-lines-per-function
export function createEffectRack(ctx: BaseAudioContext, destination: AudioNode): EffectRack {
  const input = ctx.createGain();
  let order: EffectInstanceId[] = [];
  const instances = new Map<EffectInstanceId, EffectInstance<EffectParamId>>();
  /** Built, parameterised and held — just not a link in the chain below (0023). */
  const bypassed = new Set<EffectInstanceId>();
  /**
   * The instances holding a `rebuild` move that has not been built yet, and the (instance,
   * parameter) the last move of any kind was about. A run of moves on the same pair is a drag: it
   * is built at its first and again at `endGesture`, and not in between. A move that continues
   * nothing is built where it arrives, so a value from a restoration, a clip or the wire is never
   * left waiting for a hand that is not coming (principle 5, 0090).
   */
  const owing = new Set<EffectInstanceId>();
  let lastMove: string | null = null;

  /** Pay for what an instance is holding, or say the plugin declared what it did not bind. */
  const build = (id: EffectInstanceId): void => {
    if (!owing.delete(id)) return;
    const instance = instances.get(id);
    if (instance === undefined) return;
    if (instance.endGesture === undefined) {
      throw new Error(`effect declares a rebuild parameter and binds no endGesture: ${id}`);
    }
    instance.endGesture();
  };

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

  const held = (id: EffectInstanceId): EffectInstance<EffectParamId> => {
    const instance = instances.get(id);
    if (instance === undefined) throw new Error(`effect instance is not held: ${id}`);
    return instance;
  };

  reconnect();

  return {
    input,
    add: (id, effect, values) => {
      if (instances.has(id)) throw new Error(`effect instance already held: ${id}`);
      const plugin = effectById(effect);
      // The caller's values are exactly this plugin's declared parameters — `effectParamDefaults`
      // mints them and the stored-shape validator proves them. No union can say so for a rack
      // that holds instances of different registry entries (0030).
      // oxlint-disable-next-line no-unsafe-type-assertion
      const instance = plugin.build(ctx, values as Readonly<Record<EffectParamId, number>>);
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
      held(id);
      if (bypassed.has(id) === off) return;
      if (off) bypassed.add(id);
      else bypassed.delete(id);
      rewire(() => {
        if (off) bypassed.delete(id);
        else bypassed.add(id);
      });
    },
    remove: (id) => {
      const instance = held(id);
      const previous = order;
      const wasBypassed = bypassed.has(id);
      // Its output leaves the graph here rather than in reconnect(), which only knows the
      // instances the rack still holds — an unremoved edge would keep feeding the next effect.
      instance.output.disconnect();
      order = order.filter((current) => current !== id);
      instances.delete(id);
      bypassed.delete(id);
      // A rebuild owed by an instance that has gone is owed to nothing: it leaves with it.
      owing.delete(id);
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
        throw new Error(`rack order is not a permutation of its instances: ${next.join(",")}`);
      }
      const previous = order;
      order = [...next];
      rewire(() => {
        order = previous;
      });
    },
    // O(1) and no longer a registry question: the instance is named, so nothing has to work out
    // which of two delays a `delay.time` belongs to (0030).
    setParam: (id, param, value, when) => {
      held(id).setParam(param, value, when);
      const move = `${id}\u0000${param}`;
      const continues = move === lastMove;
      lastMove = move;
      if (PARAMS[param].rebuild !== true) return;
      owing.add(id);
      if (!continues) build(id);
    },
    endGesture: () => {
      // `build` deletes the id it just paid for, which a Set iteration takes in its stride.
      for (const id of owing) build(id);
      lastMove = null;
    },
    automationTarget: (id, param) => {
      const target = held(id).automationTarget?.(param);
      if (target === undefined) throw new Error(`effect binds no automation target: ${param}`);
      return target;
    },
    reconnect,
    dispose: () => {
      input.disconnect();
      for (const instance of instances.values()) instance.dispose();
      instances.clear();
      bypassed.clear();
      owing.clear();
      lastMove = null;
      order = [];
    },
  };
}
