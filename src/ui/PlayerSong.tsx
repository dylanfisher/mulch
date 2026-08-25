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
import { useCallback, useLayoutEffect, useRef } from "react";

import type { Instrument } from "@/app/facade";
import { cn } from "@/lib/cn";
import type { PartVoice, PlayerSpec } from "@/lib/player";
import {
  PLAYER_PART_DEFAULTS,
  PLAYER_PART_MAX,
  PLAYER_PART_MIN,
  PLAYER_SONG_MAX,
  songIsDrawn,
  type SongPart,
  type SongPartId,
} from "@/lib/playerSong";
import {
  ACTION_TOOLTIPS,
  partBadge,
  PLAYER_PART_LABEL,
  PLAYER_PART_LENGTH_LABEL,
  PLAYER_PART_LENGTH_TOOLTIP,
  PLAYER_SELECT_LABEL,
  PLAYER_SELECT_TOOLTIP,
  PLAYER_SONG_EMPTY,
  PLAYER_SONG_LABEL,
  PLAYER_SONG_TOOLTIP,
  yardLabel,
} from "@/lib/copy";
import { deckIn, type DeckId } from "@/state/store";
import { Button } from "@/ui/components/button";
import { Toggle } from "@/ui/components/toggle";
import { FoldCaret } from "@/ui/FoldCaret";
import { useOnFrame } from "@/ui/frame";
import { ACTION_ICONS } from "@/ui/icons";
import { Knob } from "@/ui/Knob";
import { DRAG_CARD_ATTRIBUTE, type DragHandleProps, useListDrag } from "@/ui/listDrag";
import { mintSongPartId } from "@/ui/actions";
import { PlayerDrawn } from "@/ui/PlayerDrawn";
import { Says } from "@/ui/Says";
// oxlint-enable import/max-dependencies

/** The attribute one row carries the part it draws under, so the frame below can light the one
 *  standing without asking React for anything (0157). */
const PART_ATTRIBUTE = "data-part";

/**
 * One part, and the four gestures that shape it: the grip that moves it, the press that points the
 * card's dials at it, the dial saying how long it lasts, and the press that takes it away. A
 * component of its own for the reason the character menu's entries are: every handler has to carry
 * which part it is, and a closure built in the parent's own render is a new prop on every frame the
 * card draws.
 */
// One callback per gesture and one control per gesture, plus the grip and the badge that say which
// part this is: the length is how many things a part is rather than how much this row decides.
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
function PartRow({
  deck,
  at,
  part,
  selected,
  handle,
  onChange,
  onSelect,
  onRemove,
}: {
  deck: DeckId;
  /** Where in the song this part stands, from zero. Its place and not its name: what a control on
   *  this row is called is positional, because a name is what ./scripts/drive presses and an
   *  opaque id is not a thing a person or a locator asks for. The badge beside the grip is the
   *  name (0157). */
  at: number;
  part: SongPart;
  /** Whether the card's dials are pointed at this part. A view preference held by the yard, so it
   *  is handed down rather than kept here: no command, nothing durable, no history entry (plan §2,
   *  0176). */
  selected: boolean;
  /** The drag and the arrow keys that reorder this part, from the list that owns the gesture. */
  handle: DragHandleProps;
  onChange: (at: number, part: SongPart) => void;
  onSelect: (id: SongPartId, selected: boolean) => void;
  onRemove: (at: number) => void;
}) {
  /** What every control on this row is named by: the yard, the song, and which part it is. */
  const named = `${yardLabel(deck)} ${PLAYER_SONG_LABEL} ${PLAYER_PART_LABEL} ${at + 1}`;
  const badge = partBadge(part.id);
  const setLength = useCallback(
    (length: number) => {
      onChange(at, { ...part, length: Math.round(length) });
    },
    [onChange, at, part],
  );
  const select = useCallback(
    (next: boolean) => {
      onSelect(part.id, next);
    },
    [onSelect, part.id],
  );
  const remove = useCallback(() => {
    onRemove(at);
  }, [onRemove, at]);

  return (
    <div
      {...{ [DRAG_CARD_ATTRIBUTE]: "", [PART_ATTRIBUTE]: part.id }}
      // Two inks and never one: the walk lights the row it is standing on and a hand lights the row
      // it has pointed the dials at, and a surface that drew them the same would say a part is
      // playing when what it is, is being edited (0172, 0176). The hand's mark wins where both are
      // true — the standing attribute goes on being written by the frame below, and this row is
      // simply not drawing it — because what a selected row is *for* is that the dials above are
      // its. `accent` is the value a pressed control is filled with, so neither of these may be it.
      className={cn(
        "flex flex-wrap items-center gap-1 rounded-md px-1",
        "data-[dragging=true]:relative data-[dragging=true]:z-10",
        selected ? "bg-foreground/10" : "data-[standing=true]:bg-primary/15",
      )}
    >
      {/* The grip is the leftmost thing on the row because it is what a pointer aims at, and the
          badge reads out of it — the rack's own card, one list along (0062, 0155, P48). */}
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
      {/* What this part is, as against where it is — and the press that points the card's dials at
          it, which is the one control that says both (0076, 0157, 0176). A state and so no icon
          (0055): the badge is the whole of what the control says, because the badge is the whole
          of what a part is called. */}
      <Says what={PLAYER_SELECT_TOOLTIP}>
        <Toggle
          size="sm"
          variant="outline"
          pressed={selected}
          aria-label={`${PLAYER_SELECT_LABEL} ${named}`}
          onPressedChange={select}
        >
          <span className="type-readout">{badge}</span>
        </Toggle>
      </Says>
      {/* The compact dial, which is the one drawn without a caption: a row is read across rather
          than down, and a caption on it would be a column of two line boxes (0055,
          src/ui/Knob.tsx). Its sentence goes on the dial itself, which is the only road that
          reaches a control drawing no caption — a `Says` around the component would put the
          trigger's handlers on nothing (0094, 0157). */}
      <Knob
        label={PLAYER_PART_LENGTH_LABEL}
        name={`${named} ${PLAYER_PART_LENGTH_LABEL}`}
        says={PLAYER_PART_LENGTH_TOOLTIP}
        size="xs"
        value={part.length}
        min={PLAYER_PART_MIN}
        max={PLAYER_PART_MAX}
        defaultValue={PLAYER_PART_DEFAULTS.length}
        step={1}
        onChange={setLength}
      />
      <Says what={ACTION_TOOLTIPS.remove}>
        <Button size="icon-sm" variant="ghost" aria-label={`Remove ${named}`} onClick={remove}>
          <ACTION_ICONS.remove />
        </Button>
      </Says>
    </div>
  );
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
  voice,
  patch,
  fold,
  select,
}: {
  instrument: Instrument;
  deck: DeckId;
  player: PlayerSpec;
  /** Whether this yard is playing — what decides if the standing part is read once a frame or
   *  once a render, the same thing an automated dial's `animate` decides (0040). */
  playing: boolean;
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
}) {
  const [folded, setFolded] = fold;
  const [selected, setSelected] = select;
  const song = player.song;
  /**
   * Which of the two authors is live. A rule and never a second field: an arrangement of any parts
   * at all is one the pattern draws for itself, and the list a hand wrote is held untouched
   * meanwhile — so the section shows the run being walked rather than the one that is not (0158).
   */
  const drawn = songIsDrawn(player);
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
    // The id is minted at the gesture, which is the whole of what makes it identity: a part
    // carries it for as long as it exists and no reorder can touch it (0076, 0157). The spec is
    // captured at the same gesture and for the same reason — a part is the dials as they stood
    // when it was added, and nothing later moves it but a hand pointed at it (0176).
    patch({ song: [...song, { id: mintSongPartId(), ...PLAYER_PART_DEFAULTS, voice }] });
  }, [patch, song, voice]);
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
   * The two things this list answers for itself, both read at the release rather than at the
   * press: the order the session holds it in, and the one command a reorder is — which is the
   * ordinary `deck.player` every other gesture on this card sends, carrying the whole spec, so an
   * arrangement moved is undone, logged and replayed like any other durable edit (0089, 0111).
   */
  const order = useCallback(
    () => deckIn(instrument.state.getState().decks, deck).player?.song.map((part) => part.id) ?? [],
    [instrument, deck],
  );
  const reorder = useCallback(
    (item: SongPartId, index: number) => {
      const held = deckIn(instrument.state.getState().decks, deck).player;
      if (held === null) return;
      const from = held.song.findIndex((part) => part.id === item);
      if (from === -1) return;
      const moved = [...held.song];
      const [part] = moved.splice(from, 1);
      if (part === undefined) return;
      moved.splice(index, 0, part);
      instrument.send({ t: "deck.player", deck, player: { ...held, song: moved } });
    },
    [instrument, deck],
  );
  const { listRef, slotRef, listProps, dragHandle, abandon } = useListDrag<SongPartId>({
    order,
    reorder,
  });
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
   * Which part was lit by the last frame. The whole of the per-frame state this section keeps: the
   * read is one attribute per row and only on the frame the part actually changed, which is what
   * keeps a playing song off React entirely (plan §2, 0070).
   */
  const lit = useRef<SongPartId | null>(null);
  const paint = useCallback(
    (force = false) => {
      const standing = instrument.peek(deck).player.part;
      if (!force && standing === lit.current) return;
      lit.current = standing;
      const list = listRef.current;
      if (list === null) return;
      for (const row of list.querySelectorAll<HTMLElement>(`:scope > [${DRAG_CARD_ATTRIBUTE}]`)) {
        row.dataset["standing"] = String(row.getAttribute(PART_ATTRIBUTE) === standing);
      }
    },
    [deck, instrument, listRef],
  );

  const follow = useCallback(() => {
    paint();
  }, [paint]);
  useOnFrame(follow, playing && !folded && !drawn && song.length > 0);
  // And once on every commit, written whatever the memo above says, which is what puts these rows
  // back. A row is keyed by its part, so React reuses the same element across an edit and an
  // attribute a frame wrote survives a render untouched — nothing but this clears the row a
  // stopped yard was left standing in (0040, 0157).
  useLayoutEffect(() => {
    paint(true);
    // `drawn` among them because the branch below swaps the whole list out: React never wrote a
    // row's standing mark, so rows mounted by that swap arrive without one and the frame's own
    // guard would skip them until the part changed (0157).
  }, [paint, folded, playing, song, drawn]);

  return (
    // A full-width section of the card rather than a popover in its corner: a song is the one
    // thing on this card that changes what every dial on it means, so it is read and edited where
    // those dials are (0107, 0157).
    <section
      className="flex w-full flex-col items-start gap-2"
      aria-label={`${yardLabel(deck)} ${PLAYER_SONG_LABEL}`}
    >
      {/* The heading is the fold, the word inside the control and the caret beside it — the rack's
          own heading, one section in (0055, 0106, P73). The sentence on it is what a song is,
          which used to be the sentence on the trigger this section replaced. */}
      <Says what={PLAYER_SONG_TOOLTIP}>
        <Toggle
          size="sm"
          className="-ml-2.5 text-muted-foreground"
          pressed={folded}
          onPressedChange={onFold}
        >
          <span className="type-eyebrow">{PLAYER_SONG_LABEL}</span>
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
          ) : song.length === 0 ? (
            <p className="w-full type-body text-muted-foreground">{PLAYER_SONG_EMPTY}</p>
          ) : (
            <div ref={listRef} className="relative flex w-full flex-col gap-1" {...listProps}>
              {song.map((part, at) => (
                <PartRow
                  key={part.id}
                  deck={deck}
                  at={at}
                  part={part}
                  selected={part.id === selected}
                  handle={dragHandle(at, part.id, song.length - 1)}
                  onChange={onChange}
                  onSelect={onSelect}
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
              disabled={drawn || song.length >= PLAYER_SONG_MAX}
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
