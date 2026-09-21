/**
 * @role The crawl a ground walks: where an offset stands at its `tick`th move, grown as far as it
 *   has been asked for and drawn from one seed, in the loop's own sixteenths. The one walker both
 *   grounds on the instrument spend — the session's shared ground and a yard's own, which crawls
 *   its loop while the mulcher stands off over it (0277, 0313, 0395). Pure maths: no clock, no
 *   context, nothing durable.
 * @instead The three words one move is said in, and the amounts they become →
 *   src/lib/playerBed.ts (`bedMove`). The draw itself, shared with a jump → `leanStep`,
 *   src/lib/playerDraw.ts. The shared ground's own durable shape and its clock →
 *   src/lib/sessionGround.ts. The same move taken inside a walking pattern, on the walk's own
 *   generator rather than on a crawl of its own → src/lib/playerWalk.ts, which draws it in the
 *   stream every other field is drawn from and so may not read this.
 */
import { leanStep, type Lean } from "./playerDraw.ts";
import { mulberry32 } from "./random.ts";

/**
 * What one crawl is: the seed it is drawn from, the offset it opens at and comes home to, and the
 * three amounts one move is shaped by. Read off whatever holds them — a `SessionGround`, or a
 * yard's own spec — so a reach means one distance on the instrument and not two (principle 1).
 */
export type Crawl = {
  seed: number;
  /** Where it opens, and where a move that stays put brings it back to, in sixteenths. */
  home: number;
  lean: Lean;
};

/**
 * The crawl one ground has walked, grown as far as it has been asked for. Keyed on whichever
 * object the caller's words live on — the store replaces that object on every edit, so a moved
 * word is a new crawl and never a cached one, and the old one is collected with the object nobody
 * holds.
 *
 * A cache and not a second author: `crawlBedAt` is a pure function of `(crawl, tick)` and this
 * only spares it replaying every tick since zero on every step a transport arms. The generator is
 * held beside the list because it *is* the position in the stream — a walk grown to tick 40 has
 * spent exactly the draws ticks 1…40 spend, which is what makes growing it later the same walk as
 * having asked for it at once (0089).
 */
const crawls = new WeakMap<object, { beds: number[]; random: () => number }>();

/**
 * Where this crawl stands at its `tick`th move, **in the loop's own sixteenths** — the raw offset
 * a walking pattern carries on its step, so the transport folds one onto a buffer and not two
 * (`bedGround`, src/lib/playerBed.ts).
 *
 * A tick and not an instant, because the clocks reach it differently and the crawl is the same
 * either way: the session's ground counts seconds or a leader's parts, and a yard with no pattern
 * counts its own loop coming round. That is the whole of why two readings of one ground land on
 * the same offset — they are not talking to each other, they are reading one count (0313).
 */
export function crawlBedAt(key: object, crawl: Crawl, tick: number): number {
  let held = crawls.get(key);
  if (held === undefined) {
    held = { beds: [crawl.home], random: mulberry32(crawl.seed) };
    crawls.set(key, held);
  }
  while (held.beds.length <= tick) {
    const from = held.beds.at(-1) ?? crawl.home;
    const move = leanStep(held.random, crawl.lean);
    held.beds.push(move === null ? crawl.home : from + move);
  }
  return held.beds[tick] ?? crawl.home;
}
