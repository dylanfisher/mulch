/**
 * @role The words on the drift's tuning panel: what the button that opens it says, what the two
 *   under it say, and the sentence a copied tuning is handed to an agent with. Out of
 *   src/lib/copy.ts because that file is at the hard cap (0045), the way src/lib/copyKnobs.ts is.
 * @instead The panel's groups, labels and hints → src/lib/copyDriftGroups.ts. Every other word the
 *   interface says, the picture's own name and its pop-out among them → src/lib/copy.ts. The numbers the panel moves → `tunable(` under src/lib and src/ui, and the
 *   registry they are moved through → src/lib/moireTuning.ts.
 */

/** What the zoomed picture's own button for the panel says, Titlecase per (0059). */
export const MOIRE_TUNE = "Tune";
export const MOIRE_TUNE_TITLE = "Drift Tuning";
export const MOIRE_TUNE_RESET = "Reset";
export const MOIRE_TUNE_COPY = "Copy For Agent";
export const MOIRE_TUNE_COPIED = "Tuning Copied";
export const MOIRE_TUNE_COPY_FAILED = "Tuning Not Copied";

/** The one slider at the head of every group, driving each of its rows toward its wild end. */
export const MOIRE_TUNE_PUSH = "Push";
export const MOIRE_TUNE_PUSH_HINT =
  "Drives every dial in this group from its rest toward its wilder end at once: at nothing the group rests, at the whole it is as extreme as it goes. Reads back where the dials stand on average.";

/**
 * What a tuning is copied as: a sentence telling an agent where each number lives and what to do
 * with it, then the changed values by id on a line of their own. The sentence names the one call
 * every tunable is declared with, so the agent greps rather than guesses (0299).
 */
export const tuningPrompt = (changes: Readonly<Record<string, number>>): string =>
  `Make these the drift's defaults. Each key is the id of a \`tunable("<id>", rest, range)\` declaration under src/ — grep the id, replace its rest value with the one here, and keep the range and the comment beside it.\n${JSON.stringify(changes)}`;
