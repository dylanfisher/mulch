/**
 * @role Playback sketch 06 — the rounds as the thing being spent: a row per song, a coin per round
 *   it plays, and the coins going as the run goes. The argument: `Plays` is the only number on the
 *   tier a hand waits on, so draw it running out rather than sitting in a field.
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
  playsLeft,
  SKETCH_PLAYS_LEFT,
  SKETCH_PLAYS_SAID,
  SKETCH_RUN_SAID,
  SKETCH_STANDING_SAID,
  spentBy,
} from "@/ui/sketch/sketchSong";
import { SKETCH_SONGS } from "@/ui/sketch/sketchWalk";
import { heldMiddle, SongSays, SongStage } from "@/ui/sketch/song/SketchSongStage";

/** A row per song, and a coin per round it plays. The step is sized off the longest run of coins
 *  the fixture holds, so a song played sixteen times keeps its last coin on the picture. */
const NAMES = 84;
const ROWS = { top: 44, step: 34 };
const MOST = Math.max(...SKETCH_SONGS.map((song) => song.plays));
const COIN = Math.min((VIEW.wide - NAMES - 96) / MOST, 30);

/**
 * Every coin of every song, and whether it has been spent. A song the run has already left has
 * spent all of its coins and one it has not reached has spent none — which is the reading: what is
 * left to play is on the picture, not just what is playing.
 */
const PURSE = SKETCH_SONGS.map((song, index) => {
  const behind = spentBy(song);
  return {
    song,
    y: ROWS.top + index * ROWS.step,
    here: song === SKETCH_AT.song,
    coins: Array.from({ length: song.plays }, (_, play) => ({
      play,
      x: NAMES + play * COIN + COIN / 2,
      spent: song === SKETCH_AT.song ? play < SKETCH_AT.play : behind,
      spending: song === SKETCH_AT.song && play === SKETCH_AT.play,
    })),
  };
});

export function SketchSongSpend() {
  return (
    <SongStage reading="spend" label="The Spend">
      <SongSays x={4} y={16}>
        {SKETCH_PLAYS_SAID}
      </SongSays>
      <SongSays x={heldMiddle(VIEW.wide, SKETCH_RUN_SAID)} y={16} middle>
        {SKETCH_RUN_SAID}
      </SongSays>
      {PURSE.map((row) => (
        <g key={row.song.name}>
          {/* The row being played is the cursor: which song is spending is where the run stands. */}
          {row.here ? (
            <rect
              data-standing="spend"
              x={4}
              y={row.y - 16}
              width={VIEW.wide - 8}
              height={28}
              rx={5}
              className="fill-primary/15 stroke-foreground"
            />
          ) : null}
          <SongSays x={10} y={row.y + 4}>
            {row.song.name}
          </SongSays>
          {row.coins.map((coin) => (
            <circle
              key={coin.play}
              cx={coin.x}
              cy={row.y}
              r={COIN / 2 - 5}
              className={
                coin.spending
                  ? "fill-primary stroke-foreground"
                  : coin.spent
                    ? "fill-muted stroke-border"
                    : "fill-primary/40 stroke-border"
              }
              strokeWidth={coin.spending ? 2 : 1}
              {...(coin.spent ? { strokeDasharray: "3 3" } : {})}
            />
          ))}
          <SongSays x={NAMES + MOST * COIN + 12} y={row.y + 4}>
            {`${playsLeft(row.song)} left`}
          </SongSays>
        </g>
      ))}
      <SongSays x={4} y={VIEW.high - 6}>
        {`${SKETCH_STANDING_SAID} · ${SKETCH_PLAYS_LEFT} more after this one`}
      </SongSays>
    </SongStage>
  );
}
