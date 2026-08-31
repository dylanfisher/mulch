/**
 * @role The primitive guards at the untrusted boundary — the questions a command off the wire and
 *   a value out of stored JSON both have to answer before anything typed reads them.
 * @instead What a particular command or durable shape means once its primitives check out →
 *   src/app/wire.ts, src/state/session.ts.
 */

/**
 * How long any durable string may be. An id, a label and a name are one fact here: they are all
 * text this build writes to storage and reads back, and a bound that differs per kind is a
 * divergence waiting to happen rather than a distinction anything relies on.
 */
export const DURABLE_TEXT_MAX = 64;

/**
 * Whether a value is a plain JSON object: indexable, and neither null nor an array. The one
 * narrowing from unknown JSON to something whose fields can be read — as a predicate rather than
 * an assertion, so no caller has to waive `no-unsafe-type-assertion` to look inside its input.
 */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** The same narrowing where absence is a refusal rather than an answer, naming where it failed. */
export function objectAt(value: unknown, at: string): Record<string, unknown> {
  if (!isRecord(value)) throw new TypeError(`${at} is not an object`);
  return value;
}

/**
 * The key set a durable shape is allowed to have: exactly these, no extras and none missing. The
 * question every stored record answers before a typed field is read — a deck, a rack entry, a clip,
 * a player spec, a part, a bed and a written cell are one fact here, because a record carrying a
 * field nobody declared is a record from another build, not a record (0026).
 *
 * Seventeen sites spelled this check, in two implementations with two different messages: the
 * session's, which sorted both sides, and the player's, which counted and asked `hasOwn`. The
 * sorted one survives — it is the message the stored-session tests already read, and a sorted
 * report is the one a reader can compare two of.
 */
export function exactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  at: string,
): void {
  // ES2022 has no toSorted; both arrays are fresh, so sorting cannot mutate a caller's value.
  // oxlint-disable-next-line unicorn/no-array-sort
  const actual = Object.keys(value).sort();
  // oxlint-disable-next-line unicorn/no-array-sort
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new TypeError(`${at} has keys [${actual.join(", ")}], expected [${wanted.join(", ")}]`);
  }
}

/**
 * One number, proved to be one. JSON carries NaN as null and a string where a number belongs, and
 * both compare false in every direction rather than failing — so the check is at the door, once.
 */
export function finite(value: unknown, at: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${at} is not a finite number: ${String(value)}`);
  }
  return value;
}

/**
 * One number above zero. A sample rate, a frequency and a Q are all quantities the maths divides
 * by, and a zero or a NaN does not fail there — it produces an Infinity, a NaN buffer or a header
 * claiming 0 Hz, all of which read as data rather than as the refusal they are.
 */
export function positive(value: unknown, at: string): number {
  const number = finite(value, at);
  if (number <= 0) throw new RangeError(`${at} is not a positive number: ${number}`);
  return number;
}

/**
 * A finite number in `[min, max]`, or a loud no. The check every continuous durable field shares.
 * Here rather than beside the spec that reads it most: the player's numbers and a written cell's
 * numbers are checked by one thing, so a bound that means the same is never enforced twice
 * (principle 1, src/lib/player.ts, src/lib/playerStrip.ts).
 */
export function within(value: unknown, min: number, max: number, at: string): number {
  const number = finite(value, at);
  if (number < min || number > max)
    throw new RangeError(`${at} is outside ${min}…${max}: ${number}`);
  return number;
}

/** The same, and whole with it. The check every counted durable field shares. */
export function whole(value: unknown, min: number, max: number, at: string): number {
  const number = within(value, min, max, at);
  if (!Number.isInteger(number)) throw new RangeError(`${at} is not whole: ${number}`);
  return number;
}

/**
 * The one guard every durable field that is on or off goes through: a part's skip, an effect
 * instance's bypass and a pattern's own (P164). Three sites spelled the same `typeof` check, which
 * is the third occurrence principle 3 asks for, and the message is the one all three already said.
 */
export function flag(value: unknown, at: string): boolean {
  if (typeof value !== "boolean") throw new TypeError(`${at} is not a boolean`);
  return value;
}

/** The one guard every durable id, label and name goes through, wherever it arrived from. */
export function assertDurableText(value: unknown, at: string): asserts value is string {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${at} is not a non-empty string`);
  }
  if (value.length > DURABLE_TEXT_MAX) {
    throw new RangeError(`${at} is longer than ${DURABLE_TEXT_MAX} characters`);
  }
}
