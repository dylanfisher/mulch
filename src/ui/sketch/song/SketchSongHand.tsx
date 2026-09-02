/**
 * @role Playback sketch 02 — the parts as a hand of cards, one of them played at a time. The
 *   argument: a part is a thing a hand holds and puts down, so the arrangement is the hand and the
 *   song is the order they go down in — and which card is on the table is never a question.
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
  SKETCH_AT,
  SKETCH_PLAYS_SAID,
  SKETCH_RUN_SAID,
  SKETCH_STANDING_SAID,
} from "@/ui/sketch/sketchSong";
import { characterInk, SKETCH_PARTS } from "@/ui/sketch/sketchWalk";
import { heldMiddle, SongSays, SongStage } from "@/ui/sketch/song/SketchSongStage";

/** One card per part of the arrangement, sized off how many there are: a fifth part redraws the
 *  hand rather than running the last card off the edge. */
const EDGE = 12;
const STEP = (VIEW.wide - EDGE * 2) / SKETCH_PARTS.length;
const CARD = { wide: STEP - 12, high: 86, top: 44 };

/** The card being played is lifted out of the hand, which is the whole of what the picture says. */
const LIFT = 14;

const HAND = SKETCH_PARTS.map((part, index) => ({
  index,
  part,
  x: EDGE + index * STEP + 6,
  played: part.name === SKETCH_AT.part.name,
  ink: characterInk(part.character),
}));

export function SketchSongHand() {
  return (
    <SongStage reading="hand" label="The Hand">
      <SongSays x={EDGE} y={16}>
        {SKETCH_PLAYS_SAID}
      </SongSays>
      <SongSays x={heldMiddle(VIEW.wide, SKETCH_RUN_SAID)} y={16} middle>
        {SKETCH_RUN_SAID}
      </SongSays>
      {HAND.map((card) => (
        <g key={card.index}>
          <rect
            {...(card.played ? { "data-standing": "hand" } : {})}
            x={card.x}
            y={CARD.top - (card.played ? LIFT : 0)}
            width={CARD.wide}
            height={CARD.high}
            rx={6}
            className={
              card.played ? "fill-primary/25 stroke-foreground" : "fill-card stroke-border"
            }
            strokeWidth={card.played ? 2 : 1}
          />
          {/* The character the part was drawn with, as the weight of a band across its own card:
              one hue on this bench, so a character is a weight and never a second ink (0236). */}
          <rect
            x={card.x + 10}
            y={CARD.top - (card.played ? LIFT : 0) + 12}
            width={CARD.wide - 20}
            height={14}
            className="fill-primary"
            opacity={card.ink}
          />
          <SongSays x={card.x + CARD.wide / 2} y={CARD.top - (card.played ? LIFT : 0) + 48} middle>
            {card.part.name}
          </SongSays>
          <SongSays x={card.x + CARD.wide / 2} y={CARD.top - (card.played ? LIFT : 0) + 70} middle>
            {barsSaid(card.part)}
          </SongSays>
        </g>
      ))}
      {/* The table: where the played card is, said in the same words the other seven say it in. */}
      <SongSays
        x={heldMiddle(EDGE + STEP * (SKETCH_PARTS.length / 2), `playing ${SKETCH_STANDING_SAID}`)}
        y={VIEW.high - 8}
        middle
      >
        {`playing ${SKETCH_STANDING_SAID}`}
      </SongSays>
    </SongStage>
  );
}
