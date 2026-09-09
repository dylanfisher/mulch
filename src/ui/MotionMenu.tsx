/**
 * @role The row of names under a knob's lane preview: the characters a lane may be drawn as, each
 *   a press that draws one as if a hand had recorded it (0309) — and under them, how many passes a
 *   drawn lane plays before the knob draws it again in its place (0311). Two rows of one shape:
 *   both are toggle groups pressed on what the session holds, because a character standing and a
 *   count standing are one kind of fact and one control says it (0314). Under them, the two
 *   presses that carry a whole motion from one knob to another (0319).
 * @instead The popover it sits in, and the knob that holds the lane → src/ui/ParameterKnob.tsx.
 *   What one motion in hand is → src/ui/motionClipboard.ts.
 *   The jump pattern's character menu, which this is modelled on → src/ui/PlayerCharacter.tsx.
 *   What each character is, and the counts offered → src/lib/motion.ts.
 */
import { useCallback, useMemo } from "react";

import {
  MOTION_CHARACTER_LABELS,
  MOTION_CHARACTER_TOOLTIPS,
  MOTION_COPY,
  MOTION_COPY_SAYS,
  MOTION_OFFER,
  MOTION_PASTE,
  MOTION_PASTE_SAYS,
  MOTION_REDRAW_OFF,
  MOTION_REDRAW_OFFER,
  MOTION_REDRAW_SAYS,
  redrawPassesLabel,
} from "@/lib/copyMotion";
import {
  rescaleLane,
  type AutomationLane,
  type AutomationPoint,
  type AutomationRange,
} from "@/lib/automation";
import {
  isMotionCharacter,
  MOTION_CHARACTERS,
  MOTION_REDRAW_PASSES,
  type MotionCharacter,
  type MotionDrawn,
  type MotionRedraw,
} from "@/lib/motion";
import { Button } from "@/ui/components/button";
import { ToggleGroup, ToggleGroupItem } from "@/ui/components/toggle-group";
import { carryMotion, useMotionClipboard } from "@/ui/motionClipboard";
import { Says } from "@/ui/Says";

/** Off, and then the counts: what the redraw row offers, as the words the toggle group reads. */
const REDRAW_CHOICES: readonly MotionRedraw[] = [0, ...MOTION_REDRAW_PASSES];

/**
 * One name, and the press that draws it. A component of its own for the reason the character
 * menu's entries are: the item has to carry a tooltip of its own, and the group's own press is
 * what says which name was pressed.
 */
function MotionItem({ character, named }: { character: MotionCharacter; named: string }) {
  return (
    <Says what={MOTION_CHARACTER_TOOLTIPS[character]}>
      <ToggleGroupItem
        value={character}
        aria-label={`${named} ${MOTION_CHARACTER_LABELS[character]}`}
      >
        {MOTION_CHARACTER_LABELS[character]}
      </ToggleGroupItem>
    </Says>
  );
}

/**
 * The names, as the one shape the row beneath them already wears: pressed on the character the
 * session holds for this lane, and pressing the lit one draws a new lane in that same character
 * (0314). Its own component for the reason the row below is — the group's value is an array,
 * built once per character rather than once per render of the menu.
 */
function CharacterRow({
  named,
  character,
  onDraw,
}: {
  named: string;
  character: MotionCharacter | null;
  onDraw: (character: MotionCharacter) => void;
}) {
  // Memoised: a fresh array every render is a new prop on a control in a loop (`react-perf`).
  const value = useMemo(() => (character === null ? [] : [character]), [character]);
  // Base UI clears the group when the pressed name was already on, so an empty selection is a
  // press on the lit one — which is a draw in that same character, exactly as 0311 asks.
  const onValueChange = useCallback(
    (next: string[]) => {
      const [word] = next;
      if (isMotionCharacter(word)) onDraw(word);
      else if (character !== null) onDraw(character);
    },
    [onDraw, character],
  );
  return (
    <ToggleGroup
      value={value}
      onValueChange={onValueChange}
      variant="outline"
      size="sm"
      spacing={0}
      // Three across, the way the pattern's six are: one block a hand crosses.
      className="grid w-full grid-cols-3"
      aria-label={`${named} ${MOTION_OFFER}`}
    >
      {MOTION_CHARACTERS.map((character_) => (
        <MotionItem key={character_} character={character_} named={named} />
      ))}
    </ToggleGroup>
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
  disabled,
  onEvery,
}: {
  named: string;
  every: MotionRedraw;
  /** A knob holding no drawn lane has nothing to redraw, so there is no count to set (0314). */
  disabled: boolean;
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
        disabled={disabled}
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

/**
 * One of the two presses, and what it says. A component of its own for the reason a character's
 * item is: the sentence is the press's own, and both presses are one shape.
 */
function ClipboardPress({
  word,
  says,
  named,
  disabled,
  onPress,
}: {
  word: string;
  says: string;
  named: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Says what={says}>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={onPress}
        aria-label={`${named} ${word}`}
      >
        {word}
      </Button>
    </Says>
  );
}

/**
 * The two presses under the rows: this knob's whole motion taken off it, and the one being
 * carried put on. Copy has nothing to take from a knob holding no lane, so it stands disabled the
 * way the count above it does; Paste is not there at all until something is carried, because an
 * empty clipboard is not a paste that does nothing (0319). A lane is rescaled from the range it
 * was drawn in onto this knob's own as it is pasted, which is the only place both ranges are
 * known.
 */
function ClipboardRow({
  named,
  lane,
  range,
  drawn,
  onPaste,
}: {
  named: string;
  lane: readonly AutomationPoint[] | null;
  range: AutomationRange;
  drawn: MotionDrawn | null;
  onPaste: (points: AutomationLane, drawn: MotionDrawn | null) => void;
}) {
  const held = useMotionClipboard();
  const onCopy = useCallback(() => {
    // The row is disabled with no lane, and this is the same fact said where the clip is built.
    if (lane === null) return;
    // A copy of what stands now: the lane the knob later clears or redraws is not this one.
    carryMotion({ lane: lane.map((point) => ({ ...point })), range, drawn });
  }, [lane, range, drawn]);
  const onPastePress = useCallback(() => {
    if (held === null) return;
    onPaste(rescaleLane(held.lane, held.range, range), held.drawn);
  }, [held, range, onPaste]);
  return (
    <div className="grid w-full grid-cols-2 gap-1">
      <ClipboardPress
        word={MOTION_COPY}
        says={MOTION_COPY_SAYS}
        named={named}
        disabled={lane === null}
        onPress={onCopy}
      />
      {held === null ? null : (
        <ClipboardPress
          word={MOTION_PASTE}
          says={MOTION_PASTE_SAYS}
          named={named}
          disabled={false}
          onPress={onPastePress}
        />
      )}
    </div>
  );
}

export function MotionMenu({
  named,
  lane,
  range,
  drawn,
  onDraw,
  onEvery,
  onPaste,
}: {
  /** What the presses are named after: the yard, the card and the dial they reach. */
  named: string;
  /** The lane this knob holds, or null — what a copy takes, and nothing to take where it is null. */
  lane: readonly AutomationPoint[] | null;
  /** The range that lane is meaningful beside: what a copy carries, and what a paste scales onto. */
  range: AutomationRange;
  /** What drew the lane this knob holds, or null for one a hand rode and one that is not there. */
  drawn: MotionDrawn | null;
  onDraw: (character: MotionCharacter) => void;
  onEvery: (passes: MotionRedraw) => void;
  /** The carried motion, rescaled onto this knob's range, and what drew it where it was drawn. */
  onPaste: (points: AutomationLane, drawn: MotionDrawn | null) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="type-eyebrow text-muted-foreground">{MOTION_OFFER}</span>
      <CharacterRow named={named} character={drawn?.character ?? null} onDraw={onDraw} />
      <span className="type-eyebrow text-muted-foreground">{MOTION_REDRAW_OFFER}</span>
      <RedrawRow
        named={named}
        every={drawn?.redraw ?? 0}
        disabled={drawn === null}
        onEvery={onEvery}
      />
      <ClipboardRow named={named} lane={lane} range={range} drawn={drawn} onPaste={onPaste} />
    </div>
  );
}
