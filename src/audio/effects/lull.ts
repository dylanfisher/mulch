/**
 * @role The lull plugin: its six parameters and the transparent gain that is its whole graph,
 *   beside the one thing no other entry does — it asks the transport to rest, on a schedule drawn
 *   from its own seed, and the transport holds and releases the deck on the edges it asks for
 *   (0371). On a yard's rack it rests that yard; on the rack under all of them, every playing yard
 *   together.
 * @instead The draws themselves — the check, the roll and the rest → src/lib/lull.ts,
 *   which is pure. What the transport does with an edge → src/audio/deck.ts. How the master's
 *   asks reach every yard → src/app/engine.ts.
 */
import { PauseIcon } from "@phosphor-icons/react/Pause";

import { bindParam, type ParamBinding } from "@/audio/ramp";
import { createLaneReader, type LaneReader } from "@/lib/laneReader";
import {
  createLull,
  type HoldEdge,
  LULL_LENGTH_MAX,
  LULL_LENGTH_MIN,
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

/**
 * Six dials: the odds, the length, how often the odds are asked, how loosely each length is held,
 * the clock and the run. The Chance is rolled every Every seconds of playing and a hit rests the
 * deck for exactly one Rest. Both lengths are seconds on one logarithmic dial each and the Grid
 * rounds them onto the beat rather than changing what a dial is (docs/boundaries.md, 0373). A
 * stutter is both turned down, and the Loose is what keeps that stutter from being a square wave:
 * every length is drawn under its own dial rather than held at it, the way a scatter's windows are
 * (0396).
 *
 * The four take lanes, and none of them rebuilds: each is read at the instant the run spends it
 * — off the knob, or off the lane where one rides — through a mirror of what the rack scheduled,
 * because the roll is taken on the pump ahead of the check it decides and a value read now is
 * neither the knob's nor the lane's there (0378). A move continues the run rather than redrawing
 * it: the rests already laid are kept, and the next check reads the new value.
 */
const params = [
  /** The odds a check ends in a rest. None never rests; one rests at the first check after every
   * rest. */
  {
    id: "lull.chance",
    label: "Chance",
    min: 0,
    max: 1,
    default: 0.25,
    precision: 2,
    automation: "linear",
  },
  /** How long a rest holds the deck, in seconds. A minute at the top of the dial. */
  {
    id: "lull.rest",
    label: "Rest",
    min: LULL_LENGTH_MIN,
    max: LULL_LENGTH_MAX,
    default: 1,
    precision: 2,
    curve: "log",
    automation: "linear",
  },
  /** How long the deck plays between two checks of the Chance, in seconds — counted again from
   * the end of every rest. */
  {
    id: "lull.every",
    label: "Every",
    min: LULL_LENGTH_MIN,
    max: LULL_LENGTH_MAX,
    default: 1,
    precision: 2,
    curve: "log",
    automation: "linear",
  },
  /** How much of each length is drawn per rest rather than held at its dial: nought is every rest
   * and every check exactly as they are set, and one is each of them anywhere from a hair up to
   * it. Scatter's Stray, on a lull's two lengths — the knob that turns a square wave of rests into
   * a performance of them (0396). */
  {
    id: "lull.loose",
    label: "Loose",
    min: 0,
    max: 1,
    default: 0,
    precision: 2,
    automation: "linear",
  },
  /** Which clock the length is said on: nought is the wall's; one is the yard's beat and the
   * session's own ticks, so every rest lands on a division of the beat and on the clock the yards
   * share. A two-step dial and not a picker, the panner's way. */
  {
    id: "lull.grid",
    label: "Grid",
    min: 0,
    max: 1,
    default: 0,
    precision: 0,
    step: 1,
    rebuild: true,
  },
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
] as const satisfies readonly ParamDeclaration[];

type LullParamId = (typeof params)[number]["id"];
/** The four the run reads at an instant, which are the four that take a lane. */
type LullLaneId = Extract<LullParamId, "lull.chance" | "lull.rest" | "lull.every" | "lull.loose">;
const isLane = (param: LullParamId): param is LullLaneId =>
  param === "lull.chance" ||
  param === "lull.rest" ||
  param === "lull.every" ||
  param === "lull.loose";

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
  // The rest is the cycle this effect works over, so Rest is the row's period; Chance is how much
  // of the signal it takes at all, which is the reading a presence has elsewhere; Every is how
  // finely that cycle is cut, beside its own period, which is what `pitch` is. The Grid is
  // where the row is anchored: on the wall's clock or on the beat's. The Loose is how far each
  // length is drawn from the one before it rather than travelling evenly into it, which is what
  // `bend` is and what the scatter's Edge claims on its own row. And the Seed is which
  // performance this is, so two lulls a seed apart are three channels of ink drawn apart by
  // different amounts (0141).
  driftFrom: [
    { param: "lull.rest", into: "period" },
    { param: "lull.chance", into: "depth" },
    { param: "lull.every", into: "pitch" },
    { param: "lull.loose", into: "bend" },
    { param: "lull.grid", into: "centre" },
    { param: "lull.seed", into: "disperse" },
  ],
  // And the whole-field move a lull makes: the picture going dark and coming back on the deck's
  // own clock (src/lib/moireBlink.ts). How much of each cycle is dark is the Chance, the knob the
  // presence is read off; how long a cycle is, is the Rest; and where in its cycle the blink
  // stands is the Seed — which performance this is, so two lulls on one yard blink out of step.
  look: "blink",
  lookFrom: [
    { param: "lull.chance", into: "share" },
    { param: "lull.rest", into: "spacing" },
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
      "lull.chance": bind(),
      "lull.rest": bind(),
      "lull.every": bind(),
      "lull.loose": bind(),
      "lull.grid": bind(),
      "lull.seed": bind(),
    };
    const bound = instanceFromBindings(params, bindings, values);
    // What each lane-taking parameter is worth at an instant: the mirror the rack tells every
    // cycle to, read where the run spends the value (src/lib/laneReader.ts, 0378).
    const readers: Record<LullLaneId, LaneReader> = {
      "lull.chance": createLaneReader(values["lull.chance"]),
      "lull.rest": createLaneReader(values["lull.rest"]),
      "lull.every": createLaneReader(values["lull.every"]),
      "lull.loose": createLaneReader(values["lull.loose"]),
    };

    let sync: number | null = null;
    let bpm = 0;
    const onBeat = (): boolean => held["lull.grid"] >= 1;
    const grid = (): LullGrid => (onBeat() ? { bpm, sync } : null);
    const spec = () => ({
      chance: (at: number) => readers["lull.chance"].at(at),
      rest: (at: number) => readers["lull.rest"].at(at),
      check: (at: number) => readers["lull.every"].at(at),
      loose: (at: number) => readers["lull.loose"].at(at),
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
    /**
     * A value arrived for an instant the draws were already spent past — a knob turned now, or
     * a lane laid from inside the horizon — so what was laid is dropped and the same run walks
     * again from `when` on the draws that follow: continued, not redrawn, which is what keeps a
     * turn of the Chance heard at the next check and not a horizon later (0378).
     */
    function rewalk(when: number): void {
      if (when >= cursor.spent()) return;
      cleared = true;
      cursor.reset(when);
    }

    return {
      input: through,
      output: through,
      ...bound,
      setParam: (param, value, when) => {
        held[param] = value;
        if (isLane(param)) {
          readers[param].set(value, when);
          rewalk(when);
        }
        bound.setParam(param, value, when);
      },
      automated: (param, lane, base, origin, now) => {
        if (!isLane(param)) throw new Error(`a lull takes no lane on ${param}`);
        readers[param].lay(lane, base, origin, now);
        rewalk(Math.max(origin, now));
      },
      // The seed and the grid are declared `rebuild`, so a drag pays for the redraw once at the
      // gesture's end, and the run is re-derived from the seed rather than continued — which is
      // what keeps it a function of the seed (0090, 0204).
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
