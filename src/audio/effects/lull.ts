/**
 * @role The lull plugin: its eight parameters and the transparent gain that is its whole graph,
 *   beside the one thing no other entry does — it asks the transport to rest, on a schedule drawn
 *   from its own seed, and the transport holds and releases the deck on the edges it asks for
 *   (0371). On a yard's rack it rests that yard; on the rack under all of them, every playing yard
 *   together.
 * @instead The draws themselves — the gap, the roll, the rest and the jump → src/lib/lull.ts,
 *   which is pure. What the transport does with an edge → src/audio/deck.ts. How the master's
 *   asks reach every yard → src/app/engine.ts.
 */
import { PauseIcon } from "@phosphor-icons/react/Pause";

import { bindParam, type ParamBinding } from "@/audio/ramp";
import {
  createLull,
  type HoldEdge,
  LULL_GAP_MAX,
  LULL_GAP_MIN,
  LULL_REST_MAX,
  LULL_REST_MIN,
  LULL_SKIP_MAX,
  type LullCursor,
  type LullGrid,
} from "@/lib/lull";
import { DRIFT_PULSE_DB } from "@/lib/moireSound";
import { mulberry32, SEED_MAX } from "@/lib/random";
import {
  defineEffect,
  type EffectInstance,
  instanceFromBindings,
  type ParamDeclaration,
} from "./contract";

/** The two clocks a lull may count on, in the order the picker names them. */
export const LULL_GRIDS = ["Free", "Beat"] as const;

/**
 * Lengths in seconds on one dial each, with a switch that rounds them onto the beat — and not a
 * mode that changes what a dial is: a parameter is declared once, so a knob cannot be seconds in
 * one mode and beats in another (docs/boundaries.md, 0373). A stutter is these same dials turned
 * down, which is why both run to a hundredth of a second and are logarithmic.
 */
const params = [
  {
    id: "lull.seed",
    label: "Seed",
    min: 0,
    max: SEED_MAX,
    default: 1,
    precision: 0,
    step: 1,
    // Which performance this is, drawn afresh per instance and never ramped: the automator's
    // seed's reasons, exactly (0076, 0312).
    rebuild: true,
    seeded: true,
  },
  /** The odds a gap ends in a rest rather than another gap. None never rests; one rests after
   * every gap. Read at each roll off the knob and never off a lane: the roll is taken ahead of the
   * rest it decides, on the pump, and a lane's value there is neither the knob's nor the rest's. */
  {
    id: "lull.chance",
    label: "Chance",
    min: 0,
    max: 1,
    default: 0.5,
    precision: 2,
  },
  /** The shortest a rest may hold the deck, in seconds. */
  {
    id: "lull.least",
    label: "Rest",
    min: LULL_REST_MIN,
    max: LULL_REST_MAX,
    default: 0.5,
    precision: 2,
    curve: "log",
    rebuild: true,
  },
  /** And the longest: a minute at the top of the dial. */
  {
    id: "lull.most",
    label: "Rest To",
    min: LULL_REST_MIN,
    max: LULL_REST_MAX,
    default: 2,
    precision: 2,
    curve: "log",
    rebuild: true,
  },
  /** The shortest the deck plays between two chances of a rest, in seconds. */
  {
    id: "lull.gapLeast",
    label: "Gap",
    min: LULL_GAP_MIN,
    max: LULL_GAP_MAX,
    default: 4,
    precision: 2,
    curve: "log",
    rebuild: true,
  },
  /** And the longest. */
  {
    id: "lull.gapMost",
    label: "Gap To",
    min: LULL_GAP_MIN,
    max: LULL_GAP_MAX,
    default: 16,
    precision: 2,
    curve: "log",
    rebuild: true,
  },
  /** How far either way a resume may land from where the rest held it, in seconds. Nought is
   * exactly where it was; each resume draws a jump inside the range. */
  {
    id: "lull.skip",
    label: "Skip",
    min: 0,
    max: LULL_SKIP_MAX,
    default: 0,
    precision: 1,
    rebuild: true,
  },
  /** Which clock the lengths are said on: the wall's, or the yard's beat and the session's own
   * ticks, so every rest lands on a division of the beat and on the clock the yards share. */
  {
    id: "lull.grid",
    label: "Grid",
    min: 0,
    max: LULL_GRIDS.length - 1,
    default: 0,
    precision: 0,
    step: 1,
    choices: LULL_GRIDS,
    rebuild: true,
  },
] as const satisfies readonly ParamDeclaration[];

type LullParamId = (typeof params)[number]["id"];

/** A range said low end first, whichever way round a hand left the two dials. */
const ordered = (one: number, two: number): readonly [number, number] =>
  one <= two ? [one, two] : [two, one];

export const lullEffect = defineEffect({
  id: "lull",
  label: "Lull",
  width: "half",
  face: "knobs",
  // There or not, and nothing to fade it by: a lull is heard in what the transport does and never
  // in what passes through it, and a chance of resting is not a level — the automator's answer,
  // for the automator's reason (0202, 0371). What a hand turns down to nothing is the Chance.
  presence: {
    none: "a lull is heard in what the transport does, and a chance of resting is not a level to fade",
  },
  icon: PauseIcon,
  drift: "gap",
  geometry: "linear",
  // The longest rest is the cycle this effect works over, so Rest To is the row's period; Chance
  // is how much of the signal it takes at all, which is the reading a presence has elsewhere. The
  // shortest rest is how finely that cycle is cut, beside its own period. The shortest gap is how
  // abruptly a rest arrives after the last — what `bend` is. Skip is how far each resume is drawn
  // from every other, which is the three channels of ink no longer one lattice (0141). And the
  // Grid is where the row is anchored: on the wall's clock or on the beat's.
  driftFrom: [
    { param: "lull.most", into: "period" },
    { param: "lull.chance", into: "depth" },
    { param: "lull.least", into: "pitch" },
    { param: "lull.gapLeast", into: "bend" },
    { param: "lull.skip", into: "disperse" },
    { param: "lull.grid", into: "centre" },
  ],
  // And the whole-field move a lull makes: the picture going dark and coming back on the deck's
  // own clock (src/lib/moireBlink.ts). How much of each cycle is dark is the Chance, the knob the
  // presence is read off; how long a cycle is, is Gap To; and where in its cycle the blink stands
  // is the Seed — which performance this is, so two lulls on one yard blink out of step.
  look: "blink",
  lookFrom: [
    { param: "lull.chance", into: "share" },
    { param: "lull.gapMost", into: "spacing" },
    { param: "lull.seed", into: "seed" },
  ],
  // Everything: where the run stands is a function of how long it has been going since it was
  // born, which no window reconstructs — the automator's answer, for the automator's reason
  // (0239). A render that holds the whole performance is the one that lays the same rests.
  settle: () => Infinity,
  params,
  // The run's whole state is one closure: the cursor, the clocks it counts on and the release it
  // may owe. A helper per branch would hand those around with one caller each (0007).
  // oxlint-disable-next-line max-lines-per-function
  build: (ctx, values): EffectInstance<LullParamId> => {
    // The audio passes through untouched: a lull is heard in what the transport does and never in
    // what reaches it (0222 amended by 0371). A gain at one is the whole graph.
    const through = ctx.createGain();
    const held: Record<LullParamId, number> = { ...values };
    // Every parameter is a number the run reads rather than a node it drives, so each binds to a
    // parked ConstantSourceNode's offset — the automator's road, so nothing here special-cases a
    // knob (0049).
    const bind = (): ParamBinding => {
      const source = ctx.createConstantSource();
      source.start();
      return bindParam(source.offset);
    };
    const bindings: Record<LullParamId, ParamBinding> = {
      "lull.seed": bind(),
      "lull.chance": bind(),
      "lull.least": bind(),
      "lull.most": bind(),
      "lull.gapLeast": bind(),
      "lull.gapMost": bind(),
      "lull.skip": bind(),
      "lull.grid": bind(),
    };
    const bound = instanceFromBindings(params, bindings, values);

    let sync: number | null = null;
    let bpm = 0;
    const onBeat = (): boolean => held["lull.grid"] >= 1;
    const grid = (): LullGrid => (onBeat() ? { bpm, sync } : null);
    // The chance is read at each roll off the knob, the way every other dial here is: the roll is
    // taken on the pump, ahead of the rest it decides, and the knob is the one value that is the
    // same on both pump cadences (0204). Not a rebuild, so a move is heard at the next roll.
    const chance = (): number => held["lull.chance"];
    const spec = () => ({
      chance,
      rest: ordered(held["lull.least"], held["lull.most"]),
      gap: ordered(held["lull.gapLeast"], held["lull.gapMost"]),
      skip: held["lull.skip"],
    });
    const draw = (): LullCursor =>
      createLull(spec(), mulberry32(held["lull.seed"]), ctx.currentTime, grid());
    let cursor = draw();
    /**
     * A clear owed to the transport: the cursor was redrawn, so every instant the old one gave
     * out — a rest laid ahead, a rest holding the deck now — is nobody's, and the new run counts
     * from here. Asked for first at the next pump, which the rebuild that redrew it arms at once.
     */
    let cleared = false;
    const drawn: HoldEdge[] = [];

    function redraw(): void {
      cleared = true;
      cursor = draw();
    }

    return {
      input: through,
      output: through,
      ...bound,
      setParam: (param, value, when) => {
        held[param] = value;
        bound.setParam(param, value, when);
      },
      // Every knob that shapes the run is declared `rebuild`, so a drag pays for the redraw once
      // at the gesture's end, and the run is re-derived from the seed rather than continued —
      // which is what keeps it a function of the seed (0090, 0204).
      endGesture: redraw,
      holds: (until, out) => {
        let n = 0;
        if (cleared) {
          out[n++] = { t: "clear" };
          cleared = false;
        }
        const count = cursor.edges(until, drawn);
        for (let i = 0; i < count; i++) {
          const edge = drawn[i];
          if (edge !== undefined) out[n++] = edge;
        }
        return n;
      },
      resetHolds: (at) => {
        // A hand's reset already dropped everything the old run laid.
        cleared = false;
        cursor.reset(at);
      },
      // The clocks a beat is counted on reach the run through the same redraw a knob does, and
      // only on the grid that reads them: off it, a tempo landing on the yard moves nothing.
      setSync: (next) => {
        sync = next;
        if (onBeat()) redraw();
      },
      setTempo: (next) => {
        bpm = next;
        if (onBeat()) redraw();
      },
      // The rest, as the compressor's meter says its reduction: the whole pulse while the deck is
      // held and nought while it plays, in the unit the row's pulse already reads (P60).
      meter: () => (cursor.resting() ? -DRIFT_PULSE_DB : 0),
      dispose: () => {
        through.disconnect();
      },
    };
  },
});
