/**
 * @role The door in the jumps card's corner that sets the whole pattern at once: the characters a
 *   spec may be drawn as, and the Amount slider saying how far from plain each draw is taken. One
 *   `deck.player` per press and one per drag, each carrying the whole spec and the seed it already
 *   had — so a character changes what the pattern is like and never which performance it is
 *   (0152, 0089).
 * @instead What each character is, and the arithmetic an amount moves by →
 *   src/lib/playerCharacter.ts. The dials a press moves, and the command they all patch →
 *   src/ui/PlayerCard.tsx.
 */
// Over the dependency cap by one, and the one is the slider: this component says six words, draws
// a popover, an icon button and a control that is not a knob, and every import below is one of
// those. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import { useCallback, useState } from "react";

import type { PlayerDefaults, PlayerSpec } from "@/lib/player";
import {
  blendCharacter,
  drawCharacter,
  PLAYER_AMOUNT_MAX,
  PLAYER_AMOUNT_MIN,
  PLAYER_AMOUNT_STEP,
  PLAYER_CHARACTERS,
  type PlayerCharacter as CharacterName,
} from "@/lib/playerCharacter";
import {
  ACTION_TOOLTIPS,
  PLAYER_AMOUNT_LABEL,
  PLAYER_AMOUNT_TOOLTIP,
  PLAYER_CHARACTER_LABEL,
  PLAYER_CHARACTER_LABELS,
  PLAYER_CHARACTER_TOOLTIPS,
  yardLabel,
} from "@/lib/copy";
import type { DeckId } from "@/state/store";
import { Button } from "@/ui/components/button";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/ui/components/popover";
import { Slider } from "@/ui/components/slider";
import { ACTION_ICONS } from "@/ui/icons";
import { Says } from "@/ui/Says";
import { INSTANT_POPUP } from "@/ui/shell";

/** The amount, as the readout beside its own caption: a percentage of the character taken. */
const amountLabel = (amount: number): string => `${Math.round(amount * 100)}%`;

/**
 * One name, and the press that draws it. A component of its own for the reason the effect
 * picker's entries are (src/ui/EffectPicker.tsx): the handler has to carry which character it is,
 * and a closure built in the parent's own render is a new prop on every frame the card draws.
 */
function CharacterItem({
  character,
  press,
}: {
  character: CharacterName;
  press: (character: CharacterName) => void;
}) {
  const draw = useCallback(() => {
    press(character);
  }, [press, character]);

  return (
    <Says what={PLAYER_CHARACTER_TOOLTIPS[character]}>
      <Button size="xs" variant="outline" onClick={draw}>
        {PLAYER_CHARACTER_LABELS[character]}
      </Button>
    </Says>
  );
}

// One state cell and one handler per gesture, plus a popover that draws its own trigger: the
// length is how many controls this menu offers rather than how much it decides. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function PlayerCharacter({
  deck,
  patch,
}: {
  deck: DeckId;
  /** The card's own patch: one `deck.player` per gesture, carrying the whole spec (0089). */
  patch: (fields: Partial<PlayerSpec>) => void;
}) {
  /**
   * How far in the next press goes, and the draw the slider is moving. Neither is durable and
   * neither may be: a spec is what the pattern is, and a field remembering which character it came
   * from would be a second answer to that question — one the dials could contradict the moment a
   * hand turned any of them (boundaries, 0152).
   *
   * The draw is kept so the slider has something to move *along*. Redrawing on every frame of a
   * drag would make the amount a die with a thousand faces; keeping it makes it a control over one
   * pattern, and pressing the name again is how a second draw is asked for.
   */
  const [amount, setAmount] = useState(PLAYER_AMOUNT_MAX);
  const [drawn, setDrawn] = useState<PlayerDefaults | null>(null);

  const press = useCallback(
    (character: CharacterName) => {
      // `Math.random()` is exactly right here and exactly wrong a layer down, for the reason the
      // seed's own draw is: this runs on a click and its result travels in the command (0089).
      const next = drawCharacter(character, Math.random);
      setDrawn(next);
      patch(blendCharacter(next, amount));
    },
    [patch, amount],
  );
  const onAmount = useCallback(
    (value: number | readonly number[]) => {
      // Base UI answers a one-thumb slider with a scalar and a range with a list; this one has a
      // thumb, so the list branch is the shape and not a case (src/ui/components/slider.tsx).
      const next = typeof value === "number" ? value : value[0];
      if (next === undefined) return;
      setAmount(next);
      // Nothing drawn yet is a slider with nowhere to travel: it sets what the next press takes
      // and says nothing to the instrument, rather than blending the card toward a character
      // nobody has named.
      if (drawn !== null) patch(blendCharacter(drawn, next));
    },
    [patch, drawn],
  );

  return (
    <Popover>
      <Says what={ACTION_TOOLTIPS.character}>
        <PopoverTrigger
          render={
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={`${PLAYER_CHARACTER_LABEL} on ${yardLabel(deck)}`}
            >
              <ACTION_ICONS.character />
            </Button>
          }
        />
      </Says>
      {/* Opens instantly, for the reason every other popup on this card does: ./scripts/drive
          clicks into it, and waiting out an enter and an exit costs the gate a scenario's worth of
          time for nothing a person would notice (0056). */}
      <PopoverContent side="bottom" align="end" className={`w-56 ${INSTANT_POPUP}`}>
        <PopoverTitle>{PLAYER_CHARACTER_LABEL}</PopoverTitle>
        {/* Three across, so the six read as one block a hand crosses rather than a list it
            descends. A press is an action and not a state — nothing here reports which character
            the card is on, because after the first turned dial there is no true answer to that. */}
        <div className="grid grid-cols-3 gap-1">
          {PLAYER_CHARACTERS.map((character) => (
            <CharacterItem key={character} character={character} press={press} />
          ))}
        </div>
        {/* Linear travel over one fraction, which is what a slider is for and what the dials
            around it are not: this is not a field of the spec, so drawing it as one more knob
            would put a control that sends no value of its own into a row where every control is
            one (src/ui/Knob.tsx, 0152). */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <Says what={PLAYER_AMOUNT_TOOLTIP}>
              <span className="type-eyebrow text-muted-foreground">{PLAYER_AMOUNT_LABEL}</span>
            </Says>
            <span className="type-readout text-muted-foreground">{amountLabel(amount)}</span>
          </div>
          <Slider
            value={amount}
            min={PLAYER_AMOUNT_MIN}
            max={PLAYER_AMOUNT_MAX}
            step={PLAYER_AMOUNT_STEP}
            aria-label={`${yardLabel(deck)} ${PLAYER_CHARACTER_LABEL} ${PLAYER_AMOUNT_LABEL}`}
            onValueChange={onAmount}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
