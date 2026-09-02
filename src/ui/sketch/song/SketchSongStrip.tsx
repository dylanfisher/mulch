/**
 * @role Playback sketch 08 — the whole run as one strip, end to end, with the cursor as the only
 *   thing on it that moves. The argument: everything else here draws the structure and lets the
 *   place be a highlight; this draws the place and lets the structure be the background it moves
 *   over, which is the reading a hand watching rather than arranging actually wants.
 * @instead The other seven readings of the same run → the files beside this one. The arithmetic →
 *   src/ui/sketch/sketchSong.ts. The tier this is drawn instead of → src/lib/playerSongs.ts.
 */
// One picture is one function: the geometry is read top to bottom and every corner of it names
// itself, so cutting it into helpers to satisfy a line count would scatter one drawing across five
// scopes. The same waiver every sketch on this bench carries, for the reason 0247 gives (0007).
// oxlint-disable max-lines-per-function
import { SKETCH_VIEW as VIEW } from "@/ui/sketch/SketchFrame";
import {
  acrossRun,
  SKETCH_AT,
  SKETCH_PLAYS_SAID,
  SKETCH_RUN,
  SKETCH_RUN_BARS,
  SKETCH_RUN_SAID,
  SKETCH_SPANS,
  SKETCH_STANDING_SAID,
} from "@/ui/sketch/sketchSong";
import { characterInk } from "@/ui/sketch/sketchWalk";
import { heldMiddle, SongSays, SongStage } from "@/ui/sketch/song/SketchSongStage";

/** The strip runs the whole width, because the whole run is the picture. */
const STRIP = { y: 58, high: 44 };
const along = (bars: number): number => acrossRun(bars) * VIEW.wide;

/** One cell per turn, as long as the part it plays: the run's own measure, so the strip is the
 *  length of the thing rather than a row of equal boxes. */
const CELLS = SKETCH_RUN.map((turn) => ({
  index: turn.index,
  x: along(turn.from),
  wide: along(turn.part.bars),
  ink: characterInk(turn.part.character),
  standing: turn.standing,
}));

/** Where the cursor is: at the head of the turn it is standing on, which is the one place on this
 *  picture that would be somewhere else a moment later. */
const AT = along(SKETCH_AT.from);

export function SketchSongStrip() {
  return (
    <SongStage reading="strip" label="The Strip">
      <SongSays x={4} y={16}>
        {SKETCH_PLAYS_SAID}
      </SongSays>
      <SongSays x={heldMiddle(VIEW.wide, SKETCH_RUN_SAID)} y={16} middle>
        {SKETCH_RUN_SAID}
      </SongSays>
      {/* The songs bracketed over their own stretch: without them the strip is bars and not a run. */}
      {SKETCH_SPANS.map((span) => (
        <g key={span.song.name}>
          <line
            x1={along(span.from) + 1}
            y1={STRIP.y - 10}
            x2={along(span.to) - 1}
            y2={STRIP.y - 10}
            className="stroke-foreground/50"
            strokeWidth={2}
          />
          <SongSays
            x={heldMiddle((along(span.from) + along(span.to)) / 2, span.song.name)}
            y={STRIP.y - 16}
            middle
          >
            {span.song.name}
          </SongSays>
        </g>
      ))}
      {CELLS.map((cell) => (
        <g key={cell.index}>
          <rect
            {...(cell.standing ? { "data-standing": "strip" } : {})}
            x={cell.x}
            y={STRIP.y}
            width={cell.wide - 1}
            height={STRIP.high}
            className="fill-primary"
            opacity={cell.ink}
          />
          {cell.standing ? (
            <rect
              x={cell.x}
              y={STRIP.y}
              width={cell.wide - 1}
              height={STRIP.high}
              className="fill-none stroke-foreground"
              strokeWidth={2}
            />
          ) : null}
        </g>
      ))}
      {/* The cursor: a line the length of the strip and the head above it, and nothing else moves. */}
      <line
        x1={AT}
        y1={STRIP.y - 6}
        x2={AT}
        y2={STRIP.y + STRIP.high + 10}
        className="stroke-foreground"
        strokeWidth={2}
      />
      <path
        d={`M ${AT - 7} ${STRIP.y + STRIP.high + 10} l 14 0 l -7 10 Z`}
        className="fill-foreground"
      />
      <SongSays x={heldMiddle(AT, SKETCH_STANDING_SAID)} y={STRIP.y + STRIP.high + 36} middle>
        {SKETCH_STANDING_SAID}
      </SongSays>
      <SongSays x={4} y={VIEW.high - 6}>
        {`${SKETCH_RUN_BARS} bars end to end`}
      </SongSays>
    </SongStage>
  );
}
