/**
 * @role The arithmetic all six move sketches are drawn off: the four facts a ground's own motion
 *   is — whether the loop wanders or stays, how far, which way, and whether its own boundary grows
 *   or shrinks — the three words each of the amounts is said in instead of a number, how a dragged
 *   leash, a puck on a pad or a fence round the loop is read into them, and where the next windows
 *   land once they are. Out of the pictures for the reason the ground bench's arithmetic is (0253):
 *   six drawings deriving one future six times is six chances to disagree about it, and a static
 *   render never drags.
 * @instead The fixtures it reads back → src/ui/sketch/sketchWalk.ts. The six pictures →
 *   src/ui/sketch/move/. What the fold actually holds — a distance in sixteenths, a lean and the
 *   odds of coming home → src/lib/playerBed.ts. When a move falls at all, which is the other
 *   bench's question → src/ui/sketch/sketchGround.ts.
 */
import { PLAYER_SLOTS } from "@/lib/playerSlots";
import { fixtureAt, SKETCH_GROUND, SKETCH_SOURCE_SLOTS } from "@/ui/sketch/sketchWalk";

/**
 * How far one move may carry the loop, as three words rather than sixty-four numbers. The bet the
 * whole bench makes: a hand asking for a crawl asks for "a little" or "a lot" and never for
 * twenty-three sixteenths, so three named reaches are the amount and the dial is what they replace.
 * Each is what it says in the loop's own sixteenths — a quarter of a bed, one bed, and the whole
 * file, which is the reach at which one move may land on any ground there is (0193).
 */
export const SKETCH_REACHES = ["a nudge", "a bed", "anywhere"] as const;
export type SketchReach = (typeof SKETCH_REACHES)[number];
export const SKETCH_REACH_SLOTS: Record<SketchReach, number> = {
  "a nudge": PLAYER_SLOTS / 4,
  "a bed": PLAYER_SLOTS,
  anywhere: SKETCH_SOURCE_SLOTS,
};

/**
 * Which way it goes, as three words for the three leans a hand ever sets: always back, as likely
 * either, always on. The card's Lean is a continuous −1…1 and every hand leaves it on one of these.
 */
export const SKETCH_WAYS = ["back", "either way", "on"] as const;
export type SketchWay = (typeof SKETCH_WAYS)[number];
export const SKETCH_WAY_LEAN: Record<SketchWay, -1 | 0 | 1> = {
  back: -1,
  "either way": 0,
  on: 1,
};

/**
 * What the loop's own boundary does with every move — the one fact the fold holds nowhere today.
 * A step is a quarter of a bed either way, so a loop that grows is a bed wider after four moves.
 */
export const SKETCH_BREATHS = ["shrinks", "holds", "grows"] as const;
export type SketchBreath = (typeof SKETCH_BREATHS)[number];
export const SKETCH_BREATH_STEP: Record<SketchBreath, number> = {
  shrinks: -PLAYER_SLOTS / 4,
  holds: 0,
  grows: PLAYER_SLOTS / 4,
};

/** The two words for whether the loop moves on its own at all. */
export const SKETCH_WANDERS_SAID = { wanders: "wanders", stays: "stays put" } as const;

/** The four facts, which is the whole of what the fold's five dials and three presses say. */
export type SketchMove = {
  wanders: boolean;
  reach: SketchReach;
  way: SketchWay;
  breath: SketchBreath;
};

/**
 * The move every picture on the bench opens on. Wandering, a nudge at a time, always on, and
 * growing — every one of the four set to something a picture can show rather than to the quiet
 * case, so the six open on the same visible future and not on six pictures of a loop standing
 * still. A nudge and not a bed, because the made-up file is four beds long and a loop a bed and a
 * half in that hops a bed on is against the end of it by the second move, which is a picture of
 * the file's edge and not of the move.
 */
export const SKETCH_MOVE: SketchMove = {
  wanders: true,
  reach: "a nudge",
  way: "on",
  breath: "grows",
};

/** The fixture's move for a picture that has no say over the breath: the loop keeps its size. */
export const SKETCH_MOVE_HELD: SketchMove = { ...SKETCH_MOVE, breath: "holds" };

/** The fixture's own move as a leash: its reach pulled out on its side, in sixteenths. */
export const SKETCH_LEASH_AT =
  SKETCH_REACH_SLOTS[SKETCH_MOVE.reach] * SKETCH_WAY_LEAN[SKETCH_MOVE.way];

/**
 * Where the loop is standing while the bench is looked at — the ground bench's own standing
 * ground, so the two benches light one window and a hand reading down the page sees one loop.
 */
export const SKETCH_LOOP = { at: SKETCH_GROUND.standing, span: PLAYER_SLOTS };

/** The narrowest a loop may breathe down to: a quarter of a bed, which is the step it shrinks by. */
export const SKETCH_LOOP_MIN = PLAYER_SLOTS / 4;

/** The four facts said as one clause, the way every picture writes them on itself. */
export const moveSaid = (move: SketchMove): string =>
  move.wanders
    ? `${SKETCH_WANDERS_SAID.wanders} ${move.reach} ${move.way}, and ${move.breath}`
    : `${SKETCH_WANDERS_SAID.stays}, and ${move.breath}`;

/** The fixture's own clause, which every picture opens saying. */
export const SKETCH_MOVE_SAID = moveSaid(SKETCH_MOVE);

/**
 * The sides a move that goes either way takes, in order. Written by hand rather than rolled, for
 * the reason every fixture on the bench is: a picture of "either way" that drew a different future
 * on every render would be arguing with itself.
 */
export const SKETCH_EITHER_SIDES: readonly (-1 | 1)[] = [1, -1, -1, 1];

/** Which side the Nth move takes, counting from one. */
export function sideOf(way: SketchWay, nth: number): -1 | 1 {
  const lean = SKETCH_WAY_LEAN[way];
  return lean === 0
    ? fixtureAt(SKETCH_EITHER_SIDES, (nth - 1) % SKETCH_EITHER_SIDES.length, "side")
    : lean;
}

/** One window of the loop on the file: which move ahead reaches it, counting from one, and where
 *  it opens and how wide it is, in sixteenths. */
export type SketchWindow = { nth: number; at: number; span: number };

const held = (value: number, low: number, high: number): number =>
  Math.min(Math.max(value, low), high);

/**
 * The next `count` windows the loop reads, one per move, from where it is standing. The whole of
 * what the four facts mean, so it is the one thing every picture draws: a loop that stays never
 * moves its opening, a reach carries it that far on the side the way names, a breath widens or
 * narrows it by a step, and every window is held inside the file — a reach of anywhere is the far
 * end of the file on that side, never a window off it.
 */
export function windowsAhead(move: SketchMove, count: number): SketchWindow[] {
  const ahead: SketchWindow[] = [];
  let { at, span } = SKETCH_LOOP;
  for (let nth = 1; nth <= count; nth += 1) {
    span = held(span + SKETCH_BREATH_STEP[move.breath], SKETCH_LOOP_MIN, SKETCH_SOURCE_SLOTS);
    if (move.wanders) at += sideOf(move.way, nth) * SKETCH_REACH_SLOTS[move.reach];
    at = held(at, 0, SKETCH_SOURCE_SLOTS - span);
    ahead.push({ nth, at, span });
  }
  return ahead;
}

/**
 * A length in sixteenths read as the nearest of the three reaches, splitting the gaps between them
 * where a hand would: short of ten is a nudge, short of forty is a bed, past that is anywhere.
 */
export const SKETCH_REACH_EDGES = { nudge: 10, bed: 40 };
export const reachOf = (slots: number): SketchReach =>
  slots < SKETCH_REACH_EDGES.nudge
    ? "a nudge"
    : slots < SKETCH_REACH_EDGES.bed
      ? "a bed"
      : "anywhere";

/** A leash shorter than this lies on the loop, and a loop with no leash out stays where it is. */
export const SKETCH_LEASH_SLACK = 2;

/**
 * A leash pulled `dx` sixteenths out from the loop, read as the three facts it can say: how far it
 * reaches is the reach, which side it is pulled to is the way, and a leash lying slack on the loop
 * is a loop that stays. A leash has a side, so it never says "either way" — and while it is slack
 * it says nothing about reach or way at all, so those are held from the move a hand had.
 */
export function leashOf(dx: number, had: SketchMove): SketchMove {
  if (Math.abs(dx) < SKETCH_LEASH_SLACK) return { ...had, wanders: false };
  return { ...had, wanders: true, reach: reachOf(Math.abs(dx)), way: dx < 0 ? "back" : "on" };
}

/** How high up a pad each reach stands, nought at the foot, where the loop stays. */
export const SKETCH_PAD_EDGES = { stays: 0.15, nudge: 0.45, bed: 0.8 };

/** The middle of each reach's own band of the pad — where its name is written, and where the
 *  puck stands when it opens on that reach. */
export const SKETCH_PAD_HEIGHT: Record<SketchReach, number> = {
  "a nudge": (SKETCH_PAD_EDGES.stays + SKETCH_PAD_EDGES.nudge) / 2,
  "a bed": (SKETCH_PAD_EDGES.nudge + SKETCH_PAD_EDGES.bed) / 2,
  anywhere: (SKETCH_PAD_EDGES.bed + 1) / 2,
};

/** Where on a pad's two axes the fixture's own move is: the way across and the reach up. */
export const SKETCH_PAD_AT = {
  x: SKETCH_WAY_LEAN[SKETCH_MOVE.way],
  y: SKETCH_PAD_HEIGHT[SKETCH_MOVE.reach],
};

/**
 * A puck on a pad, read as the three facts its two axes say: across is the way, with the middle
 * third going either way, and up is the reach, with the foot of the pad the loop staying put.
 * `x` is −1…1 and `y` is nought at the foot and one at the top.
 */
export function padOf(x: number, y: number, had: SketchMove): SketchMove {
  const way: SketchWay = x < -1 / 3 ? "back" : x > 1 / 3 ? "on" : "either way";
  const reach: SketchReach =
    y < SKETCH_PAD_EDGES.nudge ? "a nudge" : y < SKETCH_PAD_EDGES.bed ? "a bed" : "anywhere";
  return { ...had, wanders: y >= SKETCH_PAD_EDGES.stays, reach, way };
}

/**
 * A fence round the loop — two posts on the file, one either side of it — read as the three facts
 * the room inside it says: the loop may wander as far as the further post leaves it, it leans to
 * whichever side has twice the room of the other, and a fence hugging the loop is a loop that
 * stays. Posts are held to the file and never inside the loop.
 */
export function fenceOf(left: number, right: number, had: SketchMove): SketchMove {
  const before = held(SKETCH_LOOP.at - left, 0, SKETCH_SOURCE_SLOTS);
  const after = held(right - (SKETCH_LOOP.at + SKETCH_LOOP.span), 0, SKETCH_SOURCE_SLOTS);
  const room = Math.max(before, after);
  if (room < SKETCH_LEASH_SLACK) return { ...had, wanders: false };
  const way: SketchWay = after > before * 2 ? "on" : before > after * 2 ? "back" : "either way";
  return { ...had, wanders: true, reach: reachOf(room), way };
}

/** Where the fence's two posts stand for the fixture's own move: the reach out on the way's side
 *  and hugging the loop on the other, in sixteenths from the top of the file. */
export const SKETCH_FENCE_AT = ((): { left: number; right: number } => {
  const reach = SKETCH_REACH_SLOTS[SKETCH_MOVE.reach];
  const side = SKETCH_WAY_LEAN[SKETCH_MOVE.way];
  return {
    left: held(SKETCH_LOOP.at - (side <= 0 ? reach : 0), 0, SKETCH_SOURCE_SLOTS),
    right: held(
      SKETCH_LOOP.at + SKETCH_LOOP.span + (side >= 0 ? reach : 0),
      0,
      SKETCH_SOURCE_SLOTS,
    ),
  };
})();

/** The word after this one in a wheel of words, coming round to the first after the last — what
 *  one press on a word in a sentence does. */
export function nextOf<T>(wheel: readonly T[], current: T): T {
  const index = wheel.indexOf(current);
  if (index === -1) throw new Error(`"${String(current)}" is not on the wheel.`);
  return fixtureAt(wheel, (index + 1) % wheel.length, "word");
}
