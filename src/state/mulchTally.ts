/**
 * @role What the header's readout counts, as one read of the session: the yards standing, the
 *   effect instances over every rack including the master's, the parameters moving on their own,
 *   and the deepest chain one yard's sound crosses. Plus the one string that stands for all four,
 *   so a surface can subscribe to the counts without subscribing to the store's objects.
 * @instead The words each number is drawn with → src/lib/copyMulch.ts. Where it is drawn →
 *   src/ui/MulchTally.tsx. What one rack holds → `rackIn` in src/state/store.ts. The bus's level,
 *   which is per-frame and not a count → src/ui/MasterMeter.tsx.
 */
import { MULCH_GRADES } from "@/lib/copyMulch";
import type { AutomationLane } from "@/lib/automation";
import type { SessionEffect } from "./session";
import { deckIn, type SessionState } from "./store";

/** The four numbers the readout shows. Derived on every read and stored nowhere (0025). */
export type MulchTally = {
  /** The yards the session holds, which is the length of its list (0029). */
  yards: number;
  /** Effect instances over every rack, the master's counted with the yards' (0321). */
  effects: number;
  /** Parameters holding a lane, over those instances and over the yards' own parameters. */
  moving: number;
  /** The longest chain one yard's sound crosses: its own rack, then the master's behind it. */
  deepest: number;
};

/** What separates the numbers in the string that stands for a tally. Not a digit, so it parses. */
const KEY_GAP = "/";

/**
 * How many parameters of one record are moving. A key is there exactly while a lane is: clearing
 * a lane deletes its key rather than leaving an empty one (src/app/execute.ts), so the keys are
 * the count.
 */
const lanesIn = (automation: Partial<Record<string, AutomationLane>>): number =>
  Object.keys(automation).length;

/** The lanes a rack's instances hold, which is the same walk for a yard's rack and the master's. */
const rackLanes = (effects: readonly SessionEffect[]): number => {
  let held = 0;
  for (const entry of effects) held += lanesIn(entry.automation);
  return held;
};

/**
 * The whole readout, from one read of the session. Nothing here peeks at the graph: every number
 * is a fact the store already holds, which is what keeps this off the frame loop — the step
 * refused a count that needs a peek per frame.
 */
export function tallyMulch(state: SessionState): MulchTally {
  const master = state.master.effects.length;
  let effects = master;
  let moving = rackLanes(state.master.effects);
  // A session holding no yards still puts nothing through the master's own rack, and a readout
  // saying five effects and "untouched" in the same breath would be saying two things at once.
  let deepest = state.deckList.length === 0 ? master : 0;
  for (const entry of state.deckList) {
    // Through `deckIn`, which is loud: the list is the registry of yards (0029), so a list entry
    // with no record behind it is a broken session rather than a yard to skip past silently.
    const deck = deckIn(state.decks, entry.id);
    effects += deck.effects.length;
    moving += rackLanes(deck.effects) + lanesIn(deck.automation);
    // The master sits behind every yard, so the chain a yard's sound crosses is its rack and the
    // master's together (0321).
    deepest = Math.max(deepest, deck.effects.length + master);
  }
  return { yards: state.deckList.length, effects, moving, deepest };
}

/**
 * The tally as one string. A surface subscribes to this rather than to the tally itself: a store
 * snapshot has to be its own identity or `useSyncExternalStore` spins, and the `decks` record is
 * replaced on every write to any yard — a `param.set` per pointer move included — so a subscriber
 * reading objects would wake for the whole of a knob drag. A string wakes only when a count moves,
 * which is the same reason the move menu reads its tags as one (src/ui/EffectMove.tsx).
 */
export const mulchKey = (tally: MulchTally): string =>
  [tally.yards, tally.effects, tally.moving, tally.deepest].join(KEY_GAP);

/** The tally back out of that string — loud on anything this module did not write (principle 5). */
export function mulchOfKey(key: string): MulchTally {
  const parts = key.split(KEY_GAP).map(Number);
  const [yards, effects, moving, deepest] = parts;
  if (
    parts.length !== 4 ||
    yards === undefined ||
    effects === undefined ||
    moving === undefined ||
    deepest === undefined ||
    parts.some((count) => !Number.isInteger(count) || count < 0)
  ) {
    throw new TypeError(`not a mulch tally: ${key}`);
  }
  return { yards, effects, moving, deepest };
}

/**
 * How mulched it is, in one word: the ladder in `MULCH_GRADES` read at the deepest chain, with
 * the last word standing for that depth and every deeper one. A yard whose rack is empty and
 * whose master rack is empty reads the first word, which is the instrument saying plainly that
 * nothing is being done to the sound yet.
 */
export const mulchGrade = (tally: MulchTally): string =>
  MULCH_GRADES[Math.min(tally.deepest, MULCH_GRADES.length - 1)] ?? MULCH_GRADES[0];
