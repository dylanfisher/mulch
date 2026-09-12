/**
 * @role Everything the host may ask of the rack that is no yard's: the same add, bypass, bound,
 *   remove and reorder a voice takes, plus the lane clock a rack with no transport under it needs.
 *   A master instance is heard on the whole session, so nothing here may be silent while a yard is
 *   (0320, 0321).
 * @instead The graph a rack is → src/audio/effects/rack.ts, which this holds one of. A yard's own
 *   rack and the transport its lanes are armed against → src/audio/deck.ts, whose `armLanes`,
 *   `retick` and lane-phase read this is the *second* occurrence of: the clocks genuinely differ,
 *   so nothing is lifted yet, and a third rack arming lanes is where the abstraction is owed
 *   (principle 3, 0321).
 */
import { laneSpan, sameGesture, type AutomationPoint } from "@/lib/automation";
import { AUTOMATION_HORIZON_SECS, AUTOMATION_REARM_SECS, MAX_AUTOMATION_CYCLES } from "./transport";
import type { GrowthBounds } from "@/lib/effectGrowth";
import { asEffectParam } from "./chain";
import { scheduleAutomation } from "./ramp";
import type { EffectRack } from "./effects/rack";
import type { EffectInstanceId, HoldEdge } from "./effects/contract";
import type { DeckPeek } from "./deckPeek";
import { effectById, type EffectId, type EffectParamId } from "./effects/registry";
import { paramKey, type AutomationParamId, type EffectParamValues, type ParamId } from "./params";

/** One lane held against a master instance, and how many of its cycles have been armed. */
type HeldLane = {
  instance: EffectInstanceId;
  param: EffectParamId;
  points: readonly AutomationPoint[];
  base: number;
  span: number;
  anchor: number;
  armed: number;
};

/**
 * The rack that is no yard's, with the clock its lanes ride. Every method a voice offers for a
 * rack, and no method a voice offers for a transport: there is nothing here to play, stop or
 * seek — which is exactly why the lane clock below is the context's own.
 */
export type MasterEffects = {
  /** What the sum of the yards connects into; the rack's own output is already wired on. */
  input: AudioNode;
  /** Every instance the rack is holding, in signal order — what a rebuild has to take away. */
  held(): EffectInstanceId[];
  addEffect(instance: EffectInstanceId, effect: EffectId, values: EffectParamValues): number;
  setEffectBypass(instance: EffectInstanceId, bypassed: boolean): void;
  setEffectBounds(instance: EffectInstanceId, bounds: GrowthBounds): void;
  dismissGrown(instance: EffectInstanceId, place: EffectInstanceId): boolean;
  removeEffect(instance: EffectInstanceId): void;
  reorderEffects(order: readonly EffectInstanceId[]): void;
  setParam(instance: EffectInstanceId, param: ParamId, value: number): void;
  setAutomation(
    instance: EffectInstanceId,
    param: AutomationParamId,
    lane: readonly AutomationPoint[],
    base: number,
  ): void;
  endGesture(): void;
  setSync(sync: number | null): void;
  /**
   * The beat this rack counts on, in bpm, or nought: there is no one tempo under all the yards,
   * so the host hands down the session's shared clock as a beat, or nothing (0097, 0371).
   */
  setTempo(bpm: number): void;
  /** Whether anything running here asks the transport for holds at all. */
  holding(): boolean;
  /**
   * Who hears the rests this rack asks for. A rack with no transport of its own hands every ask
   * up, and the host fans it out to every yard that is playing: one draw, every yard on the same
   * instants (0371). Called on the arming tick with the edges gathered up to the horizon.
   */
  onHolds(listener: (edges: readonly HoldEdge[]) => void): void;
  /** Arm the horizon from wherever the clock stands, for the host that has no interval — the
   *  offline render, which runs with nothing on the main thread listening (0071). */
  armAutomation(): void;
  /**
   * The per-frame read, written into `out`: the four things a card of this rack paints from — each
   * held lane's phase, each instance's meter, what each is growing and how long it is held. The
   * transport half of the read is left at the zero `clearDeckPeek` put there, because a rack that
   * is no yard's has no playhead, no source and no pattern (0070, 0321).
   */
  peek(out: DeckPeek): void;
};

/**
 * The rack it is handed, with a lane clock of its own.
 *
 * **The clock is the context's, and it never stops.** A yard's lanes are armed against its
 * transport and held across every gap that transport is silent for (0040), because a lane on a
 * deck describes something being played. Nothing plays the master: whatever the yards sum to
 * arrives here whenever any of them is sounding, so a master lane rides audio time itself and
 * there is no hold, no release and no phase to carry over a stop.
 */
// One rack's whole lane clock plus the pass-through of every rewire the host may ask for: the
// length tracks how many things a rack does, and the pieces share the one lane map and the one
// interval. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function createMasterEffects(ctx: BaseAudioContext, rack: EffectRack): MasterEffects {
  const lanes = new Map<string, HeldLane>();
  /** The arming tick, running exactly while there is a lane or a run to lay ahead of the clock. */
  let rearm: ReturnType<typeof setInterval> | null = null;
  let onHolds: ((edges: readonly HoldEdge[]) => void) | null = null;
  /** The rack's asks, gathered on the tick and handed up whole (0371). */
  const asks: HoldEdge[] = [];

  /**
   * Every cycle of every held lane that begins inside the horizon and has not been armed yet —
   * the same walk a deck makes over its own lanes, from the one clock this rack has (0035).
   */
  function armLanes(): void {
    const from = ctx.currentTime;
    for (const lane of lanes.values()) {
      if (lane.span <= 0) {
        if (lane.armed > 0) continue;
        lane.armed = 1;
        scheduleAutomation(
          rack.automationTarget(lane.instance, lane.param),
          lane.points,
          lane.base,
          from,
          from,
        );
        continue;
      }
      const current = Math.floor((from - lane.anchor) / lane.span);
      if (lane.armed < current) lane.armed = current;
      const wanted = Math.min(
        lane.armed + MAX_AUTOMATION_CYCLES,
        Math.floor((from + AUTOMATION_HORIZON_SECS - lane.anchor) / lane.span) + 1,
      );
      for (; lane.armed < wanted; lane.armed++) {
        const origin = lane.anchor + lane.armed * lane.span;
        scheduleAutomation(
          rack.automationTarget(lane.instance, lane.param),
          lane.points,
          lane.base,
          origin,
          from,
        );
      }
    }
  }

  /** Both things armed ahead of the clock, on the one tick that keeps them there. */
  function armAhead(): void {
    // A context that has closed is one whose clock will never move again — an offline render that
    // has finished, which nothing disposes and nothing closes by hand (src/app/render.ts). The
    // tick stops itself there, because there is no owner left to stop it: a deck's own tick is
    // cleared when its transport stops sounding, and a rack with no transport under it has no such
    // moment.
    if (ctx.state === "closed") {
      if (rearm !== null) clearInterval(rearm);
      rearm = null;
      return;
    }
    armLanes();
    rack.pump(ctx.currentTime, AUTOMATION_HORIZON_SECS);
    // Gathered on the same horizon the yards lay theirs on, and handed up rather than applied:
    // this rack has no transport, so the host is the one that knows which yards are playing.
    const asked = rack.holds(ctx.currentTime + AUTOMATION_HORIZON_SECS, asks);
    if (asked > 0) onHolds?.(asks.slice(0, asked));
  }

  /**
   * The tick runs exactly while there is something to lay ahead — a lane, or a run that grows.
   * Asked after every write that can change either answer, the bypass included: a rack with no
   * transport under it never reticks on a play or a stop, so a switch is the only thing that can
   * put its one growing instance back in the signal path (0023).
   */
  function retick(): void {
    const wanted = lanes.size > 0 || rack.pumping();
    if (wanted === (rearm !== null)) return;
    if (rearm !== null) clearInterval(rearm);
    rearm = wanted ? setInterval(armAhead, AUTOMATION_REARM_SECS * 1000) : null;
  }

  return {
    input: rack.input,
    held: () => rack.held(),
    // The registry lookup happens here rather than in the rack, which may not reach the registry
    // at all: it is imported from inside it (0203).
    addEffect: (instance, effect, values) => {
      const at = rack.add(instance, effectById(effect), values);
      // The rack it joined may grow, and this one may be the first that does.
      retick();
      return at;
    },
    setEffectBypass: (instance, bypassed) => {
      rack.setBypass(instance, bypassed);
      // The switch is what puts a growing instance back in the signal path, and this rack has no
      // play or stop to notice that at (`retick`).
      retick();
    },
    setEffectBounds: (instance, bounds) => {
      rack.setBounds(instance, bounds);
    },
    dismissGrown: (instance, place) => rack.dismissGrown(instance, place),
    removeEffect: (instance) => {
      // Every lane this instance held goes with it: a lane belongs to the instance, and the
      // instance is gone (0030).
      for (const [key, lane] of lanes) if (lane.instance === instance) lanes.delete(key);
      rack.remove(instance);
      retick();
    },
    reorderEffects: (next) => {
      rack.reorder(next);
    },
    setParam: (instance, param, value) => {
      rack.setParam(instance, asEffectParam(param), value, ctx.currentTime);
    },
    setAutomation: (instance, param, lane, base) => {
      const key = paramKey(instance, param);
      const held = asEffectParam(param);
      if (lane.length === 0) {
        lanes.delete(key);
        // Clearing is heard immediately: the parameter is back to the one the knob was left at.
        rack.setParam(instance, held, base, ctx.currentTime);
        retick();
        return;
      }
      // The same gesture arriving again is that lane re-based or re-spanned, not a new recording:
      // it keeps the phase it is in the middle of and only its schedule is redrawn (0079).
      const standing = lanes.get(key);
      const rebase = standing !== undefined && sameGesture(standing.points, lane);
      lanes.set(key, {
        instance,
        param: held,
        points: lane,
        base,
        span: laneSpan(lane),
        anchor: rebase ? standing.anchor : ctx.currentTime,
        armed: 0,
      });
      armLanes();
      retick();
    },
    endGesture: () => {
      rack.endGesture();
    },
    setSync: (sync) => {
      rack.setSync(sync);
    },
    setTempo: (bpm) => {
      rack.setTempo(bpm);
    },
    holding: () => rack.holding(),
    onHolds: (listener) => {
      onHolds = listener;
    },
    armAutomation: () => {
      armAhead();
    },
    peek: (out) => {
      rack.meters(out.meters);
      rack.growth(out.grown, out.waits);
      // The same clock the arming lays cycles against, so what a surface paints cannot drift from
      // what is scheduled. Refilled and never cleared, for the reason a deck's read is (0070).
      const at = ctx.currentTime;
      for (const [key, lane] of lanes) {
        out.automation.set(key, lane.span <= 0 ? 0 : (at - lane.anchor) % lane.span);
      }
      if (out.automation.size !== lanes.size) {
        for (const key of out.automation.keys()) if (!lanes.has(key)) out.automation.delete(key);
      }
    },
  };
}
