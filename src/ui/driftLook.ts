/**
 * @role Which look the drift is drawn in — one field every yard shares, or the scene each yard's
 *   name reads — the one place it is read and written. A view preference like the drift's own
 *   switch: it sends nothing, changes no session state and leaves no history entry (plan §2, 0400).
 * @instead Never touch localStorage for it: go through `useDriftLook`. The cache, the tab's
 *   listener and the guarded read and write → `storedChoice` in src/ui/preference.ts. Whether the
 *   picture is drawn at all → src/ui/driftShown.ts. What a yard's name reads as a scene →
 *   src/lib/yardScene.ts.
 */
import { storedChoice } from "@/ui/preference";

/** The two looks: one field for every yard, or the scene each yard's name picks. */
export type DriftLook = "uniform" | "scenes";

/** The one value the key holds while each yard draws its own scene; absent is the one field. */
const SCENES = "scenes";

const look = storedChoice<DriftLook>(
  "mulch:drift-look",
  // What the console calls this preference when the store under it refuses.
  "drift look",
  // Scenes only where the key says so; anything else, including no store at all, is the one field.
  (saved) => (saved === SCENES ? "scenes" : "uniform"),
  // The one field is the absence of a choice, so it is stored as the absence of one.
  (chosen) => (chosen === "scenes" ? SCENES : null),
  "uniform",
);

export const setDriftLook = look.set;

/** Which look the drift is drawn in. */
export const useDriftLook = look.use;
