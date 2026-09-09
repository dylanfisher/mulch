/**
 * @role The session's own ground: one crawl over the source that every yard with Together on reads
 *   instead of walking one of its own, so those loops wander together over the same part of the
 *   sample (0313). Its durable shape, the bounds its period stands in, the two clocks that period
 *   may be counted on — wall seconds, or the parts and rounds of the yard leading it — and where
 *   the crawl stands at a given tick. Pure maths: no clock of its own, no context, no React.
 * @instead One yard's own ground, and the three words a move is said in →
 *   src/lib/playerBed.ts, whose `bedTogether` is the switch that points a yard at this one. The
 *   shared jump clock, whose argument for wall seconds this borrows word for word →
 *   src/lib/playerClock.ts. The words this is said in → src/lib/copyGround.ts. Folding an offset
 *   onto a real buffer, which is the transport's and is the same for both grounds → `bedWrap`,
 *   src/lib/playerBed.ts.
 */
import {
  PLAYER_BED_REACH_SLOTS,
  PLAYER_BED_WAY_LEAN,
  type PlayerBedReach,
  type PlayerBedWay,
} from "./playerBed.ts";
import { leanStep } from "./playerDraw.ts";
import { mulberry32 } from "./random.ts";

/**
 * The shared ground, as the session holds it: how often it moves, and the three words one move is
 * said in. The three words are a yard's own said again rather than borrowed from some yard,
 * because a ground more than one yard reads may not be any one yard's to move (0097's refusal of
 * the follower, one field along).
 *
 * The period could not be borrowed at all: a yard counts its own in jumps, parts or rounds of its
 * song, and no two yards need share any of those. Seconds are what yards with different loops can
 * share, which is the whole argument `SYNC_MIN_SECS` already makes for the jump clock (0097) — so
 * this is the one clock on the instrument counted in neither slots nor jumps.
 *
 * **And there is no bed here to come home to.** A yard's own ground opens on the bed a hand put it
 * on, and a shared one cannot: two yards may hold two sources, so the bed one of them chose is
 * nowhere on the other. Offset zero is the one ground every yard can name, whatever it loaded — it
 * is the loop itself — so staying put comes home there. Where that home *lands* is the reading
 * yard's: since 0318 a zone that yard marked may not contain the loop, and this offset is then
 * folded onto the nearest home inside it, exactly as any other is (`bedWrap`,
 * src/lib/playerBed.ts).
 */
export type SessionGround = {
  /**
   * What its period counts: wall seconds, or the parts or whole rounds of one yard's song. The
   * choice and not an amount, for the reason a yard's own `bedPer` is one (0192) — three clocks
   * are three clocks rather than three points on one.
   */
  per: GroundPer;
  /**
   * Whose parts or rounds it counts, or **null** where `per` is seconds and there is nothing to
   * name. The one per-deck reference on the instrument, and the whole of why `per` cannot answer
   * on its own: parts belong to an arrangement, and the session has none — so a shared ground
   * counted in them counts *some yard's*, and which one is a thing a hand says (0097, 0313).
   *
   * A deck id, said as the durable text one is: this tier may not read src/state, and whether the
   * session still holds that yard is asked where the deck list is (`validateSession`,
   * src/state/session.ts). The check this file can make is the shape, and it makes it.
   *
   * A yard may lead without standing on the ground it clocks: leading is a source of boundaries
   * and nothing else. A `per` of parts or rounds naming no held yard never ticks at all, which is
   * the honest answer to a leader that was removed (principle 5).
   */
  leader: string | null;
  /**
   * How many of whatever `per` names between one move and the next: seconds where it names them,
   * `GROUND_EVERY_MIN_SECS`…`MAX_SECS`, and a whole `GROUND_ROUNDS_MIN`…`MAX` otherwise. One
   * period and not one per unit, which is 0192's rule said for this ground — a period per unit
   * would be three periods disagreeing about when the loop moves.
   */
  every: number;
  /** Whether a due move carries it on, or brings it home to the loop — read exactly as a yard's
   *  own `bedWanders` is, because it is the same roll (`bedMove`, src/lib/playerBed.ts). */
  wanders: boolean;
  /** How far one move may carry it. */
  reach: PlayerBedReach;
  /** Which way it leans. */
  way: PlayerBedWay;
};

/**
 * How often the shared ground may move, in seconds. A quarter-second at the short end, which is
 * about as fast as a loop can be moved and still be heard arriving somewhere rather than as a
 * texture; a minute at the long end, past which a performance is over before the ground has moved
 * twice.
 *
 * There is no nought here and no null, where the jump clock has one: a shared ground that never
 * moved is what every yard on the instrument already has — its own switch off — so a second way of
 * saying it would be a second answer to one question (principle 1, principle 5).
 */
export const GROUND_EVERY_MIN_SECS = 0.25;
export const GROUND_EVERY_MAX_SECS = 60;

/**
 * The three clocks its period may be counted on, and the two ends a count of parts or rounds
 * stands between. Seconds first because it is the one that answers with no yard named — the
 * reading the ground has where a hand has not said otherwise, exactly as `jump` is a yard's own
 * (0192, 0313).
 */
export const GROUND_PERS = ["second", "part", "song"] as const;
export type GroundPer = (typeof GROUND_PERS)[number];
export const GROUND_ROUNDS_MIN = 1;
export const GROUND_ROUNDS_MAX = 64;
export const GROUND_ROUNDS_DEFAULT = 4;

/** Whether this ground is clocked on a yard's arrangement rather than on the wall, which is the
 *  one case that needs a yard named and the one the transport cannot answer from the clock. */
export const groundIsLed = (ground: SessionGround): boolean => ground.per !== "second";

/**
 * What the shared ground opens at: four seconds, a nudge, either way, wandering. The walk one move
 * would take if nothing else were touched — the reading `PLAYER_DEFAULTS` gives a yard's own three
 * words, so the first press of Together is already a shared walk and not a no-op needing three
 * more presses first (0277).
 */
export const SESSION_GROUND_DEFAULTS: SessionGround = {
  per: "second",
  leader: null,
  every: 4,
  wanders: true,
  reach: "nudge",
  way: "either",
};

/**
 * The seed the shared crawl is drawn from. A constant and not a field, which is the one place this
 * ground parts from a yard's: a yard's crawl is drawn from the seed its whole pattern is, and the
 * session has no such seed to spend — so what varies a shared walk is its three words and its
 * period, exactly as they vary a yard's, and a durable field with no gesture to turn it would be a
 * field nothing writes (principle 5).
 */
const GROUND_SEED = 0x67726e64;

/** Where it opens, and where staying put brings it home to: the loop itself, which is the one
 *  ground every yard can name whatever it loaded — folded, on the reading yard, onto whatever zone
 *  that yard marked (`bedWrap`, src/lib/playerBed.ts, 0318). */
const GROUND_HOME = 0;

/**
 * The crawl one ground has walked, grown as far as it has been asked for. Keyed on the ground
 * itself, which the store replaces on every edit — so a moved word is a new crawl and never a
 * cached one, and the old one is collected with the object nobody holds.
 *
 * A cache and not a second author: `groundBedAt` is a pure function of `(ground, tick)` and this
 * only spares it replaying every tick since zero on every step a transport arms. The generator is
 * held beside the list because it *is* the position in the stream — a walk grown to tick 40 has
 * spent exactly the draws ticks 1…40 spend, which is what makes growing it later the same walk as
 * having asked for it at once (0089).
 */
const crawls = new WeakMap<SessionGround, { beds: number[]; random: () => number }>();

/** The three words as the three amounts the shared draw is handed — a yard's `bedMove` said for
 *  this ground, over the same two records, so one reach means one distance on the instrument
 *  (principle 1, src/lib/playerBed.ts). */
const groundMove = (ground: SessionGround) => ({
  distance: PLAYER_BED_REACH_SLOTS[ground.reach],
  bias: PLAYER_BED_WAY_LEAN[ground.way],
  home: ground.wanders ? 0 : 1,
  stride: 0,
});

/**
 * How many times the shared ground has moved by audio time `at`, where it is counted in seconds:
 * ticks from the context's own zero and from nothing else — never from whichever yard was played
 * first — which is what keeps it a function of the session rather than of the order its yards were
 * pressed (0097, 0068). Where it is counted on a leader's arrangement there is no arithmetic to do
 * here at all: the tick is a thing only that yard's walk knows, and the host counts it
 * (`groundLedTicks`, src/app/engine.ts).
 */
export const groundTicksBy = (ground: SessionGround, at: number): number =>
  Math.max(0, Math.floor(at / ground.every));

/**
 * Where the shared ground stands at its `tick`th move, **in the loop's own sixteenths** — the raw
 * offset a yard's own walk carries on its step, so the transport folds one onto a buffer and not
 * two (`bedStart`, src/audio/player.ts).
 *
 * A tick and not an instant, because the two clocks reach it differently and the crawl is the same
 * either way: seconds count themselves, and a led ground is ticked by the yard whose parts it
 * counts. That is the whole of why two yards land on the same offset — they are not talking to
 * each other, they are reading one count (0313).
 */
export function groundBedAt(ground: SessionGround, tick: number): number {
  let held = crawls.get(ground);
  if (held === undefined) {
    held = { beds: [GROUND_HOME], random: mulberry32(GROUND_SEED) };
    crawls.set(ground, held);
  }
  const lean = groundMove(ground);
  while (held.beds.length <= tick) {
    const from = held.beds.at(-1) ?? GROUND_HOME;
    const move = leanStep(held.random, lean);
    held.beds.push(move === null ? GROUND_HOME : from + move);
  }
  return held.beds[tick] ?? GROUND_HOME;
}
