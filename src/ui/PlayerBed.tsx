/**
 * @role One yard's ground: the Every dial, and beside it in its own run what that period is counted
 *   in (0192) and the three rows of words a move is said in — whether the loop wanders or stays
 *   put, how far one move may carry it and which way it leans (0277). Four rows of presses and no
 *   further dial: every word the fold can say is on the board at once, which is the argument the
 *   switchboard won the bench on. Fields of one `deck.player` spec, patched by the card that owns
 *   the command — the song's own, so no selection reaches them and the dial wears no mark (0184,
 *   the way the arrangement's four are drawn).
 * @instead The Bed dial the three rows are measured from, which stands on the fold's own row
 *   because it is a place and not a fact about the move → src/ui/PlayerCard.tsx. What a bed
 *   becomes in sound — how far through the source a landing reads, counted in the loop's own
 *   sixteenths (0185) → src/audio/player.ts. What the three words are as numbers, said once →
 *   `bedMove`, src/lib/playerBed.ts, and the move itself → src/lib/playerWalk.ts. The words each
 *   press wears → src/lib/copyGround.ts. The run they stand in → src/ui/PlayerRun.tsx.
 */
import { useCallback, useMemo } from "react";

import { yardLabel } from "@/lib/copy";
import {
  PLAYER_BED_PER_LABEL,
  PLAYER_BED_PER_LABELS,
  PLAYER_BED_PER_TOOLTIP,
  PLAYER_BED_REACH_LABEL,
  PLAYER_BED_REACH_LABELS,
  PLAYER_BED_REACH_TOOLTIP,
  PLAYER_BED_WANDERS_LABEL,
  PLAYER_BED_WANDERS_LABELS,
  PLAYER_BED_WANDERS_TOOLTIP,
  PLAYER_BED_WAY_LABEL,
  PLAYER_BED_WAY_LABELS,
  PLAYER_BED_WAY_TOOLTIP,
} from "@/lib/copyGround";
import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";
import type { DeckId } from "@/state/store";
import { PLAYER_BED_PERS, PLAYER_BED_REACHES, PLAYER_BED_WAYS } from "@/lib/playerBed";
import { ToggleGroup, ToggleGroupItem } from "@/ui/components/toggle-group";
import { PlayerDial, voiceProps } from "@/ui/PlayerDial";
import { PlayerRun, type PlayerRunProps } from "@/ui/PlayerRun";
import { Says } from "@/ui/Says";

/** The two words for whether the loop moves on its own, as the row they stand in. */
const WANDERS = ["stays", "wanders"] as const;

/**
 * One row of the board: its eyebrow, its sentence, and its words with the one that is on lit. A
 * choice and not a further amount, so a set of presses rather than a dial — the shape the cast in
 * the arrangement's own run has too (0192, 0174, src/ui/PlayerArrange.tsx). Base UI clears the
 * group when the pressed word was already on, and a row always has one word on — so an empty
 * selection is a press on the word that is already lit, and sends nothing (principle 5).
 */
function Row<T extends string>({
  deck,
  eyebrow,
  says,
  words,
  labels,
  on,
  onPress,
  disabled,
}: {
  deck: DeckId;
  eyebrow: string;
  says: string;
  words: readonly T[];
  labels: Record<T, string>;
  on: T;
  onPress: (word: T) => void;
  disabled: boolean;
}) {
  // Memoised: a fresh array every render is a new prop on a control in a loop (`react-perf`).
  const value = useMemo(() => [on], [on]);
  const onValueChange = useCallback(
    (next: string[]) => {
      const [word] = next;
      const pressed = words.find((one) => one === word);
      if (pressed !== undefined) onPress(pressed);
    },
    [words, onPress],
  );
  return (
    <div className="flex flex-col gap-1">
      <span className="type-eyebrow text-muted-foreground">{eyebrow}</span>
      <Says what={says}>
        <ToggleGroup
          value={value}
          onValueChange={onValueChange}
          variant="outline"
          size="sm"
          spacing={0}
          disabled={disabled}
          aria-label={`${yardLabel(deck)} ${eyebrow}`}
        >
          {words.map((word) => (
            <ToggleGroupItem key={word} value={word} aria-label={labels[word]}>
              {labels[word]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Says>
    </div>
  );
}

// One handler per row of the board, plus the dial: the length is how many controls this run holds
// rather than how much it decides. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function PlayerBed({
  deck,
  named,
  player,
  defaults,
  patch,
  voice,
  selected = false,
  disabled = false,
}: PlayerRunProps) {
  /** Each word sent as the whole spec, like every other gesture on this card (0089). */
  const setPer = useCallback(
    (bedPer: (typeof PLAYER_BED_PERS)[number]) => {
      patch({ bedPer });
    },
    [patch],
  );
  const setWanders = useCallback(
    (word: (typeof WANDERS)[number]) => {
      patch({ bedWanders: word === "wanders" });
    },
    [patch],
  );
  const setReach = useCallback(
    (bedReach: (typeof PLAYER_BED_REACHES)[number]) => {
      patch({ bedReach });
    },
    [patch],
  );
  const setWay = useCallback(
    (bedWay: (typeof PLAYER_BED_WAYS)[number]) => {
      patch({ bedWay });
    },
    [patch],
  );
  return (
    <PlayerRun
      title={PLAYER_KNOB_LABELS.bedEvery}
      dial={
        <PlayerDial
          named={named}
          size="default"
          knob="bedEvery"
          player={player}
          defaults={defaults}
          patch={patch}
          {...voiceProps(voice)}
          selected={selected}
          disabled={disabled}
        />
      }
    >
      {/* What the dial beside it counts stands first, because the three rows after it say what a
          move is and this says when one happens at all (0192). */}
      <Row
        deck={deck}
        eyebrow={PLAYER_BED_PER_LABEL}
        says={PLAYER_BED_PER_TOOLTIP}
        words={PLAYER_BED_PERS}
        labels={PLAYER_BED_PER_LABELS}
        on={player.bedPer}
        onPress={setPer}
        disabled={disabled}
      />
      <Row
        deck={deck}
        eyebrow={PLAYER_BED_WANDERS_LABEL}
        says={PLAYER_BED_WANDERS_TOOLTIP}
        words={WANDERS}
        labels={PLAYER_BED_WANDERS_LABELS}
        on={player.bedWanders ? "wanders" : "stays"}
        onPress={setWanders}
        disabled={disabled}
      />
      <Row
        deck={deck}
        eyebrow={PLAYER_BED_REACH_LABEL}
        says={PLAYER_BED_REACH_TOOLTIP}
        words={PLAYER_BED_REACHES}
        labels={PLAYER_BED_REACH_LABELS}
        on={player.bedReach}
        onPress={setReach}
        disabled={disabled}
      />
      <Row
        deck={deck}
        eyebrow={PLAYER_BED_WAY_LABEL}
        says={PLAYER_BED_WAY_TOOLTIP}
        words={PLAYER_BED_WAYS}
        labels={PLAYER_BED_WAY_LABELS}
        on={player.bedWay}
        onPress={setWay}
        disabled={disabled}
      />
    </PlayerRun>
  );
}
