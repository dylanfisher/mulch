/**
 * @role The row under the grid: everything a hand does to the song it picked and to the part of it
 *   it picked, in one place rather than on every cell. The song's row names it, says how many
 *   times it goes round, moves it, copies it and takes it away; the part's row names it, says how
 *   long it lasts, reads out what it plays, fills it with a character, passes over it, hears it
 *   alone, moves it, copies it, takes it away, and under its own fold opens the row it is written
 *   as and the dials it was captured from (0176, 0189, 0275). Every gesture but the audition is one
 *   `deck.player` carrying the whole spec (0089).
 * @instead The grid these rows stand under, and what picks a cell → src/ui/PlayerGrid.tsx and
 *   src/ui/PlayerGridCell.tsx. The boxes the fold draws → src/ui/PlayerDials.tsx. The character
 *   menu → src/ui/PlayerCharacter.tsx.
 */
// Over the dependency cap, and what is over it is two rows' worth of controls: two names, two
// dials, a menu, a strip, the boxes and the words for all of them. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
// And over the line cap by the same measure: one paragraph per gesture the two tiers offer, and
// splitting the rows would hand one pick between components with one caller each. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
import { useCallback, useMemo, type FocusEvent, type KeyboardEvent } from "react";

import { partVoice, type PlayerSpec } from "@/lib/player";
import {
  ACTION_TOOLTIPS,
  copyName,
  partBadge,
  PLAYER_CHARACTER_LABELS,
  PLAYER_PART_LENGTH_LABEL,
  PLAYER_PART_LENGTH_TOOLTIP,
  PLAYER_PART_NAME_LABEL,
  PLAYER_PART_NAME_TOOLTIP,
  PLAYER_PART_SIGNATURE_TOOLTIP,
  READOUT_JOIN,
} from "@/lib/copy";
import { GROWTH_LEFT_LABEL } from "@/lib/copyAuto";
import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";
import { PLAYER_PLAYS_LABEL, PLAYER_PLAYS_TOOLTIP } from "@/lib/copySongs";
import { DURABLE_TEXT_MAX } from "@/lib/guards";
import { drawAnyCharacter, partSignature, PLAYER_DEFAULTS } from "@/lib/playerCharacter";
import {
  PLAYER_PART_MAX,
  PLAYER_PART_MIN,
  PLAYER_PART_DEFAULTS,
  PLAYER_SONG_MAX,
  type SongPart,
  type SongPartId,
} from "@/lib/playerSong";
import {
  nudged,
  PLAYER_PLAYS_DEFAULT,
  PLAYER_PLAYS_MAX,
  PLAYER_PLAYS_MIN,
  PLAYER_SONGS_MAX,
  withSong,
  type PlayerSong,
} from "@/lib/playerSongs";
import type { PartStep } from "@/lib/playerStrip";
import type { DeckId } from "@/state/store";
import { mintPlayerRunId, mintSongPartId } from "@/ui/actions";
import { Button } from "@/ui/components/button";
import { Input } from "@/ui/components/input";
import { Toggle } from "@/ui/components/toggle";
import { FoldCaret } from "@/ui/FoldCaret";
import { ACTION_ICONS } from "@/ui/icons";
import { Knob } from "@/ui/Knob";
import { playerReadout } from "@/ui/PlayerDial";
import { PlayerCharacter } from "@/ui/PlayerCharacter";
import { playerDials } from "@/ui/PlayerDials";
import type { GridPick } from "@/ui/PlayerGridCell";
import { PART_ATTRIBUTE, ROW_LEFT, ROW_LEFT_SLOT, SONG_ATTRIBUTE } from "@/ui/playerLit";
import { PlayerStrip } from "@/ui/PlayerStrip";
import { Says } from "@/ui/Says";
// oxlint-enable import/max-dependencies

/** The row a tier is edited in, lit by the frame in the ink the grid's cells are lit in (0172). */
const ROW =
  "flex w-full flex-wrap items-center gap-1 rounded-md px-1 data-[standing=true]:bg-primary/15";
/** The part's row is the song's row with a fold under it, so it stacks rather than wraps. */
const PART_ROW = `${ROW} flex-col items-stretch`;

/**
 * A part's dials, read out: the three furthest from plain, each spelled the way its own dial spells
 * it. What answers "which part is which" for a part that carries a spec and no character (0176) —
 * and the whole of it is read-only, because the dials that change it are one fold below. A part
 * left exactly at the switch's own values has no signature at all, and says so with the character
 * menu's own word for that point (0152, principle 1).
 */
const signatureOf = (part: SongPart): string => {
  const knobs = partSignature(part.voice);
  if (knobs.length === 0) return PLAYER_CHARACTER_LABELS.plain;
  return knobs
    .map((knob) => `${PLAYER_KNOB_LABELS[knob]} ${playerReadout(knob, part.voice[knob])}`)
    .join(READOUT_JOIN);
};

/**
 * What a hand calls a song or a part, committed on Enter or on leaving the field and never per
 * keystroke: one durable edit per deliberate gesture (0024). An emptied field puts the badge back
 * rather than committing nothing: `assertDurableText` refuses the empty string, so "no name" is not
 * a state either tier can be in (principle 5). Keyed on the stored name, so an undo remounts the
 * field on what the session says (src/ui/ClipRack.tsx).
 */
function NameField({
  named,
  name,
  badge,
  onRename,
}: {
  named: string;
  name: string;
  badge: string;
  onRename: (name: string) => void;
}) {
  const onKey = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    // Leaves the field rather than committing here, and leaving it is what commits: committing on
    // both roads would send one edit twice (0024).
    event.currentTarget.blur();
  }, []);
  const onBlur = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      const field = event.currentTarget;
      const typed = field.value.trim();
      const next = typed === "" ? badge : typed;
      field.value = next;
      if (next !== name) onRename(next);
    },
    [onRename, name, badge],
  );
  return (
    <Says what={PLAYER_PART_NAME_TOOLTIP}>
      <Input
        key={name}
        className="w-32"
        defaultValue={name}
        maxLength={DURABLE_TEXT_MAX}
        aria-label={`${PLAYER_PART_NAME_LABEL} ${named}`}
        onKeyDown={onKey}
        onBlur={onBlur}
      />
    </Says>
  );
}

/** The two presses that move one thing along its own tier, refused at either end (0121). */
function Nudge({
  named,
  at,
  count,
  onMove,
}: {
  named: string;
  at: number;
  count: number;
  onMove: (by: -1 | 1) => void;
}) {
  const earlier = useCallback(() => {
    onMove(-1);
  }, [onMove]);
  const later = useCallback(() => {
    onMove(1);
  }, [onMove]);
  return (
    <>
      <Says what={ACTION_TOOLTIPS.earlier}>
        <Button
          size="icon-sm"
          variant="ghost"
          disabled={at === 0}
          aria-label={`Earlier ${named}`}
          onClick={earlier}
        >
          <ACTION_ICONS.earlier />
        </Button>
      </Says>
      <Says what={ACTION_TOOLTIPS.later}>
        <Button
          size="icon-sm"
          variant="ghost"
          disabled={at >= count - 1}
          aria-label={`Later ${named}`}
          onClick={later}
        >
          <ACTION_ICONS.later />
        </Button>
      </Says>
    </>
  );
}

/** A copy of one song: a fresh id, because identity is the one thing a copy may not take (0092),
 *  fresh ids for its parts on the same terms, and everything else it was. */
const copiedSong = (song: PlayerSong): PlayerSong => ({
  ...song,
  id: mintPlayerRunId(),
  name: copyName(song.name),
  parts: song.parts.map((part) => ({ ...part, id: mintSongPartId() })),
});

/**
 * The song's row, and the part's under it where a part is picked.
 */
// One callback per gesture the two tiers offer, and one control per gesture: the length is how
// many things a song and a part are rather than how much this row decides. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function PlayerGridPick({
  deck,
  named,
  player,
  songAt,
  song,
  partAt,
  part,
  soloed,
  dials,
  patch,
  onPick,
  onAudition,
}: {
  deck: DeckId;
  /** What every control here is named by: the yard. */
  named: string;
  /** The card's own spec, which the fold's dials read the four song fields off (0158, 0176). */
  player: PlayerSpec;
  songAt: number;
  song: PlayerSong;
  /** The picked part and where it stands in its song, or none where the song alone is picked. */
  partAt: number;
  part: SongPart | undefined;
  /** Whether the pass is playing the picked part on its own (0190). */
  soloed: boolean;
  /** Whether the picked part's own strip and dials are open under its row. Held by the yard on
   *  the terms every other view state on the card is (plan §2). */
  dials: [open: boolean, setOpen: (open: boolean) => void];
  /** The card's own patch: one `deck.player` per gesture, carrying the whole spec (0089). */
  patch: (fields: Partial<PlayerSpec>) => void;
  /** The pick, which a copy moves onto the copy and a removal takes off what is gone. */
  onPick: (pick: GridPick | null) => void;
  /** Hear the part on its own, and let the song have it back: the one gesture here that writes
   *  nothing durable at all, sent by the grid straight to the instrument (0041, 0190). */
  onAudition: (part: SongPartId, soloed: boolean) => void;
}) {
  const songs = player.songs;
  const songNamed = `${named} ${songAt + 1}`;
  const partNamed = `${songNamed} Part ${partAt + 1}`;
  const [open, setOpen] = dials;

  /** Every song gesture rebuilds the run and sends it whole, which is the one road this card has
   *  (0089): there is no song command, because `deck.player` already carries every song. */
  const songPlays = useCallback(
    (plays: number) => {
      patch({ songs: withSong(songs, song.id, { plays: Math.round(plays) }) });
    },
    [patch, songs, song.id],
  );
  const songRename = useCallback(
    (name: string) => {
      patch({ songs: withSong(songs, song.id, { name }) });
    },
    [patch, songs, song.id],
  );
  const songMove = useCallback(
    (by: -1 | 1) => {
      const moved = nudged(songs, songAt, by);
      if (moved !== null) patch({ songs: moved });
    },
    [patch, songs, songAt],
  );
  const songDuplicate = useCallback(() => {
    // Fresh ids all the way down, landing directly after the one it was taken from (0092), and
    // the pick moves onto it: what a hand copies is what it is about to change.
    const copy = copiedSong(song);
    patch({ songs: [...songs.slice(0, songAt + 1), copy, ...songs.slice(songAt + 1)] });
    onPick({ song: copy.id, part: null });
  }, [patch, songs, song, songAt, onPick]);
  const songRemove = useCallback(() => {
    patch({ songs: songs.filter((each) => each.id !== song.id) });
    onPick(null);
  }, [patch, songs, song.id, onPick]);

  /** And every part gesture rebuilds its song's parts and sends the whole spec down the same road. */
  const writeParts = useCallback(
    (parts: readonly SongPart[]) => {
      patch({ songs: withSong(songs, song.id, { parts }) });
    },
    [patch, songs, song.id],
  );
  const writePart = useCallback(
    (next: SongPart) => {
      writeParts(song.parts.map((held, at) => (at === partAt ? next : held)));
    },
    [writeParts, song.parts, partAt],
  );
  const partRename = useCallback(
    (name: string) => {
      if (part !== undefined) writePart({ ...part, name });
    },
    [writePart, part],
  );
  const partLength = useCallback(
    (length: number) => {
      if (part !== undefined) writePart({ ...part, length: Math.round(length) });
    },
    [writePart, part],
  );
  const partSkip = useCallback(
    (skip: boolean) => {
      if (part !== undefined) writePart({ ...part, skip });
    },
    [writePart, part],
  );
  const partMove = useCallback(
    (by: -1 | 1) => {
      const moved = nudged(song.parts, partAt, by);
      if (moved !== null) writeParts(moved);
    },
    [writeParts, song.parts, partAt],
  );
  const partDuplicate = useCallback(() => {
    if (part === undefined) return;
    const copy: SongPart = { ...part, id: mintSongPartId(), name: copyName(part.name) };
    writeParts([...song.parts.slice(0, partAt + 1), copy, ...song.parts.slice(partAt + 1)]);
    onPick({ song: song.id, part: copy.id });
  }, [writeParts, song, part, partAt, onPick]);
  const partRemove = useCallback(() => {
    writeParts(song.parts.filter((_, at) => at !== partAt));
    onPick({ song: song.id, part: null });
  }, [writeParts, song, partAt, onPick]);
  const partAudition = useCallback(
    (next: boolean) => {
      if (part !== undefined) onAudition(part.id, next);
    },
    [onAudition, part],
  );
  /**
   * What the fold's dials read and write: the card's spec with this part's numbers over it, and a
   * patch that puts the part knobs back into the part and drops everything else — the same road
   * `dialPatch` takes for a selected part, taken here so a hand can edit a part without pointing
   * the card at it (0089, 0176, src/ui/PlayerCard.tsx).
   */
  const painted: PlayerSpec = useMemo(() => ({ ...player, ...part?.voice }), [player, part]);
  const partPatch = useCallback(
    (fields: Partial<PlayerSpec>) => {
      if (part !== undefined)
        writePart({ ...part, voice: partVoice({ ...part.voice, ...fields }) });
    },
    [writePart, part],
  );
  /** A character nobody picked, drawn into this part at full strength. `Math.random` on a click,
   *  which is where it belongs: the values travel in the command and the seed is untouched (0152). */
  const partRedraw = useCallback(() => {
    partPatch(drawAnyCharacter(Math.random).voice);
  }, [partPatch]);
  const writeSteps = useCallback(
    (steps: readonly PartStep[]) => {
      if (part !== undefined) writePart({ ...part, steps });
    },
    [writePart, part],
  );

  const heard = song.plays > PLAYER_PLAYS_MIN;
  return (
    <div className="flex w-full flex-col gap-1">
      <div {...{ [SONG_ATTRIBUTE]: song.id }} className={ROW}>
        <span className="type-readout text-muted-foreground">{partBadge(song.id)}</span>
        <NameField
          named={songNamed}
          name={song.name}
          badge={partBadge(song.id)}
          onRename={songRename}
        />
        {/* How many times it goes round, and the whole of whether it is passed over: nought is
            the skip, so there is no switch beside this dial (`PLAYER_PLAYS_MIN`, principle 1). */}
        <Knob
          label={PLAYER_PLAYS_LABEL}
          name={`${songNamed} ${PLAYER_PLAYS_LABEL}`}
          says={PLAYER_PLAYS_TOOLTIP}
          size="xs"
          value={song.plays}
          min={PLAYER_PLAYS_MIN}
          max={PLAYER_PLAYS_MAX}
          defaultValue={PLAYER_PLAYS_DEFAULT}
          step={1}
          onChange={songPlays}
        />
        <div className="ml-auto flex items-center gap-1">
          {/* How long this round has left, written by the frame in the grid above (0070, 0221). */}
          <span data-slot={ROW_LEFT_SLOT} className={ROW_LEFT} title={GROWTH_LEFT_LABEL} />
          <Nudge named={songNamed} at={songAt} count={songs.length} onMove={songMove} />
          {/* Refused rather than hidden at the ceiling: a copy is a ninth of eight (0121). */}
          <Says what={ACTION_TOOLTIPS.duplicate}>
            <Button
              size="icon-sm"
              variant="ghost"
              disabled={songs.length >= PLAYER_SONGS_MAX}
              aria-label={`Duplicate ${songNamed}`}
              onClick={songDuplicate}
            >
              <ACTION_ICONS.duplicate />
            </Button>
          </Says>
          <Says what={ACTION_TOOLTIPS.remove}>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={`Remove ${songNamed}`}
              onClick={songRemove}
            >
              <ACTION_ICONS.remove />
            </Button>
          </Says>
        </div>
      </div>
      {part === undefined ? null : (
        <div {...{ [PART_ATTRIBUTE]: part.id }} className={PART_ROW}>
          <div className="flex w-full flex-wrap items-center gap-1">
            <span className="type-readout text-muted-foreground">{partBadge(part.id)}</span>
            <NameField
              named={partNamed}
              name={part.name}
              badge={partBadge(part.id)}
              onRename={partRename}
            />
            <Knob
              label={PLAYER_PART_LENGTH_LABEL}
              name={`${partNamed} ${PLAYER_PART_LENGTH_LABEL}`}
              says={PLAYER_PART_LENGTH_TOOLTIP}
              size="xs"
              value={part.length}
              min={PLAYER_PART_MIN}
              max={PLAYER_PART_MAX}
              defaultValue={PLAYER_PART_DEFAULTS.length}
              step={1}
              onChange={partLength}
            />
            {/* What it plays, read-only: the dials that change it are the fold below (0176). */}
            <Says what={PLAYER_PART_SIGNATURE_TOOLTIP}>
              <span className="min-w-0 truncate type-readout text-muted-foreground">
                {signatureOf(part)}
              </span>
            </Says>
            <div className="ml-auto flex items-center gap-1">
              <span data-slot={ROW_LEFT_SLOT} className={ROW_LEFT} title={GROWTH_LEFT_LABEL} />
              <PlayerCharacter deck={deck} named={partNamed} player={painted} patch={partPatch} />
              <Says what={ACTION_TOOLTIPS.redraw}>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Redraw ${partNamed}`}
                  onClick={partRedraw}
                >
                  <ACTION_ICONS.redraw />
                </Button>
              </Says>
              {/* A state and not an action — the part is passed over or it is not (0055). */}
              <Says what={ACTION_TOOLTIPS.skip}>
                <Toggle
                  size="sm"
                  variant="outline"
                  pressed={part.skip}
                  aria-label={`Skip ${partNamed}`}
                  onPressedChange={partSkip}
                >
                  <ACTION_ICONS.skip />
                </Toggle>
              </Says>
              {/* Refused on a part the walk passes over, the way every control at a bound on this
                  card is: a skipped part has no first jump to wind to (0121, 0190). */}
              <Says what={ACTION_TOOLTIPS.audition}>
                <Toggle
                  size="sm"
                  variant="outline"
                  pressed={soloed}
                  disabled={part.skip || !heard}
                  aria-label={`Audition ${partNamed}`}
                  onPressedChange={partAudition}
                >
                  <ACTION_ICONS.audition />
                </Toggle>
              </Says>
              <Nudge named={partNamed} at={partAt} count={song.parts.length} onMove={partMove} />
              <Says what={ACTION_TOOLTIPS.duplicate}>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  disabled={song.parts.length >= PLAYER_SONG_MAX}
                  aria-label={`Duplicate ${partNamed}`}
                  onClick={partDuplicate}
                >
                  <ACTION_ICONS.duplicate />
                </Button>
              </Says>
              <Says what={ACTION_TOOLTIPS.remove}>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Remove ${partNamed}`}
                  onClick={partRemove}
                >
                  <ACTION_ICONS.remove />
                </Button>
              </Says>
              {/* The fold that opens this part's own dials in place: its own control and not the
                  badge in the cell, because pointing the card's dials at a part and editing it
                  where it stands are two things a hand does (0055, 0176). */}
              <Says what={ACTION_TOOLTIPS.collapse}>
                <Toggle
                  size="sm"
                  className="text-muted-foreground"
                  pressed={open}
                  aria-label={`Open ${partNamed}`}
                  onPressedChange={setOpen}
                >
                  <FoldCaret />
                </Toggle>
              </Says>
            </div>
          </div>
          {/* The part's own dials, in the boxes the card draws its own in and reading this part's
              numbers, with the row it is written as above them (0176, 0188). */}
          {open ? (
            <div className="flex w-full flex-col items-stretch gap-2">
              <PlayerStrip named={partNamed} steps={part.steps} onChange={writeSteps} />
              {playerDials({
                deck,
                named: partNamed,
                player: painted,
                defaults: PLAYER_DEFAULTS,
                patch: partPatch,
              })}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
