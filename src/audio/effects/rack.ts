/**
 * @role An ordered graph of effect instances with stable input, O(1) parameter routing, bypass,
 *   removal, reorder, reconnection, and disposal — the one rack every deck's chain performs
 *   through. A rack holds any number of instances of one registry entry (0030).
 * @instead What a rack operation does to the session → src/app/execute.ts. Nothing here knows
 *   about decks, commands or events; every method is a rewire that either takes or throws (0023).
 */
// Type-only, and deliberately so: `params.ts` reads this directory's own registry at module scope,
// so a *value* import from here closes the loop registry → automator → rack → params → registry and
// the whole graph throws at load in the TDZ (0203). What this file needed from it was one lookup,
// which the plugin it already holds can answer instead.
import type { EffectParamValues } from "@/audio/params";
import type { GrowthBounds } from "@/lib/effectGrowth";
import type {
  Effect,
  EffectInstance,
  EffectInstanceId,
  GrownEffect,
  ParamDeclaration,
} from "./contract";
// Types only, and for the same reason `params.ts` above is: this file is reached from inside the
// registry — an automator holds a rack of its own — so a value import from it closes the loop and
// the whole graph throws in the TDZ at load. What the rack needed from it was one lookup, and the
// caller doing the lookup already holds its result (0203).
import type { EffectParamId } from "./registry";

export type EffectRack = {
  input: AudioNode;
  /**
   * Build one instance of `plugin` under the caller's own opaque id, at the end of the order. The
   * plugin itself rather than its id: whoever is adding has already looked it up, and this file
   * may not reach the registry to do so — see the import note above.
   */
  add(instance: EffectInstanceId, plugin: Effect, values: EffectParamValues): number;
  /**
   * Take a held instance out of the signal path, or put it back. Its nodes are kept either way,
   * so its parameter bindings stay live and unbypassing allocates nothing (0023).
   */
  setBypass(instance: EffectInstanceId, bypassed: boolean): void;
  /** Unwire a held instance, then dispose it. A refused rewire disposes nothing. */
  remove(instance: EffectInstanceId): void;
  /** Rewire the rack into `order`, which must be a permutation of the instances it holds. */
  reorder(order: readonly EffectInstanceId[]): void;
  /**
   * What every instance in the signal path whose plugin exposes one is reading right now, written
   * into `out` keyed by instance id and refilled in place — a reading and never a setting, asked
   * per frame and gone (`meter`, ./contract.ts). An instance whose plugin exposes none, and one
   * the rack is skipping, are both absent rather than zero: nothing is metering them, which is
   * not the same fact as a meter reading nothing.
   */
  meters(out: Map<EffectInstanceId, number>): void;
  /**
   * Advance every instance in the signal path that grows something of its own, up to
   * `now + horizon`. Skips a bypassed one: the switch means "not running", and a rack that went on
   * growing behind it would come back holding a population nobody heard arrive (0023, 0204).
   */
  pump(now: number, horizon: number): void;
  /**
   * What each instance that holds something is holding, keyed by instance and refilled in place —
   * and, in the same walk and keyed the same way, how long each such run is being held still
   * (0215). One pass rather than two: both are the same per-frame read of the same instances, and
   * a second walk of the rack sixty times a second is the allocation-free read paying twice (0070).
   */
  growth(rows: Map<EffectInstanceId, GrownEffect[]>, waits: Map<EffectInstanceId, number>): void;
  /** The shared clock, handed to every instance that paces itself by it. */
  setSync(sync: number | null): void;
  /**
   * The windows a hand has put on what one held instance may draw. Named rather than broadcast,
   * unlike the clock above: a bound belongs to the (instance, run) pair the way a value belongs to
   * (instance, parameter), because a rack may hold two automators bounded differently (0030, 0208).
   * Throws for an instance the rack does not hold; an instance whose plugin draws nothing takes it
   * and does nothing, the way one with no clock to keep takes `setSync`.
   */
  setBounds(instance: EffectInstanceId, bounds: GrowthBounds): void;
  /**
   * One place of what a held instance is growing, let go of by hand. Throws for an instance the
   * rack does not hold, the way `setBounds` above does; answers false where the instance grows
   * nothing, or where the place it names is no longer standing (see `dismiss`, ./contract.ts).
   */
  dismissGrown(instance: EffectInstanceId, place: EffectInstanceId): boolean;
  /** Whether anything held and running has a pump at all — so a deck ticks only where it must. */
  pumping(): boolean;
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
  /** Per instance, the parameters its own plugin declared `rebuild`. Dropped with the instance. */
  const rebuilds = new Map<EffectInstanceId, ReadonlySet<string>>();
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
    add: (id, plugin, values) => {
      if (instances.has(id)) throw new Error(`effect instance already held: ${id}`);
      // The caller's values are exactly this plugin's declared parameters — `effectParamDefaults`
      // mints them and the stored-shape validator proves them. No union can say so for a rack
      // that holds instances of different registry entries (0030).
      // oxlint-disable-next-line no-unsafe-type-assertion
      const instance = plugin.build(ctx, values);
      instances.set(id, instance);
      // Which of this instance's moves are paid for at the end of a gesture, read off the plugin
      // that declared them rather than out of the composed lookup — see the import note above.
      const declared: readonly ParamDeclaration[] = plugin.params;
      rebuilds.set(id, new Set(declared.filter((p) => p.rebuild === true).map((p) => p.id)));
      order.push(id);
      try {
        reconnect();
      } catch (error) {
        order.pop();
        instances.delete(id);
        rebuilds.delete(id);
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
      const wasRebuilds = rebuilds.get(id);
      // Its output leaves the graph here rather than in reconnect(), which only knows the
      // instances the rack still holds — an unremoved edge would keep feeding the next effect.
      instance.output.disconnect();
      order = order.filter((current) => current !== id);
      instances.delete(id);
      rebuilds.delete(id);
      bypassed.delete(id);
      // A rebuild owed by an instance that has gone is owed to nothing: it leaves with it.
      owing.delete(id);
      rewire(() => {
        order = previous;
        instances.set(id, instance);
        if (wasRebuilds !== undefined) rebuilds.set(id, wasRebuilds);
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
    meters: (out) => {
      // The one statement of which instances have a reading at all, so the fill and the prune
      // below cannot disagree — they are the same fact, and a prune that admitted a key the fill
      // declines would walk the map on every frame forever without deleting it.
      const metering = (id: EffectInstanceId): boolean =>
        instances.get(id)?.meter !== undefined && !bypassed.has(id);
      // Refilled, never cleared, for the reason the deck's own automation map is: `Map.clear()`
      // throws its backing table away on the one read every surface makes every frame (0070).
      let metered = 0;
      for (const [id, instance] of instances) {
        // A bypassed instance is unwired, so its node is not processed and `reduction` holds the
        // last value it took: it is not working at all, which is not the same fact as working at
        // nothing. It leaves the map while the switch is off, the way its row leaves the picture
        // (0139), and comes back reading live when the switch comes back.
        // `metering` carries the fact; the narrowing test beside it is what makes the call below
        // type — a predicate function cannot narrow the caller's own binding.
        if (!metering(id) || instance.meter === undefined) continue;
        out.set(id, instance.meter());
        metered += 1;
      }
      // Everything metered is now in `out`, so a bigger size is departed instances and nothing
      // else — which is the only case worth walking, exactly as the deck's own lanes are.
      if (out.size === metered) return;
      for (const id of out.keys()) {
        if (!metering(id)) out.delete(id);
      }
    },
    pump: (now, horizon) => {
      for (const [id, instance] of instances) {
        if (bypassed.has(id)) continue;
        instance.pump?.(now, horizon);
      }
    },
    growth: (out, waits) => {
      let holding = 0;
      for (const [id, instance] of instances) {
        if (instance.grown === undefined || bypassed.has(id)) continue;
        // Nought for a run that is not held, so a surface reads one number rather than a presence
        // check: a plugin that grows and cannot be held reports a hold of none.
        waits.set(id, instance.waiting?.() ?? 0);
        // Refilled in place, never replaced: the array per instance is the rack's and outlives the
        // read, the way the meters map is (0070).
        let rows = out.get(id);
        if (rows === undefined) {
          rows = [];
          out.set(id, rows);
        }
        // Overwritten in place, and shortened only on the frame the count actually falls — the
        // rule every scratch a frame reads through is bound by (0070).
        const written = instance.grown(rows);
        if (rows.length !== written) rows.length = written;
        holding++;
      }
      if (out.size === holding && waits.size === holding) return;
      for (const id of out.keys()) {
        const instance = instances.get(id);
        if (instance?.grown === undefined || bypassed.has(id)) out.delete(id);
      }
      for (const id of waits.keys()) {
        const instance = instances.get(id);
        if (instance?.grown === undefined || bypassed.has(id)) waits.delete(id);
      }
    },
    setSync: (sync) => {
      for (const instance of instances.values()) instance.setSync?.(sync);
    },
    setBounds: (id, next) => {
      held(id).setBounds?.(next);
    },
    dismissGrown: (id, place) => held(id).dismiss?.(place) ?? false,
    pumping: () => {
      for (const [id, instance] of instances) {
        if (instance.pump !== undefined && !bypassed.has(id)) return true;
      }
      return false;
    },
    // O(1) and no longer a registry question: the instance is named, so nothing has to work out
    // which of two delays a `delay.time` belongs to (0030).
    setParam: (id, param, value, when) => {
      held(id).setParam(param, value, when);
      const move = `${id}\u0000${param}`;
      const continues = move === lastMove;
      lastMove = move;
      if (rebuilds.get(id)?.has(param) !== true) return;
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
      rebuilds.clear();
      bypassed.clear();
      owing.clear();
      lastMove = null;
      order = [];
    },
  };
}
