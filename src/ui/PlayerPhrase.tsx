/**
 * @role One yard's figure: the Phrase dial, and behind the marker at its corner the three amounts
 *   saying how many passes keep one figure, whether a kept one evolves and where a let-go one goes
 *   (0151). Four fields of one `deck.player` spec, patched by the card that owns the command.
 * @instead What a figure becomes in sound — which slot each landing reads from →
 *   src/audio/player.ts. What a figure is, and the walk that lays and reads it → src/lib/player.ts.
 *   The door the three sit behind → src/ui/PlayerMore.tsx.
 */
// One callback per field and one dial per field, and the length is how many fields the figure
// declares rather than how much this component decides — the same waiver the repeats group beside
// it carries. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines-per-function
import { useCallback } from "react";

import {
  PLAYER_PHRASE_MAX,
  PLAYER_PHRASE_MIN,
  type PlayerDefaults,
  type PlayerSpec,
} from "@/lib/player";
import {
  PLAYER_PHRASE_CHANCE_MAX,
  PLAYER_PHRASE_CHANCE_MIN,
  PLAYER_PHRASE_KEEP_MAX,
  PLAYER_PHRASE_KEEP_MIN,
  PLAYER_PHRASE_RETURN_MAX,
  PLAYER_PHRASE_RETURN_MIN,
} from "@/lib/playerFigure";
import { PLAYER_KNOB_LABELS, PLAYER_KNOB_TOOLTIPS } from "@/lib/copy";
import type { DeckId } from "@/state/store";
import { Knob } from "@/ui/Knob";
import { PlayerMore } from "@/ui/PlayerMore";

export function PlayerPhrase({
  deck,
  player,
  defaults,
  patch,
}: {
  deck: DeckId;
  player: PlayerSpec;
  /** What each dial snaps back to on a double-click: the switch's own values (0118). */
  defaults: PlayerDefaults;
  /** The card's own patch: one `deck.player` per gesture, carrying the whole spec (0089). */
  patch: (fields: Partial<PlayerSpec>) => void;
}) {
  const onPhrase = useCallback(
    (value: number) => {
      patch({ phrase: Math.round(value) });
    },
    [patch],
  );
  const onKeep = useCallback(
    (value: number) => {
      patch({ phraseKeep: Math.round(value) });
    },
    [patch],
  );
  const onChance = useCallback(
    (value: number) => {
      patch({ phraseChance: value });
    },
    [patch],
  );
  const onReturn = useCallback(
    (value: number) => {
      patch({ phraseReturn: value });
    },
    [patch],
  );

  return (
    <PlayerMore
      deck={deck}
      title={PLAYER_KNOB_LABELS.phrase}
      dial={
        <Knob
          label={PLAYER_KNOB_LABELS.phrase}
          says={PLAYER_KNOB_TOOLTIPS.phrase}
          size="sm"
          value={player.phrase}
          min={PLAYER_PHRASE_MIN}
          max={PLAYER_PHRASE_MAX}
          defaultValue={defaults.phrase}
          step={1}
          onChange={onPhrase}
        />
      }
    >
      {/* Counted in passes of the figure rather than in jumps, which is why it declares a range of
          its own where the count's keep shares the rate walk's (src/lib/player.ts). */}
      <Knob
        label={PLAYER_KNOB_LABELS.phraseKeep}
        says={PLAYER_KNOB_TOOLTIPS.phraseKeep}
        size="sm"
        value={player.phraseKeep}
        min={PLAYER_PHRASE_KEEP_MIN}
        max={PLAYER_PHRASE_KEEP_MAX}
        defaultValue={defaults.phraseKeep}
        step={1}
        onChange={onKeep}
      />
      <Knob
        label={PLAYER_KNOB_LABELS.phraseChance}
        says={PLAYER_KNOB_TOOLTIPS.phraseChance}
        size="sm"
        value={player.phraseChance}
        min={PLAYER_PHRASE_CHANCE_MIN}
        max={PLAYER_PHRASE_CHANCE_MAX}
        defaultValue={defaults.phraseChance}
        onChange={onChance}
      />
      <Knob
        label={PLAYER_KNOB_LABELS.phraseReturn}
        says={PLAYER_KNOB_TOOLTIPS.phraseReturn}
        size="sm"
        value={player.phraseReturn}
        min={PLAYER_PHRASE_RETURN_MIN}
        max={PLAYER_PHRASE_RETURN_MAX}
        defaultValue={defaults.phraseReturn}
        onChange={onReturn}
      />
    </PlayerMore>
  );
}
