/**
 * @role The section of the jumps card that arranges the pattern: the parts a song is a run of,
 *   each carrying the dials it was captured from and lasting the jumps its own dial says (0176). A
 *   full-width fold under the card's dials, wearing the fold every
 *   other module wears, with the part standing lit as it plays (0107, 0157) — or, where the four
 *   amounts above it are drawing an arrangement, the run the pattern wrote for itself, read here
 *   rather than in a second display (0158). One `deck.player` per
 *   gesture, carrying the whole spec, so an arrangement is undone, logged, captured and replayed
 *   like any other durable edit (0089).
 * @instead What a part is → src/lib/playerSong.ts. What each character sounds like, and the menu
 *   that fills a selected part's spec with one → src/ui/PlayerCharacter.tsx. The dials a selected
 *   part points at, and what they write into → src/ui/PlayerCard.tsx. The reorder gesture itself →
 *   src/ui/listDrag.ts.
 */
// Over the dependency cap, and what is over it is one row's worth of controls: a picker, two
// dials, a state and an action, plus the fold, the drag and the words for all of them. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
// Over the line cap by the same measure: this is one list's whole surface — a fold, a reorder, a
// row of five controls and the add under them — and splitting it hands the drag's refs between
// components with one caller each. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
import { useCallback, useLayoutEffect, useMemo, useRef } from "react";

import type { Instrument } from "@/app/facade";
import type { PartVoice, PlayerSpec } from "@/lib/player";
import {
  PLAYER_PART_DEFAULTS,
  PLAYER_SONG_MAX,
  songIsDrawn,
  type SongPart,
  type SongPartId,
} from "@/lib/playerSong";
import { albumsArePlayed, openIn, withSongParts } from "@/lib/playerAlbum";
import type { PlayerStep } from "@/lib/playerWalk";
import { stepSecs } from "@/lib/playerScope";
import { growthLeft } from "@/lib/copyAuto";
import { PLAYER_ALBUM_EMPTY, PLAYER_ALBUM_TOOLTIP, PLAYER_ALBUMS_LABEL } from "@/lib/copyAlbum";
import { ALBUM_ATTRIBUTE, PlayerAlbums, SONG_ATTRIBUTE } from "@/ui/PlayerAlbum";
import {
  ACTION_TOOLTIPS,
  copyName,
  PLAYER_PART_LABEL,
  PLAYER_SONG_EMPTY,
  PLAYER_SONG_LABEL,
  yardLabel,
} from "@/lib/copy";
import { mintTierName } from "@/lib/copyNames";
import { deckIn, type DeckId } from "@/state/store";
import { Button } from "@/ui/components/button";
import { Toggle } from "@/ui/components/toggle";
import { FoldCaret } from "@/ui/FoldCaret";
import { useOnFrame } from "@/ui/frame";
import { ACTION_ICONS } from "@/ui/icons";
import { reordered, useListDrag } from "@/ui/listDrag";
import { mintSongPartId } from "@/ui/actions";
import { PART_ATTRIBUTE, PartCard, ROW_LEFT_SLOT } from "@/ui/PlayerPart";
import { PlayerDrawn } from "@/ui/PlayerDrawn";
import { Says } from "@/ui/Says";
// oxlint-enable import/max-dependencies

/**
 * What one painting of the arrangement says: which album, which song and which part the walk is
 * standing in, and how long each of those three has left in the words a countdown is already said
 * in (`growthLeft`, src/lib/copyAuto.ts). The ids so a row can be found by the attribute it wears,
 * the words so a row can be filled with them.
 */
export type StandingRow = {
  album: string | null;
  song: string | null;
  part: SongPartId | null;
  albumLeft: string;
  songLeft: string;
  partLeft: string;
};

/** Nothing standing anywhere, which is what a stopped yard, a pattern with no arrangement and a
 *  pattern drawing its own all read as. Declared once, outside any render: it is what the frame
 *  compares its first painting against. */
const NOTHING_STANDING: StandingRow = {
  album: null,
  song: null,
  part: null,
  albumLeft: "",
  songLeft: "",
  partLeft: "",
};

/**
 * Where the run stands and how long each row it is standing in has left, off the step the clock is
 * actually inside — the walk's own answer and never a second count of the ordinal (principle 1,
 * 0157, 0180). The place says the jumps still to come at each of the three tiers; this says how
 * long those jumps take.
 *
 * **An estimate, and drawn as one**: every jump still to come is priced at the landing the
 * *dials* say, which is the standing part's voice — so it moves when a hand moves a dial, exactly
 * as the automator's own row does, and not when a roll strays one burst or places one wait
 * (`stepSecs`, src/lib/playerScope.ts; 0221).
 *
 * A yard whose loop has no grid has no seconds to say and says none — `slotSecs` is null there, and
 * a wait counted in slots of a grid that does not exist is not a number (0159).
 */
export function standingIn(step: PlayerStep | null, slotSecs: number | null): StandingRow {
  const place = step?.place ?? null;
  const part = step?.part ?? null;
  if (place === null) return { ...NOTHING_STANDING, part };
  // The part's own numbers where one is standing, which is every step that carries a place; the
  // step's own drawn ones are the total answer where none is (0157).
  const secs = step === null || slotSecs === null ? null : stepSecs(step.voice ?? step, slotSecs);
  const said = (left: number): string => (secs === null ? "" : growthLeft(left * secs));
  return {
    album: place.album,
    song: place.song,
    part,
    albumLeft: said(place.albumLeft),
    songLeft: said(place.songLeft),
    partLeft: said(place.partLeft),
  };
}

/** Whether two paintings say the same thing, which is what keeps the DOM walk off the frames
 *  where nothing moved (0070). Field by field rather than by identity: `standingIn` answers a
 *  fresh object every frame, and it is the six answers that are the state. */
export const sameRow = (one: StandingRow, two: StandingRow): boolean =>
  one.album === two.album &&
  one.song === two.song &&
  one.part === two.part &&
  one.albumLeft === two.albumLeft &&
  one.songLeft === two.songLeft &&
  one.partLeft === two.partLeft;

/** One tier's rows lit: the standing mark on every row of it, and the countdown in the one row
 *  that is standing. Written into the DOM and never through React, and compared before it is
 *  written, because a `textContent` replaces the node's children whether or not the string
 *  matches (0070, plan §2). */
export function litRows(
  section: HTMLElement,
  attribute: string,
  standing: string | null,
  left: string,
): void {
  for (const row of section.querySelectorAll<HTMLElement>(`[${attribute}]`)) {
    const here = standing !== null && row.getAttribute(attribute) === standing;
    row.dataset["standing"] = String(here);
    const clock = row.querySelector<HTMLElement>(`[data-slot="${ROW_LEFT_SLOT}"]`);
    if (clock === null) continue;
    const says = here ? left : "";
    if (clock.textContent !== says) clock.textContent = says;
  }
}

// One callback per gesture the section offers, the fold over them and the frame that lights the
// part standing: the length is how many things a song is rather than how much this component
// decides — the same waiver its rows carry. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function PlayerSong({
  instrument,
  deck,
  player,
  playing,
  slotSecs,
  voice,
  patch,
  fold,
  select,
  open,
  solo,
  album,
  songView,
}: {
  instrument: Instrument;
  deck: DeckId;
  player: PlayerSpec;
  /** Whether this yard is playing — what decides if the standing part is read once a frame or
   *  once a render, the same thing an automated dial's `animate` decides (0040). */
  playing: boolean;
  /** How long one slot of this yard's grid lasts, or null where the loop has no grid to jump around
   *  at all — the picture's own answer, handed down rather than asked again (`slotSecsOf`,
   *  src/ui/PlayerScope.tsx). It is what turns the jumps a row has left into seconds, and a yard
   *  without one says no seconds at all (0159). */
  slotSecs: number | null;
  /**
   * The spec the card's dials are showing, as a part carries one: what Add Part captures, which is
   * the whole of "this part, exactly as the card stands right now" (0176). It is the selected
   * part's own while one is selected, so adding a part while a part is selected copies it.
   */
  voice: PartVoice;
  /** The card's own patch: one `deck.player` per gesture, carrying the whole spec (0089). */
  patch: (fields: Partial<PlayerSpec>) => void;
  /**
   * Whether this section is folded shut, and the call that changes it — held by the yard rather
   * than here, for the reason the rack's own fold is (src/ui/EffectRack.tsx): this section is
   * drawn under the jumps card's fold, and state living in it would be thrown away every time
   * that one is used. A view preference either way: no command, nothing durable, no history entry
   * (plan §2).
   */
  fold: [folded: boolean, setFolded: (folded: boolean) => void];
  /**
   * Which part the card's dials are pointed at, and the call that points them — held by the yard
   * for the reason both folds are, and a view preference on exactly the same terms: no command,
   * nothing durable, no history entry (plan §2, 0176). A selection naming a part this song no
   * longer holds is simply no selection, which is what makes removing one need no cleanup here.
   */
  select: [selected: SongPartId | null, setSelected: (selected: SongPartId | null) => void];
  /**
   * And which part has its own dials open under it, held by the yard on exactly those terms and
   * for exactly that reason (plan §2, 0176). Separate from the selection: a hand may edit a part
   * where it stands without pointing the card's dials at it, which is the indirection the fold
   * replaces — and one at a time, because a list showing several sets of dials is a list nothing
   * can be read down.
   */
  open: [open: SongPartId | null, setOpen: (open: SongPartId | null) => void];
  /**
   * And which part is being heard on its own, held by the yard for the reason the two above are
   * and on exactly the same terms — no command of its own, nothing durable, no history entry (plan
   * §2, 0190). One at a time, because a solo is what the *pass* is playing and a pass plays one
   * thing. It outlives a stop: the pass keeps its own and opens on it when the yard plays again, so
   * this toggle and the transport say one thing at every moment.
   */
  solo: [solo: SongPartId | null, setSolo: (solo: SongPartId | null) => void];
  /** Which album's songs the lists above the parts show, and which song's parts they are — held by
   *  the yard on exactly the terms every other view state on this card is, and for that reason: a
   *  fold may put the section away, and a view forgotten by a caret is the bug all of these lines
   *  are written against (plan §2, P147). */
  album: [open: string | null, setOpen: (open: string | null) => void];
  songView: [open: string | null, setOpen: (open: string | null) => void];
}) {
  const [folded, setFolded] = fold;
  const [selected, setSelected] = select;
  const [opened, setOpened] = open;
  const [soloed, setSolo] = solo;
  /** Which album and which song the part list below is a view onto — the first of each until a
   *  hand presses another, which is what `openIn` answers (plan §2, src/lib/playerAlbum.ts). */
  const openAlbum = openIn(player.albums, album[0]);
  const openSong = openIn(openAlbum?.songs ?? [], songView[0]);
  /** The parts of the song that is open. Memoised beside it because it is what every callback
   *  below closes over and what a row is handed as a prop: a fresh array per render is a fresh
   *  prop per render (0070). */
  const song = useMemo(() => openSong?.parts ?? [], [openSong]);
  /** Whether the walk plays this song at all: a count of nought at either tier over the parts is
   *  the skip, and the rows are still shown — so what it decides is which gestures on them are
   *  answerable, exactly as a part's own skip does (P147, src/ui/PlayerPart.tsx). */
  const heard = (openAlbum?.plays ?? 0) > 0 && (openSong?.plays ?? 0) > 0;
  /** Every gesture on a part row rebuilds that song's parts and sends the whole spec, which is the
   *  one road this card has: there is no part command, because `deck.player` carries every one
   *  (0089). */
  const write = useCallback(
    (parts: readonly SongPart[]) => {
      if (openAlbum === undefined || openSong === undefined) return;
      patch({ albums: withSongParts(player.albums, openAlbum.id, openSong.id, parts) });
    },
    [patch, player.albums, openAlbum, openSong],
  );
  /**
   * Which of the two authors is live. A rule and never a second field: an arrangement of any parts
   * at all is one the pattern draws for itself, and the list a hand wrote is held untouched
   * meanwhile — so the section shows the run being walked rather than the one that is not (0158).
   */
  const drawn = songIsDrawn(player);
  /** A pattern arranged as nothing at all, which is what the sentence under the lists answers: an
   *  empty run is the ordinary case and not a failure, and it is the only place the shape — albums
   *  of songs of parts — is said in words. */
  const albumsEmpty = player.albums.length === 0;
  const onChange = useCallback(
    (at: number, next: SongPart) => {
      write(song.map((part, index) => (index === at ? next : part)));
    },
    [write, song],
  );
  const onRemove = useCallback(
    (at: number) => {
      write(song.filter((_, index) => index !== at));
    },
    [write, song],
  );
  const onAdd = useCallback(() => {
    // The id is minted at the gesture, which is the whole of what makes it identity: a part
    // carries it for as long as it exists and no reorder can touch it (0076, 0157). The spec is
    // captured at the same gesture and for the same reason — a part is the dials as they stood
    // when it was added, and nothing later moves it but a hand pointed at it (0176).
    // And the name is minted from that id off the part pools, because a part is never nameless:
    // `assertDurableText` refuses the empty string, so a drawn name is what it is called until a
    // hand types something else (principle 5, 0081). The names its siblings wear go with it, so
    // two parts of one song never read alike while the pool holds a reading nobody has.
    const id = mintSongPartId();
    const name = mintTierName(
      "part",
      id,
      song.map((each) => each.name),
    );
    write([...song, { id, name, ...PLAYER_PART_DEFAULTS, voice }]);
  }, [write, song, voice]);
  /**
   * Copying one. A fresh id, because identity is the one thing a copy may not take (0092) — and
   * with it a fresh badge — and everything else the part was: its numbers, its length, its skip
   * and its name with the marker saying it is a second one. It lands directly after the part it
   * was taken from, which is where a copy belongs (0092), and it is one `deck.player` carrying the
   * whole spec like every other gesture here (0089).
   */
  const onDuplicate = useCallback(
    (at: number) => {
      const held = song[at];
      if (held === undefined) return;
      const copy: SongPart = { ...held, id: mintSongPartId(), name: copyName(held.name) };
      write([...song.slice(0, at + 1), copy, ...song.slice(at + 1)]);
    },
    [write, song],
  );
  /**
   * Pointing the dials at a part, and taking them off it. One at a time, because the card has one
   * set of dials: pressing a second part's badge moves them rather than adding to a set (0176).
   */
  const onSelect = useCallback(
    (id: SongPartId, next: boolean) => {
      setSelected(next ? id : null);
    },
    [setSelected],
  );
  /**
   * Hearing one part on its own: the pass plays that part over and over for as long as the toggle
   * is held, and lets the song carry on from it when it is let go. The one gesture in this section
   * that is not a `deck.player` — nothing durable moves, so it is no more an edit than a seek is,
   * and it is sent straight rather than through `patch` (0041, 0089, 0190).
   *
   * One at a time, exactly as the selection is: a pass plays one thing, so pressing a second part's
   * toggle moves the solo rather than adding to a set.
   */
  const onAudition = useCallback(
    (id: SongPartId, next: boolean) => {
      const part = next ? id : null;
      setSolo(part);
      instrument.send({ t: "deck.playerSolo", deck, part });
    },
    [instrument, deck, setSolo],
  );
  /** Opening a part's own dials, and shutting them. One at a time, for the reason a selection is:
   *  the list is read down, and several open parts are a list that cannot be. */
  const onOpen = useCallback(
    (id: SongPartId, next: boolean) => {
      setOpened(next ? id : null);
    },
    [setOpened],
  );

  /**
   * The two things this list answers for itself, both read at the release rather than at the
   * press: the order the session holds it in, and the one command a reorder is — which is the
   * ordinary `deck.player` every other gesture on this card sends, carrying the whole spec, so an
   * arrangement moved is undone, logged and replayed like any other durable edit (0089, 0111).
   */
  const order = useCallback(() => song.map((part) => part.id), [song]);
  const reorder = useCallback(
    (item: SongPartId, index: number) => {
      const spec = deckIn(instrument.state.getState().decks, deck).player;
      if (spec === null || openAlbum === undefined || openSong === undefined) return;
      const run = openIn(spec.albums, openAlbum.id);
      const parts = openIn(run?.songs ?? [], openSong.id)?.parts ?? [];
      const moved = reordered(parts, item, index);
      if (moved === null) return;
      instrument.send({
        t: "deck.player",
        deck,
        player: { ...spec, albums: withSongParts(spec.albums, openAlbum.id, openSong.id, moved) },
      });
    },
    [instrument, deck, openAlbum, openSong],
  );
  const { listRef, slotRef, listProps, dragHandle, abandon } = useListDrag<SongPartId>({
    order,
    reorder,
  });
  /** The section itself, which is what a painting walks: the three tiers' rows are in three lists
   *  and two components, and one selector over the section reaches all of them (0157). */
  const sectionRef = useRef<HTMLElement>(null);
  /**
   * Folding takes the list the gesture captured on with it, which is the one thing capture does
   * not survive, so a drag in flight is dropped here rather than left in a ref no later press can
   * get past (src/ui/listDrag.ts).
   */
  const onFold = useCallback(
    (next: boolean) => {
      abandon();
      setFolded(next);
    },
    [abandon, setFolded],
  );

  /**
   * What the last frame lit and what it said was left. The whole of the per-frame state this
   * section keeps: the DOM is walked only on a frame one of those six answers actually moved,
   * which is what keeps a playing run off React entirely (plan §2, 0070).
   */
  const lit = useRef<StandingRow>(NOTHING_STANDING);
  const paint = useCallback(
    (force = false) => {
      const now = standingIn(instrument.peek(deck).player.step, slotSecs);
      if (!force && sameRow(now, lit.current)) return;
      lit.current = now;
      const section = sectionRef.current;
      if (section === null) return;
      litRows(section, ALBUM_ATTRIBUTE, now.album, now.albumLeft);
      litRows(section, SONG_ATTRIBUTE, now.song, now.songLeft);
      litRows(section, PART_ATTRIBUTE, now.part, now.partLeft);
    },
    [deck, instrument, slotSecs],
  );

  const follow = useCallback(() => {
    paint();
  }, [paint]);
  // Asked of the whole run and never of the open song, which is the whole of what the two tiers
  // added: the album and the song standing may be ones this list is not a view onto, so a gate
  // reading the parts on screen would leave their rows dark for as long as they were playing. Still
  // asked, though — a yard with nothing to walk has nothing that can ever stand, and a frame
  // subscribed to it would refill the deck's whole read, meters and all, sixty times a second for
  // an answer that cannot move (0218, `albumsArePlayed`).
  useOnFrame(follow, playing && !folded && !drawn && albumsArePlayed(player.albums));
  // And once on every commit, written whatever the memo above says, which is what puts these rows
  // back. A row is keyed by its part, so React reuses the same element across an edit and an
  // attribute a frame wrote survives a render untouched — nothing but this clears the row a
  // stopped yard was left standing in (0040, 0157).
  useLayoutEffect(() => {
    paint(true);
    // `drawn` among them because the branch below swaps the whole list out: React never wrote a
    // row's standing mark, so rows mounted by that swap arrive without one and the frame's own
    // guard would skip them until the part changed (0157). They read as extra to the rule below
    // because `paint` does not close over them, which is exactly why the list needs them named.
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [paint, folded, playing, song, drawn, player.albums]);

  return (
    // A full-width section of the card rather than a popover in its corner: a song is the one
    // thing on this card that changes what every dial on it means, so it is read and edited where
    // those dials are (0107, 0157).
    <section
      ref={sectionRef}
      className="flex w-full flex-col items-start gap-2"
      aria-label={`${yardLabel(deck)} ${PLAYER_ALBUMS_LABEL}`}
    >
      {/* The heading is the fold, the word inside the control and the caret beside it — the rack's
          own heading, one section in (0055, 0106, P73). The sentence on it is what a song is,
          which used to be the sentence on the trigger this section replaced. */}
      <Says what={PLAYER_ALBUM_TOOLTIP}>
        <Toggle
          size="sm"
          className="-ml-2.5 text-muted-foreground"
          pressed={folded}
          onPressedChange={onFold}
        >
          <span className="type-eyebrow">{PLAYER_ALBUMS_LABEL}</span>
          <FoldCaret />
        </Toggle>
      </Says>
      {folded ? null : (
        <>
          {/* A song with no parts says what one is for rather than showing an empty box: this is
              the only place the shape — parts in order, one of them coming back — is said in
              words. */}
          {drawn ? (
            <PlayerDrawn
              instrument={instrument}
              deck={deck}
              count={player.arrange}
              playing={playing}
            />
          ) : (
            <>
              {/* The two tiers over the parts, in this section rather than one of their own: the
                  list below is a view onto whichever song of whichever album is open (P147). */}
              <PlayerAlbums
                instrument={instrument}
                deck={deck}
                player={player}
                patch={patch}
                album={album}
                song={songView}
              />
              {albumsEmpty ? (
                <p className="w-full type-body text-muted-foreground">{PLAYER_ALBUM_EMPTY}</p>
              ) : null}
            </>
          )}
          {drawn ? null : openSong === undefined ? null : song.length === 0 ? (
            <p className="w-full type-body text-muted-foreground">{PLAYER_SONG_EMPTY}</p>
          ) : (
            <div ref={listRef} className="relative flex w-full flex-col gap-1" {...listProps}>
              {song.map((part, at) => (
                <PartCard
                  key={part.id}
                  deck={deck}
                  at={at}
                  part={part}
                  song={song}
                  player={player}
                  selected={part.id === selected}
                  soloed={part.id === soloed}
                  heard={heard}
                  open={part.id === opened}
                  handle={dragHandle(at, part.id, song.length - 1)}
                  onChange={onChange}
                  onSelect={onSelect}
                  onOpen={onOpen}
                  onDuplicate={onDuplicate}
                  onAudition={onAudition}
                  onRemove={onRemove}
                />
              ))}
              {/* The slot a live drag would land in, filled and sized from the layout the gesture
                  measured. Hidden between drags, so it costs a hidden div and nothing else. */}
              <div
                ref={slotRef}
                hidden
                aria-hidden="true"
                data-slot="song-landing"
                className="pointer-events-none absolute bg-accent"
              />
            </div>
          )}
          {/* Refused rather than hidden at the ceiling: a control that vanishes at a bound leaves
              nothing saying there was one (0121). */}
          {/* Refused rather than hidden while the pattern is drawing its own, for the reason a
              control at its ceiling is: the list under it is not the one playing, and a button
              that vanished would leave nothing saying a hand's arrangement is still there (0121,
              0158). */}
          <Says what={ACTION_TOOLTIPS.add}>
            <Button
              size="xs"
              variant="outline"
              disabled={drawn || openSong === undefined || song.length >= PLAYER_SONG_MAX}
              aria-label={`Add ${yardLabel(deck)} ${PLAYER_SONG_LABEL} ${PLAYER_PART_LABEL}`}
              onClick={onAdd}
            >
              <ACTION_ICONS.add />
              {PLAYER_PART_LABEL}
            </Button>
          </Says>
        </>
      )}
    </section>
  );
}
