/**
 * @role What the automator declares: the bounds each of its knobs is said in, the knobs themselves,
 *   which weight belongs to which poolable entry, and the reason each knob that reaches no
 *   dimension of the picture reaches none (0148, 0210).
 * @instead What the run *does* with these numbers — the rack it holds, the places it lays and the
 *   fades it rides → ./automator.ts. What the population is, as pure maths → src/lib/effectGrowth.ts.
 */
import {
  GROWTH_COUNT_MAX,
  GROWTH_COUNT_MIN,
  GROWTH_DRIFT_MAX,
  GROWTH_DRIFT_MIN,
  GROWTH_ODDS_MAX,
  GROWTH_ODDS_MIN,
  GROWTH_WANDER_MAX,
  GROWTH_WANDER_MIN,
} from "@/lib/effectGrowth";
import type { ParamDeclaration } from "./contract";

/**
 * How long one grown effect stands, in seconds: from the moment it begins to arrive to the moment
 * it begins to leave. The floor is a few seconds, because an effect that arrives and goes inside
 * one is a graph edit rather than a sound; the ceiling is an hour, because a run of six at an hour
 * apiece is a set that turns over across a whole session and there is nothing longer to say (0206).
 */
const STAYS_MIN = 4;
const STAYS_MAX = 60 * 60;

/**
 * The shortest a turnover may be, however short a life is asked for over however many places. A
 * whole effect arriving and leaving is not a sixteenth-note gesture: below about this the run is a
 * burst of graph edits nobody can hear as anything, and — because the population has to be laid
 * ahead across the pump's own horizon (0204) — every one of them is a reverb built and thrown away
 * inside one pump.
 */
export const TICK_MIN_SECS = 1;

/**
 * How long an arrival or a departure takes. The floor is short enough to be a swell and not a
 * switch; the ceiling is long enough that an effect can take most of a phrase to appear.
 */
export const FADE_MIN = 0.05;
const FADE_MAX = 16;

/**
 * How long a hand may hold the run still, in seconds. Nought is not waiting at all; the top of the
 * range is not a very long wait but a wait with no end — the lock, held until the knob comes back
 * down (0215). Ten minutes, because a hold measured in seconds is a hand keeping what it has for
 * one passage, and anything longer than a passage is what the lock is for.
 */
const WAIT_MIN = 0;
export const WAIT_MAX = 600;

export const params = [
  {
    id: "auto.seed",
    label: "Seed",
    min: 0,
    max: 0xff_ff_ff_ff,
    default: 1,
    precision: 0,
    step: 1,
    // The 32 bits mulberry32 has state for, exactly as a player's seed is (0089). It is not a
    // lane: a seed is which performance this is, and ramping between two of them is not a sound.
    rebuild: true,
    // And never the declared default: a fresh automator is a run nobody has heard, drawn from the
    // id the gesture that added it minted (0076, 0089).
    seeded: true,
  },
  {
    // The run's floor and its ceiling, rather than the one number a population used to be: what
    // makes a run feel alive is that it is not always the same size (0210).
    id: "auto.least",
    label: "Least",
    min: GROWTH_COUNT_MIN,
    max: GROWTH_COUNT_MAX,
    default: 2,
    precision: 0,
    step: 1,
    rebuild: true,
  },
  {
    id: "auto.most",
    label: "Most",
    min: GROWTH_COUNT_MIN,
    max: GROWTH_COUNT_MAX,
    default: 3,
    precision: 0,
    step: 1,
    rebuild: true,
  },
  {
    // Beside them, because it is what makes the two ends a range at all: the odds a tick lays the
    // place whose turn it is. All the way up — the default — every place is filled and the run
    // stands at Most forever, which is the only size a run had before this dial.
    id: "auto.odds",
    label: "Odds",
    min: GROWTH_ODDS_MIN,
    max: GROWTH_ODDS_MAX,
    default: 1,
    precision: 2,
    rebuild: true,
  },
  {
    // The one knob that says when: how long each grown effect stands, said as the time it stands
    // and not as a rate to divide in your head. What turns over is derived from it — a place is
    // let go and another laid every `stays / most` (0206).
    id: "auto.stays",
    label: "Stays",
    min: STAYS_MIN,
    max: STAYS_MAX,
    default: 60,
    precision: 0,
    curve: "log",
  },
  {
    // Beside Stays, and the other half of the same question: Stays is how long a place lasts once
    // it is laid, Wait is how long nothing is laid at all. Not `rebuild` — a hold does not reshape
    // the run, it stops the clock the run is laid against, and a redraw would be the one thing a
    // hand asking to keep what it has did not ask for (0215).
    id: "auto.wait",
    label: "Wait",
    min: WAIT_MIN,
    max: WAIT_MAX,
    default: 0,
    precision: 0,
  },
  {
    id: "auto.fade",
    label: "Fade",
    min: FADE_MIN,
    max: FADE_MAX,
    default: 2,
    precision: 2,
    curve: "log",
  },
  {
    id: "auto.drift",
    label: "Stray",
    min: GROWTH_DRIFT_MIN,
    max: GROWTH_DRIFT_MAX,
    default: 0.4,
    precision: 2,
    rebuild: true,
  },
  {
    // Beside Stray, and the other half of the same question: Stray is how far from its plugin's
    // default a value is drawn, Wander is how alive it is once drawn (0208).
    id: "auto.wander",
    label: "Wander",
    min: GROWTH_WANDER_MIN,
    max: GROWTH_WANDER_MAX,
    default: 0.2,
    precision: 2,
    rebuild: true,
  },
  // One weight per poolable entry. Seven literal declarations rather than a list generated off the
  // registry, because this file may not import the registry it is about to be a member of — see
  // the module-order note on `createAutomator` (0203, 0204).
  { id: "auto.filter", label: "Filter", min: 0, max: 1, default: 1, precision: 2, rebuild: true },
  { id: "auto.delay", label: "Delay", min: 0, max: 1, default: 1, precision: 2, rebuild: true },
  { id: "auto.eq", label: "EQ", min: 0, max: 1, default: 1, precision: 2, rebuild: true },
  {
    id: "auto.compressor",
    label: "Comp",
    min: 0,
    max: 1,
    default: 0.4,
    precision: 2,
    rebuild: true,
  },
  { id: "auto.reverb", label: "Reverb", min: 0, max: 1, default: 1, precision: 2, rebuild: true },
  { id: "auto.tape", label: "Tape", min: 0, max: 1, default: 1, precision: 2, rebuild: true },
  { id: "auto.pop", label: "Pop", min: 0, max: 1, default: 1, precision: 2, rebuild: true },
] as const satisfies readonly ParamDeclaration[];

export type AutoParamId = (typeof params)[number]["id"];

/** The weight knob that decides how often each entry is drawn, by that entry's own id. */
export const WEIGHT_OF: Record<string, AutoParamId> = {
  filter: "auto.filter",
  delay: "auto.delay",
  eq: "auto.eq",
  compressor: "auto.compressor",
  reverb: "auto.reverb",
  tape: "auto.tape",
  pop: "auto.pop",
};

/**
 * Every knob of this entry that reaches no dimension of the drift picture, beside the reason it
 * reaches none — the other half of `driftFrom`, and the list the registry throws at load for a
 * parameter that is in neither (0148).
 */
export const AUTO_UNREACHED: readonly { param: AutoParamId; because: string }[] = [
  {
    param: "auto.least",
    because:
      "the picture reads how deep a swarm is off the most a run may hold, and a floor is " +
      "that same swarm on the ticks the odds thinned",
  },
  {
    param: "auto.odds",
    because:
      "how often a place is filled is the same run happening less often, and a row that " +
      "read it would say the swarm had changed shape when only its size had",
  },
  {
    param: "auto.seed",
    because: "a seed says which performance this is, never what it is like",
  },
  {
    // 0148's own rule, said of a hold: a wait is *when* the next place is laid and a row's shape
    // is *what* was laid, so a picture that read it would report a still run as a changed one.
    param: "auto.wait",
    because: "a wait is when the run lays its next place, and a row's shape is what it laid",
  },
  { param: "auto.fade", because: "a fade is how long an arrival takes, which is not a shape" },
  {
    param: "auto.wander",
    because:
      "the picture already reads how finely a run is drawn off Stray, and how often a " +
      "drawn knob is redrawn afterwards is the same shape happening more times",
  },
  { param: "auto.filter", because: "a weight is one voice in a pool, and no row is a pool" },
  { param: "auto.delay", because: "a weight is one voice in a pool, and no row is a pool" },
  { param: "auto.eq", because: "a weight is one voice in a pool, and no row is a pool" },
  {
    param: "auto.compressor",
    because: "a weight is one voice in a pool, and no row is a pool",
  },
  { param: "auto.reverb", because: "a weight is one voice in a pool, and no row is a pool" },
  { param: "auto.tape", because: "a weight is one voice in a pool, and no row is a pool" },
  { param: "auto.pop", because: "a weight is one voice in a pool, and no row is a pool" },
];
