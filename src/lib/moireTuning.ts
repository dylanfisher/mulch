/**
 * @role The drift's tunable numbers, live: one registry every cheap constant in the picture is
 *   declared into where it was argued, and one place a value is moved while the picture is up.
 *   A handle is read as `.value` on the paint path — a property read and no allocation (0070) —
 *   so a slider moved shows on the next painting and nothing is rebuilt. Nothing here is stored:
 *   a tuning is session-only, and becomes a default by being pasted into an agent prompt and
 *   written back into its declaration (0299).
 * @instead Which numbers are tunable at all — each one, with its reasons, in the file that spends
 *   it (every `tunable(` call under src/lib and src/ui). The panel that moves them →
 *   src/ui/MoireTuning.tsx. What is *not* tunable: a reach a row set is built from, or a kernel the
 *   worker runs — those are consts still, for the reasons beside them. A number a *tile* is baked
 *   under may be tunable, and a scene's are (0329), on one condition: what the tile is keyed by has
 *   to move when the number does, or the slider is answered out of a cache and does nothing
 *   (`tuned`, src/ui/moireScreenTile.ts).
 */
import { clamp } from "./range.ts";

/** One tunable: where it rests, where it may go, and what it is now. Mutable only through `setTuning`. */
export type Tunable = {
  readonly id: string;
  readonly rest: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  value: number;
};

/** Every tunable, in the order the modules declaring them were loaded. */
const registry = new Map<string, Tunable>();
const listeners = new Set<() => void>();

/**
 * Declare one tunable. `id` is `group.name`, and the one name the panel and the clipboard text
 * both use — a group heading is the part before the dot, and a label the part after. A duplicate
 * id or a rest outside its own range is a declaration that cannot mean one thing, and throws.
 */
export function tunable(
  id: string,
  rest: number,
  range: { min: number; max: number; step: number },
): Tunable {
  if (registry.has(id)) throw new Error(`Drift tuning "${id}" is declared twice.`);
  if (!/^[a-z]+\.[a-zA-Z]+$/u.test(id)) throw new Error(`Drift tuning "${id}" is not group.name.`);
  if (!(range.min < range.max) || !(range.step > 0)) {
    throw new Error(`Drift tuning "${id}" has no range to move in.`);
  }
  if (rest < range.min || rest > range.max) {
    throw new Error(`Drift tuning "${id}" rests at ${rest}, outside ${range.min}–${range.max}.`);
  }
  const handle: Tunable = { id, rest, ...range, value: rest };
  registry.set(id, handle);
  return handle;
}

function notify(): void {
  for (const listener of listeners) listener();
}

/** Move one tunable, held to its own range. An id nothing declared is a slider over nothing. */
export function setTuning(id: string, value: number): void {
  const handle = registry.get(id);
  if (handle === undefined) throw new Error(`No drift tuning "${id}".`);
  if (!Number.isFinite(value)) throw new Error(`Drift tuning "${id}" cannot be ${value}.`);
  const held = clamp(value, handle.min, handle.max);
  if (held === handle.value) return;
  handle.value = held;
  notify();
}

/** Every tunable back to where it was declared to rest. */
export function resetTuning(): void {
  let moved = false;
  for (const handle of registry.values()) {
    if (handle.value === handle.rest) continue;
    handle.value = handle.rest;
    moved = true;
  }
  if (moved) notify();
}

/** Every tunable declared so far, in declaration order. */
export const tunings = (): readonly Tunable[] => [...registry.values()];

/** Only what has been moved off its rest, by id — the whole of what a tuning session is. */
export function tuningChanges(): Record<string, number> {
  const changes: Record<string, number> = {};
  for (const handle of registry.values()) {
    if (handle.value !== handle.rest) changes[handle.id] = handle.value;
  }
  return changes;
}

/** Hear every move and every reset, until the returned unsubscribe is called. */
export function subscribeTuning(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * A snapshot a React subscriber can compare: the one string every current value is in, which is
 * new exactly when a value moved. Values are read off the handles directly; this only says when.
 */
export const tuningSnapshot = (): string =>
  [...registry.values()].map((handle) => `${handle.id}=${handle.value}`).join(" ");
