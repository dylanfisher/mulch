/**
 * @role The row of names under a knob's lane preview: the characters a lane may be drawn as, each
 *   a press that draws one as if a hand had recorded it (0309). One `automation.set` per press,
 *   sent by the knob that owns the lane.
 * @instead The popover it sits in, and the knob that holds the lane → src/ui/ParameterKnob.tsx.
 *   The jump pattern's character menu, which this is modelled on → src/ui/PlayerCharacter.tsx.
 *   What each character is → src/lib/motion.ts.
 */
import { useCallback } from "react";

import { MOTION_CHARACTER_LABELS, MOTION_CHARACTER_TOOLTIPS, MOTION_OFFER } from "@/lib/copyMotion";
import { MOTION_CHARACTERS, type MotionCharacter } from "@/lib/motion";
import { Button } from "@/ui/components/button";
import { Says } from "@/ui/Says";

/**
 * One name, and the press that draws it. A component of its own for the reason the character
 * menu's entries are: the handler has to carry which character it is, and a closure built in the
 * parent's render is a new prop on every frame.
 */
function MotionItem({
  character,
  named,
  press,
}: {
  character: MotionCharacter;
  named: string;
  press: (character: MotionCharacter) => void;
}) {
  const draw = useCallback(() => {
    press(character);
  }, [press, character]);
  return (
    <Says what={MOTION_CHARACTER_TOOLTIPS[character]}>
      <Button
        size="xs"
        variant="outline"
        aria-label={`${named} ${MOTION_CHARACTER_LABELS[character]}`}
        onClick={draw}
      >
        {MOTION_CHARACTER_LABELS[character]}
      </Button>
    </Says>
  );
}

export function MotionMenu({
  named,
  onDraw,
}: {
  /** What the presses are named after: the yard, the card and the dial they reach. */
  named: string;
  onDraw: (character: MotionCharacter) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="type-eyebrow text-muted-foreground">{MOTION_OFFER}</span>
      {/* Three across, the way the pattern's six are: one block a hand crosses. */}
      <div className="grid grid-cols-3 gap-1">
        {MOTION_CHARACTERS.map((character) => (
          <MotionItem key={character} character={character} named={named} press={onDraw} />
        ))}
      </div>
    </div>
  );
}
