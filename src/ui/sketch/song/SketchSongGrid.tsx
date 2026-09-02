/**
 * @role Playback sketch 04 — a launch grid: a column per song, a row per part, the cell playing
 *   lit and the next one armed. The argument: a run is only ever heard as "this now, that next",
 *   so make the next thing the thing a hand presses and let the boundary do the rest.
 * @instead The other seven readings of the same run → the files beside this one. The arithmetic →
 *   src/ui/sketch/sketchSong.ts. The tier this is drawn instead of → src/lib/playerSongs.ts.
 */
// One picture is one function: the geometry is read top to bottom and every corner of it names
// itself, so cutting it into helpers to satisfy a line count would scatter one drawing across five
// scopes. The same waiver every sketch on this bench carries, for the reason 0247 gives (0007).
// oxlint-disable max-lines-per-function
import { SKETCH_VIEW as VIEW } from "@/ui/sketch/SketchFrame";
import {
  SKETCH_AT,
  SKETCH_NEXT,
  SKETCH_PLAYS_SAID,
  SKETCH_RUN_SAID,
  SKETCH_STANDING_SAID,
  SKETCH_TURN,
} from "@/ui/sketch/sketchSong";
import { SKETCH_PARTS, SKETCH_SONGS } from "@/ui/sketch/sketchWalk";
import { heldMiddle, SongSays, SongStage } from "@/ui/sketch/song/SketchSongStage";

/** A column per song and a row per part, both sized off how many the fixture holds. */
const NAMES = 92;
const GRID = { top: 42, high: 22, gap: 3 };
const WIDE = (VIEW.wide - NAMES - 8) / SKETCH_SONGS.length;

/**
 * Every cell of the grid, whether the song holds that part or not: an empty cell is the half of a
 * launch grid that says what a song is *not* a run of, so it is drawn rather than left out.
 */
const CELLS = SKETCH_SONGS.flatMap((song, column) =>
  SKETCH_PARTS.map((part, row) => ({
    key: `${song.name}/${part.name}`,
    x: NAMES + column * WIDE,
    y: GRID.top + row * (GRID.high + GRID.gap),
    held: song.parts.includes(part.name),
    playing: song === SKETCH_AT.song && part.name === SKETCH_AT.part.name,
    armed: song === SKETCH_NEXT.song && part.name === SKETCH_NEXT.part.name,
  })),
);

export function SketchSongGrid() {
  return (
    <SongStage reading="grid" label="The Grid">
      <SongSays x={4} y={16}>
        {SKETCH_PLAYS_SAID}
      </SongSays>
      <SongSays x={heldMiddle(VIEW.wide, SKETCH_RUN_SAID)} y={16} middle>
        {SKETCH_RUN_SAID}
      </SongSays>
      {SKETCH_SONGS.map((song, column) => (
        <SongSays key={song.name} x={NAMES + column * WIDE + WIDE / 2 - 4} y={34} middle>
          {song.name}
        </SongSays>
      ))}
      {SKETCH_PARTS.map((part, row) => (
        <SongSays key={part.name} x={4} y={GRID.top + row * (GRID.high + GRID.gap) + 15}>
          {part.name}
        </SongSays>
      ))}
      {CELLS.map((cell) => (
        <g key={cell.key}>
          <rect
            {...(cell.playing ? { "data-standing": "grid" } : {})}
            x={cell.x}
            y={cell.y}
            width={WIDE - 8}
            height={GRID.high}
            rx={4}
            className={
              cell.playing
                ? "fill-primary/30 stroke-foreground"
                : cell.held
                  ? "fill-primary/12 stroke-border"
                  : "fill-muted stroke-border"
            }
            strokeWidth={cell.playing ? 2 : 1}
            {...(cell.armed ? { strokeDasharray: "5 3", strokeWidth: 2 } : {})}
          />
          {/* The one playing carries the mark a hand looks for; the one armed carries the ring. */}
          {cell.playing ? (
            <path
              d={`M ${cell.x + 10} ${cell.y + 6} L ${cell.x + 22} ${cell.y + GRID.high / 2} L ${cell.x + 10} ${cell.y + GRID.high - 6} Z`}
              className="fill-foreground"
            />
          ) : null}
          {cell.armed ? (
            <circle
              cx={cell.x + 16}
              cy={cell.y + GRID.high / 2}
              r={5}
              className="fill-none stroke-foreground"
              strokeWidth={2}
            />
          ) : null}
        </g>
      ))}
      <SongSays x={4} y={VIEW.high - 6}>
        {`${SKETCH_STANDING_SAID} · armed ${SKETCH_NEXT.part.name}, in at the next ${SKETCH_TURN}`}
      </SongSays>
    </SongStage>
  );
}
