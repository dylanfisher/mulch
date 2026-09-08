/**
 * @role The seed as a field rather than a readout: the one number a whole pattern unfolds from,
 *   read on the heading and typed back there, so a performance heard once can be dialled up again
 *   from the number that made it (0089, 0312).
 * @instead Drawing a new one → the reseed on the card's front, src/ui/PlayerBlend.tsx. What the
 *   number unfolds into → src/lib/player.ts; this file knows only that it is a whole 32 bits.
 */
import { type FocusEvent, type KeyboardEvent, useCallback } from "react";

import { SEED_LABEL } from "@/lib/copy";
import { isPlayerSeed, PLAYER_SEED_MAX } from "@/lib/player";
import { InlineField } from "@/ui/InlineField";

/**
 * Uncontrolled and committed on blur or Enter, the way the load's own field is
 * (src/ui/LoadField.tsx): a seed sent per keystroke would restart the pass under the hand typing
 * it, and every prefix of a ten-digit number is a different pattern. `key` is the committed seed,
 * so a reseed — or an undo, or a session loaded from a file — remounts the field in step.
 */
export function PlayerSeed({
  id,
  seed,
  onCommit,
}: {
  id: string;
  seed: number;
  onCommit: (seed: number) => void;
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

  const onBlur = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      commit(event.currentTarget);
    },
    [commit],
  );
  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") commit(event.currentTarget);
    },
    [commit],
  );

  return (
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
  );
}
