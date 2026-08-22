/**
 * @role The caret on a heading that is its own fold: one picture, turned by the Toggle's own
 *   pressed state rather than swapped for a second icon (0055).
 * @instead The heading itself → the surface that owns the fold, which decides the word and its
 *   type utility. Only the caret is the same at all three, which is why only the caret is here.
 */
import { ACTION_ICONS } from "@/ui/icons";

export function FoldCaret() {
  return (
    <ACTION_ICONS.collapse
      data-icon="inline-end"
      className="transition-transform group-aria-pressed/toggle:rotate-180"
    />
  );
}
