/**
 * @role What the picture's own work costs, for the harness that measures it: one accumulator per
 *   named function, filled only while something is measuring, and the one opening ./scripts/measure
 *   reaches this page through. It counts and it judges nothing (0051); a boolean test at each end
 *   is the whole cost while nobody is measuring, and a filled accumulator is written in place and
 *   never allocated (0070).
 * @instead What one frame of the loop costs, which the debug console already reads →
 *   src/ui/frame.ts, whose `measureFrameCost` is the precedent this follows. A number a slider
 *   moves → src/lib/moireTuning.ts, which this opening also carries: a harness that imports that
 *   module from the page builds a second, empty registry and moves nothing (0375).
 */
import { setTuning, tunings } from "./moireTuning.ts";

/** One measured function: its name, and what it has cost since measuring was turned on. */
export type Cost = {
  readonly name: string;
  calls: number;
  totalMs: number;
  worstMs: number;
};

/** Every declared cost, in the order the modules declaring them were loaded. */
const costs: Cost[] = [];
let measuring = false;

/**
 * Declare one cost, at module level beside the call it times — the shape `tunable()` already uses,
 * and for the same reason: the handle is a property read on the paint path rather than a lookup.
 * A name declared twice is two accumulators a reader cannot tell apart, and throws.
 */
export function cost(name: string): Cost {
  if (costs.some((held) => held.name === name)) {
    throw new Error(`Measured cost "${name}" is declared twice.`);
  }
  const held: Cost = { name, calls: 0, totalMs: 0, worstMs: 0 };
  costs.push(held);
  return held;
}

/**
 * Start or stop measuring. Every accumulator is emptied either way, so a window is what happened
 * inside it and never what the page cost while it was settling — the same clearing
 * `measureFrameCost` does, for the same reason.
 */
export function measureCosts(enabled: boolean): void {
  measuring = enabled;
  for (const held of costs) {
    held.calls = 0;
    held.totalMs = 0;
    held.worstMs = 0;
  }
}

/** Whether anything is measuring — what a caller asks before paying to have a span sent to it. */
export const measuringCosts = (): boolean => measuring;

/** The clock, or nought where nobody is measuring. Pair it with `costEnd`. */
export function costStart(): number {
  return measuring ? performance.now() : 0;
}

/** Record a span already measured — what a cost timed in another thread arrives as. */
export function costSpend(of: Cost, ms: number): void {
  if (!measuring) return;
  of.calls += 1;
  of.totalMs += ms;
  if (ms > of.worstMs) of.worstMs = ms;
}

/** Close a span opened by `costStart`, and answer what it cost — nought while nobody measures. */
export function costEnd(of: Cost, at: number): number {
  if (!measuring) return 0;
  const spent = performance.now() - at;
  costSpend(of, spent);
  return spent;
}

/** What every declared cost holds, as plain numbers a harness can print. */
export type CostRead = { calls: number; meanMs: number; worstMs: number };

/**
 * Read them all. This allocates, deliberately: it is asked once at the end of a window and never
 * on a frame, and a reader that has to walk handles to find a name is a second statement of them.
 */
export function readCosts(): Record<string, CostRead> {
  const out: Record<string, CostRead> = {};
  for (const held of costs) {
    out[held.name] = {
      calls: held.calls,
      meanMs: held.calls === 0 ? 0 : held.totalMs / held.calls,
      worstMs: held.worstMs,
    };
  }
  return out;
}

/**
 * What ./scripts/measure is handed, attached by src/main.tsx behind the same gate `window.mulch` is
 * behind. Both halves are here rather than in two openings because both exist for one reader: the
 * costs it prints, and the registry it walks a number through to drive a rebake.
 */
export type MeasureOpening = {
  /** Turn the accumulators on or off, emptying them either way. */
  on: (enabled: boolean) => void;
  /** Every declared cost as plain numbers. */
  read: () => Record<string, CostRead>;
  /** Move one tunable, in the registry this page's own modules read. */
  tune: (id: string, value: number) => void;
  /** Every tunable's id, so a harness picks one by name rather than by guess. */
  ids: () => readonly string[];
};

export const measureOpening = (): MeasureOpening => ({
  on: measureCosts,
  read: readCosts,
  tune: setTuning,
  ids: () => tunings().map((one) => one.id),
});
