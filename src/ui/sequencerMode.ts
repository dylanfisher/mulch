/**
 * @role The sequencer view — whether every yard is drawn folded with its sequence in the header's
 *   slack — the one place it is read and written. A view preference exactly like the theme's: it
 *   sends nothing, changes no session state and leaves no history entry (plan §2, 0379).
 * @instead Never touch localStorage for it: go through `useSequencerMode`. The cache, the tab's
 *   listener and the guarded read and write → `storedChoice` in src/ui/preference.ts. The theme,
 *   whose shape this copies → src/ui/theme.ts.
 */
import { storedChoice } from "@/ui/preference";

/** The one value the key holds while the view is on; absent is off, and off is where everybody
 *  starts — on the server, where no store is read, and on a first visit. */
const ON = "on";

const mode = storedChoice<boolean>(
  "mulch:sequencer",
  // What the console calls this preference when the store under it refuses.
  "sequencer view",
  // On only where the key says so; anything else, including no store at all, draws the yards the
  // ordinary way.
  (saved) => saved === ON,
  // Off is the absence of a choice, so it is stored as the absence of one.
  (on) => (on ? ON : null),
  false,
);

export const setSequencerMode = mode.set;

/** Whether the sequencer view is on. */
export const useSequencerMode = mode.use;
