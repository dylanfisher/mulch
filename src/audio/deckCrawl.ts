/**
 * @role The ground under a yard the mulcher is not on: the window a plain looping deck reads, moved
 *   through the source by the three words a move is said in — whether it wanders, how far, which
 *   way — on the one clock such a yard has, its own loop coming round (0277, 0395). Holds the loop
 *   the hand set as the ground it walks from, and hands the transport the window to play next.
 * @instead The same ground under a yard that *is* jumping, where the walk takes the move in the
 *   stream every other field is drawn from → src/lib/playerWalk.ts. The walk one move takes, shared
 *   with the session's ground → src/lib/playerCrawl.ts. Folding an offset onto a real buffer →
 *   `bedGround`, src/lib/playerBed.ts. The transport that spends this → src/audio/deck.ts.
 */
import { bedMove, bedGround } from "@/lib/playerBed";
import { crawlBedAt } from "@/lib/playerCrawl";
import { PLAYER_SLOTS } from "@/lib/playerSlots";
import type { PlayerSpec } from "@/lib/player";
import type { Loop } from "@/lib/timeline";

export type DeckCrawl = {
  /**
   * The spec this yard crawls under, or null while it is walking a pattern of its own — which is
   * exactly `playerCrawling` and `playerSounding` read one after the other (src/lib/player.ts).
   * Any change of the words gives the loop back to the hand first, so a crawl is replanted on the
   * ground a hand set rather than on wherever the last one wandered to.
   */
  set: (spec: PlayerSpec | null) => void;
  /**
   * And the deck losing what it was reading: the spec goes and the loop is *not* given back, because
   * the ground it was walking belongs to a source this deck no longer holds. Its own road and not
   * `set(null)`, which hands the hand's loop back — after a load there is no such loop to hand.
   */
  forget: () => void;
  /** One round of the loop, gone by. The whole clock: see `looped` below. */
  looped: (loop: Loop | null, duration: number) => void;
};

/**
 * `move` is what the transport does with the window this answers: play it, in place where the
 * playhead survives the move and by a restart where it does not — the same two roads a loop moved
 * by a hand takes (0091, src/audio/deck.ts).
 */
// One closure over the hand's loop, the crawl's own, the round count and the tick, with `looped`
// the one place all four are read together; parting that read from the setters that keep them
// would hand the invariant between `home` and `mine` across a seam. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function createDeckCrawl(move: (to: Loop) => void): DeckCrawl {
  let spec: PlayerSpec | null = null;
  /**
   * The loop the *hand* set, which is the ground every offset is counted from. Held here and not
   * read off the deck, because the deck's own `loop` is the window being played and the crawl is
   * what moved it — a crawl counting from that would compound its own moves and never come home.
   */
  let home: Loop | null = null;
  /** The last window this crawl handed over, so a loop it did not author is known to be a hand's. */
  let mine: Loop | null = null;
  /** Rounds of the loop since the last move, and how many moves have been taken. */
  let rounds = 0;
  let tick = 0;

  /** Back to the ground the hand set, where this crawl has taken the loop anywhere else. */
  const givenBack = (): void => {
    if (mine === null || home === null) return;
    mine = null;
    move(home);
  };

  return {
    set: (next) => {
      givenBack();
      spec = next;
      rounds = 0;
      tick = 0;
    },

    forget: () => {
      spec = null;
      home = null;
      mine = null;
      rounds = 0;
      tick = 0;
    },

    /**
     * **The loop coming round is the tick.** A yard with the mulcher off takes no jumps, stands in
     * no part and comes round on no song, so the three clocks a period may be counted on
     * (`PLAYER_BED_PERS`) all count nothing — and its loop is the one boundary such a yard has and
     * the one a hand can hear go by. So the period is spent in rounds of it, whatever `bedPer`
     * says, which is 0192's own fallback read one tier along (0395).
     *
     * Rounds counted here rather than the cycle number the reporter carries: a move the playhead
     * does not survive restarts the pass and sends that number back to zero, so a crawl reading it
     * would re-take the move it had just taken and never walk past its first.
     *
     * And handed the round *after* the deck has reported it, for the other half of that fact: the
     * move may tear the pass down, and a cycle reported against a pass that is gone is one the
     * next pass reports again (src/audio/deck.ts, 0031).
     */
    looped: (loop, duration) => {
      // A yard standing on the session's ground does not author where its loop is, off or on: the
      // ground is not this yard's to move, and a second author would be two answers to one
      // question (principle 1, 0313).
      if (spec === null || loop === null || spec.bedTogether) return;
      if (loop !== mine && loop !== home) {
        // A loop this crawl neither handed over nor is already counting from is the hand's, and a
        // hand that moves the loop has planted the ground the crawl walks from: the count starts
        // again there.
        home = loop;
        mine = null;
        rounds = 0;
        tick = 0;
      }
      if (home === null || spec.bedEvery <= 0) return;
      rounds++;
      if (rounds < spec.bedEvery) return;
      rounds = 0;
      tick++;
      const span = home.out - home.in;
      const bed = crawlBedAt(
        spec,
        {
          seed: spec.seed,
          // Where it opens and where staying put brings it back to: the bed the hand put the song
          // on, counted in sixteenths exactly as the walk counts it (src/lib/playerWalk.ts).
          home: spec.bed * PLAYER_SLOTS,
          // The three words said as the amounts the draw is handed — the walk's own reading of
          // them, whole, so one reach means one distance on the instrument (`bedMove`, 0277).
          lean: bedMove(spec),
        },
        tick,
      );
      // Folded onto the ground this buffer actually holds, and inside whatever zone a hand marked
      // — the one fold every ground on the instrument lands through (0318, src/lib/playerBed.ts).
      const ground = bedGround(home.in, span, duration, bed, spec.zone);
      const to = { in: ground.in, out: ground.in + span };
      if (to.in === loop.in) return;
      mine = to;
      move(to);
    },
  };
}
