/**
 * @role Part sketch 03 — two readings of How It Is Arranged, the hardest fold on the card because
 *   all eight of its knobs are odds and none of them is a thing: the ladder, where Grow, Span and
 *   Apart are a shape a part climbs, and the dice tray, where Chance, Keep and Return are three
 *   visible odds with a hundred pips each. The tray is the one picture 0247's drawn scores gave up
 *   on outright — "a drawn score says what happens, not what tends to happen".
 * @instead The fold this is the argument about → src/ui/PlayerCard.tsx. The sixteen passes both
 *   pictures are drawn off → src/ui/sketch/sketchWalk.ts. The other parts bench →
 *   src/ui/sketch/parts/SketchPartWalk.tsx.
 */
// One part, two readings — the same waiver every surface on the bench carries (0247, 0007).
// oxlint-disable max-lines-per-function
import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";
import { SKETCH_PICTURE, SketchLabel } from "@/ui/sketch/SketchFrame";
import { fixtureAt, SKETCH_ARRANGE, SKETCH_ARRANGE_ODDS } from "@/ui/sketch/sketchWalk";

/** Both pictures are drawn in this box, so the two readings sit at one size in one row. */
const VIEW = { wide: 320, high: 160 };

/* -------------------------------------------------------------------------- the ladder ------- */

const LADDER = { left: 16, right: 10, top: 34, foot: 118 };

/**
 * The tallest the arrangement ever stood, read off the run rather than set beside it: a ladder
 * with a rung nothing ever climbed to is a scale and not a reading. Checked where it is read
 * rather than three lines further down, because a run that never stood two parts divides by
 * nought in `partsY` and fills every rung with `NaN` before any later guard can say why.
 */
const TALLEST = ((): number => {
  const tallest = Math.max(...SKETCH_ARRANGE.map((pass) => pass.parts));
  if (tallest < 2) {
    throw new Error("The arrangement fixture never stands two parts, so it draws no ladder.");
  }
  return tallest;
})();

const passX = (index: number) =>
  LADDER.left + ((index + 0.5) / SKETCH_ARRANGE.length) * (VIEW.wide - LADDER.left - LADDER.right);
/** One part at the foot and the tallest the run stood at the top: growth climbs, which is the
 *  whole of what this reading buys over a number in a drawer. */
const partsY = (parts: number) =>
  LADDER.foot - ((parts - 1) / (TALLEST - 1)) * (LADDER.foot - LADDER.top);

/** Every rung the run stood on: how wide it was drawn is the span, and how far it is pushed off
 *  its own step is how unlike its neighbour it was. */
const RUNGS = SKETCH_ARRANGE.map((pass, index) => ({
  pass,
  index,
  x: passX(index),
  y: partsY(pass.parts) + pass.apart * 8 - 4,
  wide: 6 + pass.span * 4,
  letGo: pass.roll === "new" || pass.roll === "home",
}));

/** The widest rung and the one pushed furthest off its own step, so each amount is named on the
 *  pass that is the thing rather than in a legend beside the picture. */
const FIRST_RUNG = fixtureAt(RUNGS, 0, "rung");
const WIDEST = RUNGS.reduce(
  (far, rung) => (rung.pass.span > far.pass.span ? rung : far),
  FIRST_RUNG,
);
const FURTHEST = RUNGS.reduce(
  (far, rung) => (rung.pass.apart > far.pass.apart ? rung : far),
  FIRST_RUNG,
);

/** Every pass a part joined on, which is every pass that stood taller than the one before it. */
const CLIMBS = SKETCH_ARRANGE.map((pass, index) => ({ pass, index })).filter(
  ({ pass, index }) => index > 0 && pass.parts > fixtureAt(SKETCH_ARRANGE, index - 1, "pass").parts,
);

/**
 * How many passes go by between one part joining and the next — one number for the whole run, so
 * every gap inside a run has to agree on it. Two climbs are needed to have a gap at all, and a
 * fixture that climbed at two different rates has no single Grow to name: drawing the first gap
 * and calling it the Grow would put a number on the picture that most of the run disobeys, which
 * is the legend this reading exists to stop being (principle 5).
 *
 * Only gaps inside one run count. A let-go starts the arrangement over from one part, so the
 * distance from the last climb before it to the first climb after it is a restart and not a grow.
 */
const GROW = ((): { by: number; from: number; to: number } => {
  const gaps = CLIMBS.slice(1)
    .map((climb, at) => {
      const from = fixtureAt(CLIMBS, at, "climb").index;
      return { from, to: climb.index, by: climb.index - from };
    })
    .filter(({ from, to }) =>
      SKETCH_ARRANGE.slice(from, to).every((pass) => pass.roll !== "new" && pass.roll !== "home"),
    );
  const first = gaps[0];
  if (first === undefined) {
    throw new Error("The arrangement fixture never takes a second part on, so it draws no Grow.");
  }
  const disagrees = gaps.find((gap) => gap.by !== first.by);
  if (disagrees !== undefined) {
    throw new Error(
      `The arrangement fixture grows every ${first.by} passes and again every ${disagrees.by}, so it has no one Grow.`,
    );
  }
  return first;
})();

/**
 * The ladder: sixteen passes across, how many parts stood up. A run opens on one part and takes
 * another on every Grow passes, so the build-up is a staircase — and the drop back to one is the
 * arrangement being let go, which is the tray's business and shows here as the shape restarting.
 */
function ArrangeLadder() {
  return (
    <svg viewBox={`0 0 ${VIEW.wide} ${VIEW.high}`} className={SKETCH_PICTURE}>
      {Array.from({ length: TALLEST }, (_, at) => (
        <line
          key={at}
          x1={LADDER.left}
          y1={partsY(at + 1)}
          x2={VIEW.wide - LADDER.right}
          y2={partsY(at + 1)}
          className="stroke-border"
          strokeWidth={1}
        />
      ))}
      {Array.from({ length: TALLEST }, (_, at) => (
        <text key={at} x={2} y={partsY(at + 1) + 3} className="fill-current type-readout">
          {at + 1}
        </text>
      ))}
      {RUNGS.map((rung) => (
        <rect
          key={rung.index}
          x={rung.x - rung.wide / 2}
          y={rung.y}
          width={rung.wide}
          height={7}
          rx={1}
          className={rung.letGo ? "fill-foreground/50" : "fill-primary"}
        />
      ))}
      {/* The climb the Grow is: from the pass a part joined on to the pass the next one did. */}
      <line
        x1={passX(GROW.from)}
        y1={LADDER.top - 12}
        x2={passX(GROW.to)}
        y2={LADDER.top - 12}
        className="stroke-foreground"
        strokeWidth={2}
      />
      <text x={passX(GROW.from)} y={LADDER.top - 16} className="fill-current type-readout">
        {`${PLAYER_KNOB_LABELS.arrangeGrow} ${GROW.by}`}
      </text>
      <text
        x={passX(WIDEST.index) + 8}
        y={partsY(WIDEST.pass.parts) - 6}
        className="fill-current type-readout"
      >
        {`${PLAYER_KNOB_LABELS.arrangeSpan} ${WIDEST.pass.span}`}
      </text>
      <text
        x={passX(FURTHEST.index) - 8}
        y={partsY(FURTHEST.pass.parts) + 22}
        textAnchor="end"
        className="fill-current type-readout"
      >
        {`${PLAYER_KNOB_LABELS.arrangeApart} ${FURTHEST.pass.apart}`}
      </text>
    </svg>
  );
}

/* ---------------------------------------------------------------------------- the tray ------- */

/** A hundred pips is the whole of the argument: an odds is a share of a hundred passes, so it is
 *  drawn as a hundred and never as a bar whose end a hand has to read off an axis. */
const PIPS = 100;
const PIP = { across: 10, gap: 8, radius: 2.6, top: 42, left: 14, apart: 104 };

/** The three the tray shows, each with the name the card gives it and the share the sixteen
 *  passes actually rolled. Keep is a count of rounds on the card and an odds here, which is the
 *  one thing this reading changes and so the one thing it has to say out loud. */
const ODDS = [
  {
    key: "chance",
    name: PLAYER_KNOB_LABELS.arrangeChance,
    share: SKETCH_ARRANGE_ODDS.chance,
  },
  { key: "keep", name: PLAYER_KNOB_LABELS.arrangeKeep, share: SKETCH_ARRANGE_ODDS.keep },
  { key: "return", name: PLAYER_KNOB_LABELS.arrangeReturn, share: SKETCH_ARRANGE_ODDS.return },
];

/** Where a pip sits in its own hundred, row-major from the top left. */
const PIP_SPOTS = Array.from({ length: PIPS }, (_, at) => ({
  at,
  x: (at % PIP.across) * PIP.gap,
  y: Math.floor(at / PIP.across) * PIP.gap,
}));

/**
 * The tray: three hundreds of pips, each filled to the share the run rolled. This is the one fold
 * where a drawn score gives up — a score says a part was redrawn on pass four, and what a hand
 * needs to know is how often one is — so the picture is of the odds and not of the run.
 */
function ArrangeTray() {
  return (
    <svg viewBox={`0 0 ${VIEW.wide} ${VIEW.high}`} className={SKETCH_PICTURE}>
      {ODDS.map((one, index) => {
        const lit = Math.round(one.share * PIPS);
        return (
          <g key={one.key} data-odds={one.key}>
            <text
              x={PIP.left + index * PIP.apart}
              y={PIP.top - 12}
              className="fill-current type-readout"
            >
              {`${one.name} ${lit}%`}
            </text>
            {PIP_SPOTS.map((spot) => (
              <circle
                key={spot.at}
                cx={PIP.left + index * PIP.apart + spot.x}
                cy={PIP.top + spot.y}
                r={PIP.radius}
                className={spot.at < lit ? "fill-primary" : "fill-border"}
              />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

/* --------------------------------------------------------------------------- the bench ------- */

export function SketchPartArrange() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start gap-6">
        <div data-arrange="ladder" className="flex flex-col gap-2">
          <SketchLabel>The Ladder</SketchLabel>
          <ArrangeLadder />
          <p className="max-w-80 type-readout text-muted-foreground">
            Trades the odds. A staircase says what this run did, so nothing on it says how likely
            any of it was — the same wall every drawn score on the bench above runs into.
          </p>
        </div>
        <div data-arrange="tray" className="flex flex-col gap-2">
          <SketchLabel>The Dice Tray</SketchLabel>
          <ArrangeTray />
          <p className="max-w-80 type-readout text-muted-foreground">
            Trades the run. A hundred pips says how often, and never when — so the build-up the
            ladder is entirely made of has no mark here at all.
          </p>
        </div>
      </div>
      <p className="max-w-3xl type-body text-muted-foreground">
        Eight amounts and not one of them is a thing, which is why this fold is two pictures rather
        than one: three of them shape a part and are seen by climbing, three are odds and are seen
        by counting pips. The {PLAYER_KNOB_LABELS.arrangeKeep} is the join between them — a count of
        rounds on the card, drawn here as the odds any one pass is the pass that lets go, which is
        what makes it comparable with the two beside it and is the only number on this bench
        restated rather than read.{" "}
        {`${PLAYER_KNOB_LABELS.arrange} and ${PLAYER_KNOB_LABELS.arrangeAmount}`} are the two
        neither picture holds: one is how many parts may be drawn at all and the other is how far
        each is taken from the dials, and both are still just dials here.
      </p>
    </div>
  );
}
