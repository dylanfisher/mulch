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

/**
 * A whole session's moves, applied at once: every handle back to its rest and then the ones named
 * here set. **The one way a tuning crosses a thread** (0354) — a worker has its own registry and
 * hears no slider, so the port that asks it for a bake carries `tuningChanges()` beside the order
 * and this puts them on. An id the worker's own module graph never declared is skipped rather than
 * thrown on: the page declares tunables this side of the seam has no loop to spend (`wind.strips`,
 * a painter's), and a bake refused over a slider it does not read would be a picture lost to a
 * number that could not have moved it.
 */
export function applyTunings(changes: Readonly<Record<string, number>>): void {
  // **A snapshot already on is not a move.** Every bake carries one, and the reset below notifies
  // whenever anything was off its rest — which is what the picture's caches are dropped on, so
  // without this one slider moved once would throw the worker's body away before every tile it
  // bakes for the rest of the session (0354).
  const already = tuningChanges();
  const ids = Object.keys(changes);
  if (
    ids.length === Object.keys(already).length &&
    ids.every((id) => already[id] === changes[id])
  ) {
    return;
  }
  resetTuning();
  for (const [id, value] of Object.entries(changes)) {
    if (registry.has(id)) setTuning(id, value);
  }
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
