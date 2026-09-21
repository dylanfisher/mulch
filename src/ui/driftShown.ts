/**
 * @role Whether the drift is drawn at all — the switch a machine that cannot afford the picture
 *   turns off — the one place it is read and written. A view preference exactly like the
 *   sequencer's: it sends nothing, changes no session state and leaves no history entry
 *   (plan §2, 0397).
 * @instead Never touch localStorage for it: go through `useDriftShown`. The cache, the tab's
 *   listener and the guarded read and write → `storedChoice` in src/ui/preference.ts. The picture
 *   the switch withholds → src/ui/MoireStrip.tsx, which mounts nothing at all while this says off.
 *   The other preferences that outlive a reload → src/ui/theme.ts, src/ui/sequencerMode.ts and
 *   src/ui/rackFold.ts.
 */
import { storedChoice } from "@/ui/preference";

/** The one value the key holds while the picture is off; absent is the picture drawn, and that is
 *  what everybody starts on — on the server, where no store is read, and on a first visit. */
const OFF = "off";

const shown = storedChoice<boolean>(
  "mulch:drift",
  // What the console calls this preference when the store under it refuses.
  "drift switch",
  // Off only where the key says so; anything else, including no store at all, draws the picture.
  (saved) => saved !== OFF,
  // Drawing the picture is the absence of a choice, so it is stored as the absence of one.
  (drawn) => (drawn ? null : OFF),
  true,
);

export const setDriftShown = shown.set;

/** Whether the drift is drawn at all. */
export const useDriftShown = shown.use;
