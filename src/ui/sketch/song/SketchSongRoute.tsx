/**
 * @role Playback sketch 05 — the run as a route across a map of parts: every part a place, the
 *   song the road between them, and the cursor a pin standing on one. The argument: an arrangement
 *   that reuses a part is a route that visits a place twice, which a list of rows cannot draw at
 *   all and a map draws by itself.
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
  SKETCH_PLAYS_SAID,
  SKETCH_RUN_SAID,
  SKETCH_STANDING_SAID,
} from "@/ui/sketch/sketchSong";
import { fixtureAt, SKETCH_PARTS } from "@/ui/sketch/sketchWalk";
import { heldMiddle, SongSays, SongStage } from "@/ui/sketch/song/SketchSongStage";

/**
 * Where each part sits on the map. Placed by hand rather than laid out on a row, which is the
 * whole of the reading: a route is only a shape if the places are somewhere in particular. One per
 * part of the arrangement, so a fifth part throws here rather than being drawn nowhere.
 */
const PLACES: readonly { x: number; y: number }[] = [
  { x: 52, y: 96 },
  { x: 174, y: 44 },
  { x: 300, y: 100 },
  { x: 420, y: 46 },
];

const STOP = 22;

const MAP = SKETCH_PARTS.map((part, index) => {
  const place = fixtureAt(PLACES, index, "place");
  return { part, x: place.x, y: place.y, standing: part.name === SKETCH_AT.part.name };
});

/** The place of a part by name — the map is indexed by the arrangement, so a road to a part the
 *  arrangement never held is a line drawn to nowhere (principle 5). */
function placeOf(name: string): { x: number; y: number } {
  const found = MAP.find((stop) => stop.part.name === name);
  if (found === undefined) throw new Error(`The map holds no place for the part "${name}".`);
  return found;
}

/**
 * The standing song's own route, and the leg that closes it: the last part leads back to the first
 * because a song goes round as many times as it plays, and a route drawn open would say it ends.
 */
const LEGS = SKETCH_AT.song.parts.map((name, index) => {
  const parts = SKETCH_AT.song.parts;
  const next = fixtureAt(parts, (index + 1) % parts.length, "part");
  return {
    key: `${name}>${next}`,
    from: placeOf(name),
    to: placeOf(next),
    round: index === parts.length - 1,
  };
});

/** The pin over the place being played, pointing down at it. */
const PIN = ((): string => {
  const at = placeOf(SKETCH_AT.part.name);
  return `M ${at.x} ${at.y - STOP - 4} l -7 -14 l 14 0 Z`;
})();

export function SketchSongRoute() {
  return (
    <SongStage reading="route" label="The Route">
      <SongSays x={4} y={16}>
        {SKETCH_PLAYS_SAID}
      </SongSays>
      <SongSays x={heldMiddle(VIEW.wide, SKETCH_RUN_SAID)} y={16} middle>
        {SKETCH_RUN_SAID}
      </SongSays>
      {LEGS.map((leg) => (
        <line
          key={leg.key}
          x1={leg.from.x}
          y1={leg.from.y}
          x2={leg.to.x}
          y2={leg.to.y}
          className="stroke-foreground/60"
          strokeWidth={2}
          {...(leg.round ? { strokeDasharray: "6 4" } : {})}
        />
      ))}
      {MAP.map((stop) => (
        <g key={stop.part.name}>
          <circle
            {...(stop.standing ? { "data-standing": "route" } : {})}
            cx={stop.x}
            cy={stop.y}
            r={STOP}
            className={
              stop.standing ? "fill-primary/30 stroke-foreground" : "fill-card stroke-border"
            }
            strokeWidth={stop.standing ? 2 : 1}
          />
          <SongSays x={heldMiddle(stop.x, stop.part.name)} y={stop.y + STOP + 16} middle>
            {stop.part.name}
          </SongSays>
        </g>
      ))}
      {/* The pin: the cursor is a place on the map and never a row of the list beside it. */}
      <path d={PIN} className="fill-foreground" />
      <SongSays x={4} y={VIEW.high - 6}>
        {`${SKETCH_STANDING_SAID} · the road comes round`}
      </SongSays>
    </SongStage>
  );
}
