/**
 * @role Part sketch 01 — three readings of The Walk, the fold every other one is read against: the
 *   strip as the card draws it now, the same loop bent into a ring, and the same landings as a
 *   piano-roll against the slot of the source each one reads. One fixture, three pictures, so what
 *   is being compared is the reading and not the run.
 * @instead The strip this is the control of → src/ui/PlayerScope.tsx. The whole-card arguments the
 *   bench mounts above these → src/ui/sketch/SketchPage.tsx. The landings themselves →
 *   src/ui/sketch/sketchWalk.ts.
 */
// One part, three readings of it, and the length is the three — the same waiver every surface on
// the bench carries and for the same stated reason (0247, 0007).
// oxlint-disable max-lines-per-function
import { cn } from "@/lib/cn";
import { PLAYER_SCOPE_LABEL } from "@/lib/copy";
import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";
import { PLAYER_SLOTS } from "@/lib/playerSlots";
import { SketchLabel } from "@/ui/sketch/SketchFrame";
import {
  characterInk,
  SKETCH_CHARACTER_WEIGHT,
  SKETCH_REACH,
  SKETCH_STANDING,
  SKETCH_WALK,
  type SketchLanding,
} from "@/ui/sketch/sketchWalk";

/** What a picture drawn of a walk that never travels would need and cannot have. */
function landingNever(): never {
  throw new Error("The walk fixture never leaves the top of the loop, so it draws no jump.");
}

/** One landing of the fixture, or a throw: an index the walk does not hold is a picture drawn of
 *  nothing, and a fixture is hand-written so there is nothing to fall back to. */
function landingAt(index: number): SketchLanding {
  const landing = SKETCH_WALK[index];
  if (landing === undefined) throw new Error(`The walk fixture holds no landing ${index}.`);
  return landing;
}

/** The landing the bench is held on, taken once: all three readings light the same one. */
const STANDING = landingAt(SKETCH_STANDING);

/** Every picture is drawn in this square so three readings sit at one size in one row. */
const VIEW = 200;
const MIDDLE = VIEW / 2;

/* -------------------------------------------------------------------------- the strip ------- */

/**
 * A block's box on the strip, in the card's own geometry: across is where in the loop it opens and
 * how long it holds; down is the band of the slot it reads, slot nought at the foot — which is
 * `bandOf` (src/ui/playerScopeCanvas.ts) said in percentages, because the control has to be the
 * control. Only the ink differs: the card fades everything but the standing landing, and the bench
 * spends the fill on which character cut it, the way all three readings here do.
 */
const STRIP_BLOCKS = SKETCH_WALK.map((landing, index) => ({
  index,
  landing,
  style: {
    left: `${landing.at * 100}%`,
    width: `${Math.max(landing.span, 0.008) * 100}%`,
    top: `${((PLAYER_SLOTS - landing.slot - 1) / PLAYER_SLOTS) * 100}%`,
    height: `${(1 / PLAYER_SLOTS) * 100}%`,
  },
}));

/**
 * The control: the strip as the card draws it today — one sheet of the loop, each landing on the
 * band of the slot it reads, the standing one lit. It is here to be argued with, not to win.
 */
function WalkStrip() {
  return (
    <div className="relative h-40 w-full overflow-hidden rounded border border-border bg-muted">
      {STRIP_BLOCKS.map((block) => (
        <div
          key={block.landing.at}
          style={block.style}
          className={cn(
            "absolute rounded-xs",
            SKETCH_CHARACTER_WEIGHT[block.landing.character],
            block.index === SKETCH_STANDING && "outline-2 outline-foreground",
          )}
        />
      ))}
      {/* Where the sheet turns over, which the strip can only say with an edge. */}
      <div className="absolute inset-y-0 right-0 border-r-2 border-foreground/40" />
    </div>
  );
}

/* --------------------------------------------------------------------------- the ring ------- */

const RING_R = 66;
const RING_THICK = 16;

/** Where on the ring a fraction of the loop sits, starting at the top and going clockwise. */
function ringAt(at: number, radius: number) {
  const angle = at * Math.PI * 2 - Math.PI / 2;
  return { x: MIDDLE + Math.cos(angle) * radius, y: MIDDLE + Math.sin(angle) * radius };
}

/** One landing as an arc of the ring, at the least a visible tick of it. */
const RING_ARCS = SKETCH_WALK.map((landing, index) => {
  const span = Math.max(landing.span, 0.006);
  const from = ringAt(landing.at, RING_R);
  const to = ringAt(landing.at + span, RING_R);
  return {
    index,
    landing,
    d: `M ${from.x} ${from.y} A ${RING_R} ${RING_R} 0 0 1 ${to.x} ${to.y}`,
  };
});

/** The head is drawn from a stub rather than the middle: a spoke through the centre crosses the
 *  one name in the hole, and a name a line runs through reads as a shorter word (0252). */
const RING_HUB = 26;
const RING_TAIL = ringAt(STANDING.at, RING_HUB);
const RING_HEAD = ringAt(STANDING.at, RING_R + RING_THICK);
const RING_TOP = ringAt(0, RING_R + RING_THICK);

/**
 * The ring: the same loop bent round until its end meets its start. The turn-over the strip has to
 * say in a sentence is a fact of the shape here — there is no right-hand edge to fall off.
 */
function WalkRing() {
  return (
    <svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      className="h-40 w-full rounded bg-muted text-muted-foreground"
    >
      <circle
        cx={MIDDLE}
        cy={MIDDLE}
        r={RING_R}
        className="fill-none stroke-border"
        strokeWidth={RING_THICK}
      />
      {RING_ARCS.map((arc) => (
        <path
          key={arc.landing.at}
          d={arc.d}
          className="fill-none stroke-primary"
          strokeWidth={RING_THICK}
          opacity={characterInk(arc.landing.character)}
        />
      ))}
      {/* The playhead, which sweeps and never lands anywhere the picture stops. */}
      <line
        x1={RING_TAIL.x}
        y1={RING_TAIL.y}
        x2={RING_HEAD.x}
        y2={RING_HEAD.y}
        className="stroke-foreground"
        strokeWidth={2}
      />
      {/* The top of the loop names itself, because a ring has no edge to mean it. */}
      <line
        x1={MIDDLE}
        y1={MIDDLE - RING_R + RING_THICK}
        x2={RING_TOP.x}
        y2={RING_TOP.y}
        className="stroke-foreground/50"
        strokeWidth={1}
      />
      <text x={MIDDLE} y={14} textAnchor="middle" className="fill-current type-eyebrow">
        top of the loop
      </text>
      <text x={MIDDLE} y={MIDDLE + 4} textAnchor="middle" className="fill-current type-eyebrow">
        {STANDING.character}
      </text>
    </svg>
  );
}

/* --------------------------------------------------------------------------- the roll ------- */

/** The roll is drawn wide rather than square: sixteen landings across a 200-unit box are closer
 *  together than the names beside them are tall, which is the picture arguing with its own labels. */
const ROLL_WIDE = 320;
const ROLL = { left: 24, right: 10, top: 18, bottom: 12 };
/** The last slot of the loop, so the axis is the module's grid and not a made-up depth. */
const SLOT_MAX = PLAYER_SLOTS - 1;

const rollX = (index: number) =>
  ROLL.left + ((index + 0.5) / SKETCH_WALK.length) * (ROLL_WIDE - ROLL.left - ROLL.right);
/** Slot nought at the foot, the way `bandOf` reads it and the strip beside this one does: a
 *  picture whose whole job is to be read against the card cannot run the other way up. */
const rollY = (slot: number) =>
  ROLL.top + ((SLOT_MAX - slot) / SLOT_MAX) * (VIEW - ROLL.top - ROLL.bottom);

/** Every fourth slot gets a number down the side: the axis is the source, not the clock. Counted
 *  off `PLAYER_SLOTS` rather than written out, so a grid of a different width takes the axis with
 *  it instead of drawing numbered lines above the top of the box (principle 1). */
const ROLL_TICKS = Array.from({ length: Math.ceil(PLAYER_SLOTS / 4) }, (_, at) => ({
  slot: at * 4,
  y: rollY(at * 4),
}));

const ROLL_MARKS = SKETCH_WALK.map((landing, index) => ({
  landing,
  index,
  x: rollX(index),
  y: rollY(landing.slot),
}));

/**
 * Every jump as the move it was: from the slot it left to the slot it read. A step that lands on
 * the top of the loop is the walk coming home rather than a travel, which is the distinction the
 * three amounts are drawn out of.
 */
const ROLL_STEPS = SKETCH_WALK.slice(1).map((landing, index) => {
  const from = ROLL_MARKS[index];
  const to = ROLL_MARKS[index + 1];
  if (from === undefined || to === undefined) throw new Error("A step of the walk has no ends.");
  return {
    key: landing.at,
    from,
    to,
    by: landing.slot - from.landing.slot,
    home: landing.slot === 0,
  };
});

/** The step that goes furthest, which is what the distance is, and a step that goes back, which is
 *  the side the bias leaves room for. Each carries the amount's name where it happens. */
const ROLL_TRAVELS = ROLL_STEPS.filter((step) => !step.home);
const ROLL_FURTHEST = ROLL_TRAVELS.reduce(
  (far, step) => (Math.abs(step.by) > Math.abs(far.by) ? step : far),
  // A walk that never leaves the top of the loop has no step to name the distance on, and a seedless
  // reduce would say so as a bare TypeError from inside a module the whole route imports.
  ROLL_TRAVELS[0] ?? landingNever(),
);
/** The *last* step that goes back, not the first: the first is next door to the furthest step, and
 *  two names six units apart are one smudge — which the shot caught before this said `last`. */
const ROLL_BACKS = ROLL_STEPS.filter((step) => !step.home && step.by < 0);
const ROLL_BACK = ROLL_BACKS.at(-1);
const ROLL_HOME = ROLL_STEPS.find((step) => step.home);

/**
 * The roll: the *jumps* across in the order they were taken, the sixteen slots of the source up.
 * Dropping the time base is the whole of what it buys — consecutive landings are next to each other
 * whatever the loop did between them, so the jump itself becomes a mark, and the three amounts are
 * the shape of that mark: the distance is how far a step reaches, the bias is which side it reaches
 * on, and coming home is a step back to the slot-nought line.
 */
function WalkRoll() {
  return (
    <svg
      viewBox={`0 0 ${ROLL_WIDE} ${VIEW}`}
      className="h-40 w-full rounded bg-muted text-muted-foreground"
    >
      {ROLL_TICKS.map((tick) => (
        <g key={tick.slot}>
          <line
            x1={ROLL.left}
            y1={tick.y}
            x2={ROLL_WIDE - ROLL.right}
            y2={tick.y}
            className="stroke-border"
            strokeWidth={1}
          />
          <text x={4} y={tick.y + 3} className="fill-current type-readout">
            {tick.slot}
          </text>
        </g>
      ))}
      {/* The top of the source, named on the line itself: every step that lands here is a return. */}
      <line
        x1={ROLL.left}
        y1={rollY(0)}
        x2={ROLL_WIDE - ROLL.right}
        y2={rollY(0)}
        className="stroke-foreground/60"
        strokeDasharray="3 3"
        strokeWidth={1}
      />
      {ROLL_STEPS.map((step) => (
        <line
          key={step.key}
          x1={step.from.x}
          y1={step.from.y}
          x2={step.to.x}
          y2={step.to.y}
          className={step.home ? "stroke-foreground/50" : "stroke-primary"}
          strokeDasharray={step.home ? "2 2" : undefined}
          strokeWidth={step.home ? 1 : 2}
        />
      ))}
      {ROLL_MARKS.map((mark) => (
        <rect
          key={mark.landing.at}
          x={mark.x - 4}
          y={mark.y - 3}
          width={8}
          height={6}
          rx={1}
          className={cn("fill-primary", mark.index === SKETCH_STANDING && "stroke-foreground")}
          opacity={characterInk(mark.landing.character)}
        />
      ))}
      <text
        x={ROLL_FURTHEST.to.x + 5}
        y={(ROLL_FURTHEST.from.y + ROLL_FURTHEST.to.y) / 2 + 3}
        className="fill-current type-readout"
      >
        {`${PLAYER_KNOB_LABELS.distance} ${SKETCH_REACH.distance}`}
      </text>
      {ROLL_BACK !== undefined && (
        <text
          x={ROLL_BACK.to.x - 6}
          y={Math.min(ROLL_BACK.from.y, ROLL_BACK.to.y) - 6}
          textAnchor="end"
          className="fill-current type-readout"
        >
          {`${PLAYER_KNOB_LABELS.bias} ${Math.round(SKETCH_REACH.bias * 100) / 100}`}
        </text>
      )}
      {ROLL_HOME !== undefined && (
        <text x={ROLL.left + 2} y={rollY(0) - 6} className="fill-current type-readout">
          {`${PLAYER_KNOB_LABELS.home} ${Math.round(SKETCH_REACH.home * 100)}%`}
        </text>
      )}
    </svg>
  );
}

/* -------------------------------------------------------------------------- the bench ------- */

/**
 * The three, side by side and at one size, each stating what it gives up — the shape the cast's
 * four blends already argue in, one fold down (0252).
 */
const READINGS = [
  {
    key: "strip",
    title: "The Strip",
    trades:
      "the jump. Two landings that follow each other sit wherever the loop put them, so how far the pattern travelled between them is a gap and never a move.",
    Picture: WalkStrip,
  },
  {
    key: "ring",
    title: "The Ring",
    trades:
      "fineness. Sixteen landings round a circle are shorter arcs than sixteen along a strip, so a cluster is a smudge.",
    Picture: WalkRing,
  },
  {
    key: "roll",
    title: "The Roll",
    trades:
      "the clock. Sixteen jumps evenly spaced is not sixteen landings in time, so a cluster and a long gap read the same, and how long one holds is off it entirely.",
    Picture: WalkRoll,
  },
];

export function SketchPartWalk() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start gap-6">
        {READINGS.map(({ key, title, trades, Picture }) => (
          <div key={key} data-reading={key} className="flex min-w-64 flex-1 flex-col gap-2">
            <SketchLabel>{title}</SketchLabel>
            <Picture />
            <p className="type-readout text-muted-foreground">Trades {trades}</p>
          </div>
        ))}
      </div>
      <p className="max-w-3xl type-body text-muted-foreground">
        One fixture, three readings: the same sixteen landings, the same one standing, so what is
        being picked between is how {PLAYER_SCOPE_LABEL} is read and nothing else. Two of them
        already put a landing on the slot it reads — that is the card&apos;s own geometry. Only the
        roll gives up the clock for it, which is what turns a jump into a mark and the three amounts
        into a shape rather than three numbers in Fine Tune.
      </p>
    </div>
  );
}
