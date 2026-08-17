/**
 * @role The one way to build a total record from a registry of ids — the shape every fixed id list
 *   in the app derives its per-id map from.
 * @instead A map whose keys are not a registry, or a lookup into one → plain object literals, and
 *   the tier's own accessor (`deckIn`, `paramIn`).
 */

/**
 * One value per id in `ids`, in the order the array gives them, keyed by the id itself. The array
 * is the registry, so the result is total by construction — which is exactly what no type can
 * prove about a runtime array, and why the assertion lives here.
 *
 * `Object.fromEntries` is typed `{ [k: string]: T }` whatever it is handed: the key type is lost
 * at the call, not recoverable from it. This is the single place that puts it back, so no caller
 * has to waive `no-unsafe-type-assertion` to describe a map it just built totally.
 */
export function fromIds<const Id extends PropertyKey, T>(
  ids: readonly Id[],
  value: (id: Id) => T,
): Record<Id, T> {
  // oxlint-disable-next-line no-unsafe-type-assertion
  return Object.fromEntries(ids.map((id) => [id, value(id)])) as Record<Id, T>;
}
