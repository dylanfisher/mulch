/**
 * @role Part sketch 05 — the two folds that are already only dials, together: How It Sounds and How
 *   It Is Timed, each drawn as the honest control it is today beside one alternative — the sound
 *   fold as a single chew axis every one of its six rides, the timing fold as a picker of grids.
 *   One sketch and not two, because the question is the same question for both and it is a question
 *   the rest of the bench cannot ask: whether either of them needs to be anything else at all.
 *   "Leave these two alone" is a real outcome here, and the bench has nowhere else to say it.
 * @instead The folds this is the argument about → src/ui/PlayerDials.tsx. The amounts each picture
 *   is derived from → src/ui/sketch/sketchWalk.ts. The other parts benches →
 *   src/ui/sketch/parts/SketchPartSongs.tsx.
 */
// Two folds, two readings each — the same waiver every surface on the bench carries and for the
// same stated reason (0247, 0007).
// oxlint-disable max-lines-per-function
import type { ReactNode } from "react";

import { PLAYER_GROUP_LABELS } from "@/lib/copy";
import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";
import type { PlayerKnob } from "@/lib/player";
import { PLAYER_BURST_MAX, PLAYER_VARY_MAX } from "@/lib/player";
import { PLAYER_REPEATS_MAX } from "@/lib/playerRepeats";
import { PLAYER_REST_MAX } from "@/lib/playerRest";
import { PLAYER_SLOTS } from "@/lib/playerSlots";
import { Slider } from "@/ui/components/slider";
import { SKETCH_PICTURE, SketchLabel } from "@/ui/sketch/SketchFrame";
import { fixtureAt, SKETCH_SOUND } from "@/ui/sketch/sketchWalk";

/** Both alternatives are drawn in the bench's own box, so every picture on the parts bench is one
 *  size and what is being compared is the reading (SketchFrame). */
const VIEW = { wide: 320, high: 160 };

/** One row of an honest fold: the card's own word, the amount under it said in the unit the card
 *  says it in, and the dial itself — which is the whole of what either fold is today. */
function Dial({ says, at }: { says: string; at: number }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="type-readout text-muted-foreground">{says}</span>
      <Slider aria-label={says} defaultValue={at} className="max-w-64" />
    </div>
  );
}

/** The honest control of one fold: its dials, in the order the card draws them across. */
function Fold({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-64 flex-1 flex-col gap-3">
      <SketchLabel>{label}</SketchLabel>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------------- the chew axis ------- */

/**
 * The six the sound fold draws, in the card's own order, each with how much of the chew axis it
 * takes. The alternative's whole claim is that one axis sets all six, so the amounts under the
 * honest dials beside it are read off that axis rather than written out a second time: a table of
 * six numbers here would be the claim quietly abandoned (principle 1).
 */
const CHEWED = [
  { knob: "gate", reach: 1 },
  { knob: "drop", reach: 0.45 },
  { knob: "spark", reach: 0.8 },
  { knob: "sparkLevel", reach: 0.7 },
  { knob: "sparkDelay", reach: 0.35 },
  { knob: "reverse", reach: 0.5 },
] as const satisfies readonly { knob: PlayerKnob; reach: number }[];

const SOUND = CHEWED.map(({ knob, reach }) => ({
  knob,
  name: PLAYER_KNOB_LABELS[knob],
  at: Math.round(SKETCH_SOUND.chew * reach * 100),
}));

/** The axis itself and the lanes under it: where the handle stands, and where each of the six lands
 *  along its own lane, so the six dots are visibly one hand's worth of travel. */
const AXIS = { left: 84, right: 10, top: 30, row: 48, step: 17 };
const AXIS_WIDE = VIEW.wide - AXIS.left - AXIS.right;
const CHEW_AT = AXIS.left + SKETCH_SOUND.chew * AXIS_WIDE;
const CHEW_SAYS = `Chew ${Math.round(SKETCH_SOUND.chew * 100)}`;

/* ---------------------------------------------------------------------------- the picker ------- */

/**
 * The grids the picker offers: how many even divisions of the loop one pass makes. A landing is
 * struck once per division, and the wait between two jumps is what one division is worth in the
 * loop's own sixteenths — so both amounts are the grid's arithmetic and neither is a number typed
 * beside it. Stopping at four is not a shortening: below it a division is worth more than the wait
 * the card will take (`PLAYER_REST_MAX`), so a coarser grid is a cell the picker could not honour.
 */
const GRIDS = [4, 8, 16].map((divisions) => ({
  divisions,
  name: `1/${divisions}`,
  repeats: divisions,
  rest: PLAYER_SLOTS / divisions,
}));

const STANDING_GRID = fixtureAt(GRIDS, SKETCH_SOUND.subdivision, "grid");
const CELL = { edge: 8, step: 102, wide: 94, top: 40, high: 84 };

/** The two amounts the picker cannot reach, in the unit the card reads them in: a reading under a
 *  second is milliseconds, which is the burst dial's own rule and not this bench's. */
const BURST_SAYS = `${PLAYER_KNOB_LABELS.burst} ${Math.round(SKETCH_SOUND.burst * 1000)}ms`;
const VARY_SAYS = `${PLAYER_KNOB_LABELS.vary} ${Math.round(SKETCH_SOUND.vary * 1000)}ms`;
const REPEATS_SAYS = `${PLAYER_KNOB_LABELS.repeats} ${STANDING_GRID.repeats}`;
const REST_SAYS = `${PLAYER_KNOB_LABELS.rest} ${STANDING_GRID.rest}`;

/* ---------------------------------------------------------------------------- the bench ------- */

export function SketchPartSound() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start gap-6">
        <div data-sound="dials">
          <Fold label={`${PLAYER_GROUP_LABELS.sound} — as it stands`}>
            {SOUND.map((one) => (
              <Dial key={one.knob} says={`${one.name} ${one.at}`} at={one.at} />
            ))}
          </Fold>
        </div>

        <div data-sound="chew" className="flex flex-col gap-2">
          <SketchLabel>{`${PLAYER_GROUP_LABELS.sound} — one axis`}</SketchLabel>
          <svg viewBox={`0 0 ${VIEW.wide} ${VIEW.high}`} className={SKETCH_PICTURE}>
            <line
              x1={AXIS.left}
              y1={AXIS.top}
              x2={VIEW.wide - AXIS.right}
              y2={AXIS.top}
              className="stroke-border"
              strokeWidth={2}
            />
            {/* Every one of the six hangs off the one handle, drawn rather than stated: the claim
                is that a hand turns this and the fold follows, and six unconnected dots would be
                six dials in a different typeface. */}
            {SOUND.map((one, index) => (
              <line
                key={one.knob}
                x1={CHEW_AT}
                y1={AXIS.top + 4}
                x2={AXIS.left + (one.at / 100) * AXIS_WIDE}
                y2={AXIS.row + index * AXIS.step - 4}
                className="stroke-foreground/25"
                strokeWidth={1}
              />
            ))}
            <circle cx={CHEW_AT} cy={AXIS.top} r={5} className="fill-primary" />
            <text x={AXIS.left} y={AXIS.top - 10} className="fill-current type-readout">
              {CHEW_SAYS}
            </text>
            {SOUND.map((one, index) => {
              const y = AXIS.row + index * AXIS.step;
              return (
                <g key={one.knob} data-chewed={one.knob}>
                  <line
                    x1={AXIS.left}
                    y1={y}
                    x2={VIEW.wide - AXIS.right}
                    y2={y}
                    className="stroke-border"
                    strokeWidth={1}
                  />
                  <circle
                    cx={AXIS.left + (one.at / 100) * AXIS_WIDE}
                    cy={y}
                    r={3}
                    className="fill-primary"
                  />
                  <text x={4} y={y + 3} className="fill-current type-readout">
                    {`${one.name} ${one.at}`}
                  </text>
                </g>
              );
            })}
          </svg>
          <p className="max-w-80 type-readout text-muted-foreground">
            Trades the corner. One axis reaches every mix along it and no mix off it, so a hard gate
            with no spark at all — which is a sound the fold has today — is unreachable.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <div data-timed="dials">
          <Fold label={`${PLAYER_GROUP_LABELS.timing} — as it stands`}>
            <Dial says={BURST_SAYS} at={(SKETCH_SOUND.burst / PLAYER_BURST_MAX) * 100} />
            <Dial says={VARY_SAYS} at={(SKETCH_SOUND.vary / PLAYER_VARY_MAX) * 100} />
            <Dial says={REPEATS_SAYS} at={(STANDING_GRID.repeats / PLAYER_REPEATS_MAX) * 100} />
            <Dial says={REST_SAYS} at={(STANDING_GRID.rest / PLAYER_REST_MAX) * 100} />
          </Fold>
        </div>

        <div data-timed="picker" className="flex flex-col gap-2">
          <SketchLabel>{`${PLAYER_GROUP_LABELS.timing} — a grid`}</SketchLabel>
          <svg viewBox={`0 0 ${VIEW.wide} ${VIEW.high}`} className={SKETCH_PICTURE}>
            <text x={CELL.edge} y={20} className="fill-current type-readout">
              {`${PLAYER_GROUP_LABELS.timing}, as a grid of the loop`}
            </text>
            {GRIDS.map((grid, index) => {
              const x = CELL.edge + index * CELL.step;
              const lit = grid.divisions === STANDING_GRID.divisions;
              return (
                <g key={grid.divisions} data-grid={grid.name}>
                  <rect
                    {...(lit ? { "data-standing": "picker" } : {})}
                    x={x}
                    y={CELL.top}
                    width={CELL.wide}
                    height={CELL.high}
                    rx={4}
                    className={
                      lit ? "fill-primary/20 stroke-foreground" : "fill-card stroke-border"
                    }
                    strokeWidth={lit ? 2 : 1}
                  />
                  {/* The grid drawn as the grid it is: one tick per division, so a hand picks a
                      rhythm by looking at one rather than by reading a fraction. */}
                  {Array.from({ length: grid.divisions }, (_, tick) => (
                    <line
                      key={tick}
                      x1={x + 8 + (tick * (CELL.wide - 16)) / grid.divisions}
                      y1={CELL.top + 10}
                      x2={x + 8 + (tick * (CELL.wide - 16)) / grid.divisions}
                      y2={CELL.top + 26}
                      className="stroke-foreground/60"
                      strokeWidth={1}
                    />
                  ))}
                  <text
                    x={x + CELL.wide / 2}
                    y={CELL.top + 44}
                    textAnchor="middle"
                    className="fill-current type-readout"
                  >
                    {grid.name}
                  </text>
                  <text
                    x={x + CELL.wide / 2}
                    y={CELL.top + 60}
                    textAnchor="middle"
                    className="fill-current type-readout"
                  >
                    {`${PLAYER_KNOB_LABELS.repeats} ${grid.repeats}`}
                  </text>
                  <text
                    x={x + CELL.wide / 2}
                    y={CELL.top + 76}
                    textAnchor="middle"
                    className="fill-current type-readout"
                  >
                    {`${PLAYER_KNOB_LABELS.rest} ${grid.rest}`}
                  </text>
                </g>
              );
            })}
            <text x={CELL.edge} y={VIEW.high - 8} className="fill-current type-readout">
              {`No cell: ${BURST_SAYS}, ${VARY_SAYS}`}
            </text>
          </svg>
          <p className="max-w-80 type-readout text-muted-foreground">
            Trades the second. A grid is a division of the loop, so how long one landing sounds —
            the one length the loop does not set — has no cell here at all.
          </p>
        </div>
      </div>

      <p className="max-w-3xl type-body text-muted-foreground">
        The two folds that are already only dials, which is why they are one sketch: neither is a
        picture waiting to be drawn, so the argument is whether either needs to be anything else.
        The chew axis buys one hand movement and gives up every mix off the line it draws. The grid
        buys a rhythm a hand can see and gives up the burst and its {PLAYER_KNOB_LABELS.vary}{" "}
        outright, because those are seconds and a grid is a division of the loop. Leaving both folds
        exactly as they stand is a real answer to this bench, and the only one no whole-surface
        sketch above can express.
      </p>
    </div>
  );
}
