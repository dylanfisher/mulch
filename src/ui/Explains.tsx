/**
 * @role A sentence with a way in: the info press that carries one, for the controls a sentence
 *   cannot be read off. `Says` puts a sentence on a control a hand was already going to touch;
 *   this is for the ones it was not — a picture, an eyebrow, a canvas — where the sentence was
 *   reachable and nothing on screen said so (0080, 0198).
 * @instead A control that explains itself → wrap it in src/ui/Says.tsx and add nothing. The words
 *   → src/lib/copy.ts and its siblings, keyed by the list the control comes from.
 */
// The one icon in the instrument that is not in src/ui/icons.ts, and the reason is that file's own
// rule: the vocabulary is one picture per *action*, and this is not one — it sends no command,
// changes nothing durable and has no undo. It is the picture of a sentence, so it lives with the
// component that shows sentences, imported once here rather than at each surface that wants one.
import { InfoIcon } from "@phosphor-icons/react/Info";

import { EXPLAIN_LABEL } from "@/lib/copyCard";
import { Button } from "@/ui/components/button";
import { Says } from "@/ui/Says";

export function Explains({
  what,
  named,
}: {
  /** The sentence, from wherever the words the surface says are kept. */
  what: string;
  /**
   * What this press explains, as the thing's own name in this yard — the whole of the accessible
   * name beside `EXPLAIN_LABEL`. A screen has more than one picture in it, so "About" alone would
   * be several presses sharing one name (0055).
   */
  named: string;
}) {
  return (
    <Says what={what}>
      <Button
        size="icon-sm"
        variant="ghost"
        className="text-muted-foreground"
        aria-label={`${EXPLAIN_LABEL} ${named}`}
      >
        <InfoIcon />
      </Button>
    </Says>
  );
}
