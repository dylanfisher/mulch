/**
 * @role One cell of the launch grid, and the head of the column over it. A cell is one part of one
 *   song: the press that arms it for the next boundary, the toggle that hears it on its own right
 *   now (0190), the badge that picks it for the row under the grid and points the card's dials at
 *   it, and the two marks the frame lights — playing, and coming (0275). The head is the song: its
 *   name, how many times it goes round, and the press that picks it alone.
 * @instead The grid that lays these out and lights them → src/ui/PlayerGrid.tsx. The row under it
 *   that edits what is picked → src/ui/PlayerGridPick.tsx. What a part and a song are →
 *   src/lib/playerSong.ts and src/lib/playerSongs.ts.
 */
// One over the dependency cap, and it is the press at the foot of a column: three controls of
// one grid share the words, the icons and the two attributes. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import { useCallback } from "react";

import { cn } from "@/lib/cn";
import { ACTION_TOOLTIPS, partBadge, PLAYER_PART_LABEL, PLAYER_SELECT_TOOLTIP } from "@/lib/copy";
import { PLAYER_ARM_TOOLTIP, PLAYER_SONG_PICK_TOOLTIP } from "@/lib/copySongs";
import type { SongPart, SongPartId } from "@/lib/playerSong";
import type { PlayerSong, PlayerSongId } from "@/lib/playerSongs";
import { Button } from "@/ui/components/button";
import { Toggle } from "@/ui/components/toggle";
import { ACTION_ICONS } from "@/ui/icons";
import { PART_ATTRIBUTE, SONG_ATTRIBUTE } from "@/ui/playerLit";
import { Says } from "@/ui/Says";
// oxlint-enable import/max-dependencies

/**
 * What a hand has picked for the row under the grid: a song, and a part of it or none. A view
 * preference held by the yard and never durable — no command, nothing durable, no history entry
 * (plan §2). The song is always named, because a song with no parts has to be pickable to be
 * given one; the part is what points the card's dials somewhere (0176).
 */
export type GridPick = { song: PlayerSongId; part: SongPartId | null };

/**
 * The two inks a cell and a head may be lit in, and never both: the walk lights the one it is
 * standing in and a hand lights the one it has picked, and the hand's wins where both are true —
 * what a picked cell is *for* is that the row under the grid is its. Neither is `accent`, which is
 * the fill a pressed control wears (0172). The ring is a third thing and may stand with either:
 * it says what is coming, which is true of a cell whatever else is true of it.
 */
const LIT =
  "rounded-md border border-border data-[standing=true]:bg-primary/15 data-[armed=true]:border-dashed data-[armed=true]:border-foreground";
const PICKED = "bg-foreground/10";

/** The mark saying the walk is here, in a slot every cell is mounted with (0070). */
const PLAYING_MARK =
  "size-1.5 shrink-0 rounded-full bg-primary opacity-0 group-data-[standing=true]/cell:opacity-100";
/** And the ring saying this is what comes next, on the same terms. */
const COMING_MARK =
  "size-2 shrink-0 rounded-full border-2 border-foreground opacity-0 group-data-[armed=true]/cell:opacity-100";

/** How tall every cell is — the placeholders as well, so the rows of two columns line up. */
export const CELL = "h-8";

// One press, one badge and the two marks the frame lights, each with the sentence saying why it
// is where it is: the length is what a cell is. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function GridCell({
  named,
  song,
  part,
  picked,
  soloed,
  disabled,
  onArm,
  onAudition,
  onPick,
}: {
  /** What the controls here are named by: the yard, the song and the part, positionally — a name
   *  is what ./scripts/drive presses and an opaque id is not a thing a person asks for. */
  named: string;
  song: PlayerSongId;
  part: SongPart;
  picked: boolean;
  /** Whether this is the part being heard on its own (0190). */
  soloed: boolean;
  /** Whether the arm and the audition are refused: a part passed over, a song that plays no times,
   *  or a pattern drawing its own arrangement — each a press the pass would refuse, said here
   *  instead (0121). One flag for both, because the pass refuses both on the same terms: neither
   *  has a first jump to wind to. */
  disabled: boolean;
  onArm: (part: SongPartId) => void;
  onAudition: (part: SongPartId, soloed: boolean) => void;
  onPick: (pick: GridPick | null) => void;
}) {
  const arm = useCallback(() => {
    onArm(part.id);
  }, [onArm, part.id]);
  const audition = useCallback(
    (next: boolean) => {
      onAudition(part.id, next);
    },
    [onAudition, part.id],
  );
  const pick = useCallback(
    (next: boolean) => {
      onPick(next ? { song, part: part.id } : null);
    },
    [onPick, song, part.id],
  );
  return (
    <div
      {...{ [PART_ATTRIBUTE]: part.id }}
      className={cn("group/cell flex items-center gap-1 pr-1", CELL, LIT, picked && PICKED)}
    >
      {/* The press is the cell: a launch grid's whole argument is that the next thing is the thing
          a hand presses, so the name fills the cell and the badge stands at its edge (0275). */}
      <Says what={PLAYER_ARM_TOOLTIP}>
        <Button
          size="xs"
          variant="ghost"
          className="min-w-0 flex-1 justify-start gap-1.5"
          disabled={disabled}
          aria-label={`Arm ${named}`}
          onClick={arm}
        >
          <span aria-hidden="true" className={PLAYING_MARK} />
          <span aria-hidden="true" className={COMING_MARK} />
          <span className="truncate">{part.name}</span>
        </Button>
      </Says>
      {/* Hearing it now rather than next: the arm waits for the boundary, and the solo does not.
          On the cell itself, because a part a hand wants to hear is a part it has not necessarily
          picked, and the row under the grid holds only the picked one (0190). */}
      <Says what={ACTION_TOOLTIPS.audition}>
        <Toggle
          size="sm"
          variant="outline"
          className="h-6 min-w-6 px-1"
          pressed={soloed}
          disabled={disabled}
          aria-label={`Solo ${named}`}
          onPressedChange={audition}
        >
          <ACTION_ICONS.audition />
        </Toggle>
      </Says>
      {/* What this part is, as against where it is — and the press that points the card's dials
          at it and fills the row under the grid with it (0076, 0157, 0176). */}
      <Says what={PLAYER_SELECT_TOOLTIP}>
        <Toggle
          size="sm"
          variant="outline"
          className="h-6 min-w-6 px-1"
          pressed={picked}
          aria-label={`Select ${named}`}
          onPressedChange={pick}
        >
          <span className="type-readout">{partBadge(part.id)}</span>
        </Toggle>
      </Says>
    </div>
  );
}

/** The head of one column: the song, picked alone — how a song with no parts is edited at all. */
export function GridHead({
  named,
  song,
  plays,
  picked,
  onPick,
}: {
  named: string;
  song: PlayerSong;
  /** How many times it goes round, said beside the name so a column reads as a run of that many. */
  plays: string;
  picked: boolean;
  onPick: (pick: GridPick | null) => void;
}) {
  const pick = useCallback(
    (next: boolean) => {
      onPick(next ? { song: song.id, part: null } : null);
    },
    [onPick, song.id],
  );
  return (
    <div
      {...{ [SONG_ATTRIBUTE]: song.id }}
      className={cn("group/cell flex items-center", CELL, LIT, picked && PICKED)}
    >
      <Says what={PLAYER_SONG_PICK_TOOLTIP}>
        <Toggle
          size="sm"
          className="w-full min-w-0 justify-start gap-1.5"
          pressed={picked}
          aria-label={`Select ${named}`}
          onPressedChange={pick}
        >
          <span aria-hidden="true" className={PLAYING_MARK} />
          <span className="truncate">{song.name}</span>
          <span className="type-readout text-muted-foreground">{plays}</span>
        </Toggle>
      </Says>
    </div>
  );
}

/**
 * The press at the foot of a column that gives its song one more part. Its own component so the
 * handler carries which song it is rather than being a closure the grid rebuilds every render,
 * which is what `react-perf` asks of a control drawn in a loop. Refused rather than hidden at the
 * ceiling: a control that vanishes at a bound leaves nothing saying there was one (0121).
 */
export function GridAddPart({
  named,
  song,
  disabled,
  onAdd,
}: {
  named: string;
  song: PlayerSong;
  disabled: boolean;
  onAdd: (song: PlayerSong) => void;
}) {
  const add = useCallback(() => {
    onAdd(song);
  }, [onAdd, song]);
  return (
    <Says what={ACTION_TOOLTIPS.add}>
      <Button
        size="xs"
        variant="outline"
        disabled={disabled}
        aria-label={`Add ${named} ${PLAYER_PART_LABEL}`}
        onClick={add}
      >
        <ACTION_ICONS.add />
        {PLAYER_PART_LABEL}
      </Button>
    </Says>
  );
}
