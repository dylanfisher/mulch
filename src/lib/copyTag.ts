/**
 * @role The three words the tag has: what the field that holds it is called, what a hover on it
 *   says the word is for, and how a yard's name wears the word once one is written (0386). Out of
 *   src/lib/copy.ts because the hint's arrival put that file over the hard cap, and a split is what
 *   the cap asks for (0045).
 * @instead The field itself → src/ui/DeckTag.tsx. The yard's own name, which never changes →
 *   src/lib/copyYard.ts. Every other word the interface says → src/lib/copy.ts.
 */

/**
 * What the word a hand writes on a yard is called, where the field that holds it is labelled.
 * Titlecase per 0059, and no vocabulary behind it: "low end" and "tops" are the hand's words, so
 * the instrument offers a field and never a list (0386).
 */
export const TAG_LABEL = "Tag";

/**
 * What the tag is for, worn as the field's `title` so a hover on the word or its box says it: a
 * one-word label offers nothing else to explain itself by. A sentence, not a title (0059), and the
 * examples are the ones 0386 gives.
 */
export const TAG_HINT =
  'A word of your own for this yard, such as "low end" or "tops". It is kept with the session and shown beside the yard\'s name wherever it is picked.';

/**
 * Anything a yard is named by, wearing the word a hand wrote on that yard — and exactly itself
 * where nobody has written one. One composition rather than one per list, so the menu that
 * carries an effect to a yard and anything else that comes to name one read the same (0386).
 */
export const taggedLabel = (label: string, tag: string): string =>
  tag === "" ? label : `${label} (${tag})`;
