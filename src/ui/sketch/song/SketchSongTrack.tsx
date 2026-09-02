/**
 * @role Playback sketch 01 — the run as a track the cursor rides: the songs laid end to end, a
 *   sleeper per turn, and the cursor a car standing on one of them. The argument: a run is a
 *   distance travelled, so draw the distance and let the list of songs be the scenery.
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
  SKETCH_RUN_SAID,
  SKETCH_SPANS,
  SKETCH_STANDING_SAID,
  SKETCH_TURN,
} from "@/ui/sketch/sketchSong";
import { characterInk } from "@/ui/sketch/sketchWalk";
import { heldMiddle, SongSays, SongStage } from "@/ui/sketch/song/SketchSongStage";

/** The rail, and the margin the run is drawn inside so the first and last songs have a name. */
const EDGE = 10;
const RAIL = { y: 90, high: 26, from: EDGE, wide: VIEW.wide - EDGE * 2 };

/** Where a count of bars falls along the rail — the run's own measure, so a long part is a long
 *  stretch of track rather than one more equal box. */
const along = (bars: number): number => RAIL.from + acrossRun(bars) * RAIL.wide;

/** One sleeper per turn, inked by the character its part was drawn with. */
const SLEEPERS = SKETCH_RUN.map((turn) => ({
  index: turn.index,
  x: along(turn.from),
  wide: Math.max(along(turn.from + turn.part.bars) - along(turn.from) - 2, 3),
  ink: characterInk(turn.part.character),
}));

/** What a stretch of track is named: the song, and how many turns of the run it is. */
const said = (name: string, turns: number): string => `${name} · ${turns} ${SKETCH_TURN}s`;

/** The car: the turn being played, drawn on the track and not beside it. */
const CAR = {
  x: along(SKETCH_AT.from),
  wide: along(SKETCH_AT.from + SKETCH_AT.part.bars) - along(SKETCH_AT.from),
};

export function SketchSongTrack() {
  return (
    <SongStage reading="track" label="The Track">
      <SongSays x={EDGE} y={16}>
        {SKETCH_PLAYS_SAID}
      </SongSays>
      {/* The songs as the stretches of track they are, each named over its own length. */}
      {SKETCH_SPANS.map((span) => (
        <g key={span.song.name}>
          <line
            x1={along(span.from) + 1}
            y1={RAIL.y - 16}
            x2={along(span.to) - 1}
            y2={RAIL.y - 16}
            className="stroke-border"
            strokeWidth={2}
          />
          <SongSays
            x={heldMiddle(
              (along(span.from) + along(span.to)) / 2,
              said(span.song.name, span.turns),
            )}
            y={RAIL.y - 22}
            middle
          >
            {said(span.song.name, span.turns)}
          </SongSays>
        </g>
      ))}
      <rect
        x={RAIL.from}
        y={RAIL.y}
        width={RAIL.wide}
        height={RAIL.high}
        rx={4}
        className="fill-muted stroke-border"
      />
      {SLEEPERS.map((sleeper) => (
        <rect
          key={sleeper.index}
          x={sleeper.x + 1}
          y={RAIL.y + 4}
          width={sleeper.wide}
          height={RAIL.high - 8}
          className="fill-primary"
          opacity={sleeper.ink}
        />
      ))}
      {/* The cursor riding it — the one thing on this picture that is anywhere in particular. */}
      <rect
        data-standing="track"
        x={CAR.x - 3}
        y={RAIL.y - 8}
        width={CAR.wide + 6}
        height={RAIL.high + 16}
        rx={5}
        className="fill-primary/25 stroke-foreground"
        strokeWidth={2}
      />
      <SongSays
        x={heldMiddle(CAR.x + CAR.wide / 2, SKETCH_STANDING_SAID)}
        y={RAIL.y + RAIL.high + 20}
        middle
      >
        {SKETCH_STANDING_SAID}
      </SongSays>
      <SongSays x={EDGE} y={VIEW.high - 6}>
        {SKETCH_RUN_SAID}
      </SongSays>
    </SongStage>
  );
}
