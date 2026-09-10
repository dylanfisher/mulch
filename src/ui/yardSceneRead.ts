/**
 * @role The one memoized reading of a yard's name, and the one place a hand may set the field aside
 *   from what the name says: a name never changes, so a surface reads it once a yard rather than
 *   once a render, and a chosen field is a session preference laid over that reading — stored
 *   nowhere, gone with the tab, and at rest the name's own (0343). Its own module because
 *   three surfaces read it — the picture, the yard's header and the drift's tuning panel — and the
 *   panel is worn by the strip, so a hook kept in src/ui/MoireStrip.tsx could not be imported back
 *   into it (principle 1, and the cycle that would be).
 * @instead The reading itself → src/lib/yardScene.ts, and the words it is said in →
 *   src/lib/copyScene.ts. What the picture does with a reading → src/ui/moireScreenTile.ts. The
 *   dropdown the choice is made on → src/ui/MoireTuning.tsx.
 */
import { useMemo, useSyncExternalStore } from "react";

import type { SceneName } from "@/lib/moireScene";
import { type YardScene, yardScene } from "@/lib/yardScene";

/**
 * Which field each yard has been asked to stand in instead of the one its name reads as, by the
 * yard's name — the one identity a reading already keys on. A yard with no entry stands where its
 * name puts it, which is the rest and the whole of the default: a session opens with this empty.
 */
const chosen = new Map<string, SceneName>();
const listeners = new Set<() => void>();

/** The field a hand chose for this yard, or null for the name's own. */
export const sceneChoice = (name: string): SceneName | null => chosen.get(name) ?? null;

/**
 * Set a yard's field aside from its name, or hand it back to the name with null. Every reader of
 * `useYardScene` re-reads on the next render — the tile is keyed by the scene it was baked under
 * (src/ui/moireScreen.ts), so the picture rebakes and nothing is written anywhere.
 */
export function setSceneChoice(name: string, scene: SceneName | null): void {
  if (scene === null) chosen.delete(name);
  else chosen.set(name, scene);
  for (const listener of listeners) listener();
}

/** Forget every choice: the session's rest, which a test restores between cases. */
export function resetSceneChoices(): void {
  chosen.clear();
  for (const listener of listeners) listener();
}

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * One string every current choice is in, so React can compare snapshots by value: a Map is the
 * same object after every move, and a subscriber comparing it would never re-render.
 */
const snapshot = (): string => JSON.stringify([...chosen]);

/**
 * The field this yard's picture is of, read off its own name: the scene its plant stands in, the
 * light its air puts that scene under, the wind its adjective sets, and how close its place word
 * stands to the one thing its place noun names (`yardScene`, 0329, 0335) — with the scene alone
 * replaced by whatever a hand chose for this yard, if it chose one (0343).
 */
export function useYardScene(name: string): YardScene {
  useSyncExternalStore(subscribe, snapshot, snapshot);
  const scene = sceneChoice(name);
  return useMemo(() => {
    const read = yardScene(name);
    return scene === null ? read : { ...read, scene };
  }, [name, scene]);
}
