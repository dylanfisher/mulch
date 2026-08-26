/**
 * @role One yard's drawn arrangement: the Compose dial, and behind the marker at its corner the
 *   three amounts saying how many rounds keep one arrangement, whether a kept one evolves and
 *   where a let-go one goes (0158), beside the cast saying which characters it may draw from at
 *   all (0174). Five fields of one `deck.player` spec, patched by the card that owns the command —
 *   the Phrase door said one tier up, which is what the three amounts are.
 * @instead What a drawn arrangement is, and the cursor that lays and reads it →
 *   src/lib/playerSong.ts. What a cast is, and the draw it narrows → src/lib/playerCast.ts. The
 *   parts it is playing, where a written arrangement is read → src/ui/PlayerDrawn.tsx. The door
 *   the four sit behind → src/ui/PlayerMore.tsx. What range each dial is drawn on →
 *   src/lib/playerKnobs.ts.
 */
import { useCallback } from "react";

import {
  PLAYER_CAST_LABEL,
  PLAYER_CAST_TOOLTIP,
  PLAYER_CHARACTER_LABELS,
  yardLabel,
} from "@/lib/copy";
import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";
import { inCast, PLAYER_CHARACTERS, withCharacter, type PlayerCharacter } from "@/lib/playerCast";
import { PLAYER_ARRANGE_KNOBS } from "@/lib/playerKnobs";
import type { DeckId } from "@/state/store";
import { Toggle } from "@/ui/components/toggle";
import { PlayerDial, voiceProps } from "@/ui/PlayerDial";
import { PlayerMore, type PlayerDoorProps } from "@/ui/PlayerMore";
import { Says } from "@/ui/Says";

/**
 * One character of the cast as a press. Its own component so the handler is the component's rather
 * than a closure the row rebuilds every render, which is what `react-perf` asks of a control drawn
 * in a loop (src/ui/PlayerDial.tsx takes the same shape).
 *
 * A state and not an action — the name is in the cast or it is not — which is what a toggle is
 * (0055), and the word is the whole control, the way it is in the character menu: a character
 * carries no icon (0152). Outlined, which is what the card's other name-bearing presses are — the
 * toggle that selects a part a section below and the character menu's own six — so an unpressed
 * name reads as something to press rather than as text beside the eyebrow (principle 2).
 */
function CastToggle({
  deck,
  character,
  held,
  press,
  disabled,
}: {
  deck: DeckId;
  character: PlayerCharacter;
  held: boolean;
  press: (character: PlayerCharacter, held: boolean) => void;
  disabled: boolean;
}) {
  const onPressedChange = useCallback(
    (next: boolean) => {
      press(character, next);
    },
    [press, character],
  );
  return (
    <Says what={PLAYER_CAST_TOOLTIP}>
      <Toggle
        size="sm"
        variant="outline"
        pressed={held}
        disabled={disabled}
        aria-label={`${yardLabel(deck)} ${PLAYER_CAST_LABEL} ${PLAYER_CHARACTER_LABELS[character]}`}
        onPressedChange={onPressedChange}
      >
        {PLAYER_CHARACTER_LABELS[character]}
      </Toggle>
    </Says>
  );
}

// No character names any of the three amounts this door holds, so what a dial here paints is the
// spec's own number whatever part is standing (0152, 0158) — and none of them writes the cast
// either, which is the same refusal said for the list a drawn part is drawn from (0174).
//
// One handler per gesture the door offers, plus the dial the marker sits on and the two rows
// behind it: the length is how many controls this door holds rather than how much it decides. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function PlayerArrange({
  deck,
  named,
  player,
  defaults,
  patch,
  doors,
  voice,
  selected = false,
  disabled = false,
}: PlayerDoorProps) {
  const press = useCallback(
    (character: PlayerCharacter, held: boolean) => {
      const next = withCharacter(player.cast, character, held);
      // The last one on stays on: a cast permitting nobody is an arrangement with no part to draw,
      // and `assertPlayer` refuses one — so the press that would empty it does nothing rather than
      // failing loudly at the wire, the way the grid mask's strip refused its own last press
      // (0174, 0165, principle 5).
      if (next === 0) return;
      patch({ cast: next });
    },
    [patch, player.cast],
  );
  return (
    <PlayerMore
      deck={deck}
      named={named}
      doors={doors}
      // The one door of the seven that stays a popover, and it is kept for what is behind it
      // rather than for how much: six cast presses under an eyebrow of their own are not a row of
      // dials, and laid inline they are a block of a different height and a different grammar
      // standing beside dial columns (0174, P135, src/ui/PlayerMore.tsx).
      popped
      disabled={disabled}
      title={PLAYER_KNOB_LABELS.arrange}
      dial={
        <PlayerDial
          named={named}
          knob="arrange"
          player={player}
          defaults={defaults}
          patch={patch}
          {...voiceProps(voice)}
          selected={selected}
          disabled={disabled}
        />
      }
    >
      {/* The keep among them is counted in rounds of the arrangement, which is why it declares a
          range of its own where the figure's keep counts passes (src/lib/playerSong.ts). */}
      {PLAYER_ARRANGE_KNOBS.map((knob) => (
        <PlayerDial
          named={named}
          key={knob}
          knob={knob}
          player={player}
          defaults={defaults}
          patch={patch}
          {...voiceProps(voice)}
          selected={selected}
          disabled={disabled}
        />
      ))}
      {/* And the cast beside them, under an eyebrow of its own: it is behind this marker because
          it shapes the draw this dial makes and nothing else, which is what a door holds (0124).
          Two deep and column-major, which is the shape six presses read in and the one reason this
          door is still a popup: laid inline it would be a block of a different height and a
          different grammar beside dial columns (0174, P135). */}
      <div className="flex flex-col gap-1">
        <span className="type-eyebrow text-muted-foreground">{PLAYER_CAST_LABEL}</span>
        <div className="grid grid-flow-col grid-rows-2 gap-1">
          {PLAYER_CHARACTERS.map((character) => (
            <CastToggle
              key={character}
              deck={deck}
              character={character}
              held={inCast(player.cast, character)}
              press={press}
              disabled={disabled}
            />
          ))}
        </div>
      </div>
    </PlayerMore>
  );
}
