/**
 * @role What one jump of a pattern is shaped by, beyond how far it may go: which way the walk
 *   leans, how often it takes the whole distance rather than a drawn one, and how often it comes
 *   home to the top of the loop instead. The three amounts behind the Distance dial's own framed
 *   plus (0124), declared here for the reason the figure's three are declared beside the figure —
 *   the spec in src/lib/player.ts is this and the rest of the pattern's amounts, so each is said
 *   once (principle 1).
 * @instead How far a jump may travel, which is a fact about the grid and so is declared with it →
 *   src/lib/playerSlots.ts (`PLAYER_DISTANCE_MIN`, `PLAYER_DISTANCE_MAX`, `PLAYER_SLOTS`). The draw
 *   these four shape, which spends the walk's own generator and so cannot live here → `travelFrom`
 *   in src/lib/playerWalk.ts; the odds it comes to are `travelReach` below. The dial each is turned
 *   on → src/lib/playerKnobs.ts.
 */
import { PLAYER_SLOTS } from "./playerSlots.ts";

/**
 * Which way the walk leans, −1…1. Zero is as likely to go back as on, which is the wandering walk
 * this module did before it could lean; one only ever moves on through the loop, wrapping at the
 * end, and minus one only ever moves back.
 *
 * An amount rather than a choice between two named walks, and it replaced that choice rather than
 * standing beside it: a bias of +1 *is* "forward", so a spec holding both would be one instruction
 * arriving from two fields (0162, principle 1).
 */
export const PLAYER_BIAS_MIN = -1;
export const PLAYER_BIAS_MAX = 1;

/**
 * The odds one jump travels the whole distance rather than a number drawn inside it, 0…1. Zero
 * draws every jump, which is the walk this module was before it could stride. One takes the
 * distance every time, so the walk turns by a fixed number of slots at every jump — a rotation of
 * the grid, and at a lean of ±1 the cheapest rhythm the module could not otherwise say.
 *
 * Rolled only where it is above zero, the way the vary and the rest are, so a pattern that never
 * strides lays down the stream it laid before striding existed (0134, P87).
 */
export const PLAYER_STRIDE_MIN = 0;
export const PLAYER_STRIDE_MAX = 1;

/**
 * The odds one jump goes to the top of the loop instead of travelling, 0…1. Zero never comes home,
 * which is the walk this module was; one reads that one slot forever, which is a deck not jumping
 * at all. Between them is what the field is for: a pattern that keeps returning to one place and
 * leaves it again, which is a chorus said in slots rather than in parts.
 *
 * Read before the distance is drawn and short-circuiting it, the way a refused wait is zero rather
 * than a shorter one: coming home is instead of travelling and not a travel of its own (P87).
 */
export const PLAYER_HOME_MIN = 0;
export const PLAYER_HOME_MAX = 1;

/**
 * The four fields of a `PlayerSpec` one jump is shaped by, declared here because this is what a
 * jump is — the same arrangement `FigureSpec` has, and for the same reason (src/lib/playerFigure.ts).
 */
export type TravelSpec = {
  /** Slots a jump may travel, PLAYER_DISTANCE_MIN…PLAYER_DISTANCE_MAX. Whole. */
  distance: number;
  /** Which way it leans, PLAYER_BIAS_MIN…PLAYER_BIAS_MAX. Zero wanders, ±1 only ever goes one way. */
  bias: number;
  /** The odds it travels the whole distance rather than a drawn one, 0…1. */
  stride: number;
  /** The odds it comes home to the top of the loop instead of travelling, 0…1. */
  home: number;
};

/** One place a jump can land, and how often it does: how far it goes, and the odds of that. */
export type TravelLeg = {
  /**
   * Slots from where the pattern is standing — negative goes back, positive goes on, and never
   * more than half the grid either way, because the draw wraps and the shorter way round is the
   * move a listener hears (`travelFrom`, src/lib/playerWalk.ts). At the widest distance a jump of
   * the whole grid is a jump of nothing, which is this at zero.
   */
  offset: number;
  /** The odds one jump takes this leg, 0…1. Every leg and the home odds sum to one. */
  weight: number;
};

/** Where the next jump can go, as the four amounts above shape it. */
export type TravelReach = {
  /** The odds it comes home to the top of the loop instead of travelling at all. */
  home: number;
  /** And every distance it can travel otherwise, each way, nearest first. */
  legs: TravelLeg[];
};

/**
 * What the four amounts above come to, read as odds rather than as a draw: the same arithmetic
 * `travelFrom` (src/lib/playerWalk.ts) spends one random number on, spent instead over every
 * outcome at once. It is the one thing on the card that says what the pattern *might* do rather
 * than what it did, and it is the only way the four travel dials say anything before they are
 * turned — a distance is a width, a lean is a side, a stride is a spike at the far end and a home
 * is a leg of its own.
 *
 * A second declaration of the draw and not a second *author* of it: nothing schedules or sounds
 * from this, so a rounding difference here is a picture off by a hair and never a pattern off by a
 * jump. The draw itself stays where the grid is, because it needs the grid (principle 1).
 */
export function travelReach(spec: TravelSpec): TravelReach {
  // The stride takes the whole distance outright; everything else is uniform over the distances
  // inside it, which is exactly the two branches `drawFar` has.
  const travelled = 1 - spec.home;
  const drawn = (1 - spec.stride) / spec.distance;
  const back = (1 - spec.bias) / 2;
  /**
   * Keyed by where the jump lands rather than by how far it was drawn, because the draw wraps: a
   * distance may reach the whole grid, so at 16 slots a move of −9 lands where +7 lands and a move
   * of ±16 lands where the pattern already is. Two legs the ear cannot tell apart are one leg, or
   * the fan would draw a branch for a jump that goes nowhere and read it out as the likeliest
   * (0159, 0180).
   */
  const odds = new Map<number, number>();
  const add = (move: number, weight: number): void => {
    const wrapped =
      (((((move % PLAYER_SLOTS) + PLAYER_SLOTS) % PLAYER_SLOTS) + PLAYER_SLOTS / 2) %
        PLAYER_SLOTS) -
      PLAYER_SLOTS / 2;
    odds.set(wrapped, (odds.get(wrapped) ?? 0) + weight);
  };
  for (let far = 1; far <= spec.distance; far++) {
    const each = travelled * (drawn + (far === spec.distance ? spec.stride : 0));
    add(far, each * (1 - back));
    add(-far, each * back);
  }
  const legs = [...odds].map(([offset, weight]) => ({ offset, weight }));
  legs.sort((one, two) => Math.abs(one.offset) - Math.abs(two.offset) || one.offset - two.offset);
  return { home: spec.home, legs };
}
