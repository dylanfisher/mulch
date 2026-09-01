/**
 * @role Part sketch 04 — two readings of the tier over a part (src/lib/playerSongs.ts): the songs a
 *   pattern is a run of, named, in an order a hand chose, each carrying how many times it plays.
 *   The timeline makes that run a bar a hand drags songs about on; the tracker makes it a numbered
 *   list, which is the only one of the two a long arrangement stays readable in. Both draw the
 *   cursor standing somewhere, because what a song *is* is a run and a cursor over it.
 * @instead The tier this is the argument about → src/lib/playerSongs.ts, and the surface that draws
 *   it today → src/ui/PlayerSong.tsx. The drag's own arithmetic, where a static render can reach it
 *   → src/ui/sketch/sketchSongs.ts. The songs themselves → src/ui/sketch/sketchWalk.ts.
 */
// One part, two readings and the drag that makes the first one an argument — the same waiver every
// surface on the bench carries and for the same stated reason (0247, 0007).
// oxlint-disable max-lines-per-function
import { type PointerEvent as ReactPointerEvent, useCallback, useState } from "react";

import { PLAYER_PLAYS_LABEL, PLAYER_SONGS_LABEL } from "@/lib/copySongs";
import { SKETCH_PICTURE, SKETCH_VIEW as VIEW, SketchLabel } from "@/ui/sketch/SketchFrame";
import {
  alongBar,
  type SongGrab,
  songGrabbed,
  songLetGo,
  songMoved,
  songsPlayed,
} from "@/ui/sketch/sketchSongs";
import {
  fixtureAt,
  SKETCH_SONG_STANDING,
  SKETCH_SONGS,
  type SketchSong,
} from "@/ui/sketch/sketchWalk";

/* Both readings are drawn in `SKETCH_VIEW`, which is what makes a pointer's place in the element
 * its place in the picture and the drag below possible at all (SketchFrame, 0255). */

/** The song the cursor is standing in: resolved once where the fixture is, so nothing here looks it
 *  up a second time and disagrees with it (`SKETCH_SONG_STANDING`, principle 1). */
const STANDING = SKETCH_SONG_STANDING.song;

/** The part that song is standing on, which is the innermost thing the cursor knows. */
const STANDING_PART = fixtureAt(STANDING.parts, SKETCH_SONG_STANDING.part, "part");

/* ------------------------------------------------------------------------ the timeline ------- */

const BAR = { left: 8, top: 58, high: 42 };
const BAR_WIDE = VIEW.wide - BAR.left * 2;

/** Where a place on the picture is, as a fraction of the bar drawn inside it — the bar is inset, so
 *  the element's own width is not the bar's and the two measures are not interchangeable
 *  (`alongBar`, src/ui/sketch/sketchSongs.ts). */
function barAt(event: ReactPointerEvent<SVGSVGElement>): number {
  const box = event.currentTarget.getBoundingClientRect();
  return alongBar((event.clientX - box.left) / box.width, VIEW.wide, BAR.left, BAR_WIDE);
}

/** Every song as a segment of one bar: where it opens and how wide it is, both in rounds, because
 *  how long a song is on this picture is how many times it plays and nothing else. */
function segments(songs: readonly SketchSong[]) {
  const played = songsPlayed(songs);
  const step = BAR_WIDE / played;
  let before = 0;
  return songs.map((song) => {
    const x = BAR.left + before * step;
    before += song.plays;
    return { song, x, step, wide: song.plays * step };
  });
}

/** One song on the bar: the block, one cell per round so the plays can be counted rather than read
 *  off a label alone, and the name inside it with the count under it (0252). */
function SongBlock({
  song,
  x,
  step,
  wide,
  grab,
}: {
  song: SketchSong;
  x: number;
  step: number;
  wide: number;
  grab: (name: string, event: ReactPointerEvent<SVGRectElement>) => void;
}) {
  const take = useCallback(
    (event: ReactPointerEvent<SVGRectElement>) => {
      grab(song.name, event);
    },
    [grab, song.name],
  );
  return (
    <g data-song={song.name}>
      <rect
        x={x}
        y={BAR.top}
        width={wide}
        height={BAR.high}
        rx={2}
        className={
          song.name === STANDING.name
            ? "fill-primary/25 stroke-foreground"
            : "fill-primary/10 stroke-border"
        }
        strokeWidth={1}
        onPointerDown={take}
      />
      {/* One line per round after the first: a bar whose length is the plays is only honest if the
          plays can be counted off it, which is the pips' argument said for a length (0255). */}
      {Array.from({ length: song.plays - 1 }, (_, round) => (
        <line
          key={round}
          x1={x + (round + 1) * step}
          y1={BAR.top + 4}
          x2={x + (round + 1) * step}
          y2={BAR.top + BAR.high - 4}
          className="stroke-border"
          strokeWidth={1}
        />
      ))}
      {/* The name over the block and not inside it: the cursor is drawn as a box round one round
          of one block, and a name under that box is a name with a rule through it — which reads as
          a clipped label, the trap 0252's own shot caught twice. */}
      <text
        x={x + wide / 2}
        y={BAR.top - 8}
        textAnchor="middle"
        className="fill-current type-readout"
      >
        {song.name}
      </text>
      <text
        x={x + wide / 2}
        y={BAR.top + BAR.high + 16}
        textAnchor="middle"
        className="fill-current type-readout"
      >
        {`${PLAYER_PLAYS_LABEL} ${song.plays}`}
      </text>
    </g>
  );
}

/* -------------------------------------------------------------------------- the tracker ------- */

const ROW = { top: 26, high: 40, edge: 6, indent: 26 };

/** Which round of its own song each row is standing on, said as a hand counts them — the cursor's
 *  round is nought-based one tier down, and a list that started at nought would be the only place
 *  on the bench a count did (`SongPlace`, src/lib/playerSongs.ts). */
const STANDING_ROUND = `${SKETCH_SONG_STANDING.play + 1}/${STANDING.plays}`;

/* --------------------------------------------------------------------------- the bench ------- */

export function SketchPartSongs() {
  const [songs, setSongs] = useState<readonly SketchSong[]>(SKETCH_SONGS);
  const [held, setHeld] = useState<SongGrab | null>(null);

  /**
   * The capture is taken on the **picture** and never on the block that was pressed. A reorder
   * moves the block's own node in the DOM, and a moved node has its capture released implicitly —
   * so a capture on the block dies at the first swap and the run stops following a hand that is
   * still down. The ground's drag captures on its chip safely because it never reorders anything.
   */
  const grab = useCallback((name: string, event: ReactPointerEvent<SVGRectElement>) => {
    const picture = event.currentTarget.ownerSVGElement;
    if (picture === null) throw new Error("A song block is drawn outside a picture.");
    picture.setPointerCapture(event.pointerId);
    setHeld(songGrabbed(name, event.pointerId));
  }, []);

  const drag = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      const at = barAt(event);
      setSongs((was) => songMoved(was, held, event.pointerId, at));
    },
    [held],
  );

  const drop = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    setHeld((was) => songLetGo(was, event.pointerId));
  }, []);

  const laid = segments(songs);
  // Where the cursor is drawn, found by name after every drag: a reorder moves the block the run is
  // standing in, and an index taken before it would light whichever song was dragged into its place
  // — the exact failure a place keyed by id is what stops one tier down (`SongPlace`).
  const cursor = laid.find((one) => one.song.name === STANDING.name);
  if (cursor === undefined) throw new Error(`The bar no longer holds the song ${STANDING.name}.`);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start gap-6">
        <div data-songs="timeline" className="flex flex-col gap-2">
          <SketchLabel>The Timeline</SketchLabel>
          <svg
            viewBox={`0 0 ${VIEW.wide} ${VIEW.high}`}
            className={`${SKETCH_PICTURE} touch-none`}
            onPointerMove={drag}
            onPointerUp={drop}
            onPointerCancel={drop}
            onLostPointerCapture={drop}
          >
            <text x={BAR.left} y={14} className="fill-current type-readout">
              {`${PLAYER_SONGS_LABEL} — drag a block to reorder`}
            </text>
            {laid.map((one) => (
              <SongBlock
                key={one.song.name}
                song={one.song}
                x={one.x}
                step={one.step}
                wide={one.wide}
                grab={grab}
              />
            ))}
            {/* The cursor: the round the run is standing in, on the song it is standing in — one
                cell of the block and never the whole of it, because a song that plays four times
                is somewhere inside those four and that is the whole of what a cursor says. */}
            <rect
              data-standing="timeline"
              x={cursor.x + SKETCH_SONG_STANDING.play * cursor.step}
              y={BAR.top - 4}
              width={cursor.step}
              height={BAR.high + 8}
              rx={2}
              className="fill-none stroke-foreground"
              strokeWidth={2}
            />
            {/* What that box comes to, said in the picture rather than under it: which song, which
                round of it, and which part — the three the cursor knows one tier down. */}
            <text x={BAR.left} y={VIEW.high - 6} className="fill-current type-readout">
              {`${STANDING.name} ${STANDING_ROUND} · ${STANDING_PART}`}
            </text>
          </svg>
          <p className="max-w-80 type-readout text-muted-foreground">
            Trades the list. A bar is as long as the run plays, so eight songs of sixteen rounds are
            a wall of slivers and the names inside them go first.
          </p>
        </div>

        <div data-songs="tracker" className="flex flex-col gap-2">
          <SketchLabel>The Tracker</SketchLabel>
          <svg viewBox={`0 0 ${VIEW.wide} ${VIEW.high}`} className={SKETCH_PICTURE}>
            <text x={ROW.edge} y={14} className="fill-current type-readout">
              {PLAYER_SONGS_LABEL}
            </text>
            {/* The state and not the fixture: the two are readings of one run, so a reorder the
                timeline just made has to reach the numbering here — a list still numbered in the
                order the bench opened in is the pair arguing with itself. */}
            {songs.map((song, index) => {
              const top = ROW.top + index * ROW.high;
              const lit = song.name === STANDING.name;
              return (
                <g key={song.name} data-song={song.name}>
                  {lit && (
                    <rect
                      data-standing="tracker"
                      x={ROW.edge - 2}
                      y={top}
                      width={VIEW.wide - (ROW.edge - 2) * 2}
                      height={ROW.high - 6}
                      rx={2}
                      className="fill-primary/15 stroke-foreground"
                      strokeWidth={1}
                    />
                  )}
                  <text x={ROW.edge + 2} y={top + 16} className="fill-current type-readout">
                    {`${String(index + 1).padStart(2, "0")} ${song.name}`}
                  </text>
                  {lit && (
                    <text
                      x={VIEW.wide / 2}
                      y={top + 16}
                      textAnchor="middle"
                      className="fill-current type-readout"
                    >
                      {STANDING_ROUND}
                    </text>
                  )}
                  <text
                    x={VIEW.wide - ROW.edge}
                    y={top + 16}
                    textAnchor="end"
                    className="fill-current type-readout"
                  >
                    {`${PLAYER_PLAYS_LABEL} ${song.plays}`}
                  </text>
                  <text x={ROW.indent} y={top + 30} className="fill-current type-readout">
                    {song.parts.map((part, at) => (
                      <tspan
                        key={part}
                        className={
                          lit && at === SKETCH_SONG_STANDING.part
                            ? "fill-primary"
                            : "fill-muted-foreground"
                        }
                      >
                        {at === 0 ? part : ` · ${part}`}
                      </tspan>
                    ))}
                  </text>
                </g>
              );
            })}
          </svg>
          <p className="max-w-80 type-readout text-muted-foreground">
            Trades the reorder. A row is a row however long the song is, so nothing on this picture
            says a song of four rounds is four times a song of one.
          </p>
        </div>
      </div>
      <p className="max-w-3xl type-body text-muted-foreground">
        The tier over a part, which is the one region of the {PLAYER_SONGS_LABEL} list a card of
        dials has no room for: named things in an order a hand chose, each carrying how many times
        it plays. Both readings draw the cursor — {STANDING.name}, round {STANDING_ROUND}, on{" "}
        {STANDING_PART} — because a run with no cursor over it is a list and not a song. The
        timeline is the only one a hand can reorder by dragging, and the tracker is the only one a
        long arrangement stays readable in, which is the whole of the choice between them.
      </p>
    </div>
  );
}
