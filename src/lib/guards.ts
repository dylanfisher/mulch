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
 * One number, proved to be one. JSON carries NaN as null and a string where a number belongs, and
 * both compare false in every direction rather than failing — so the check is at the door, once.
 */
export function finite(value: unknown, at: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${at} is not a finite number: ${String(value)}`);
  }
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
