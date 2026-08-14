/**
 * @role The versioned durable session format, its projection from live state, and the append-only
 *   migration pipeline that validates stored JSON before it reaches the instrument.
 * @instead Live and transient deck state → src/state/store.ts.
 */
import { isEffectId, type EffectId } from "@/audio/effects/registry";
import { PARAM_IDS, PARAMS, type ParamId } from "@/audio/params";
import { assertSourceRef, type SourceRef } from "@/lib/source";
import { DECK_IDS, fromDecks, type SessionState } from "./store";
import { SESSION_V1_VERSION, SESSION_V2_VERSION } from "./version";
import type { CURRENT_SESSION_VERSION } from "./version";

export { CURRENT_SESSION_VERSION } from "./version";

const SESSION_V1_DECK_IDS = ["a", "b"] as const;
type SessionDeckIdV1 = (typeof SESSION_V1_DECK_IDS)[number];
const SESSION_V2_DECK_IDS = ["a", "b"] as const;
type SessionDeckIdV2 = (typeof SESSION_V2_DECK_IDS)[number];
const SESSION_V2_INITIAL_DECK: SessionDeckIdV2 = SESSION_V2_DECK_IDS[0];
type CurrentDeckSchemaMatches = typeof DECK_IDS extends typeof SESSION_V2_DECK_IDS
  ? typeof SESSION_V2_DECK_IDS extends typeof DECK_IDS
    ? true
    : false
  : false;
/** A runtime cardinality change cannot keep writing v2; it must add the next migration first. */
const CURRENT_SESSION_DECK_IDS: CurrentDeckSchemaMatches extends true
  ? typeof SESSION_V2_DECK_IDS
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

const sourceProjection = (source: SourceRef | null): SourceRef | null => {
  if (source === null) return null;
  if ("blobId" in source) return { blobId: source.blobId };
  return {
    gen: source.gen,
    secs: source.secs,
    ...(source.hz === undefined ? {} : { hz: source.hz }),
  };
};

const deckProjection = (state: SessionState, deck: SessionDeckIdV2): SessionDeckV1 => {
  const current = state.decks[deck];
  const params = Object.fromEntries(PARAM_IDS.map((id) => [id, current.params[id]]));
  return {
    // The registry is the proof that this derived object has every ParamId exactly once.
    // oxlint-disable-next-line no-unsafe-type-assertion
    params: params as Record<ParamId, number>,
    effects: [...current.effects],
    source: sourceProjection(current.source),
    loop: current.loop === null ? null : { ...current.loop },
  };
};

/** The current durable projection; derived and graph-owned deck fields remain absent. */
export function sessionV2(state: SessionState): SessionV2 {
  return {
    version: SESSION_V2_VERSION,
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

function validateDeck(value: unknown, deck: string): void {
  const at = `session.decks.${deck}`;
  const stored = objectAt(value, at);
  exactKeys(stored, ["params", "effects", "source", "loop"], at);

  const params = objectAt(stored.params, `${at}.params`);
  exactKeys(params, PARAM_IDS, `${at}.params`);
  for (const id of PARAM_IDS) {
    const paramValue = finite(params[id], `${at}.params.${id}`);
    const spec = PARAMS[id];
    if (paramValue < spec.min || paramValue > spec.max) {
      throw new RangeError(`${at}.params.${id} is outside [${spec.min}, ${spec.max}]`);
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
  for (const deck of SESSION_V1_DECK_IDS) validateDeck(decks[deck], deck);
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
  for (const deck of SESSION_V2_DECK_IDS) validateDeck(decks[deck], deck);
  // Everything reachable has now been checked against SessionV2.
  // oxlint-disable-next-line no-unsafe-type-assertion
  return value as SessionV2;
}

/**
 * Append only: a future format adds its stage after this one. A stored version starts at its own
 * stage, while an older value proceeds through every later stage in order.
 */
const MIGRATIONS = [identityV1, migrateV2] as const;
const MIGRATION_COUNT: typeof CURRENT_SESSION_VERSION = MIGRATIONS.length;

export function migrateSession(value: unknown): SessionV2 {
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
  return migrated as SessionV2;
}
