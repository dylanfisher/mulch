/**
 * @role The door in the jumps card's corner that arranges the pattern: the parts a song is a run
 *   of, each drawn as a character it names, lasting the jumps its dial says, and coming back the
 *   same every round or not (0153). One `deck.player` per gesture, carrying the whole spec, so an
 *   arrangement is undone, logged, captured and replayed like any other durable edit (0089).
 * @instead What a part is and what a chorus means → src/lib/playerSong.ts. What each character
 *   sounds like, and the menu that presses one → src/ui/PlayerCharacter.tsx. The dials every part
 *   is a distance from → src/ui/PlayerCard.tsx.
 */
// Over the dependency cap, and what is over it is one row's worth of controls: a picker, two
// dials, a state and an action, plus the popover and the words for all five. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
// And the place in the list is a row's key, which it has to be: two parts may be drawn as one
// character for one length and be alike in every field, so nothing else about a part tells it from
// its neighbour — a song is *where* its parts are. The rule guards against a key that reorders
// under a list, and every row here is told its own place and rebuilt from the list it is in.
// oxlint-disable react/no-array-index-key
import { useCallback } from "react";

import {
  PLAYER_AMOUNT_MAX,
  PLAYER_AMOUNT_MIN,
  PLAYER_AMOUNT_STEP,
  PLAYER_CHARACTERS,
  type PlayerSpec,
} from "@/lib/player";
import {
  PLAYER_PART_DEFAULTS,
  PLAYER_PART_MAX,
  PLAYER_PART_MIN,
  PLAYER_SONG_MAX,
  type SongPart,
} from "@/lib/playerSong";
import {
  ACTION_TOOLTIPS,
  PLAYER_AMOUNT_LABEL,
  PLAYER_CHARACTER_LABELS,
  PLAYER_CHORUS_LABEL,
  PLAYER_CHORUS_TOOLTIP,
  PLAYER_PART_CHARACTER_LABEL,
  PLAYER_PART_LABEL,
  PLAYER_PART_LENGTH_LABEL,
  PLAYER_PART_LENGTH_TOOLTIP,
  PLAYER_SONG_EMPTY,
  PLAYER_SONG_LABEL,
  yardLabel,
} from "@/lib/copy";
import type { DeckId } from "@/state/store";
import { Button } from "@/ui/components/button";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/ui/components/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/components/select";
import { Toggle } from "@/ui/components/toggle";
import { ACTION_ICONS } from "@/ui/icons";
import { Knob } from "@/ui/Knob";
import { Says } from "@/ui/Says";
import { INSTANT_POPUP } from "@/ui/shell";
// oxlint-enable import/max-dependencies

/** The names a part may be drawn as, built once: the picker takes a list, and one made in a
 *  render would be a new array on every frame the card draws. */
const CHARACTER_ITEMS = PLAYER_CHARACTERS.map((character) => ({
  value: character,
  label: PLAYER_CHARACTER_LABELS[character],
}));

/** A part's amount, as the readout beside its dial: a percentage of the character taken (0152). */
const amountLabel = (amount: number): string => `${Math.round(amount * 100)}%`;

/**
 * One part, and the four gestures that shape it. A component of its own for the reason the
 * character menu's entries are: every handler has to carry which part it is, and a closure built
 * in the parent's own render is a new prop on every frame the card draws.
 */
// One callback per field and one control per field: the length is how many things a part is
// rather than how much this row decides. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
function PartRow({
  deck,
  at,
  part,
  onChange,
  onRemove,
}: {
  deck: DeckId;
  /** Where in the song this part stands, from zero — its own name, since two parts may otherwise
   *  be drawn as one character for one length and be nothing a control could tell apart. */
  at: number;
  part: SongPart;
  onChange: (at: number, part: SongPart) => void;
  onRemove: (at: number) => void;
}) {
  /** What every control on this row is named by: the yard, the song, and which part it is. */
  const named = `${yardLabel(deck)} ${PLAYER_SONG_LABEL} ${PLAYER_PART_LABEL} ${at + 1}`;
  const setCharacter = useCallback(
    (value: unknown) => {
      // The picker hands back whatever its items carry; a part may only name a declared character,
      // and one that is not is a pick this row refuses rather than a spec the validator throws on.
      const character = PLAYER_CHARACTERS.find((declared) => declared === value);
      if (character !== undefined) onChange(at, { ...part, character });
    },
    [onChange, at, part],
  );
  const setAmount = useCallback(
    (amount: number) => {
      onChange(at, { ...part, amount });
    },
    [onChange, at, part],
  );
  const setLength = useCallback(
    (length: number) => {
      onChange(at, { ...part, length: Math.round(length) });
    },
    [onChange, at, part],
  );
  const setChorus = useCallback(
    (chorus: boolean) => {
      onChange(at, { ...part, chorus });
    },
    [onChange, at, part],
  );
  const remove = useCallback(() => {
    onRemove(at);
  }, [onRemove, at]);

  return (
    <div className="flex items-center gap-1">
      <Select value={part.character} onValueChange={setCharacter} items={CHARACTER_ITEMS}>
        <SelectTrigger
          size="sm"
          className="w-28"
          aria-label={`${named} ${PLAYER_PART_CHARACTER_LABEL}`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CHARACTER_ITEMS.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {/* The compact dial, which is the one drawn without a caption: a row is read across rather
          than down, and four captions on it would be four columns of two line boxes (0055,
          src/ui/Knob.tsx). Each says what it is through its own name instead. */}
      <Says what={PLAYER_PART_LENGTH_TOOLTIP}>
        <Knob
          label={PLAYER_PART_LENGTH_LABEL}
          name={`${named} ${PLAYER_PART_LENGTH_LABEL}`}
          size="xs"
          value={part.length}
          min={PLAYER_PART_MIN}
          max={PLAYER_PART_MAX}
          defaultValue={PLAYER_PART_DEFAULTS.length}
          step={1}
          onChange={setLength}
        />
      </Says>
      <Knob
        label={PLAYER_AMOUNT_LABEL}
        name={`${named} ${PLAYER_AMOUNT_LABEL}`}
        size="xs"
        value={part.amount}
        min={PLAYER_AMOUNT_MIN}
        max={PLAYER_AMOUNT_MAX}
        defaultValue={PLAYER_PART_DEFAULTS.amount}
        step={PLAYER_AMOUNT_STEP}
        format={amountLabel}
        onChange={setAmount}
      />
      {/* A state, so it carries the word and no icon (0055) — and the word is the one the whole
          arrangement is named for. */}
      <Says what={PLAYER_CHORUS_TOOLTIP}>
        <Toggle
          size="sm"
          variant="outline"
          pressed={part.chorus}
          aria-label={`${named} ${PLAYER_CHORUS_LABEL}`}
          onPressedChange={setChorus}
        >
          <span className="type-eyebrow">{PLAYER_CHORUS_LABEL}</span>
        </Toggle>
      </Says>
      <Says what={ACTION_TOOLTIPS.remove}>
        <Button size="icon-sm" variant="ghost" aria-label={`Remove ${named}`} onClick={remove}>
          <ACTION_ICONS.remove />
        </Button>
      </Says>
    </div>
  );
}

// One callback per gesture the menu offers, and the rest is the popover it offers them in: the
// length is how many things a song is rather than how much this component decides — the same
// waiver its rows carry. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function PlayerSong({
  deck,
  player,
  patch,
}: {
  deck: DeckId;
  player: PlayerSpec;
  /** The card's own patch: one `deck.player` per gesture, carrying the whole spec (0089). */
  patch: (fields: Partial<PlayerSpec>) => void;
}) {
  const song = player.song;
  const onChange = useCallback(
    (at: number, next: SongPart) => {
      patch({ song: song.map((part, index) => (index === at ? next : part)) });
    },
    [patch, song],
  );
  const onRemove = useCallback(
    (at: number) => {
      patch({ song: song.filter((_, index) => index !== at) });
    },
    [patch, song],
  );
  const onAdd = useCallback(() => {
    patch({ song: [...song, PLAYER_PART_DEFAULTS] });
  }, [patch, song]);

  return (
    <Popover>
      <Says what={ACTION_TOOLTIPS.song}>
        <PopoverTrigger
          render={
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={`${PLAYER_SONG_LABEL} on ${yardLabel(deck)}`}
            >
              <ACTION_ICONS.song />
            </Button>
          }
        />
      </Says>
      {/* Opens instantly, for the reason every other popup on this card does: ./scripts/drive
          clicks into it, and waiting out an enter and an exit costs the gate a scenario's worth of
          time for nothing a person would notice (0056). */}
      <PopoverContent side="bottom" align="end" className={`w-auto ${INSTANT_POPUP}`}>
        <PopoverTitle>{PLAYER_SONG_LABEL}</PopoverTitle>
        {/* A song with no parts says what one is for rather than showing an empty box: this is the
            only place the shape — parts in order, one of them coming back — is said in words. */}
        {song.length === 0 ? (
          <p className="max-w-xs type-body text-muted-foreground">{PLAYER_SONG_EMPTY}</p>
        ) : (
          <div className="flex flex-col gap-1">
            {song.map((part, at) => (
              <PartRow
                key={at}
                deck={deck}
                at={at}
                part={part}
                onChange={onChange}
                onRemove={onRemove}
              />
            ))}
          </div>
        )}
        {/* Refused rather than hidden at the ceiling: a control that vanishes at a bound leaves
            nothing saying there was one (0121). */}
        <Says what={ACTION_TOOLTIPS.add}>
          <Button
            size="xs"
            variant="outline"
            disabled={song.length >= PLAYER_SONG_MAX}
            aria-label={`Add ${yardLabel(deck)} ${PLAYER_SONG_LABEL} ${PLAYER_PART_LABEL}`}
            onClick={onAdd}
          >
            <ACTION_ICONS.add />
            {PLAYER_PART_LABEL}
          </Button>
        </Says>
      </PopoverContent>
    </Popover>
  );
}
