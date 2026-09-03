/**
 * @role The section of the mulcher card that arranges the pattern, drawn as a launch grid: a
 *   column per song, a row per part, the cell playing lit and the one coming ringed — the walk's
 *   own next turn, or the part a hand pressed, which the pass lands at the next boundary (0275).
 *   Under the grid, the row that edits whatever is picked; while the pattern draws its own
 *   arrangement, the run it wrote for itself is read here instead (0158). A full-width fold under
 *   the card's dials, wearing the fold every other module wears (0107, 0157).
 * @instead One cell and one column head → src/ui/PlayerGridCell.tsx. The row under the grid, and
 *   every gesture that edits a song or a part → src/ui/PlayerGridPick.tsx. What lights the cells
 *   → src/ui/playerLit.ts. What comes next on the run's own → src/lib/playerNext.ts. The run a
 *   drawn pattern lays → src/ui/PlayerDrawn.tsx.
 */
// Over the dependency cap by the words and the two tiers' bounds a section of two tiers reads. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import { useCallback, useLayoutEffect, useRef } from "react";

import type { Instrument } from "@/app/facade";
import type { PartVoice, PlayerSpec } from "@/lib/player";
import {
  ACTION_TOOLTIPS,
  PLAYER_PART_LABEL,
  PLAYER_SONG_LABEL,
  READOUT_JOIN,
  yardLabel,
} from "@/lib/copy";
import { mintTierName } from "@/lib/copyNames";
import {
  PLAYER_ARMED_LABEL,
  PLAYER_NEXT_LABEL,
  PLAYER_SONGS_EMPTY,
  PLAYER_SONGS_LABEL,
  PLAYER_SONGS_TOOLTIP,
  partNamed,
  playsSaid,
  standingSaid,
} from "@/lib/copySongs";
import { songsAfter } from "@/lib/playerNext";
import { PLAYER_PART_DEFAULTS, PLAYER_SONG_MAX, songIsDrawn } from "@/lib/playerSong";
import {
  PLAYER_PLAYS_MIN,
  PLAYER_SONG_DEFAULTS,
  PLAYER_SONGS_MAX,
  songsArePlayed,
  withSong,
  type PlayerSong,
} from "@/lib/playerSongs";
import type { SongPartId } from "@/lib/playerSong";
import type { DeckId } from "@/state/store";
import { mintPlayerRunId, mintSongPartId } from "@/ui/actions";
import { Button } from "@/ui/components/button";
import { Toggle } from "@/ui/components/toggle";
import { FoldCaret } from "@/ui/FoldCaret";
import { useOnFrame } from "@/ui/frame";
import { ACTION_ICONS } from "@/ui/icons";
import { PlayerDrawn } from "@/ui/PlayerDrawn";
import { CELL, GridAddPart, GridCell, GridHead, type GridPick } from "@/ui/PlayerGridCell";
import { PlayerGridPick } from "@/ui/PlayerGridPick";
import {
  litRows,
  NOTHING_STANDING,
  PART_ATTRIBUTE,
  sameRow,
  SONG_ATTRIBUTE,
  standingIn,
  type StandingRow,
} from "@/ui/playerLit";
import { PlayerSongsClear } from "@/ui/PlayerSongsClear";
import { Says } from "@/ui/Says";
// oxlint-enable import/max-dependencies

/** Where the frame writes the foot line: what is playing, which round, and what is coming. */
export const GRID_FOOT_SLOT = "grid-foot";

/** What the frame lit last: the standing rows, the cell ringed, and the foot line's words. */
type Lit = { standing: StandingRow; armed: SongPartId | null; foot: string };
const NOTHING_LIT: Lit = { standing: NOTHING_STANDING, armed: null, foot: "" };

/** A cell a song does not hold at that row: drawn rather than left out, because an empty cell is
 *  the half of a launch grid that says what a song is *not* a run of. Inert. */
const EMPTY_CELL = `${CELL} rounded-md border border-dashed border-border/50`;

// One callback per gesture the section offers, the fold over them and the frame that lights the
// cells: the length is how many things a grid is rather than how much this component decides. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function PlayerGrid({
  instrument,
  deck,
  player,
  playing,
  slotSecs,
  voice,
  patch,
  fold,
  pick,
  dials,
  solo,
}: {
  instrument: Instrument;
  deck: DeckId;
  player: PlayerSpec;
  /** Whether this yard is playing — what decides if the standing cell is read once a frame or
   *  once a render, the same thing an automated dial's `animate` decides (0040). */
  playing: boolean;
  /** How long one slot of this yard's grid lasts, or null where the loop has no grid to jump
   *  around at all: what turns the jumps a row has left into seconds (0159, `slotSecsOf`). */
  slotSecs: number | null;
  /** The spec the card's dials are showing, as a part carries one: what Add Part captures (0176). */
  voice: PartVoice;
  /** The card's own patch: one `deck.player` per gesture, carrying the whole spec (0089). */
  patch: (fields: Partial<PlayerSpec>) => void;
  /** Whether this section is folded shut — held by the yard, for the reason the rack's own fold
   *  is: this section is drawn under the card's fold (plan §2, src/ui/EffectRack.tsx). */
  fold: [folded: boolean, setFolded: (folded: boolean) => void];
  /** What is picked for the row under the grid, held by the yard on exactly the same terms: a fold
   *  may put the section away, and a pick that went with it would be a hand's aim forgotten by a
   *  caret (0176). A pick naming what the run no longer holds is simply no pick. */
  pick: [picked: GridPick | null, setPick: (pick: GridPick | null) => void];
  /** Whether the picked part's own strip and dials are open under its row, on the same terms. */
  dials: [open: boolean, setOpen: (open: boolean) => void];
  /** Which part is being heard on its own, held by the yard because it outlives a fold and a stop
   *  (0190). */
  solo: [solo: SongPartId | null, setSolo: (solo: SongPartId | null) => void];
}) {
  const [folded, setFolded] = fold;
  const [picked, setPick] = pick;
  const [soloed, setSolo] = solo;
  const songs = player.songs;
  const named = `${yardLabel(deck)} ${PLAYER_SONG_LABEL}`;
  /** Which of the two authors is live: an arrangement of any parts at all is one the pattern draws
   *  for itself, and the list a hand wrote is held untouched meanwhile (0158). */
  const drawn = songIsDrawn(player);
  /** A row per part of the longest song, and one row at least, so a column of nothing is still a
   *  column: the cell a shorter song lacks at a row is drawn empty. */
  const rows = Math.max(1, ...songs.map((song) => song.parts.length));
  /** The pick resolved against the run: the song it names, and the part of that song, or nothing
   *  where the run no longer holds either (plan §2). */
  const pickedAt = picked === null ? -1 : songs.findIndex((song) => song.id === picked.song);
  const pickedSong = songs[pickedAt];
  const pickedPartAt =
    pickedSong === undefined || picked === null || picked.part === null
      ? -1
      : pickedSong.parts.findIndex((part) => part.id === picked.part);
  const pickedPart = pickedSong?.parts[pickedPartAt];

  /**
   * Arming: the one transport gesture on the grid, sent straight rather than through `patch`
   * because nothing durable moves (0041). Pressing the cell already armed lets it go — read off
   * the pass rather than off state of this component's own, because what is armed is the pass's
   * fact and the ring is painted from the same read (principle 1).
   */
  const onArm = useCallback(
    (part: SongPartId) => {
      const armed = instrument.peek(deck).player.armed;
      instrument.send({ t: "deck.playerArm", deck, part: armed === part ? null : part });
    },
    [instrument, deck],
  );
  /**
   * Hearing one part on its own: the pass plays that part over and over for as long as the toggle
   * is held, and lets the song carry on from it when it is let go. Transport and never an edit, so
   * it is sent straight rather than through `patch` (0041, 0089, 0190). One at a time: a pass
   * plays one thing, so pressing a second part's toggle moves the solo rather than adding to a set.
   */
  const onAudition = useCallback(
    (part: SongPartId, next: boolean) => {
      const heard = next ? part : null;
      setSolo(heard);
      instrument.send({ t: "deck.playerSolo", deck, part: heard });
    },
    [instrument, deck, setSolo],
  );
  /** Adding a song: the id and the name minted at the gesture, off the song pools, so no two
   *  columns read alike while the pool holds a reading nobody has (0076, 0081, 0157). Picked as it
   *  lands, because what a hand adds is what it is about to name. */
  const onAddSong = useCallback(() => {
    const id = mintPlayerRunId();
    const name = mintTierName(
      "song",
      id,
      songs.map((each) => each.name),
    );
    patch({ songs: [...songs, { id, name, ...PLAYER_SONG_DEFAULTS }] });
    setPick({ song: id, part: null });
  }, [patch, songs, setPick]);
  /** Adding a part to one song's column: it is the dials as they stand, captured at the gesture
   *  (0176), under a name minted off its id against its siblings' (0081). */
  const onAddPart = useCallback(
    (song: PlayerSong) => {
      const id = mintSongPartId();
      const name = mintTierName(
        "part",
        id,
        song.parts.map((each) => each.name),
      );
      const part = { id, name, ...PLAYER_PART_DEFAULTS, voice };
      patch({ songs: withSong(songs, song.id, { parts: [...song.parts, part] }) });
      setPick({ song: song.id, part: id });
    },
    [patch, songs, voice, setPick],
  );

  /** The section itself, which is what a painting walks: cells, heads and the rows under them all
   *  wear one of the two tiers' attributes, and one selector over the section reaches them all. */
  const sectionRef = useRef<HTMLElement>(null);
  const lit = useRef<Lit>(NOTHING_LIT);
  /**
   * What the last frame lit. The whole of the per-frame state this section keeps: the DOM is
   * walked only on a frame one of these answers actually moved, which is what keeps a playing run
   * off React entirely (plan §2, 0070). The ring is the part the pass has queued, or the turn the
   * run would come to on its own — so it is never dark while something is playing.
   */
  const paint = useCallback(
    (force = false) => {
      const peek = instrument.peek(deck).player;
      const step = peek.step;
      const standing = standingIn(step, slotSecs);
      const queued = peek.armed;
      const coming = queued ?? songsAfter(songs, step)?.part ?? null;
      const foot =
        step === null || step.place === null || standing.part === null
          ? ""
          : [
              standingSaid(songs, step.place.song, standing.part),
              playsSaid(songs, step.place.song, step.place.songPlay),
              coming === null
                ? ""
                : `${queued === null ? PLAYER_NEXT_LABEL : PLAYER_ARMED_LABEL} ${partNamed(songs, coming)}`,
            ]
              .filter((said) => said !== "")
              .join(READOUT_JOIN);
      const now: Lit = { standing, armed: coming, foot };
      const was = lit.current;
      if (
        !force &&
        sameRow(now.standing, was.standing) &&
        now.armed === was.armed &&
        now.foot === was.foot
      ) {
        return;
      }
      lit.current = now;
      const section = sectionRef.current;
      if (section === null) return;
      litRows(section, SONG_ATTRIBUTE, standing.song, standing.songLeft);
      litRows(section, PART_ATTRIBUTE, standing.part, standing.partLeft);
      for (const cell of section.querySelectorAll<HTMLElement>(`[${PART_ATTRIBUTE}]`)) {
        cell.dataset["armed"] = String(cell.getAttribute(PART_ATTRIBUTE) === coming);
      }
      const out = section.querySelector<HTMLElement>(`[data-slot="${GRID_FOOT_SLOT}"]`);
      if (out !== null && out.textContent !== foot) out.textContent = foot;
    },
    [deck, instrument, slotSecs, songs],
  );
  const follow = useCallback(() => {
    paint();
  }, [paint]);
  // A yard with nothing to walk has nothing that can ever stand, and a frame subscribed to it
  // would refill the deck's whole read sixty times a second for an answer that cannot move (0218).
  useOnFrame(follow, playing && !folded && !drawn && songsArePlayed(songs));
  // And once on every commit, written whatever the memo above says, which is what puts these cells
  // back: a cell is keyed by its part, so React reuses the element across an edit and an attribute
  // a frame wrote survives a render untouched (0040, 0157).
  useLayoutEffect(() => {
    paint(true);
    // `drawn`, `folded` and `playing` read as extra because `paint` does not close over them;
    // the cells mounted by a swap of the branch below are why they are here.
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [paint, folded, playing, drawn]);

  const onFold = useCallback(
    (next: boolean) => {
      setFolded(next);
    },
    [setFolded],
  );

  return (
    <section
      ref={sectionRef}
      className="flex w-full flex-col items-start gap-2"
      aria-label={`${yardLabel(deck)} ${PLAYER_SONGS_LABEL}`}
    >
      {/* The heading is the fold, the word inside the control and the caret beside it — the rack's
          own heading, one section in (0055, 0106). The sentence on it is what a song is. */}
      <div className="flex w-full items-center justify-between gap-2">
        <Says what={PLAYER_SONGS_TOOLTIP}>
          <Toggle
            size="sm"
            className="-ml-2.5 text-muted-foreground"
            pressed={folded}
            onPressedChange={onFold}
          >
            <span className="type-eyebrow">{PLAYER_SONGS_LABEL}</span>
            <FoldCaret />
          </Toggle>
        </Says>
        {/* Never over the run the pattern drew for itself: the written list is held and not shown
            then, so a press emptying it would take a dozen columns nothing on screen says are
            there (0158) — the same reason the pick is dropped while drawn (src/ui/PlayerCard.tsx). */}
        {drawn ? null : (
          <PlayerSongsClear
            instrument={instrument}
            deck={deck}
            held={songs.length}
            patch={patch}
            onPick={setPick}
          />
        )}
      </div>
      {folded ? null : drawn ? (
        <PlayerDrawn instrument={instrument} deck={deck} count={player.arrange} playing={playing} />
      ) : (
        <>
          {/* The grid: a column per song, read down, and a column of one press at the end for the
              next song. Scrolls sideways past eight rather than crushing eight names into one
              line, because a name a hand cannot read is a cell it cannot aim at. */}
          <div className="flex w-full items-start gap-1 overflow-x-auto">
            {songs.map((song, songAt) => (
              <div key={song.id} className="flex min-w-28 flex-1 flex-col gap-1">
                <GridHead
                  named={`${named} ${songAt + 1}`}
                  song={song}
                  plays={`×${song.plays}`}
                  picked={picked?.song === song.id && picked.part === null}
                  onPick={setPick}
                />
                {Array.from({ length: rows }, (_unused, row) => {
                  const part = song.parts[row];
                  return part === undefined ? (
                    <div key={row} aria-hidden="true" className={EMPTY_CELL} />
                  ) : (
                    <GridCell
                      key={part.id}
                      named={`${named} ${songAt + 1} ${PLAYER_PART_LABEL} ${row + 1}`}
                      song={song.id}
                      part={part}
                      picked={picked?.part === part.id}
                      disabled={part.skip || song.plays <= PLAYER_PLAYS_MIN}
                      onArm={onArm}
                      onPick={setPick}
                    />
                  );
                })}
                <GridAddPart
                  named={`${named} ${songAt + 1}`}
                  song={song}
                  disabled={song.parts.length >= PLAYER_SONG_MAX}
                  onAdd={onAddPart}
                />
              </div>
            ))}
            <div className="flex min-w-28 flex-1 flex-col gap-1">
              <Says what={ACTION_TOOLTIPS.add}>
                <Button
                  size="xs"
                  variant="outline"
                  className={CELL}
                  disabled={songs.length >= PLAYER_SONGS_MAX}
                  aria-label={`Add ${named}`}
                  onClick={onAddSong}
                >
                  <ACTION_ICONS.add />
                  {PLAYER_SONG_LABEL}
                </Button>
              </Says>
            </div>
          </div>
          {/* A pattern arranged as nothing at all says what the shape is, which an empty grid
              cannot: an empty run is the ordinary case and not a failure. */}
          {songs.length === 0 ? (
            <p className="w-full type-body text-muted-foreground">{PLAYER_SONGS_EMPTY}</p>
          ) : null}
          {/* What is playing and what is coming, written by the frame and by nothing else: the one
              line here a launch grid gives up drawing — how long — is said in the row below. */}
          <span data-slot={GRID_FOOT_SLOT} className="type-readout text-muted-foreground" />
          {pickedSong === undefined ? null : (
            <PlayerGridPick
              deck={deck}
              named={named}
              player={player}
              songAt={pickedAt}
              song={pickedSong}
              partAt={pickedPartAt}
              part={pickedPart}
              soloed={pickedPart !== undefined && pickedPart.id === soloed}
              dials={dials}
              patch={patch}
              onPick={setPick}
              onAudition={onAudition}
            />
          )}
        </>
      )}
    </section>
  );
}
