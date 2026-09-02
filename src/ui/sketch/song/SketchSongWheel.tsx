/**
 * @role Playback sketch 03 — the song as a wheel, with the rounds it plays as the teeth: one tooth
 *   goes by per round and the wheel hands on to the next song when the last one passes. The
 *   argument: `Plays` is a count of times round, so draw the going round and let the number be how
 *   many teeth there are.
 * @instead The other seven readings of the same run → the files beside this one. The arithmetic →
 *   src/ui/sketch/sketchSong.ts. The tier this is drawn instead of → src/lib/playerSongs.ts.
 */
// One picture is one function: the geometry is read top to bottom and every corner of it names
// itself, so cutting it into helpers to satisfy a line count would scatter one drawing across five
// scopes. The same waiver every sketch on this bench carries, for the reason 0247 gives (0007).
// oxlint-disable max-lines-per-function
import { READOUT_JOIN } from "@/lib/copy";
import { atTurn } from "@/ui/sketch/SketchFrame";
import {
  SKETCH_AT,
  SKETCH_PLAYS_LEFT,
  SKETCH_PLAYS_SAID,
  SKETCH_RUN_SAID,
  SKETCH_SONG_AFTER,
  SKETCH_STANDING_SAID,
} from "@/ui/sketch/sketchSong";
import { SongSays, SongStage } from "@/ui/sketch/song/SketchSongStage";

/** The wheel, and the reading column beside it. */
const HUB = { x: 88, y: 80, r: 30 };
const RIM = HUB.r + 14;
const TIP = RIM + 18;
const SAID = 176;

/**
 * One tooth per round the song plays, sized off how many there are: a song played sixteen times is
 * the same wheel with finer teeth rather than sixteen teeth off the edge of the picture. Nought a
 * turn at the top, so the first round is where a hand looks first.
 */
const ROUNDS = Array.from({ length: SKETCH_AT.song.plays }, (_, play) => ({
  play,
  from: atTurn(HUB.x, HUB.y, RIM, play / SKETCH_AT.song.plays),
  to: atTurn(HUB.x, HUB.y, TIP, play / SKETCH_AT.song.plays),
  gone: play < SKETCH_AT.play,
  turning: play === SKETCH_AT.play,
}));

export function SketchSongWheel() {
  return (
    <SongStage reading="wheel" label="The Wheel">
      <circle cx={HUB.x} cy={HUB.y} r={RIM} className="fill-none stroke-border" strokeWidth={2} />
      {ROUNDS.map((round) => (
        <line
          key={round.play}
          x1={round.from.x}
          y1={round.from.y}
          x2={round.to.x}
          y2={round.to.y}
          className={
            round.turning ? "stroke-foreground" : round.gone ? "stroke-primary" : "stroke-border"
          }
          strokeWidth={round.turning ? 7 : 5}
        />
      ))}
      {/* The hub is the cursor: which part of the round the wheel is standing on. */}
      <circle
        data-standing="wheel"
        cx={HUB.x}
        cy={HUB.y}
        r={HUB.r}
        className="fill-primary/25 stroke-foreground"
        strokeWidth={2}
      />
      <SongSays x={HUB.x} y={HUB.y + 4} middle>
        {SKETCH_AT.part.name}
      </SongSays>
      <SongSays x={SAID} y={34}>
        {SKETCH_PLAYS_SAID}
      </SongSays>
      <SongSays x={SAID} y={58}>
        {SKETCH_STANDING_SAID}
      </SongSays>
      {/* The round itself, spelled out: a wheel with unlabelled teeth is a gear and not a song. */}
      <SongSays x={SAID} y={82}>
        {SKETCH_AT.song.parts.join(READOUT_JOIN)}
      </SongSays>
      <SongSays x={SAID} y={106}>
        {SKETCH_RUN_SAID}
      </SongSays>
      <SongSays x={SAID} y={130}>
        {`${SKETCH_PLAYS_LEFT} more, then ${SKETCH_SONG_AFTER.name}`}
      </SongSays>
    </SongStage>
  );
}
