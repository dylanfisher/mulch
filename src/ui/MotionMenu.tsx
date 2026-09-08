/**
 * @role The row of names under a knob's lane preview: the characters a lane may be drawn as, each
 *   a press that draws one as if a hand had recorded it (0309) — and under them, how many passes a
 *   drawn lane plays before the knob draws it again in its place (0311). One `automation.set` per
 *   press, sent by the knob that owns the lane; the count is the knob's own, nothing durable.
 * @instead The popover it sits in, and the knob that holds the lane → src/ui/ParameterKnob.tsx.
 *   The jump pattern's character menu, which this is modelled on → src/ui/PlayerCharacter.tsx.
 *   What each character is, and the counts offered → src/lib/motion.ts.
 */
import { useCallback, useMemo } from "react";

import {
  MOTION_CHARACTER_LABELS,
  MOTION_CHARACTER_TOOLTIPS,
  MOTION_OFFER,
  MOTION_REDRAW_OFF,
  MOTION_REDRAW_OFFER,
  MOTION_REDRAW_SAYS,
  redrawPassesLabel,
} from "@/lib/copyMotion";
import {
  MOTION_CHARACTERS,
  MOTION_REDRAW_PASSES,
  type MotionCharacter,
  type MotionRedraw,
} from "@/lib/motion";
import { Button } from "@/ui/components/button";
import { ToggleGroup, ToggleGroupItem } from "@/ui/components/toggle-group";
import { Says } from "@/ui/Says";

/** Off, and then the counts: what the redraw row offers, as the words the toggle group reads. */
const REDRAW_CHOICES: readonly MotionRedraw[] = [0, ...MOTION_REDRAW_PASSES];

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

/**
 * The row under the names: off, and the counts a drawn lane may play before it is drawn again.
 * Its own component for the reason the entries above are — the group's value is an array, built
 * once per count rather than once per render of the menu.
 */
function RedrawRow({
  named,
  every,
  onEvery,
}: {
  named: string;
  every: MotionRedraw;
  onEvery: (passes: MotionRedraw) => void;
}) {
  // Memoised: a fresh array every render is a new prop on a control in a loop (`react-perf`).
  const value = useMemo(() => [String(every)], [every]);
  // Base UI clears the group when the pressed count was already on, and one count is always on —
  // so an empty selection is a press on the lit one, and sends nothing (principle 5).
  const onValueChange = useCallback(
    (next: string[]) => {
      const [word] = next;
      const pressed = REDRAW_CHOICES.find((count) => String(count) === word);
      if (pressed !== undefined) onEvery(pressed);
    },
    [onEvery],
  );
  return (
    <Says what={MOTION_REDRAW_SAYS}>
      <ToggleGroup
        value={value}
        onValueChange={onValueChange}
        variant="outline"
        size="sm"
        spacing={0}
        aria-label={`${named} ${MOTION_REDRAW_OFFER}`}
      >
        {REDRAW_CHOICES.map((count) => (
          <ToggleGroupItem
            key={count}
            value={String(count)}
            aria-label={
              count === 0 ? `${named} ${MOTION_REDRAW_OFF}` : `${named} ${redrawPassesLabel(count)}`
            }
          >
            {count === 0 ? MOTION_REDRAW_OFF : count}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </Says>
  );
}

export function MotionMenu({
  named,
  onDraw,
  every,
  onEvery,
}: {
  /** What the presses are named after: the yard, the card and the dial they reach. */
  named: string;
  onDraw: (character: MotionCharacter) => void;
  /** How many passes a drawn lane plays before it is drawn again, or 0 for never. */
  every: MotionRedraw;
  onEvery: (passes: MotionRedraw) => void;
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
      <span className="type-eyebrow text-muted-foreground">{MOTION_REDRAW_OFFER}</span>
      <RedrawRow named={named} every={every} onEvery={onEvery} />
    </div>
  );
}
