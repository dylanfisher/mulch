/**
 * @role One deck's automation lanes and the clock they ride: held rather than scheduled on
 *   arrival, frozen where they stand at every halt and carried over the gap at the next play, and
 *   armed ahead of the clock on the deck's own tick (0035, 0040).
 * @instead The transport the clock follows, and the tick that calls `arm` → src/audio/deck.ts.
 *   The master's lanes ride the context clock, which never stops → src/audio/masterEffects.ts.
 */
import { laneSpan, sameGesture, type AutomationPoint } from "@/lib/automation";
import type { DeckChain } from "./chain";
import type { EffectInstanceId } from "./effects/contract";
import { paramKey, type AutomationParamId } from "./params";
import { AUTOMATION_HORIZON_SECS, MAX_AUTOMATION_CYCLES } from "./transport";

type HeldLane = {
  instance: EffectInstanceId | null;
  param: AutomationParamId;
  points: readonly AutomationPoint[];
  base: number;
  /** Its own period: the gesture's length. Zero for a lane that never moved. */
  span: number;
  /** When its counting began, on the lane clock — the instant it was recorded (0035). */
  anchor: number;
  /** The next cycle of this lane to schedule, counted from `anchor`. */
  armed: number;
};

export type DeckLanes = {
  /**
   * The lane clock: the audio clock while the transport is sounding, and the reading it was
   * frozen at while it is not (0040). Never behind the source — inside the lookahead nothing
   * sounds yet, so nothing has advanced, and arming from `currentTime` there would lay a cycle
   * down before the first sample of it could be heard.
   */
  now(): number;
  /**
   * Freeze the lanes where they stand. Every halt comes through here, so the phase a pause is
   * holding is the same phase a stop, a reload or a loop move holds (0040).
   */
  hold(): void;
  /**
   * Carry every lane over the gap the transport was silent for: the anchors move by exactly that
   * gap, so each lane's phase at `at` is the phase the halt froze it at, and cycle counting picks
   * up mid-cycle rather than starting the gesture again (0040).
   */
  release(at: number): void;
  /**
   * Schedule every cycle of every held lane that begins inside the horizon and has not been armed
   * yet. A lane repeats on its own length — the gesture's, not the loop's — from the anchor it
   * has carried since it was recorded, so two lanes of different lengths drift against each other
   * and against the waveform, and the same lane keeps its phase across a loop change, a rate
   * change, a pause and a stop (0035, 0040).
   */
  arm(): void;
  /** Give every automated parameter back to its manual value. What stopping sounds like. */
  reset(): void;
  /** Hold a lane, or let one go when `lane` is empty; either way the chain hears it at once. */
  set(
    instance: EffectInstanceId | null,
    param: AutomationParamId,
    lane: readonly AutomationPoint[],
    base: number,
  ): void;
  /** Every lane this instance held goes with it: a lane belongs to the instance (0030). */
  forget(instance: EffectInstanceId): void;
  size(): number;
  /** Where every lane stands in its own cycle, refilled in place and never cleared (0070). */
  peek(out: Map<string, number>): void;
  clear(): void;
};

/**
 * `planStart` answers when the plan now standing began, or null with no transport up: the lane
 * clock is read off it, and running without one is a bug in the pairing `hold`/`release` keep.
 */
// One closure over one map and one frozen reading: the arming walk and the clock it reads are
// the invariant `hold`/`release` keep, and a helper per method would hand that pair around with
// one caller each (0007).
// oxlint-disable-next-line max-lines-per-function
export function createDeckLanes(
  ctx: BaseAudioContext,
  chain: DeckChain,
  planStart: () => number | null,
): DeckLanes {
  const lanes = new Map<string, HeldLane>();
  /**
   * What the lane clock reads while it is frozen, or null while it runs with the transport. Lane
   * time advances only while the deck sounds: a pause or a stop freezes every lane exactly where
   * it stands and the next play carries it on from there, so the transport moves the waveform
   * and never the gesture (0040). Only `now() - anchor` is ever read, so the number itself means
   * nothing beyond how far apart two readings are.
   */
  let heldAt: number | null = ctx.currentTime;

  function now(): number {
    if (heldAt !== null) return heldAt;
    // The two move together: `halt` is the only place a plan is torn down and it freezes the lane
    // clock, `start` is the only place one is built and it releases it. Running without one is a
    // bug in that pairing, and a silent `currentTime` here would be drift nobody could find.
    const startTime = planStart();
    if (startTime === null) throw new Error("lane clock running with no transport");
    return Math.max(ctx.currentTime, startTime);
  }

  function arm(): void {
    if (planStart() === null || lanes.size === 0) return;
    const from = now();
    for (const lane of lanes.values()) {
      if (lane.span <= 0) {
        // A lane that never moved has no cycle to repeat: one schedule, from here, and no more.
        if (lane.armed > 0) continue;
        lane.armed = 1;
        chain.setAutomation(lane.instance, lane.param, lane.points, lane.base, from);
        continue;
      }
      // The cycle the clock is already inside is the one to arm first, so a lane released
      // mid-cycle is heard from where that cycle has reached rather than at the next one, and a
      // lane that has been held through a long stop never lays its history out again.
      const current = Math.floor((from - lane.anchor) / lane.span);
      if (lane.armed < current) lane.armed = current;
      const wanted = Math.min(
        lane.armed + MAX_AUTOMATION_CYCLES,
        Math.floor((from + AUTOMATION_HORIZON_SECS - lane.anchor) / lane.span) + 1,
      );
      // Ascending, and each cycle replaces only what was scheduled from its own start, so arming
      // the next one never disturbs the one currently sounding.
      for (; lane.armed < wanted; lane.armed++) {
        const origin = lane.anchor + lane.armed * lane.span;
        chain.setAutomation(lane.instance, lane.param, lane.points, lane.base, origin);
      }
    }
  }

  return {
    now,
    hold: () => {
      heldAt ??= now();
    },
    release: (at) => {
      if (heldAt === null) throw new Error("lane clock released twice");
      const gap = at - heldAt;
      for (const lane of lanes.values()) lane.anchor += gap;
      heldAt = null;
    },
    arm,
    reset: () => {
      for (const lane of lanes.values()) {
        lane.armed = 0;
        chain.setParam(lane.instance, lane.param, lane.base, ctx.currentTime);
      }
    },
    set: (instance, param, lane, base) => {
      const key = paramKey(instance, param);
      if (lane.length === 0) {
        lanes.delete(key);
        // Clearing is heard immediately, playing or not: the parameter is back to being the one
        // the performer left the knob at.
        chain.setParam(instance, param, base, ctx.currentTime);
        return;
      }
      // The anchor is the instant the gesture was recorded, on the lane clock, and the lane counts
      // its own cycles from there for as long as it is held — across loop changes, pauses, stops
      // and re-plays, none of which advance it (0035, 0040).
      // The same gesture arriving again is that lane being re-based onto a new manual value or
      // stretched onto a new span, not a new recording: it keeps the phase it is in the middle
      // of, and only its schedule is redrawn (0079).
      const held = lanes.get(key);
      const rebase = held !== undefined && sameGesture(held.points, lane);
      lanes.set(key, {
        instance,
        param,
        points: lane,
        base,
        span: laneSpan(lane),
        anchor: rebase ? held.anchor : now(),
        armed: 0,
      });
      arm();
    },
    forget: (instance) => {
      for (const [key, lane] of lanes) if (lane.instance === instance) lanes.delete(key);
    },
    size: () => lanes.size,
    peek: (out) => {
      // The same clock the arming lays cycles against, so what a surface paints cannot drift from
      // what is scheduled — including inside the lookahead, and while the transport is halted,
      // where it is the phase the lanes are holding and will resume from (0040).
      const at = now();
      // Refilled, never cleared: `Map.clear()` throws its backing table away and allocates a
      // fresh one — 28 bytes a call, measured, on the one read every surface makes every frame
      // (0070). Overwriting a key that is already there allocates nothing, so the only frame
      // that pays is the one where a lane actually went away.
      for (const [key, lane] of lanes) {
        out.set(key, lane.span <= 0 ? 0 : (at - lane.anchor) % lane.span);
      }
      // Every live lane is now in `out`, so `out` holds the lanes and possibly some departed
      // ones — which is exactly what a bigger size means, and the only case worth walking.
      if (out.size !== lanes.size) {
        for (const key of out.keys()) if (!lanes.has(key)) out.delete(key);
      }
    },
    clear: () => {
      lanes.clear();
    },
  };
}
