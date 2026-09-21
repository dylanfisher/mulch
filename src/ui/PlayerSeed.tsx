/**
 * @role The seed as a field rather than a readout: the one number a whole pattern unfolds from,
 *   read on the heading and typed back there, so a performance heard once can be dialled up again
 *   from the number that made it (0089, 0312).
 * @instead The other press of the same draw, beside the six names that fill the dials →
 *   src/ui/PlayerBlend.tsx. Minting the number both of them send → src/ui/PlayerCard.tsx. What the
 *   number unfolds into → src/lib/player.ts; this file knows only that it is a whole 32 bits.
 */
import { useCallback } from "react";

import { ACTION_TOOLTIPS, SEED_LABEL } from "@/lib/copy";
import { isPlayerSeed, PLAYER_SEED_MAX } from "@/lib/player";
import { Button } from "@/ui/components/button";
import { ACTION_ICONS } from "@/ui/icons";
import { InlineField, useFieldCommit } from "@/ui/InlineField";
import { Says } from "@/ui/Says";

/**
 * Uncontrolled and committed on blur or Enter, the way the load's own field is
 * (src/ui/LoadField.tsx): a seed sent per keystroke would restart the pass under the hand typing
 * it, and every prefix of a ten-digit number is a different pattern. `key` is the committed seed,
 * so a reseed — or an undo, or a session loaded from a file — remounts the field in step.
 */
// The prop list with its two documented presses, the commit that refuses a bad seed, and one field
// beside one button. Nothing branches; what is over is the documentation of why the die sits on
// this row. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function PlayerSeed({
  id,
  seed,
  onCommit,
  reseed,
  reseedLabel,
}: {
  id: string;
  seed: number;
  onCommit: (seed: number) => void;
  /**
   * The card's own reseed — the same one press the front sends, handed here as well (0385). Not a
   * second way to draw a number: the mint is the card's, and this button and the front's are two
   * places to reach one command.
   */
  reseed: () => void;
  /** What that press is called, for the name a reader and ./scripts/smoke read it by. */
  reseedLabel: string;
}) {
  const commit = useCallback(
    (input: HTMLInputElement) => {
      const typed = input.valueAsNumber;
      if (typed === seed) return;
      if (isPlayerSeed(typed)) {
        onCommit(typed);
        return;
      }
      // A refused seed patches nothing, so nothing remounts this field: put the pattern's own
      // number back rather than leave the heading reading one the deck is not playing.
      input.value = String(seed);
    },
    [seed, onCommit],
  );

  const { onBlur, onKeyDown } = useFieldCommit(commit);

  return (
    // The field and the die that fills it, on one row: typing a number in and drawing one are the
    // same question asked two ways, and the number is read here — above the fold, where a folded
    // yard still says which pattern it holds — so the press that draws another is read here too
    // (0385, P98, 0312).
    <div className="flex items-center gap-1">
      <InlineField
        key={seed}
        id={id}
        label={SEED_LABEL}
        type="number"
        // Ten digits wide: a seed is the whole 32 bits, and one that scrolls inside its own box is
        // a number nobody can read off a screen to write down (P98).
        className="w-28 type-readout"
        min={0}
        max={PLAYER_SEED_MAX}
        step={1}
        defaultValue={seed}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
      />
      <Says what={ACTION_TOOLTIPS.reseed}>
        <Button size="icon-sm" variant="ghost" aria-label={reseedLabel} onClick={reseed}>
          <ACTION_ICONS.reseed />
        </Button>
      </Says>
    </div>
  );
}
