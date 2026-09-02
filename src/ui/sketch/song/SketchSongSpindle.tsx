/**
 * @role Playback sketch 07 — the song as a spindle of parts, one pulled off, played, and pushed
 *   back on. The argument: what a run does to a part is a gesture with two ends, and a stack draws
 *   both — where the part came from, and that it is going back, which a row of the list never says.
 *   Named for the spindle and not the stack because the bench was cleared of a sketch called
 *   `stack` (SketchPage.test.tsx), and an id come round again is a record that stops being one.
 * @instead The other seven readings of the same run → the files beside this one. The arithmetic →
 *   src/ui/sketch/sketchSong.ts. The tier this is drawn instead of → src/lib/playerSongs.ts.
 */
// One picture is one function: the geometry is read top to bottom and every corner of it names
// itself, so cutting it into helpers to satisfy a line count would scatter one drawing across five
// scopes. The same waiver every sketch on this bench carries, for the reason 0247 gives (0007).
// oxlint-disable max-lines-per-function
import { SKETCH_VIEW as VIEW } from "@/ui/sketch/SketchFrame";
import {
  barsSaid,
  partOf,
  SKETCH_AT,
  SKETCH_PLAYS_SAID,
  SKETCH_RUN_SAID,
  SKETCH_STANDING_SAID,
} from "@/ui/sketch/sketchSong";
import { heldMiddle, SongSays, SongStage } from "@/ui/sketch/song/SketchSongStage";

/** The pile on the left, and the place a part is played on the right. */
const PILE = { x: 16, wide: 170, top: 44, high: 26, gap: 8 };
const PLAYED = { x: 286, wide: 178, y: 60, high: 48 };

/** One slot per part of the standing song, in the order the song plays them: the slot the cursor
 *  is on is the empty one, because the part that was in it is out being played. */
const SLOTS = SKETCH_AT.song.parts.map((name, partAt) => ({
  name,
  partAt,
  y: PILE.top + partAt * (PILE.high + PILE.gap),
  out: partAt === SKETCH_AT.partAt,
}));

/** Where the pulled part came from — the middle of its own empty slot, so the arrow points at the
 *  hole rather than at the pile in general. */
const FROM = PILE.top + SKETCH_AT.partAt * (PILE.high + PILE.gap) + PILE.high / 2;

export function SketchSongSpindle() {
  return (
    <SongStage reading="spindle" label="The Spindle">
      <SongSays x={4} y={16}>
        {SKETCH_PLAYS_SAID}
      </SongSays>
      <SongSays x={heldMiddle(VIEW.wide, SKETCH_RUN_SAID)} y={16} middle>
        {SKETCH_RUN_SAID}
      </SongSays>
      <SongSays x={PILE.x} y={34}>
        {`${SKETCH_AT.song.name}, top first`}
      </SongSays>
      {SLOTS.map((slot) => (
        <g key={slot.partAt}>
          <rect
            x={PILE.x}
            y={slot.y}
            width={PILE.wide}
            height={PILE.high}
            rx={4}
            className={slot.out ? "fill-none stroke-border" : "fill-card stroke-border"}
            {...(slot.out ? { strokeDasharray: "5 4" } : {})}
          />
          <SongSays x={PILE.x + 10} y={slot.y + 18}>
            {slot.out ? "— out —" : slot.name}
          </SongSays>
          <SongSays x={PILE.x + PILE.wide - 74} y={slot.y + 18}>
            {barsSaid(partOf(slot.name))}
          </SongSays>
        </g>
      ))}
      {/* Pulled off, and going back: two arrows, because a stack that only pops is a queue. */}
      <path
        d={`M ${PILE.x + PILE.wide + 6} ${FROM} L ${PLAYED.x - 8} ${PLAYED.y + 16} l -12 -2 m 12 2 l -8 9`}
        className="fill-none stroke-foreground"
        strokeWidth={2}
      />
      <path
        d={`M ${PLAYED.x - 8} ${PLAYED.y + PLAYED.high - 8} L ${PILE.x + PILE.wide + 6} ${FROM + 22} l 12 2 m -12 -2 l 8 -9`}
        className="fill-none stroke-border"
        strokeWidth={2}
        strokeDasharray="5 4"
      />
      <SongSays x={PILE.x + PILE.wide + 16} y={FROM - 8}>
        pulled
      </SongSays>
      <SongSays x={PILE.x + PILE.wide + 16} y={FROM + 42}>
        pushed back
      </SongSays>
      {/* The part out of the stack: the cursor, drawn as the one thing not in the pile. */}
      <rect
        data-standing="spindle"
        x={PLAYED.x}
        y={PLAYED.y}
        width={PLAYED.wide}
        height={PLAYED.high}
        rx={6}
        className="fill-primary/25 stroke-foreground"
        strokeWidth={2}
      />
      <SongSays
        x={heldMiddle(PLAYED.x + PLAYED.wide / 2, SKETCH_STANDING_SAID)}
        y={PLAYED.y + 30}
        middle
      >
        {SKETCH_STANDING_SAID}
      </SongSays>
      <SongSays x={PILE.x} y={VIEW.high - 6}>
        {`${barsSaid(SKETCH_AT.part)} out of the pile, then back on it`}
      </SongSays>
    </SongStage>
  );
}
