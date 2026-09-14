/**
 * @role What a parameter driven by lanes is worth at an instant ahead of the clock — the one thing
 *   no AudioParam answers, and the one thing an effect deciding something at a future instant has
 *   to know (0378). A mirror of the schedule: every cycle a rack lays onto the param is told here
 *   too, each replacing what stood from its origin on, exactly as the param's own schedule is
 *   replaced; a knob move is a cycle of no points at the knob's value. Pure: no clock, no context.
 * @instead The one reading of a lane's points → automationValueAt in src/lib/automation.ts. The
 *   schedule this mirrors → scheduleAutomation in src/audio/ramp.ts. Who is told → the rack's
 *   `setAutomation`, src/audio/effects/rack.ts.
 */
import { type AutomationPoint, automationValueAt } from "./automation.ts";

export type LaneReader = {
  /**
   * One cycle laid from `origin`, replacing everything laid from there on. `now` is how far the
   * clock has got: a cycle wholly behind another that has already begun is forgotten, because
   * nothing is ever read before now.
   */
  lay(lane: readonly AutomationPoint[], base: number, origin: number, now: number): void;
  /** The knob moved: the value from `when` on, until a cycle laid after it. */
  set(value: number, when: number): void;
  /** What the parameter is worth at `at`: the cycle standing there, or the value it was built at. */
  at(at: number): number;
};

type Cycle = { origin: number; lane: readonly AutomationPoint[]; base: number };

export function createLaneReader(initial: number): LaneReader {
  /** Ascending by origin, and never two at one origin. */
  const cycles: Cycle[] = [];

  function lay(lane: readonly AutomationPoint[], base: number, origin: number, now: number): void {
    if (!Number.isFinite(origin)) throw new RangeError(`a cycle is laid on a clock: ${origin}`);
    for (;;) {
      const last = cycles.at(-1);
      if (last === undefined || last.origin < origin) break;
      cycles.pop();
    }
    cycles.push({ origin, lane, base });
    // Drop every cycle whose successor has already begun: what stood before it is nobody's.
    let stale = 0;
    for (;;) {
      const successor = cycles[stale + 1];
      if (successor === undefined || successor.origin > now) break;
      stale++;
    }
    if (stale > 0) cycles.splice(0, stale);
  }

  return {
    lay,
    set: (value, when) => {
      lay([], value, when, when);
    },
    at: (at) => {
      let standing: Cycle | null = null;
      for (const cycle of cycles) {
        if (cycle.origin > at) break;
        standing = cycle;
      }
      if (standing === null) return initial;
      return automationValueAt(standing.lane, at - standing.origin, standing.base);
    },
  };
}
