/**
 * @role The menu behind a knob's motion mark: the characters a motion may be, each a press that
 *   deals a new seed, and — while the knob holds one — the press that deals it again and the one
 *   that takes it away (0309). One `motion.set` per press, carrying the whole spec.
 * @instead The mark it hangs off, and the knob that holds the motion → src/ui/ParameterKnob.tsx.
 *   The jump pattern's character menu, which this is modelled on → src/ui/PlayerCharacter.tsx.
 *   What each character is → src/lib/motion.ts.
 */
import { useCallback } from "react";

import { PLAYER_AGAIN_LABEL } from "@/lib/copy";
import {
  MOTION_CHARACTER_LABELS,
  MOTION_CHARACTER_TOOLTIPS,
  MOTION_LABEL,
  MOTION_OFF_LABEL,
  MOTION_OFFER,
} from "@/lib/copyMotion";
import { MOTION_CHARACTERS, type MotionCharacter, type MotionSpec } from "@/lib/motion";
import { mintSeed } from "@/lib/random";
import { Button } from "@/ui/components/button";
import { Says } from "@/ui/Says";

/**
 * One name, and the press that deals it. A component of its own for the reason the character
 * menu's entries are: the handler has to carry which character it is, and a closure built in the
 * parent's render is a new prop on every frame.
 */
function MotionItem({
  character,
  held,
  named,
  press,
}: {
  character: MotionCharacter;
  /** Whether this is the character the knob is already moving as — a state, drawn filled. */
  held: boolean;
  named: string;
  press: (character: MotionCharacter) => void;
}) {
  const deal = useCallback(() => {
    press(character);
  }, [press, character]);
  return (
    <Says what={MOTION_CHARACTER_TOOLTIPS[character]}>
      <Button
        size="xs"
        variant={held ? "default" : "outline"}
        aria-label={`${named} ${MOTION_CHARACTER_LABELS[character]}`}
        aria-pressed={held}
        onClick={deal}
      >
        {MOTION_CHARACTER_LABELS[character]}
      </Button>
    </Says>
  );
}

export function MotionMenu({
  named,
  held,
  onSet,
}: {
  /** What the presses are named after: the yard, the card and the dial they reach. */
  named: string;
  held: MotionSpec | null;
  onSet: (motion: MotionSpec | null) => void;
}) {
  const prefix = `${named} ${MOTION_LABEL}`;
  // The seed is dealt on the click and travels in the command, so the session recorded is the
  // session replayed; nothing on a play-time path draws anything (0089, src/lib/random.ts).
  const press = useCallback(
    (character: MotionCharacter) => {
      onSet({ character, seed: mintSeed() });
    },
    [onSet],
  );
  const again = useCallback(() => {
    if (held !== null) press(held.character);
  }, [held, press]);
  const off = useCallback(() => {
    onSet(null);
  }, [onSet]);

  return (
    <div className="flex flex-col gap-2">
      <span className="type-eyebrow text-muted-foreground">
        {held === null ? MOTION_OFFER : MOTION_CHARACTER_LABELS[held.character]}
      </span>
      {/* Three across, the way the pattern's six are: one block a hand crosses. */}
      <div className="grid grid-cols-3 gap-1">
        {MOTION_CHARACTERS.map((character) => (
          <MotionItem
            key={character}
            character={character}
            held={held?.character === character}
            named={prefix}
            press={press}
          />
        ))}
      </div>
      {held === null ? null : (
        <div className="flex gap-1">
          <Button
            size="xs"
            variant="outline"
            aria-label={`${prefix} ${PLAYER_AGAIN_LABEL}`}
            onClick={again}
          >
            {PLAYER_AGAIN_LABEL}
          </Button>
          <Button
            size="xs"
            variant="outline"
            aria-label={`${prefix} ${MOTION_OFF_LABEL}`}
            onClick={off}
          >
            {MOTION_OFF_LABEL}
          </Button>
        </div>
      )}
    </div>
  );
}
