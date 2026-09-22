/**
 * @role The words the drift's own controls say: the switch that decides whether the picture is
 *   drawn at all, the one that decides whether it is one field or each yard's scene, the button that hands it a window of its own, and the tuning panel — what the
 *   button that opens it says, what the two under it say, and the sentence a copied tuning is
 *   handed to an agent with. Out of src/lib/copy.ts because that file is at the hard cap (0045),
 *   the way src/lib/copyKnobs.ts is — and the pop-out's two words came here when the switch's
 *   arrival put that file over it (0397).
 * @instead The panel's groups, labels and hints → src/lib/copyDriftGroups.ts. Every other word the
 *   interface says, the picture's own two names among them → src/lib/copy.ts. The numbers the
 *   panel moves → `tunable(` under src/lib and src/ui, and the registry they are moved through →
 *   src/lib/moireTuning.ts.
 */

/**
 * The switch on the header bar, which is the one control that takes the picture away entirely,
 * and the sentence saying what that buys. Said as the gesture rather than as the state, the way
 * every other label on the bar is (0059): pressed is the picture gone.
 */
export const MOIRE_SWITCH_LABEL = "Switch Off The Drift";
export const MOIRE_SWITCH_TOOLTIP =
  "Stop drawing the drift anywhere: no strip on a yard, nothing to open in full, and no picture being worked out behind the sound. For a machine that would rather spend everything it has on playing. Press again and the pictures come back.";

/**
 * The switch beside it, which decides what the picture is *of*: pressed, each yard draws the scene
 * its name reads; released, every yard draws the one field, moved by its own sound (0400).
 */
export const MOIRE_LOOK_LABEL = "Draw Each Yard's Scene";
export const MOIRE_LOOK_TOOLTIP =
  "Draw each yard as the place its name describes, a meadow, a bloom, water or a canopy, instead of one field every yard shares. Every yard still moves to its own sound either way. Press again for the one field.";

/** What the zoomed picture's own button for a window of its own says (0139). */
export const MOIRE_POP_OUT = "Pop Out";

/**
 * What that button buys, and the one place the strip's hidden gesture is written down. The
 * sentence says what a second window is for — watching the drift while turning the knobs that make
 * it drift, which a picture over the instrument cannot offer (0138) — rather than naming the
 * browser feature, and the shortcut is said here because a gesture nothing says is a gesture
 * nobody finds.
 */
export const MOIRE_POP_OUT_TOOLTIP =
  "Hands this picture to a browser window of its own, so the instrument underneath stays reachable — put it on another screen and it keeps drawing there. Option-click the strip to send it straight out.";

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
