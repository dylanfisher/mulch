/**
 * @role Part sketch 02 — two readings of Which Ground, the fold whose five knobs are the song's
 *   and never a part's (0184): the source with the grounds planted on it and dragged where they
 *   go, and the beds of that source as a deck of cards the Every dial cuts. Both light the one
 *   ground the loop is standing on, because "the loop walks the source once, under every part in
 *   turn" is the fact a hand keeps losing.
 * @instead The fold this is the argument about → src/ui/PlayerCard.tsx. What a bed is, and why the
 *   distance is counted in sixteenths and never in whole beds → src/lib/playerBed.ts. The fixtures
 *   themselves → src/ui/sketch/sketchWalk.ts.
 */
// One part, two readings and the drag that makes the first one an argument — the same waiver every
// surface on the bench carries and for the same stated reason (0247, 0007).
// oxlint-disable max-lines-per-function
import { type PointerEvent as ReactPointerEvent, useCallback, useState } from "react";

import { PLAYER_GROUP_LABELS } from "@/lib/copy";
import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";
import { PLAYER_SLOTS } from "@/lib/playerSlots";
import { SKETCH_PICTURE, SketchLabel } from "@/ui/sketch/SketchFrame";
import { dragged, type Grab, grabbed, letGo } from "@/ui/sketch/sketchGround";
import {
  fixtureAt,
  SKETCH_BEDS,
  type SketchBed,
  SKETCH_GROUND,
  SKETCH_GROUND_STANDING,
  SKETCH_SOURCE,
  SKETCH_SOURCE_BEDS,
  SKETCH_SOURCE_SLOTS,
} from "@/ui/sketch/sketchWalk";

/**
 * Both pictures are drawn in this box, and its shape is the reason the drag works. The box is
 * `SKETCH_PICTURE`'s own — `h-40 w-80` is 160 by 320 — so one unit of the viewBox is one pixel of
 * the element and a pointer's place in the box is its place in the picture. A `w-full` picture is
 * letterboxed inside its element by the default `preserveAspectRatio`, and a drag read off the
 * element's width then lags the pointer by the ratio between the two, which is the trap the
 * chipper's own fixed box already avoids one directory up.
 */
const VIEW = { wide: 320, high: 160 };

/** Where in the file a count of the loop's own sixteenths falls, as a fraction of the whole. */
const acrossFile = (slots: number) => slots / SKETCH_SOURCE_SLOTS;

/** Which way the walk leans, in the module's own reading of a signed amount: nought is as likely
 *  back as on, so the side is read off the sign and never written beside it. */
const LEAN = SKETCH_GROUND.bias > 0 ? "forward" : SKETCH_GROUND.bias < 0 ? "back" : "even";

/* ----------------------------------------------------------------------- the waveform ------- */

const WAVE = { top: 44, foot: 118, mid: 81 };

/**
 * The source as one closed shape, mirrored about its own middle: the loudness run read up from
 * the midline and back down it, which is the picture a hand already knows a sample by.
 */
const WAVE_PATH = ((): string => {
  const step = VIEW.wide / (SKETCH_SOURCE.length - 1);
  const reach = (WAVE.foot - WAVE.top) / 2;
  const up = SKETCH_SOURCE.map((much, at) => `${at * step} ${WAVE.mid - much * reach}`);
  // Walked backwards by index rather than off a reversed copy: the shape has to close on the
  // sample it opened on, and a sample the run does not hold is a corner drawn out of nothing.
  const down = Array.from({ length: SKETCH_SOURCE.length }, (_, at) => {
    const back = SKETCH_SOURCE.length - 1 - at;
    return `${back * step} ${WAVE.mid + fixtureAt(SKETCH_SOURCE, back, "sample") * reach}`;
  });
  return `M ${[...up, ...down].join(" L ")} Z`;
})();

/** Where in the source a pointer is, as a fraction of it. The box is pinned to the viewBox above,
 *  so the element's own width is the source's and no scale has to be carried about. */
function sourceAt(event: ReactPointerEvent<SVGRectElement>): number {
  const picture = event.currentTarget.ownerSVGElement;
  if (picture === null) throw new Error("A bed chip is drawn outside a picture.");
  const box = picture.getBoundingClientRect();
  return (event.clientX - box.left) / box.width;
}

/**
 * One planted ground on the source: the chip itself, a handle on its right edge, and its name over
 * the top. The name is inside the picture rather than in a legend for the reason every other
 * corner on this bench carries its own (0252) — a chip a hand has just dragged is the one thing a
 * legend cannot keep up with.
 */
function BedChip({
  bed,
  index,
  grab,
  drag,
  drop,
}: {
  bed: SketchBed;
  index: number;
  grab: (index: number, edge: boolean, event: ReactPointerEvent<SVGRectElement>) => void;
  drag: (event: ReactPointerEvent<SVGRectElement>) => void;
  drop: (event: ReactPointerEvent<SVGRectElement>) => void;
}) {
  const takeBody = useCallback(
    (event: ReactPointerEvent<SVGRectElement>) => {
      grab(index, false, event);
    },
    [grab, index],
  );
  const takeEdge = useCallback(
    (event: ReactPointerEvent<SVGRectElement>) => {
      grab(index, true, event);
    },
    [grab, index],
  );
  const left = bed.at * VIEW.wide;
  const wide = bed.span * VIEW.wide;
  return (
    <g>
      <rect
        x={left}
        y={WAVE.top - 6}
        width={wide}
        height={WAVE.foot - WAVE.top + 12}
        rx={2}
        className="fill-primary/20 stroke-border"
        strokeWidth={1}
        onPointerDown={takeBody}
        onPointerMove={drag}
        onPointerUp={drop}
        onPointerCancel={drop}
        onLostPointerCapture={drop}
      />
      <rect
        x={left + wide - 3}
        y={WAVE.top - 6}
        width={6}
        height={WAVE.foot - WAVE.top + 12}
        className="fill-foreground/60"
        onPointerDown={takeEdge}
        onPointerMove={drag}
        onPointerUp={drop}
        onPointerCancel={drop}
        onLostPointerCapture={drop}
      />
      <text
        x={left + wide / 2}
        y={WAVE.top - 12}
        textAnchor="middle"
        className="fill-current type-readout"
      >
        {bed.name}
      </text>
    </g>
  );
}

/* ---------------------------------------------------------------------------- the deck ------- */

/**
 * One card per bed of the source — a loop-length each, which is what the Bed dial counts — with
 * the geometry derived from how many there are rather than set, so a file of eight beds redraws
 * the deck instead of running the last card off the right-hand edge.
 */
const DECK_EDGE = 10;
const DECK_STEP = (VIEW.wide - DECK_EDGE * 2) / SKETCH_SOURCE_BEDS;
const CARD = { wide: DECK_STEP - 8, high: 54, top: 26 };

const DECK = Array.from({ length: SKETCH_SOURCE_BEDS }, (_, bed) => ({
  bed,
  /** The card's own word for itself, which is the dial's: nought is the loop the song opens on. */
  name: `${PLAYER_KNOB_LABELS.bed} ${bed}`,
  x: DECK_EDGE + bed * DECK_STEP,
}));

/** Where a count of sixteenths falls across the deck, which is the same measure the file is drawn
 *  in one picture over — so a move of less than a bed lands part-way into a card, and that is the
 *  whole of the crawl (src/lib/playerBed.ts). */
const alongDeck = (slots: number) => DECK_EDGE + acrossFile(slots) * (VIEW.wide - DECK_EDGE * 2);

const STANDS_AT = alongDeck(SKETCH_GROUND.standing);
const TRAVELS_TO = alongDeck(SKETCH_GROUND.standing + SKETCH_GROUND.distance);
const HOME_AT = alongDeck(SKETCH_GROUND.bed * PLAYER_SLOTS);
const MOVE_Y = CARD.top + CARD.high + 26;

/* --------------------------------------------------------------------------- the bench ------- */

export function SketchPartGround() {
  const [beds, setBeds] = useState<readonly SketchBed[]>(SKETCH_BEDS);
  const [held, setHeld] = useState<Grab | null>(null);

  const grab = useCallback(
    (index: number, edge: boolean, event: ReactPointerEvent<SVGRectElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      setHeld(grabbed(beds, index, edge, sourceAt(event), event.pointerId));
    },
    [beds],
  );

  const drag = useCallback(
    (event: ReactPointerEvent<SVGRectElement>) => {
      setBeds((was) => dragged(was, held, event.pointerId, sourceAt(event)));
    },
    [held],
  );

  const drop = useCallback((event: ReactPointerEvent<SVGRectElement>) => {
    setHeld((was) => letGo(was, event.pointerId));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start gap-6">
        <div data-ground="source" className="flex flex-col gap-2">
          <SketchLabel>The Source</SketchLabel>
          <svg viewBox={`0 0 ${VIEW.wide} ${VIEW.high}`} className={`${SKETCH_PICTURE} touch-none`}>
            <path d={WAVE_PATH} className="fill-foreground/25" />
            {/* The window the loop is reading — one bed wide, standing part-way into one. */}
            <rect
              data-standing="source"
              x={acrossFile(SKETCH_GROUND.standing) * VIEW.wide}
              y={WAVE.top - 6}
              width={acrossFile(PLAYER_SLOTS) * VIEW.wide}
              height={WAVE.foot - WAVE.top + 12}
              rx={2}
              className="fill-primary/10 stroke-foreground"
              strokeWidth={2}
            />
            {beds.map((bed, index) => (
              <BedChip key={bed.name} bed={bed} index={index} grab={grab} drag={drag} drop={drop} />
            ))}
            <text x={4} y={VIEW.high - 8} className="fill-current type-readout">
              {`Drag a chip, drag its edge to resize`}
            </text>
          </svg>
          <p className="max-w-80 type-readout text-muted-foreground">
            Trades the order. A chip says where a ground is in the file and nothing about when the
            loop gets there, so the Every dial has no mark on this picture at all.
          </p>
        </div>

        <div data-ground="deck" className="flex flex-col gap-2">
          <SketchLabel>The Deck</SketchLabel>
          <svg viewBox={`0 0 ${VIEW.wide} ${VIEW.high}`} className={SKETCH_PICTURE}>
            {DECK.map((card) => (
              <g key={card.bed}>
                <rect
                  x={card.x}
                  y={CARD.top}
                  width={CARD.wide}
                  height={CARD.high}
                  rx={4}
                  className={
                    card.bed === SKETCH_GROUND_STANDING.bed
                      ? "fill-primary/20 stroke-foreground"
                      : "fill-card stroke-border"
                  }
                  strokeWidth={1}
                />
                <text
                  x={card.x + CARD.wide / 2}
                  y={CARD.top + CARD.high / 2 + 3}
                  textAnchor="middle"
                  className="fill-current type-readout"
                >
                  {card.name}
                </text>
              </g>
            ))}
            {/* Where the loop is standing — part-way into a card, which is the crawl and the one
                thing a deck cut in whole beds could never draw. */}
            <rect
              data-standing="deck"
              x={STANDS_AT}
              y={CARD.top - 8}
              width={alongDeck(PLAYER_SLOTS) - DECK_EDGE}
              height={CARD.high + 16}
              rx={2}
              className="fill-none stroke-foreground"
              strokeWidth={2}
            />
            {/* Where the deck is cut, which is the one thing only this reading can draw. */}
            <line
              x1={STANDS_AT}
              y1={18}
              x2={STANDS_AT}
              y2={CARD.top + CARD.high + 8}
              className="stroke-foreground"
              strokeDasharray="4 3"
              strokeWidth={2}
            />
            <text x={DECK_EDGE} y={14} className="fill-current type-readout">
              {`${PLAYER_KNOB_LABELS.bedEvery} ${SKETCH_GROUND.every}`}
            </text>
            {/* The move the cut makes: how far, which side, and how often it comes home instead.
                Each of the three names itself on the mark that is the thing (0252). */}
            <line
              x1={STANDS_AT}
              y1={MOVE_Y}
              x2={TRAVELS_TO}
              y2={MOVE_Y}
              className="stroke-primary"
              strokeWidth={2}
            />
            <text
              x={(STANDS_AT + TRAVELS_TO) / 2}
              y={MOVE_Y - 4}
              textAnchor="middle"
              className="fill-current type-readout"
            >
              {`${PLAYER_KNOB_LABELS.bedDistance} ${SKETCH_GROUND.distance}`}
            </text>
            <line
              x1={STANDS_AT}
              y1={MOVE_Y + 12}
              x2={HOME_AT}
              y2={MOVE_Y + 12}
              className="stroke-foreground/50"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
            <text x={DECK_EDGE} y={VIEW.high - 20} className="fill-current type-readout">
              {`${PLAYER_KNOB_LABELS.bedBias} ${SKETCH_GROUND.bias} ${LEAN}`}
            </text>
            <text x={DECK_EDGE} y={VIEW.high - 6} className="fill-current type-readout">
              {`${PLAYER_KNOB_LABELS.bedHome} ${Math.round(SKETCH_GROUND.home * 100)}% to ${PLAYER_KNOB_LABELS.bed} ${SKETCH_GROUND.bed}`}
            </text>
          </svg>
          <p className="max-w-80 type-readout text-muted-foreground">
            Trades the sample. A card is a bed with no waveform under it, so nothing here says which
            ground is the one worth standing on.
          </p>
        </div>
      </div>
      <p className="max-w-3xl type-body text-muted-foreground">
        {`${PLAYER_GROUP_LABELS.ground} is standing on ${PLAYER_KNOB_LABELS.bed} ${SKETCH_GROUND_STANDING.bed}, ${SKETCH_GROUND_STANDING.into} sixteenths in`}{" "}
        — one ground, for the whole song. The loop walks the source once, under every part in turn,
        so these five amounts are never a part&apos;s: a part that wanted its own bed would be a
        second walk over the same file, and there is only ever the one. Both pictures light that one
        window, and only the deck can draw the cut that moves it — a move counted in the loop&apos;s
        own sixteenths and not in whole beds, which is why it lands part-way into a card.
      </p>
    </div>
  );
}
