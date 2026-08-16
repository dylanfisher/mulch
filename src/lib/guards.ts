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

/** Whether a value is durable text. The louder question — why not — is `assertDurableText`. */
export const isDurableText = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= DURABLE_TEXT_MAX;

/** The one guard every durable id, label and name goes through, wherever it arrived from. */
export function assertDurableText(value: unknown, at: string): asserts value is string {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${at} is not a non-empty string`);
  }
  if (value.length > DURABLE_TEXT_MAX) {
    throw new RangeError(`${at} is longer than ${DURABLE_TEXT_MAX} characters`);
  }
}
