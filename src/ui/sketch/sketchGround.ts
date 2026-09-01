/**
 * @role The arithmetic all eight ground sketches are drawn off: how many whole sequences of the
 *   walk have gone by, which ground the Nth move of the crawl landed on, and where a thrown loop
 *   comes down. Out of the pictures for the reason the pile's arithmetic was (0253) — eight
 *   drawings deriving one count eight times is eight chances to disagree about it, and a static
 *   render never throws, so this is the only place the gesture can be proven.
 * @instead The fixtures it reads back → src/ui/sketch/sketchWalk.ts. The eight pictures →
 *   src/ui/sketch/ground/. The real period, and the three units the card counts it in →
 *   src/lib/playerBed.ts.
 */
import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";
import { PLAYER_SLOTS } from "@/lib/playerSlots";
import {
  fixtureAt,
  SKETCH_GROUND,
  SKETCH_GROUND_CRAWL,
  SKETCH_GROUND_GONE,
  SKETCH_SOURCE_BEDS,
  SKETCH_SOURCE_SLOTS,
  SKETCH_STANDING,
  SKETCH_WALK,
} from "@/ui/sketch/sketchWalk";

/**
 * How many landings one whole sequence of the walk is — the tick the fourth clock counts. Read off
 * the one walk every sketch on the bench draws rather than written beside it: a sequence of a
 * different length from the walk's own would be a clock nobody could check against the picture.
 */
export const SKETCH_SEQUENCE = SKETCH_WALK.length;

/**
 * The word the bench gives that tick — a lap of the walk. `bedPer` has three units and none of
 * them is this one (0192), so the eight say it in one place or they say it eight slightly
 * different ways: a picture whose legend reads "sequences" and whose caption reads "laps" is two
 * words for one clock, which is the drift this constant exists to stop.
 */
export const SKETCH_PER = "lap";

/** The period as every one of the eight writes it, so no two of them word it differently. */
export const SKETCH_EVERY_SAID = `${PLAYER_KNOB_LABELS.bedEvery} ${SKETCH_GROUND.every} ${SKETCH_PER}s`;

/** Which bed of the source a count of the loop's own sixteenths falls in. */
export const bedOf = (slots: number): number => Math.floor(slots / PLAYER_SLOTS);

/** How far into that bed the count stands — the half of the split a crawl exists to reach, since a
 *  move counted in sixteenths lands part-way into a bed and one counted in beds never can. */
export const intoBed = (slots: number): number => slots % PLAYER_SLOTS;

/** A bed in the card's own word, by its own number: what a picture drawn in whole beds writes on
 *  each one of them. */
export const bedNamed = (bed: number): string => `${PLAYER_KNOB_LABELS.bed} ${bed}`;

/** The same for a count of sixteenths, which is what a picture drawn over the file writes on the
 *  ground it lights. */
export const bedSaid = (slots: number): string => bedNamed(bedOf(slots));

/** Where the crawl started, and where a move that comes home comes home to, in the loop's own
 *  sixteenths — the song's own bed, derived once so no picture spells it out again. */
export const SKETCH_GROUND_HOME = SKETCH_GROUND.bed * PLAYER_SLOTS;

/** Where a count of sixteenths falls across the whole file, as a fraction of it. */
export const acrossFile = (slots: number): number => slots / SKETCH_SOURCE_SLOTS;

/** One move of the crawl: when it fell, where it went, and whether it went home instead. */
export type SketchGroundMove = {
  /** Which move it is, counting from one — the Nth completion the shift falls on. */
  nth: number;
  /** How many whole sequences of the walk had gone by when it fell. */
  after: number;
  /** Where the ground stood before it, in the loop's own sixteenths. */
  from: number;
  /** Where it landed, in the same. */
  to: number;
  /** Whether it came home to the song's own bed rather than travelling. */
  home: boolean;
};

/**
 * The crawl so far, read back off the landings the fixture holds rather than written beside them —
 * the rule every derived amount on this bench follows, and here it is load-bearing three times
 * over: a run of moves the period does not account for, a travel further than the Distance dial
 * allows, or a last landing that is not where the readout says the ground is standing would each
 * put a number on eight pictures that the fixture never made (principle 5).
 */
export const SKETCH_GROUND_MOVES: readonly SketchGroundMove[] =
  ((): readonly SketchGroundMove[] => {
    if (SKETCH_GROUND.every < 1) {
      throw new Error("The ground fixture moves every 0 sequences, which is never moving at all.");
    }
    const due = Math.floor(SKETCH_GROUND_GONE / SKETCH_GROUND.every);
    if (due !== SKETCH_GROUND_CRAWL.length) {
      throw new Error(
        `${SKETCH_GROUND_GONE} sequences at every ${SKETCH_GROUND.every} is ${due} moves, and the crawl holds ${SKETCH_GROUND_CRAWL.length}.`,
      );
    }
    let from = SKETCH_GROUND_HOME;
    const run = SKETCH_GROUND_CRAWL.map((to, index) => {
      if (to < 0 || to >= SKETCH_SOURCE_SLOTS) {
        throw new Error(`The crawl lands on ${to}, which is off a file of ${SKETCH_SOURCE_SLOTS}.`);
      }
      // A move that comes home is a jump to the song's own bed however far that is, so only a
      // travelled one is measured against the dial that capped it (src/lib/playerBed.ts).
      if (to !== SKETCH_GROUND_HOME && Math.abs(to - from) > SKETCH_GROUND.distance) {
        throw new Error(
          `The crawl travels ${Math.abs(to - from)} sixteenths, past a ${PLAYER_KNOB_LABELS.bedDistance} of ${SKETCH_GROUND.distance}.`,
        );
      }
      const move = {
        nth: index + 1,
        after: (index + 1) * SKETCH_GROUND.every,
        from,
        to,
        home: to === SKETCH_GROUND_HOME,
      };
      from = to;
      return move;
    });
    if (from !== SKETCH_GROUND.standing) {
      throw new Error(
        `The crawl ends on ${from} and the ground is standing on ${SKETCH_GROUND.standing}.`,
      );
    }
    return run;
  })();

/** Which ground the Nth move landed on, counting from one. Never an index nobody wrote. */
export function groundMove(nth: number): SketchGroundMove {
  return fixtureAt(SKETCH_GROUND_MOVES, nth - 1, "move");
}

/**
 * Where the fourth clock is standing: what it has counted, and what it has left to count. The one
 * amount eight pictures share, so a ring drawn two pips full and a ladder drawn three rungs down
 * cannot both be of this bench.
 */
export const SKETCH_GROUND_CLOCK = {
  /** Whole sequences of the walk gone by since the song started. */
  gone: SKETCH_GROUND_GONE,
  /** Which landing of the unfinished sequence the walk is standing on. */
  into: SKETCH_STANDING,
  /** How many sequences have gone since the last move — how full the count stands. */
  since: SKETCH_GROUND_GONE % SKETCH_GROUND.every,
  /** How many are left before the next one. */
  until: SKETCH_GROUND.every - (SKETCH_GROUND_GONE % SKETCH_GROUND.every),
};

/** What the count stands at, said the one way all eight say it: the picture that words this for
 *  itself is the first place the bench starts disagreeing with itself. */
export const SKETCH_COUNTED_SAID = `${SKETCH_GROUND_CLOCK.since} of ${SKETCH_GROUND.every}`;

/**
 * How many sequences from now until the Nth move ahead, counting the next one as one. The one
 * amount a queue, a ladder and a throw all have to agree on: three pictures each counting forward
 * from the clock in their own way is three answers to "when does the ground shift".
 */
export const aheadIn = (nth: number): number =>
  SKETCH_GROUND_CLOCK.until + (nth - 1) * SKETCH_GROUND.every;

/**
 * Which ground the crawl was standing on once `sequences` whole sequences had gone by — the last
 * move at or before it. Before the first move that is the song's own bed, which is where the crawl
 * started and not a nought standing in for an answer.
 */
export function groundAfter(sequences: number): number {
  const fallen = SKETCH_GROUND_MOVES.filter((move) => move.after <= sequences);
  const last = fallen.at(-1);
  return last === undefined ? SKETCH_GROUND_HOME : last.to;
}

/**
 * Where a loop thrown at a bed comes down, and when. A throw is the one gesture on this bench that
 * a static render cannot make, so the arithmetic is here where a test can reach it: it lands on a
 * whole bed and never part-way into one — which is the trade the picture has to say out loud,
 * because the crawl it replaces is counted in sixteenths precisely so it can land part-way in — and
 * it lands at the next sequence boundary rather than under the hand, which is the whole of what
 * the period buys. A bed off the end of the file is held to the file rather than thrown past it.
 */
export function thrownTo(bed: number): { bed: number; at: number; after: number } {
  const held = Math.min(Math.max(Math.round(bed), 0), SKETCH_SOURCE_BEDS - 1);
  return { bed: held, at: held * PLAYER_SLOTS, after: SKETCH_GROUND_CLOCK.until };
}
