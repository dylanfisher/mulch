/**
 * @role The durable session format — one shape, projected from live state and fully validated on
 *   the way back in. Pre-release: there is no stored version and no migration, so stored data that
 *   is not this shape is discarded rather than repaired (0026).
 * @instead Live and transient deck state → src/state/store.ts.
 */
// The durable shape, its projection and the one validator that proves stored JSON is it. They
// stay in one file because splitting them is how a shape and its checker drift apart, which is
// the failure 0026 exists to prevent.
import { assertEffectInstanceId, type EffectInstanceId } from "@/audio/effects/contract";
import { isEffectId, type EffectId } from "@/audio/effects/registry";
import {
  DECK_AUTOMATION_PARAM_IDS,
  DECK_PARAM_IDS,
  effectAutomationParamIds,
  effectParamIds,
  isAutomationParam,
  paramIn,
  PARAMS,
  type ParamId,
  type DeckAutomationParamId,
  type DeckParamId,
  type EffectAutomationParamId,
  type EffectParamValues,
} from "@/audio/params";
import { normalizeAutomationLane, type AutomationLane } from "@/lib/automation";
import { assertDurableText, finite, isRecord, objectAt } from "@/lib/guards";
import { assertSourceRef, type BlobId, type SourceRef } from "@/lib/source";
import {
  assertDeckId,
  deckIdsOf,
  deckIn,
  fromDecks,
  type DeckEntry,
  type DeckId,
  type SessionState,
} from "./store";

/**
 * One occurrence of one effect in one rack. Its id is opaque and durable, its values and lanes
 * are its own, and its bypass is a flag on it rather than a parallel list — which is what lets a
 * rack hold two delays that sound different (0030).
 */
export type SessionEffect = {
  id: EffectInstanceId;
  effect: EffectId;
  bypassed: boolean;
  /** Exactly the parameters this instance's plugin declares. Read through `paramIn`. */
  params: EffectParamValues;
  automation: Partial<Record<EffectAutomationParamId, AutomationLane>>;
};

export type SessionDeck = {
  /** The deck's own parameters. An effect's value lives on its instance (0030). */
  params: Record<DeckParamId, number>;
  automation: Partial<Record<DeckAutomationParamId, AutomationLane>>;
  /** The rack, in signal order: any number of instances of any registry entry. */
  effects: SessionEffect[];
  source: SourceRef | null;
  loop: { in: number; out: number } | null;
};

/** A clip's opaque identity — minted by whoever captures it, never derived from its contents. */
export type ClipId = string;

/**
 * One captured deck preset. `deck` is the same durable shape a deck stores, so a parameter or an
 * effect costs one declaration here too, and a clip carries each instance's own values and lanes
 * the way a deck does (0030). The source is a reference: a clip borrows blob bytes (0027).
 */
export type Clip = {
  id: ClipId;
  name: string;
  deck: SessionDeck;
};

export type Session = {
  /** Null exactly when `deckList` is empty — a session may hold no decks at all (0029). */
  activeDeck: DeckId | null;
  /**
   * The session's own deck list: the single source of truth for order and membership (0029),
   * one record per deck so the emoji and name it was added with are replayed with it (0057).
   */
  deckList: DeckEntry[];
  decks: Record<DeckId, SessionDeck>;
  /** Capture order. Renaming and deleting never reorder it, so a list index stays meaningful. */
  clips: Clip[];
};

/** The one guard on a clip label, shared by the capture command and the stored-shape validator. */
export function assertClipName(value: unknown, at: string): asserts value is string {
  assertDurableText(value, at);
}

/** The one guard on a clip id, shared by every clip command and the stored-shape validator. */
export function assertClipId(value: unknown, at: string): asserts value is ClipId {
  assertDurableText(value, at);
}

const sourceBlobId = (source: SourceRef | null): BlobId | null =>
  source !== null && "blobId" in source ? source.blobId : null;

/**
 * The exact blob reachability projection shared by persistence, history and portable archives.
 * Clips are walked beside decks: a clip borrows a deck's bytes, so the last referrer of either
 * kind is what keeps them (0027). The walk reads the session's own deck list rather than a
 * fixed registry, which is what makes a removed deck's blob collectable (0029).
 */
export function sessionBlobIds(session: Session): Set<BlobId> {
  const ids = new Set<BlobId>();
  for (const { id: deck } of session.deckList) {
    const id = sourceBlobId(deckIn(session.decks, deck).source);
    if (id !== null) ids.add(id);
  }
  for (const clip of session.clips) {
    const id = sourceBlobId(clip.deck.source);
    if (id !== null) ids.add(id);
  }
  return ids;
}

const sourceProjection = (source: SourceRef | null): SourceRef | null => {
  if (source === null) return null;
  if ("blobId" in source) return { blobId: source.blobId };
  return {
    gen: source.gen,
    secs: source.secs,
    ...(source.hz === undefined ? {} : { hz: source.hz }),
  };
};

/** One lane, durable: its points' positions and values, and nothing a recorder left on them. */
const laneProjection = (lane: AutomationLane): AutomationLane =>
  lane.map((point) => ({ at: point.at, value: point.value }));

/** One rack entry, durable: its identity, what it is, its bypass, its values and its lanes. */
const effectSnapshot = (entry: SessionEffect): SessionEffect => ({
  id: entry.id,
  effect: entry.effect,
  bypassed: entry.bypassed,
  params: Object.fromEntries(
    effectParamIds(entry.effect).map((id) => [id, paramIn(entry.params, id)]),
  ),
  automation: Object.fromEntries(
    effectAutomationParamIds(entry.effect).flatMap((id) => {
      const lane = entry.automation[id];
      return lane === undefined || lane.length === 0 ? [] : [[id, laneProjection(lane)]];
    }),
  ),
});

/**
 * One deck, durable. The live `DeckState` is structurally this shape plus the derived and
 * graph-owned fields, so a stored clip's preset projects through the very same function.
 */
export const deckSnapshot = (current: SessionDeck): SessionDeck => {
  const params = Object.fromEntries(DECK_PARAM_IDS.map((id) => [id, current.params[id]]));
  return {
    // The registry is the proof that this derived object has every deck param exactly once.
    // oxlint-disable-next-line no-unsafe-type-assertion
    params: params as Record<DeckParamId, number>,
    automation: Object.fromEntries(
      DECK_AUTOMATION_PARAM_IDS.flatMap((id) => {
        const lane = current.automation[id];
        return lane === undefined || lane.length === 0 ? [] : [[id, laneProjection(lane)]];
      }),
    ),
    // Order is the signal order, and each entry projects through the registry it names, so one
    // rack state has exactly one JSON — what history's comparison is written against (0021).
    effects: current.effects.map(effectSnapshot),
    source: sourceProjection(current.source),
    loop: current.loop === null ? null : { ...current.loop },
  };
};

/** The durable projection; derived and graph-owned deck fields remain absent. */
export function sessionSnapshot(state: SessionState): Session {
  return {
    activeDeck: state.activeDeck,
    deckList: state.deckList.map((entry) => ({ ...entry })),
    decks: fromDecks(deckIdsOf(state.deckList), (deck) => deckSnapshot(deckIn(state.decks, deck))),
    clips: state.clips.map((clip) => ({
      id: clip.id,
      name: clip.name,
      deck: deckSnapshot(clip.deck),
    })),
  };
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[], at: string): void {
  // ES2022 has no toSorted; both arrays are fresh, so sorting cannot mutate a caller's value.
  // oxlint-disable-next-line unicorn/no-array-sort
  const actual = Object.keys(value).sort();
  // oxlint-disable-next-line unicorn/no-array-sort
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new TypeError(`${at} has keys [${actual.join(", ")}], expected [${wanted.join(", ")}]`);
  }
}

/** One value, finite and inside the range its declaration states. */
function paramValue(value: unknown, param: ParamId, at: string): void {
  const found = finite(value, at);
  const spec = PARAMS[param];
  if (found < spec.min || found > spec.max) {
    throw new RangeError(`${at} is outside [${spec.min}, ${spec.max}]`);
  }
}

/** Lanes, keyed by exactly the automatable parameters this owner declares, each normalized. */
function validateLanes(value: unknown, allowed: readonly ParamId[], at: string): void {
  const automation = objectAt(value, at);
  const declared = new Set<string>(allowed);
  for (const [rawParam, rawLane] of Object.entries(automation)) {
    if (!declared.has(rawParam) || !isAutomationParam(rawParam)) {
      throw new TypeError(`${at} has unsupported param: ${rawParam}`);
    }
    const lane = normalizeAutomationLane(rawLane, PARAMS[rawParam]);
    if (lane.length === 0) throw new TypeError(`${at}.${rawParam} is empty`);
    if (
      !Array.isArray(rawLane) ||
      lane.length !== rawLane.length ||
      lane.some((point, index) => {
        const candidate: unknown = rawLane[index];
        if (!isRecord(candidate)) return true;
        // normalizeAutomationLane already proved this exact-key object shape; this comparison
        // only decides whether the validated input was already the canonical representation.
        return !Object.is(point.at, candidate.at) || !Object.is(point.value, candidate.value);
      })
    ) {
      throw new TypeError(`${at}.${rawParam} is not normalized`);
    }
  }
}

/**
 * The rack, validated as the list of instances it is: unique opaque ids, a registered effect,
 * a bypass flag, and values keyed by exactly the parameters that effect declares — which is what
 * makes two delays two sets of values rather than one (0030).
 */
function validateRack(value: unknown, at: string): void {
  if (!Array.isArray(value)) throw new TypeError(`${at} is not an array`);
  const seen = new Set<EffectInstanceId>();
  for (const [index, raw] of value.entries()) {
    const where = `${at}[${index}]`;
    const entry = objectAt(raw, where);
    exactKeys(entry, ["id", "effect", "bypassed", "params", "automation"], where);
    assertEffectInstanceId(entry.id, `${where}.id`);
    if (seen.has(entry.id)) throw new TypeError(`${where}.id repeats ${entry.id}`);
    seen.add(entry.id);
    if (!isEffectId(entry.effect)) {
      throw new TypeError(`${where}.effect is not registered: ${String(entry.effect)}`);
    }
    if (typeof entry.bypassed !== "boolean") {
      throw new TypeError(`${where}.bypassed is not a boolean`);
    }
    const owned = effectParamIds(entry.effect);
    const params = objectAt(entry.params, `${where}.params`);
    exactKeys(params, owned, `${where}.params`);
    for (const param of owned) paramValue(params[param], param, `${where}.params.${param}`);
    validateLanes(entry.automation, effectAutomationParamIds(entry.effect), `${where}.automation`);
  }
}

// One function owns the whole deck shape: params, lanes, rack, source and loop are validated
// against each other, and splitting it would let a caller check one without the rest.
// See docs/decisions/0007-reviewed-oversized-functions.md.
function validateDeck(value: unknown, at: string): void {
  const stored = objectAt(value, at);
  exactKeys(stored, ["params", "automation", "effects", "source", "loop"], at);

  const params = objectAt(stored.params, `${at}.params`);
  exactKeys(params, DECK_PARAM_IDS, `${at}.params`);
  for (const id of DECK_PARAM_IDS) paramValue(params[id], id, `${at}.params.${id}`);

  validateLanes(stored.automation, DECK_AUTOMATION_PARAM_IDS, `${at}.automation`);
  validateRack(stored.effects, `${at}.effects`);

  if (stored.source !== null) assertSourceRef(stored.source, `${at}.source`);
  if (stored.loop !== null) {
    if (stored.source === null) throw new TypeError(`${at}.loop exists without a source`);
    const loop = objectAt(stored.loop, `${at}.loop`);
    exactKeys(loop, ["in", "out"], `${at}.loop`);
    const from = finite(loop.in, `${at}.loop.in`);
    const to = finite(loop.out, `${at}.loop.out`);
    if (from < 0 || to <= from) throw new RangeError(`${at}.loop is not an increasing range`);
  }
}

/**
 * The clip list, validated as the preset list it is: unique ids, bounded labels, and a body that
 * is a whole deck — checked by the same `validateDeck` a stored deck goes through, so a clip can
 * never hold a shape a deck could not (0027).
 */
function validateClips(value: unknown): void {
  if (!Array.isArray(value)) throw new TypeError("session.clips is not an array");
  const seen = new Set<ClipId>();
  for (const [index, entry] of value.entries()) {
    const at = `session.clips[${index}]`;
    const clip = objectAt(entry, at);
    exactKeys(clip, ["id", "name", "deck"], at);
    assertClipId(clip.id, `${at}.id`);
    if (seen.has(clip.id)) throw new TypeError(`${at}.id repeats ${clip.id}`);
    seen.add(clip.id);
    assertClipName(clip.name, `${at}.name`);
    validateDeck(clip.deck, `${at}.deck`);
    // Capture refuses an empty deck, so a stored clip without a source is not something this
    // format ever wrote — and apply would have no `deck.load` to lead with (0027).
    if (objectAt(clip.deck, `${at}.deck`).source === null) {
      throw new TypeError(`${at}.deck has no source`);
    }
  }
}

/**
 * The one validator: stored JSON is this build's shape or it is not a session. There is no
 * migration to reach for, so every caller's failure path is the same one — discard it (0026).
 */
export function validateSession(value: unknown): Session {
  const session = objectAt(value, "session");
  exactKeys(session, ["activeDeck", "deckList", "decks", "clips"], "session");

  // The list is the shape: the keyed map is validated against it, so one deck cannot exist as a
  // key without a place in the order, or hold a place without a deck (0029). Each entry carries
  // the emoji and name the deck was added with, checked as the durable text they are — the pools
  // they were drawn from are the interface's business, not the stored shape's (0057).
  if (!Array.isArray(session.deckList)) throw new TypeError("session.deckList is not an array");
  const deckIds: DeckId[] = [];
  for (const [index, entry] of session.deckList.entries()) {
    const at = `session.deckList[${index}]`;
    const held = objectAt(entry, at);
    exactKeys(held, ["id", "emoji", "name"], at);
    assertDeckId(held.id, `${at}.id`);
    assertDurableText(held.emoji, `${at}.emoji`);
    assertDurableText(held.name, `${at}.name`);
    if (deckIds.includes(held.id)) throw new TypeError(`session.deckList repeats ${held.id}`);
    deckIds.push(held.id);
  }
  const decks = objectAt(session.decks, "session.decks");
  exactKeys(decks, deckIds, "session.decks");
  for (const deck of deckIds) validateDeck(decks[deck], `session.decks.${deck}`);

  // A session with no decks has nothing to activate, and one with decks must name one of them.
  if (session.activeDeck === null) {
    if (deckIds.length > 0) throw new TypeError("session.activeDeck is null but decks are held");
  } else if (typeof session.activeDeck !== "string" || !deckIds.includes(session.activeDeck)) {
    throw new TypeError(
      `session.activeDeck is not a held deck: ${JSON.stringify(session.activeDeck)}`,
    );
  }

  validateClips(session.clips);
  // Everything reachable has now been checked against Session.
  // oxlint-disable-next-line no-unsafe-type-assertion
  return value as Session;
}
