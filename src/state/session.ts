/**
 * @role The versioned durable session format, its projection from live state, and the append-only
 *   migration pipeline that validates stored JSON before it reaches the instrument.
 * @instead Live and transient deck state → src/state/store.ts.
 */
// Three frozen validators and their append-only migrations stay together so a shipped stage
// cannot quietly reuse the current shape. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines, max-lines-per-function
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
import { DECK_IDS, fromDecks, type SessionState } from "./store";
import { SESSION_V1_VERSION, SESSION_V2_VERSION, SESSION_V3_VERSION } from "./version";
import type { CURRENT_SESSION_VERSION } from "./version";

export { CURRENT_SESSION_VERSION } from "./version";

const SESSION_V1_DECK_IDS = ["a", "b"] as const;
type SessionDeckIdV1 = (typeof SESSION_V1_DECK_IDS)[number];
const SESSION_V2_DECK_IDS = ["a", "b"] as const;
type SessionDeckIdV2 = (typeof SESSION_V2_DECK_IDS)[number];
const SESSION_V2_INITIAL_DECK: SessionDeckIdV2 = SESSION_V2_DECK_IDS[0];
const SESSION_V3_DECK_IDS = ["a", "b"] as const;
type SessionDeckIdV3 = (typeof SESSION_V3_DECK_IDS)[number];
type CurrentDeckSchemaMatches = typeof DECK_IDS extends typeof SESSION_V3_DECK_IDS
  ? typeof SESSION_V3_DECK_IDS extends typeof DECK_IDS
    ? true
    : false
  : false;
/** A runtime cardinality change cannot keep writing v2; it must add the next migration first. */
const CURRENT_SESSION_DECK_IDS: CurrentDeckSchemaMatches extends true
  ? typeof SESSION_V3_DECK_IDS
  : never = DECK_IDS;

export type SessionDeckV1 = {
  params: Record<ParamId, number>;
  effects: EffectId[];
  source: SourceRef | null;
  loop: { in: number; out: number } | null;
};

export type SessionV1 = {
  version: typeof SESSION_V1_VERSION;
  decks: Record<SessionDeckIdV1, SessionDeckV1>;
};

export type SessionV2 = {
  version: typeof SESSION_V2_VERSION;
  activeDeck: SessionDeckIdV2;
  decks: Record<SessionDeckIdV2, SessionDeckV1>;
};

export type SessionDeckV3 = SessionDeckV1 & {
  automation: Partial<Record<AutomationParamId, AutomationLane>>;
};

export type SessionV3 = {
  version: typeof SESSION_V3_VERSION;
  activeDeck: SessionDeckIdV3;
  decks: Record<SessionDeckIdV3, SessionDeckV3>;
};

/** The exact blob reachability projection shared by persistence and portable archives. */
export function sessionBlobIds(session: SessionV3): Set<BlobId> {
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

const deckProjection = (state: SessionState, deck: SessionDeckIdV3): SessionDeckV3 => {
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
    source: sourceProjection(current.source),
    loop: current.loop === null ? null : { ...current.loop },
  };
};

/** The current durable projection; derived and graph-owned deck fields remain absent. */
export function sessionV3(state: SessionState): SessionV3 {
  return {
    version: SESSION_V3_VERSION,
    activeDeck: state.activeDeck,
    decks: fromDecks(CURRENT_SESSION_DECK_IDS, (deck) => deckProjection(state, deck)),
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

function validateSource(value: unknown, at: string): void {
  assertSourceRef(value, at);
}

function validateDeck(value: unknown, deck: string, withAutomation: boolean): void {
  const at = `session.decks.${deck}`;
  const stored = objectAt(value, at);
  exactKeys(
    stored,
    withAutomation
      ? ["params", "automation", "effects", "source", "loop"]
      : ["params", "effects", "source", "loop"],
    at,
  );

  const params = objectAt(stored.params, `${at}.params`);
  exactKeys(params, PARAM_IDS, `${at}.params`);
  for (const id of PARAM_IDS) {
    const paramValue = finite(params[id], `${at}.params.${id}`);
    const spec = PARAMS[id];
    if (paramValue < spec.min || paramValue > spec.max) {
      throw new RangeError(`${at}.params.${id} is outside [${spec.min}, ${spec.max}]`);
    }
  }

  if (withAutomation) {
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
  }

  if (!Array.isArray(stored.effects)) throw new TypeError(`${at}.effects is not an array`);
  const seen = new Set<EffectId>();
  for (const effect of stored.effects) {
    if (!isEffectId(effect))
      throw new TypeError(`${at}.effects has unknown effect: ${String(effect)}`);
    if (seen.has(effect)) throw new TypeError(`${at}.effects repeats ${effect}`);
    seen.add(effect);
  }

  if (stored.source !== null) validateSource(stored.source, `${at}.source`);
  if (stored.loop !== null) {
    if (stored.source === null) throw new TypeError(`${at}.loop exists without a source`);
    const loop = objectAt(stored.loop, `${at}.loop`);
    exactKeys(loop, ["in", "out"], `${at}.loop`);
    const from = finite(loop.in, `${at}.loop.in`);
    const to = finite(loop.out, `${at}.loop.out`);
    if (from < 0 || to <= from) throw new RangeError(`${at}.loop is not an increasing range`);
  }
}

/** The shipped v1 migration stage: validate the format and return that same value unchanged. */
function identityV1(value: unknown): SessionV1 {
  const session = objectAt(value, "session");
  exactKeys(session, ["version", "decks"], "session");
  if (session.version !== SESSION_V1_VERSION) {
    throw new RangeError(`unsupported session version: ${String(session.version)}`);
  }
  const decks = objectAt(session.decks, "session.decks");
  exactKeys(decks, SESSION_V1_DECK_IDS, "session.decks");
  for (const deck of SESSION_V1_DECK_IDS) validateDeck(decks[deck], deck, false);
  // Everything reachable has now been checked against SessionV1.
  // oxlint-disable-next-line no-unsafe-type-assertion
  return value as SessionV1;
}

/** Append-only v2 stage: add activeDeck to v1, or fully validate an already-v2 value. */
function migrateV2(value: unknown): SessionV2 {
  const session = objectAt(value, "session");
  if (session.version === SESSION_V1_VERSION) {
    // identityV1 is the preceding pipeline stage, so this value has already been validated.
    // oxlint-disable-next-line no-unsafe-type-assertion
    const previous = value as SessionV1;
    return {
      version: SESSION_V2_VERSION,
      activeDeck: SESSION_V2_INITIAL_DECK,
      decks: previous.decks,
    };
  }

  exactKeys(session, ["version", "activeDeck", "decks"], "session");
  if (session.version !== SESSION_V2_VERSION) {
    throw new RangeError(`unsupported session version: ${String(session.version)}`);
  }
  if (!SESSION_V2_DECK_IDS.some((deck) => deck === session.activeDeck)) {
    throw new TypeError(
      `session.activeDeck is not a registered deck: ${String(session.activeDeck)}`,
    );
  }
  const decks = objectAt(session.decks, "session.decks");
  exactKeys(decks, SESSION_V2_DECK_IDS, "session.decks");
  for (const deck of SESSION_V2_DECK_IDS) validateDeck(decks[deck], deck, false);
  // Everything reachable has now been checked against SessionV2.
  // oxlint-disable-next-line no-unsafe-type-assertion
  return value as SessionV2;
}

/** Append-only v3 stage: add empty lanes to v2, or fully validate an already-v3 value. */
function migrateV3(value: unknown): SessionV3 {
  const session = objectAt(value, "session");
  if (session.version === SESSION_V2_VERSION) {
    // migrateV2 is the preceding pipeline stage, so this value has already been validated.
    // oxlint-disable-next-line no-unsafe-type-assertion
    const previous = value as SessionV2;
    return {
      version: SESSION_V3_VERSION,
      activeDeck: previous.activeDeck,
      decks: fromDecks(SESSION_V3_DECK_IDS, (deck) => ({
        ...previous.decks[deck],
        automation: {},
      })),
    };
  }

  exactKeys(session, ["version", "activeDeck", "decks"], "session");
  if (session.version !== SESSION_V3_VERSION) {
    throw new RangeError(`unsupported session version: ${String(session.version)}`);
  }
  if (!SESSION_V3_DECK_IDS.some((deck) => deck === session.activeDeck)) {
    throw new TypeError(
      `session.activeDeck is not a registered deck: ${String(session.activeDeck)}`,
    );
  }
  const decks = objectAt(session.decks, "session.decks");
  exactKeys(decks, SESSION_V3_DECK_IDS, "session.decks");
  for (const deck of SESSION_V3_DECK_IDS) validateDeck(decks[deck], deck, true);
  // Everything reachable has now been checked against SessionV3.
  // oxlint-disable-next-line no-unsafe-type-assertion
  return value as SessionV3;
}

/**
 * Append only: a future format adds its stage after this one. A stored version starts at its own
 * stage, while an older value proceeds through every later stage in order.
 */
const MIGRATIONS = [identityV1, migrateV2, migrateV3] as const;
const MIGRATION_COUNT: typeof CURRENT_SESSION_VERSION = MIGRATIONS.length;

export function migrateSession(value: unknown): SessionV3 {
  const raw = objectAt(value, "session");
  if (!Number.isInteger(raw.version) || typeof raw.version !== "number" || raw.version < 1) {
    throw new TypeError(`session.version is not a positive integer: ${String(raw.version)}`);
  }
  if (raw.version > MIGRATION_COUNT) {
    throw new RangeError(`unsupported session version: ${raw.version}`);
  }
  let migrated: unknown = value;
  for (let index = raw.version - 1; index < MIGRATIONS.length; index++) {
    const stage = MIGRATIONS[index];
    if (stage === undefined) throw new Error(`missing session migration stage ${index + 1}`);
    migrated = stage(migrated);
  }
  // The last stage is the current format's validator; never call an older validator here.
  // oxlint-disable-next-line no-unsafe-type-assertion
  return migrated as SessionV3;
}
