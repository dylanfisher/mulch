/**
 * @role The two tiers over a part, drawn as one list twice: the albums a pattern is a run of, and
 *   the songs of whichever album is open. A tier shaped like the tier under it costs one editor
 *   rather than three, so an album row and a song row are the same component and an album is not a
 *   new kind of thing (P147). Every gesture here is one `deck.player` carrying the whole spec, so
 *   an album edit is undone, logged, captured and replayed like any other durable edit (0089).
 * @instead The parts of the open song, and the row one part wears → src/ui/PlayerSong.tsx and
 *   src/ui/PlayerPart.tsx. What an album is, and what happens to a count of nought →
 *   src/lib/playerAlbum.ts. The words these rows say → src/lib/copyAlbum.ts. The reorder gesture
 *   itself → src/ui/listDrag.ts.
 */
// Over the dependency cap, and what is over it is one row's worth of controls twice: a grip, an
// open press, a name field, a dial, two actions and the words for all of them. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
// And over the line cap by the same measure: this is two lists' whole surface, and splitting it
// would hand one list's drag refs to a component with one caller. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
import { useCallback, useMemo, type FocusEvent, type KeyboardEvent } from "react";

import type { Instrument } from "@/app/facade";
import type { PlayerSpec } from "@/lib/player";
import {
  openIn,
  PLAYER_ALBUM_DEFAULTS,
  PLAYER_ALBUM_MAX,
  PLAYER_ALBUM_SONGS_MAX,
  PLAYER_PLAYS_DEFAULT,
  PLAYER_PLAYS_MAX,
  PLAYER_PLAYS_MIN,
  PLAYER_SONG_DEFAULTS,
  type PlayerAlbum,
  type PlayerSong,
} from "@/lib/playerAlbum";
import {
  PLAYER_ALBUM_LABEL,
  PLAYER_ALBUM_OPEN_LABEL,
  PLAYER_ALBUM_OPEN_TOOLTIP,
  PLAYER_PLAYS_LABEL,
  PLAYER_PLAYS_TOOLTIP,
} from "@/lib/copyAlbum";
import {
  ACTION_TOOLTIPS,
  copyName,
  partBadge,
  PLAYER_PART_NAME_TOOLTIP,
  PLAYER_SONG_LABEL,
  yardLabel,
} from "@/lib/copy";
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

/** What both tiers are, as far as a row is concerned: a thing with a name, in an order, played a
 *  number of times. The whole of why there is one row component and not two (P147). */
type Tier = { id: string; name: string; plays: number };

/** The attribute each tier's rows carry the thing they draw under, so the frame in the section
 *  above can light the one standing without asking React for anything — the road `PART_ATTRIBUTE`
 *  took, one and two tiers up (0157, src/ui/PlayerPart.tsx). One per tier and not one shared: an
 *  album's id and a song's id are minted from the same well and checked against different sets, so
 *  a single attribute would be two lists a lookup could confuse. */
export const ALBUM_ATTRIBUTE = "data-album";
export const SONG_ATTRIBUTE = "data-song";

/**
 * One row of either tier: the grip that moves it, the press that fills the list below with what it
 * holds, what a hand calls it, how many times it plays, and the two actions that copy it and take
 * it away.
 *
 * A component of its own for the reason a part row is one: every handler has to carry which row it
 * is, and a closure built in the parent's render is a new prop on every frame the card draws.
 */
// One callback per gesture and one control per gesture, plus the grip and the badge that say
// which row this is: the length is how many things a tier is rather than how much this row
// decides — the same waiver a part's row carries. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
function TierRow({
  named,
  attribute,
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
  /** Which tier's attribute this row wears its id under, so the frame above lights albums against
   *  albums and songs against songs (`ALBUM_ATTRIBUTE`). */
  attribute: string;
  held: Tier;
  /** Whether the list below is showing this one's own run. A view preference handed down, never a
   *  field of the row: no command, nothing durable, no history entry (plan §2). */
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
      {...{ [DRAG_CARD_ATTRIBUTE]: "", [attribute]: held.id }}
      // Two inks and never one, exactly as a part's row draws them: the walk lights the row it is
      // standing on and a hand lights the row it has opened, and a surface that drew them the same
      // would say a run is playing when what it is, is being read (0172, src/ui/PlayerPart.tsx).
      className={cn(
        "group/row flex w-full flex-wrap items-center gap-1 rounded-md px-1",
        "data-[dragging=true]:relative data-[dragging=true]:z-10",
        open ? "bg-foreground/10" : "data-[standing=true]:bg-primary/15",
      )}
    >
      {/* The mark saying the walk is inside this album or this song, in a slot the row is mounted
          with whether or not it is: a run arriving may not move the page under it (0070). */}
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
      {/* What this one is, and the press that fills the list below with what it holds — one
          control saying both, exactly as a part's badge and its Select are (0157, 0176). Pressed
          and never un-pressed: something is always open, because a list showing nothing would be a
          section with a hole in it. */}
      <Says what={PLAYER_ALBUM_OPEN_TOOLTIP}>
        <Toggle
          size="sm"
          variant="outline"
          pressed={open}
          aria-label={`${PLAYER_ALBUM_OPEN_LABEL} ${named}`}
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
            jumps still to come of the song round, or of the album round over that, at the length
            the standing part's dials say a landing lasts (0221, `growthLeft`,
            src/ui/PlayerSong.tsx). Written by the frame above, mounted here whether or not there
            is anything to say (0070). */}
        <span data-slot={ROW_LEFT_SLOT} className={ROW_LEFT} />
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

/**
 * One tier's whole list: its rows, the drag that reorders them and the button that adds one. Drawn
 * twice — once for the albums, once for the open album's songs — because the two tiers are one
 * shape and one shape is one list (P147).
 */
// One prop per gesture its rows offer, plus the drag and the add under them: the length is that
// list's whole surface. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
function TierList({
  named,
  what,
  attribute,
  run,
  open,
  max,
  order,
  reorder,
  onOpen,
  onPlays,
  onRename,
  onAdd,
  onDuplicate,
  onRemove,
}: {
  named: string;
  /** What one of these is called, which every control on every row is named after: a locator asks
   *  for "Yard 1 Album 2 Plays", and two lists under one word would be two controls under one
   *  name (§4, src/ui/PlayerPart.tsx). */
  what: string;
  /** The attribute this list's rows are keyed by, handed down to them (`ALBUM_ATTRIBUTE`). */
  attribute: string;
  run: readonly Tier[];
  open: string | null;
  max: number;
  order: () => string[];
  reorder: (item: string, index: number) => void;
  onOpen: (id: string) => void;
  onPlays: (id: string, plays: number) => void;
  onRename: (id: string, name: string) => void;
  onAdd: () => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const { listRef, slotRef, listProps, dragHandle } = useListDrag<string>({ order, reorder });
  const full = run.length >= max;
  return (
    <div className="flex w-full flex-col items-start gap-1">
      <div ref={listRef} className="relative flex w-full flex-col gap-1" {...listProps}>
        {run.map((held, at) => (
          <TierRow
            key={held.id}
            named={`${named} ${what} ${at + 1}`}
            attribute={attribute}
            held={held}
            open={held.id === open}
            handle={dragHandle(at, held.id, run.length - 1)}
            onOpen={onOpen}
            onPlays={onPlays}
            onRename={onRename}
            onDuplicate={onDuplicate}
            onRemove={onRemove}
            full={full}
          />
        ))}
        {/* The slot a live drag would land in, hidden between drags — the part list's own (0157). */}
        <div
          ref={slotRef}
          hidden
          aria-hidden="true"
          data-slot="album-landing"
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
          aria-label={`Add ${named} ${what}`}
          onClick={onAdd}
        >
          <ACTION_ICONS.add />
          {what}
        </Button>
      </Says>
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
 * The albums, and the songs of whichever one is open. Both lists are drawn here rather than one
 * each in two sections, because the screen is one section: the area under the albums is a view
 * onto the album that is open, so pressing another fills it with that album's songs (P147).
 */
// One callback per gesture per tier, which is the length: the two lists offer the same six things
// and each of them says beside itself what it patches. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function PlayerAlbums({
  instrument,
  deck,
  player,
  patch,
  album,
  song,
}: {
  instrument: Instrument;
  deck: DeckId;
  player: PlayerSpec;
  /** The card's own patch: one `deck.player` per gesture, carrying the whole spec (0089). */
  patch: (fields: Partial<PlayerSpec>) => void;
  /** Which album's songs the list below shows, and which song's parts the list below that does —
   *  held by the yard for the reason every other view state on this card is: this section is drawn
   *  under the card's fold, and state living in it would be thrown away every time that fold is
   *  used (0157). No command, nothing durable, no history entry (plan §2). */
  album: [open: string | null, setOpen: (open: string | null) => void];
  song: [open: string | null, setOpen: (open: string | null) => void];
}) {
  const albums = player.albums;
  const [openAlbum, setOpenAlbum] = album;
  const [openSong, setOpenSong] = song;
  const held = openIn(albums, openAlbum);
  /** The songs of the album that is open. Memoised beside it because it is handed straight to a
   *  list as a prop, and a fresh array per render is a fresh prop per render (0070). */
  const songs = useMemo(() => held?.songs ?? [], [held]);
  const standing = openIn(songs, openSong);
  const named = yardLabel(deck);

  /** Every album gesture rebuilds the run and sends it whole, which is the one road this card has
   *  (0089): there is no album command, because `deck.player` already carries every album. */
  const withAlbums = useCallback(
    (next: readonly PlayerAlbum[]) => {
      patch({ albums: next });
    },
    [patch],
  );
  const albumPlays = useCallback(
    (id: string, plays: number) => {
      withAlbums(albums.map((each) => (each.id === id ? { ...each, plays } : each)));
    },
    [withAlbums, albums],
  );
  const albumRename = useCallback(
    (id: string, name: string) => {
      withAlbums(albums.map((each) => (each.id === id ? { ...each, name } : each)));
    },
    [withAlbums, albums],
  );
  const albumAdd = useCallback(() => {
    // The id is minted at the gesture, which is the whole of what makes it identity, and the name
    // is drawn off that id from the album pools, because nothing here is ever nameless (0076,
    // 0157, 0081, principle 5). The albums already standing go with the draw, so no two rows of
    // this list read alike while the pool holds a reading nobody has.
    const id = mintPlayerRunId();
    const name = mintTierName(
      "album",
      id,
      albums.map((each) => each.name),
    );
    withAlbums([...albums, { id, name, ...PLAYER_ALBUM_DEFAULTS }]);
  }, [withAlbums, albums]);
  const albumDuplicate = useCallback(
    (id: string) => {
      const at = albums.findIndex((each) => each.id === id);
      const found = albums[at];
      if (found === undefined) return;
      // Fresh ids all the way down, because identity is the one thing a copy may not take at any
      // tier (0092, 0157), and it lands directly after the one it was taken from (0092).
      const copy: PlayerAlbum = {
        ...found,
        id: mintPlayerRunId(),
        name: copyName(found.name),
        songs: found.songs.map(copiedSong),
      };
      withAlbums([...albums.slice(0, at + 1), copy, ...albums.slice(at + 1)]);
    },
    [withAlbums, albums],
  );
  const albumRemove = useCallback(
    (id: string) => {
      withAlbums(albums.filter((each) => each.id !== id));
    },
    [withAlbums, albums],
  );

  /** And the same six one tier down, each writing into the album that is open: a song is an album's
   *  and never the spec's, so every one of these is a rebuild of that album alone. */
  const withSongs = useCallback(
    (next: readonly PlayerSong[]) => {
      if (held === undefined) return;
      withAlbums(albums.map((each) => (each.id === held.id ? { ...each, songs: next } : each)));
    },
    [withAlbums, albums, held],
  );
  const songPlays = useCallback(
    (id: string, plays: number) => {
      withSongs(songs.map((each) => (each.id === id ? { ...each, plays } : each)));
    },
    [withSongs, songs],
  );
  const songRename = useCallback(
    (id: string, name: string) => {
      withSongs(songs.map((each) => (each.id === id ? { ...each, name } : each)));
    },
    [withSongs, songs],
  );
  const songAdd = useCallback(() => {
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

  /**
   * What a reorder answers with, both read at the release rather than at the press: the order the
   * session holds, and the one command a reorder is — the ordinary `deck.player`, so a run moved
   * is undone, logged and replayed like any other durable edit (0089, 0111).
   */
  const albumOrder = useCallback(
    () => deckIn(instrument.state.getState().decks, deck).player?.albums.map((one) => one.id) ?? [],
    [instrument, deck],
  );
  const albumReorder = useCallback(
    (item: string, index: number) => {
      const spec = deckIn(instrument.state.getState().decks, deck).player;
      if (spec === null) return;
      const moved = reordered(spec.albums, item, index);
      if (moved === null) return;
      instrument.send({ t: "deck.player", deck, player: { ...spec, albums: moved } });
    },
    [instrument, deck],
  );
  const songOrder = useCallback(() => songs.map((one) => one.id), [songs]);
  const songReorder = useCallback(
    (item: string, index: number) => {
      const moved = reordered(songs, item, index);
      if (moved === null) return;
      withSongs(moved);
    },
    [songs, withSongs],
  );

  return (
    <>
      <TierList
        named={named}
        what={PLAYER_ALBUM_LABEL}
        attribute={ALBUM_ATTRIBUTE}
        run={albums}
        open={held?.id ?? null}
        max={PLAYER_ALBUM_MAX}
        order={albumOrder}
        reorder={albumReorder}
        onOpen={setOpenAlbum}
        onPlays={albumPlays}
        onRename={albumRename}
        onAdd={albumAdd}
        onDuplicate={albumDuplicate}
        onRemove={albumRemove}
      />
      {/* The songs of whichever album is open, in the same area rather than a second section: the
          list is a view onto the album above it, so pressing another album fills it (P147). */}
      {held === undefined ? null : (
        <TierList
          named={`${named} ${PLAYER_ALBUM_LABEL}`}
          what={PLAYER_SONG_LABEL}
          attribute={SONG_ATTRIBUTE}
          run={songs}
          open={standing?.id ?? null}
          max={PLAYER_ALBUM_SONGS_MAX}
          order={songOrder}
          reorder={songReorder}
          onOpen={setOpenSong}
          onPlays={songPlays}
          onRename={songRename}
          onAdd={songAdd}
          onDuplicate={songDuplicate}
          onRemove={songRemove}
        />
      )}
    </>
  );
}
