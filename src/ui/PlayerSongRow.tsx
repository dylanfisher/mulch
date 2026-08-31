/**
 * @role The tier over a part, drawn as one list: the songs a pattern is a run of, each a row with
 *   a grip, an open press, a name, a dial and two actions. A list of its own rather than a shape
 *   the parts list grows, because the parts under it are drawn by the section that holds both and
 *   that section is already at its cap (P170). Every gesture here is one `deck.player` carrying
 *   the whole spec, so a song edit is undone, logged, captured and replayed like any other durable
 *   edit (0089).
 * @instead The section this list sits in, the parts of the open song, and the row one part wears →
 *   src/ui/PlayerSong.tsx and src/ui/PlayerPart.tsx. What a song is, and what happens to a count of
 *   nought → src/lib/playerSongs.ts. The words these rows say → src/lib/copySongs.ts. The reorder
 *   gesture itself → src/ui/listDrag.ts.
 */
// Over the dependency cap, and what is over it is one row's worth of controls: a grip, an open
// press, a name field, a dial, two actions and the words for all of them. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
// And over the line cap by the same measure: this is one list's whole surface — a row of six
// controls, the reorder over them and the add under them — and splitting it would hand the list's
// drag refs to a component with one caller. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
import { useCallback, type FocusEvent, type KeyboardEvent } from "react";

import type { Instrument } from "@/app/facade";
import type { PlayerSpec } from "@/lib/player";
import {
  openIn,
  PLAYER_PLAYS_DEFAULT,
  PLAYER_PLAYS_MAX,
  PLAYER_PLAYS_MIN,
  PLAYER_SONG_DEFAULTS,
  PLAYER_SONGS_MAX,
  withSong,
  type PlayerSong,
} from "@/lib/playerSongs";
import {
  PLAYER_PLAYS_LABEL,
  PLAYER_PLAYS_TOOLTIP,
  PLAYER_SONG_OPEN_LABEL,
  PLAYER_SONG_OPEN_TOOLTIP,
} from "@/lib/copySongs";
import {
  ACTION_TOOLTIPS,
  copyName,
  partBadge,
  PLAYER_PART_NAME_TOOLTIP,
  PLAYER_SONG_LABEL,
  yardLabel,
} from "@/lib/copy";
import { GROWTH_LEFT_LABEL } from "@/lib/copyAuto";
import { mintTierName } from "@/lib/copyNames";
import { DURABLE_TEXT_MAX } from "@/lib/guards";
import { cn } from "@/lib/cn";
import { deckIn, type DeckId } from "@/state/store";
import { Button } from "@/ui/components/button";
import { Input } from "@/ui/components/input";
import { Toggle } from "@/ui/components/toggle";
import { ACTION_ICONS } from "@/ui/icons";
import { Knob } from "@/ui/Knob";
import { DRAG_CARD_ATTRIBUTE, reordered, useListDrag, type DragHandleProps } from "@/ui/listDrag";
import { mintPlayerRunId, mintSongPartId } from "@/ui/actions";
import { ROW_LEFT, ROW_LEFT_SLOT, ROW_MARK } from "@/ui/PlayerPart";
import { Says } from "@/ui/Says";
// oxlint-enable import/max-dependencies

/** The attribute each song row carries its id under, so the frame in the section above can light
 *  the one standing without asking React for anything — the road `PART_ATTRIBUTE` took, one tier
 *  up (0157, src/ui/PlayerPart.tsx). */
export const SONG_ATTRIBUTE = "data-song";

/**
 * One song's row: the grip that moves it, the press that fills the list below with its parts, what
 * a hand calls it, how many times it plays, and the two actions that copy it and take it away.
 *
 * A component of its own for the reason a part row is one: every handler has to carry which row it
 * is, and a closure built in the parent's render is a new prop on every frame the card draws.
 */
// One callback per gesture and one control per gesture, plus the grip and the badge that say
// which row this is: the length is how many things a song is rather than how much this row
// decides — the same waiver a part's row carries. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
function SongRow({
  named,
  held,
  open,
  handle,
  onOpen,
  onPlays,
  onRename,
  onDuplicate,
  onRemove,
  full,
}: {
  named: string;
  held: PlayerSong;
  /** Whether the list below is showing this one's own parts. A view preference handed down, never
   *  a field of the row: no command, nothing durable, no history entry (plan §2). */
  open: boolean;
  handle: DragHandleProps;
  onOpen: (id: string) => void;
  onPlays: (id: string, plays: number) => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
  /** Whether the run is at its ceiling, which is what refuses the copy — the same bound the add
   *  under the list is refused at, said on the one control that would also write a ninth (0121). */
  full: boolean;
}) {
  const badge = partBadge(held.id);
  const openThis = useCallback(() => {
    onOpen(held.id);
  }, [onOpen, held.id]);
  const setPlays = useCallback(
    (plays: number) => {
      onPlays(held.id, Math.round(plays));
    },
    [onPlays, held.id],
  );
  const duplicate = useCallback(() => {
    onDuplicate(held.id);
  }, [onDuplicate, held.id]);
  const remove = useCallback(() => {
    onRemove(held.id);
  }, [onRemove, held.id]);
  /** Renaming, committed on Enter or on leaving the field and never per keystroke, and an emptied
   *  field puts the badge back: the part row's own rule, for its reasons (0024, principle 5,
   *  src/ui/PlayerPart.tsx). */
  const rename = useCallback(
    (field: HTMLInputElement) => {
      const typed = field.value.trim();
      const name = typed === "" ? badge : typed;
      field.value = name;
      if (name === held.name) return;
      onRename(held.id, name);
    },
    [onRename, held, badge],
  );
  const onRenameKey = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.currentTarget.blur();
  }, []);
  const onRenameBlur = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      rename(event.currentTarget);
    },
    [rename],
  );

  return (
    <div
      {...{ [DRAG_CARD_ATTRIBUTE]: "", [SONG_ATTRIBUTE]: held.id }}
      // Two inks and never one, exactly as a part's row draws them: the walk lights the row it is
      // standing on and a hand lights the row it has opened, and a surface that drew them the same
      // would say a run is playing when what it is, is being read (0172, src/ui/PlayerPart.tsx).
      className={cn(
        "group/row flex w-full flex-wrap items-center gap-1 rounded-md px-1",
        "data-[dragging=true]:relative data-[dragging=true]:z-10",
        open ? "bg-foreground/10" : "data-[standing=true]:bg-primary/15",
      )}
    >
      {/* The mark saying the walk is inside this song, in a slot the row is mounted with whether or
          not it is: a run arriving may not move the page under it (0070). */}
      <span aria-hidden="true" className={ROW_MARK} />
      <Says what={ACTION_TOOLTIPS.reorder}>
        <Button
          size="icon-sm"
          variant="ghost"
          className="cursor-grab touch-none"
          aria-label={`Reorder ${named}`}
          {...handle}
        >
          <ACTION_ICONS.reorder />
        </Button>
      </Says>
      {/* What this one is, and the press that fills the list below with its parts — one control
          saying both, exactly as a part's badge and its Select are (0157, 0176). Pressed and never
          un-pressed: something is always open, because a list showing nothing would be a section
          with a hole in it. */}
      <Says what={PLAYER_SONG_OPEN_TOOLTIP}>
        <Toggle
          size="sm"
          variant="outline"
          pressed={open}
          aria-label={`${PLAYER_SONG_OPEN_LABEL} ${named}`}
          onPressedChange={openThis}
        >
          <span className="type-readout">{badge}</span>
        </Toggle>
      </Says>
      <Says what={PLAYER_PART_NAME_TOOLTIP}>
        <Input
          key={held.name}
          className="w-32"
          defaultValue={held.name}
          maxLength={DURABLE_TEXT_MAX}
          aria-label={`Name ${named}`}
          onKeyDown={onRenameKey}
          onBlur={onRenameBlur}
        />
      </Says>
      {/* How many times it goes round, and the whole of whether it is passed over: nought is the
          skip, so there is no switch beside this dial (`PLAYER_PLAYS_MIN`, principle 1). The
          compact dial, which is the one drawn without a caption, for the reason a part's length
          dial is (0055, src/ui/Knob.tsx). */}
      <Knob
        label={PLAYER_PLAYS_LABEL}
        name={`${named} ${PLAYER_PLAYS_LABEL}`}
        says={PLAYER_PLAYS_TOOLTIP}
        size="xs"
        value={held.plays}
        min={PLAYER_PLAYS_MIN}
        max={PLAYER_PLAYS_MAX}
        defaultValue={PLAYER_PLAYS_DEFAULT}
        step={1}
        onChange={setPlays}
      />
      <div className="ml-auto flex items-center gap-1">
        {/* How long this round of it has left, in the words a countdown is already said in: the
            jumps still to come of the song round, at the length the standing part's dials say a
            landing lasts (0221, `growthLeft`, src/ui/PlayerSong.tsx). Written by the frame above,
            mounted here whether or not there is anything to say, and labelled here once with what
            the number counts rather than carrying the word in every string a frame writes (0070,
            P162). */}
        <span data-slot={ROW_LEFT_SLOT} className={ROW_LEFT} title={GROWTH_LEFT_LABEL} />
        {/* Refused rather than hidden at the ceiling, exactly as the add under the list is: a copy
            is a ninth of eight, which the one validator refuses loudly (0121). */}
        <Says what={ACTION_TOOLTIPS.duplicate}>
          <Button
            size="icon-sm"
            variant="ghost"
            disabled={full}
            aria-label={`Duplicate ${named}`}
            onClick={duplicate}
          >
            <ACTION_ICONS.duplicate />
          </Button>
        </Says>
        <Says what={ACTION_TOOLTIPS.remove}>
          <Button size="icon-sm" variant="ghost" aria-label={`Remove ${named}`} onClick={remove}>
            <ACTION_ICONS.remove />
          </Button>
        </Says>
      </div>
    </div>
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
 * The songs, above the parts of whichever one is open. One list and never two: the area under it
 * is a view onto the song that is open, so pressing another fills it with that song's parts
 * (P170).
 */
// One callback per gesture the list offers, plus the drag and the add under them: the length is
// the list's whole surface, and each callback says beside itself what it patches. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function PlayerSongs({
  instrument,
  deck,
  player,
  patch,
  song,
}: {
  instrument: Instrument;
  deck: DeckId;
  player: PlayerSpec;
  /** The card's own patch: one `deck.player` per gesture, carrying the whole spec (0089). */
  patch: (fields: Partial<PlayerSpec>) => void;
  /** Which song's parts the list below shows — held by the yard for the reason every other view
   *  state on this card is: this section is drawn under the card's fold, and state living in it
   *  would be thrown away every time that fold is used (0157). No command, nothing durable, no
   *  history entry (plan §2). */
  song: [open: string | null, setOpen: (open: string | null) => void];
}) {
  const songs = player.songs;
  const [opened, setOpenSong] = song;
  /** Which row reads as open, resolved rather than compared against the view state raw: nothing
   *  pointed at is the first, and so is a name the run no longer answers — the same `openIn` the
   *  parts under this list are read through, so the row that is marked is the row those parts
   *  belong to (plan §2, src/ui/PlayerSong.tsx). */
  const openSong = openIn(songs, opened)?.id ?? null;
  const named = yardLabel(deck);
  /**
   * What a reorder answers with, both read at the release rather than at the press: the order the
   * session holds, and the one command a reorder is — the ordinary `deck.player`, so a run moved
   * is undone, logged and replayed like any other durable edit (0089, 0111).
   */
  const order = useCallback(
    () => deckIn(instrument.state.getState().decks, deck).player?.songs.map((one) => one.id) ?? [],
    [instrument, deck],
  );
  const reorder = useCallback(
    (item: string, index: number) => {
      const spec = deckIn(instrument.state.getState().decks, deck).player;
      if (spec === null) return;
      const moved = reordered(spec.songs, item, index);
      if (moved === null) return;
      instrument.send({ t: "deck.player", deck, player: { ...spec, songs: moved } });
    },
    [instrument, deck],
  );
  const { listRef, slotRef, listProps, dragHandle } = useListDrag<string>({ order, reorder });

  /** Every song gesture rebuilds the run and sends it whole, which is the one road this card has
   *  (0089): there is no song command, because `deck.player` already carries every song. */
  const withSongs = useCallback(
    (next: readonly PlayerSong[]) => {
      patch({ songs: next });
    },
    [patch],
  );
  const songPlays = useCallback(
    (id: string, plays: number) => {
      withSongs(withSong(songs, id, { plays }));
    },
    [withSongs, songs],
  );
  const songRename = useCallback(
    (id: string, name: string) => {
      withSongs(withSong(songs, id, { name }));
    },
    [withSongs, songs],
  );
  const songAdd = useCallback(() => {
    // The id is minted at the gesture, which is the whole of what makes it identity, and the name
    // is drawn off that id from the song pools, because nothing here is ever nameless (0076, 0157,
    // 0081, principle 5). The songs already standing go with the draw, so no two rows of this list
    // read alike while the pool holds a reading nobody has.
    const id = mintPlayerRunId();
    const name = mintTierName(
      "song",
      id,
      songs.map((each) => each.name),
    );
    withSongs([...songs, { id, name, ...PLAYER_SONG_DEFAULTS }]);
  }, [withSongs, songs]);
  const songDuplicate = useCallback(
    (id: string) => {
      const at = songs.findIndex((each) => each.id === id);
      const found = songs[at];
      if (found === undefined) return;
      // Fresh ids all the way down, because identity is the one thing a copy may not take at
      // either tier (0092, 0157), and it lands directly after the one it was taken from (0092).
      withSongs([...songs.slice(0, at + 1), copiedSong(found), ...songs.slice(at + 1)]);
    },
    [withSongs, songs],
  );
  const songRemove = useCallback(
    (id: string) => {
      withSongs(songs.filter((each) => each.id !== id));
    },
    [withSongs, songs],
  );

  const full = songs.length >= PLAYER_SONGS_MAX;
  return (
    <div className="flex w-full flex-col items-start gap-1">
      <div ref={listRef} className="relative flex w-full flex-col gap-1" {...listProps}>
        {songs.map((held, at) => (
          <SongRow
            key={held.id}
            named={`${named} ${PLAYER_SONG_LABEL} ${at + 1}`}
            held={held}
            open={held.id === openSong}
            handle={dragHandle(at, held.id, songs.length - 1)}
            onOpen={setOpenSong}
            onPlays={songPlays}
            onRename={songRename}
            onDuplicate={songDuplicate}
            onRemove={songRemove}
            full={full}
          />
        ))}
        {/* The slot a live drag would land in, hidden between drags — the part list's own (0157). */}
        <div
          ref={slotRef}
          hidden
          aria-hidden="true"
          data-slot="song-row-landing"
          className="pointer-events-none absolute bg-accent"
        />
      </div>
      {/* Refused rather than hidden at the ceiling: a control that vanishes at a bound leaves
          nothing saying there was one (0121). */}
      <Says what={ACTION_TOOLTIPS.add}>
        <Button
          size="xs"
          variant="outline"
          disabled={full}
          aria-label={`Add ${named} ${PLAYER_SONG_LABEL}`}
          onClick={songAdd}
        >
          <ACTION_ICONS.add />
          {PLAYER_SONG_LABEL}
        </Button>
      </Says>
    </div>
  );
}
