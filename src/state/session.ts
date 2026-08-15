/**
 * @role The durable session format — one shape, projected from live state and fully validated on
 *   the way back in. Pre-release: there is no stored version and no migration, so stored data that
 *   is not this shape is discarded rather than repaired (0026).
 * @instead Live and transient deck state → src/state/store.ts.
 */
import { isEffectId, type EffectId } from "@/audio/effects/registry";
import {
  AUTOMATION_PARAM_IDS,
  isAutomationParam,
  PARAM_IDS,
  PARAMS,
  type AutomationParamId,
  type ParamId,
} from "@/audio/params";
import { normalizeAutomationLane, type AutomationLane } from "@/lib/automation";
import { assertSourceRef, type BlobId, type SourceRef } from "@/lib/source";
import { DECK_IDS, fromDecks, isDeckId, type DeckId, type SessionState } from "./store";

export type SessionDeck = {
  params: Record<ParamId, number>;
  automation: Partial<Record<AutomationParamId, AutomationLane>>;
  effects: EffectId[];
  /** Which of `effects` are out of the signal path, in `effects` order — 0023's bypass. */
  bypassed: EffectId[];
  source: SourceRef | null;
  loop: { in: number; out: number } | null;
};

export type Session = {
  activeDeck: DeckId;
  decks: Record<DeckId, SessionDeck>;
};

/** The exact blob reachability projection shared by persistence and portable archives. */
export function sessionBlobIds(session: Session): Set<BlobId> {
  const ids = new Set<BlobId>();
  for (const deck of Object.values(session.decks)) {
    if (deck.source !== null && "blobId" in deck.source) ids.add(deck.source.blobId);
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

const deckProjection = (state: SessionState, deck: DeckId): SessionDeck => {
  const current = state.decks[deck];
  const params = Object.fromEntries(PARAM_IDS.map((id) => [id, current.params[id]]));
  return {
    // The registry is the proof that this derived object has every ParamId exactly once.
    // oxlint-disable-next-line no-unsafe-type-assertion
    params: params as Record<ParamId, number>,
    automation: Object.fromEntries(
      AUTOMATION_PARAM_IDS.flatMap((id) => {
        const lane = current.automation[id];
        return lane === undefined || lane.length === 0
          ? []
          : [[id, lane.map((point) => ({ at: point.at, value: point.value }))]];
      }),
    ),
    effects: [...current.effects],
    // Derived from the rack rather than copied, so one rack state has exactly one JSON — which
    // is what history's checkpoint comparison is written against (0021, 0023).
    bypassed: current.effects.filter((effect) => current.bypassed.includes(effect)),
    source: sourceProjection(current.source),
    loop: current.loop === null ? null : { ...current.loop },
  };
};

/** The durable projection; derived and graph-owned deck fields remain absent. */
export function sessionSnapshot(state: SessionState): Session {
  return {
    activeDeck: state.activeDeck,
    decks: fromDecks(DECK_IDS, (deck) => deckProjection(state, deck)),
  };
}

type JsonObject = Record<string, unknown>;

function objectAt(value: unknown, at: string): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${at} is not an object`);
  }
  // This is the runtime narrowing from unknown JSON to an indexable record.
  // oxlint-disable-next-line no-unsafe-type-assertion
  return value as JsonObject;
}

function exactKeys(value: JsonObject, expected: readonly string[], at: string): void {
  // ES2022 has no toSorted; both arrays are fresh, so sorting cannot mutate a caller's value.
  // oxlint-disable-next-line unicorn/no-array-sort
  const actual = Object.keys(value).sort();
  // oxlint-disable-next-line unicorn/no-array-sort
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new TypeError(`${at} has keys [${actual.join(", ")}], expected [${wanted.join(", ")}]`);
  }
}

function finite(value: unknown, at: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${at} is not a finite number`);
  }
  return value;
}

// One function owns the whole deck shape: params, lanes, rack, bypass, source and loop are
// validated against each other, and splitting it would let a caller check one without the rest.
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
function validateDeck(value: unknown, deck: string): void {
  const at = `session.decks.${deck}`;
  const stored = objectAt(value, at);
  exactKeys(stored, ["params", "automation", "effects", "bypassed", "source", "loop"], at);

  const params = objectAt(stored.params, `${at}.params`);
  exactKeys(params, PARAM_IDS, `${at}.params`);
  for (const id of PARAM_IDS) {
    const paramValue = finite(params[id], `${at}.params.${id}`);
    const spec = PARAMS[id];
    if (paramValue < spec.min || paramValue > spec.max) {
      throw new RangeError(`${at}.params.${id} is outside [${spec.min}, ${spec.max}]`);
    }
  }

  const automation = objectAt(stored.automation, `${at}.automation`);
  for (const [rawParam, rawLane] of Object.entries(automation)) {
    if (!isAutomationParam(rawParam)) {
      throw new TypeError(`${at}.automation has unsupported param: ${rawParam}`);
    }
    const lane = normalizeAutomationLane(rawLane, PARAMS[rawParam]);
    if (lane.length === 0) throw new TypeError(`${at}.automation.${rawParam} is empty`);
    if (
      !Array.isArray(rawLane) ||
      lane.length !== rawLane.length ||
      lane.some((point, index) => {
        const rawPoint: unknown = rawLane[index];
        if (typeof rawPoint !== "object" || rawPoint === null || Array.isArray(rawPoint)) {
          return true;
        }
        // normalizeAutomationLane already proved this exact-key object shape; this comparison
        // only decides whether the validated input was already the canonical representation.
        // oxlint-disable-next-line no-unsafe-type-assertion
        const candidate = rawPoint as Record<string, unknown>;
        return !Object.is(point.at, candidate.at) || !Object.is(point.value, candidate.value);
      })
    ) {
      throw new TypeError(`${at}.automation.${rawParam} is not normalized`);
    }
  }

  if (!Array.isArray(stored.effects)) throw new TypeError(`${at}.effects is not an array`);
  const seen = new Set<EffectId>();
  const rack: EffectId[] = [];
  for (const effect of stored.effects) {
    if (!isEffectId(effect))
      throw new TypeError(`${at}.effects has unknown effect: ${String(effect)}`);
    if (seen.has(effect)) throw new TypeError(`${at}.effects repeats ${effect}`);
    seen.add(effect);
    rack.push(effect);
  }

  const storedBypass: unknown = stored.bypassed;
  if (!Array.isArray(storedBypass)) throw new TypeError(`${at}.bypassed is not an array`);
  const off = new Set<EffectId>();
  for (const effect of storedBypass) {
    if (!isEffectId(effect))
      throw new TypeError(`${at}.bypassed has unknown effect: ${String(effect)}`);
    if (!seen.has(effect))
      throw new TypeError(`${at}.bypassed names an effect the rack does not hold: ${effect}`);
    if (off.has(effect)) throw new TypeError(`${at}.bypassed repeats ${effect}`);
    off.add(effect);
  }
  // The projection derives this list from the rack, so a stored one in any other order is a
  // second representation of one state and never something this format wrote (0023).
  const canonical = rack.filter((effect) => off.has(effect));
  if (canonical.some((effect, index) => storedBypass[index] !== effect)) {
    throw new TypeError(`${at}.bypassed is not in rack order`);
  }

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
 * The one validator: stored JSON is this build's shape or it is not a session. There is no
 * migration to reach for, so every caller's failure path is the same one — discard it (0026).
 */
export function validateSession(value: unknown): Session {
  const session = objectAt(value, "session");
  exactKeys(session, ["activeDeck", "decks"], "session");
  if (!isDeckId(session.activeDeck)) {
    throw new TypeError(
      `session.activeDeck is not a registered deck: ${String(session.activeDeck)}`,
    );
  }
  const decks = objectAt(session.decks, "session.decks");
  exactKeys(decks, DECK_IDS, "session.decks");
  for (const deck of DECK_IDS) validateDeck(decks[deck], deck);
  // Everything reachable has now been checked against Session.
  // oxlint-disable-next-line no-unsafe-type-assertion
  return value as Session;
}
