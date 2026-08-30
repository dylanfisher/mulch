/**
 * @role One yard's drawn arrangement: the Compose dial, and beside it in its own run the seven
 *   amounts saying what becomes of a run over time — how many rounds keep one, whether a kept one
 *   evolves, where a let-go one goes and how fast a fresh one arrives — and what the parts inside
 *   it may be — how far each is taken from the dials, how long each lasts, and how unlike its
 *   neighbour each is (0158, 0199), beside the cast saying which characters it may draw from at
 *   all (0174). Nine fields of one `deck.player` spec, patched by the card that owns the command.
 * @instead What a drawn arrangement is, and the cursor that lays and reads it →
 *   src/lib/playerSong.ts. What a cast is, and the draw it narrows → src/lib/playerCast.ts. The
 *   parts it is playing, where a written arrangement is read → src/ui/PlayerDrawn.tsx. The run the
 *   four stand in, and the name they wear in it → src/ui/PlayerRun.tsx. What range each dial is
 *   drawn on → src/lib/playerKnobs.ts.
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
import { PlayerRun, runName, type PlayerRunProps } from "@/ui/PlayerRun";
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

// No character names any of the seven amounts this run holds, so what a dial here paints is the
// spec's own number whatever part is standing (0152, 0158) — and none of them writes the cast
// either, which is the same refusal said for the list a drawn part is drawn from (0174).
//
// One handler per gesture the run offers, plus the dial it belongs to and the two blocks beside
// it: the length is how many controls this run holds rather than how much it decides. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function PlayerArrange({
  deck,
  named,
  player,
  defaults,
  patch,
  voice,
  selected = false,
  disabled = false,
}: PlayerRunProps) {
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
    <PlayerRun
      title={PLAYER_KNOB_LABELS.arrange}
      dial={
        <PlayerDial
          named={named}
          size="default"
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
      {/* In the order the module declares them, which is the order a hand meets the questions: what
          becomes of the run, then what the parts in it may be (`PLAYER_ARRANGE_KNOBS`). The keep
          among them is counted in rounds of the arrangement, which is why it declares a range of
          its own where the figure's keep counts passes; the grow beside it counts the same rounds,
          and the span counts doublings of a part's own length (src/lib/playerSong.ts, 0199). */}
      {PLAYER_ARRANGE_KNOBS.map((knob) => (
        <PlayerDial
          named={runName(named, PLAYER_KNOB_LABELS.arrange)}
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
      {/* And the cast beside them, under an eyebrow of its own: it is in this run because it shapes
          the draw this dial makes and nothing else, which is what a run holds (0124). Two deep and
          column-major, which is the shape six presses read in — the same shape the ground's own
          clock stands in beside its dials (0174, 0195, src/ui/PlayerBed.tsx). */}
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
    </PlayerRun>
  );
}
