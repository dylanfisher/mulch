/**
 * @role One row of the drift, built with only what a case actually varies spelled out. Nothing in
 *   production imports this file — it exists so the three tests that paint or measure rows share
 *   one set of defaults instead of writing the nine fields out three times, the way
 *   src/ui/keyPress.ts serves the shortcut tests and src/audio/deckDouble.ts the transport's.
 * @instead What a row means, and the maths every field of it is read through → src/lib/moire.ts.
 *   What a yard's real rows are made of → src/ui/moireRows.ts, which builds them from a session.
 */
import { DRIFT_REST, FLAT_BEND, LINEAR_GEOMETRY, PLAIN_PROFILE, type MoireRow } from "./moire";

export const moireRow = (over: Partial<MoireRow> = {}): MoireRow => ({
  period: 1,
  phase: 0,
  pulse: 0,
  reference: false,
  shape: 0,
  bend: FLAT_BEND,
  profile: PLAIN_PROFILE,
  geometry: LINEAR_GEOMETRY,
  // A row no value of an effect's reaches: cut at the one depth, drawn at the pitch its period
  // sets. The neutral `driftReached` fills a dimension nothing declared with (0139).
  ...DRIFT_REST,
  ...over,
});
