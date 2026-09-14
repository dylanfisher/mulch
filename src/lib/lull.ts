/**
 * @role What a lull asks of the transport, as a cursor over its own draws: one roll against the
 *   chance at every check — a check every so many seconds of playing — and, where a roll hit, a
 *   hold for exactly one rest and the release that ends it, from which the checks count again. On
 *   the beat both lengths are rounded onto a beat's divisions and every edge snapped onto the
 *   session clock. Every term is asked at the instant it is spent — the chance at the check, the
 *   rest at the hold, the check's length at the edge it counts from — so a lane on any of them is
 *   heard where it stands and never where the pump was (0378). Pure maths — no clock, no context,
 *   and no generator of its own: `random` is the caller's, because the order of the draws is the
 *   whole of what a seed promises (0204, 0371).
 * @instead The transport that holds and releases on these edges → src/audio/deck.ts. The one
 *   generator a seed is spent through → src/lib/random.ts.
 */
import { syncedFrom } from "./playerClock.ts";
import { PLAYER_BEAT_DIVISIONS } from "./playerBurst.ts";
import { clamp } from "./range.ts";

/** How long a rest may hold the deck, and how long the deck plays between two checks: a hair, or
 * a minute. */
export const LULL_LENGTH_MIN = 0.01;
export const LULL_LENGTH_MAX = 60;

/**
 * One edge the transport is asked for: a hold at an instant, or the release at the one that ends
 * it, resuming where the rest held the playhead. Or a clear: every rest the asker had laid is
 * dropped, because it was redrawn and the instants it gave out are no longer its own — the
 * transport restarts in place where a stop already stands.
 */
export type HoldEdge = { t: "hold"; at: number } | { t: "release"; at: number } | { t: "clear" };

/**
 * Each term as what it is worth at an instant, and never a number copied once: the cursor lays
 * edges up to a horizon ahead, and a value read off the knob now is neither the knob's nor the
 * lane's where the edge falls (0204, 0378).
 */
export type LullSpec = {
  /** The odds a check ends in a rest, at the check. */
  chance: (at: number) => number;
  /** How long a rest holds the deck, in seconds, at the hold. */
  rest: (at: number) => number;
  /** How long the deck plays between two checks, in seconds, at the edge the check counts from. */
  check: (at: number) => number;
};

/**
 * The beat both lengths are rounded onto and the clock every edge is snapped onto, or null where the
 * lull runs free. A tempo of nought is a yard with no beat found: on the grid it lays nothing,
 * because a beat nobody measured is not one to invent (principle 5).
 */
export type LullGrid = { bpm: number; sync: number | null } | null;

export type LullCursor = {
  /**
   * Every edge whose instant falls at or before `until` and has not been handed out, written into
   * `out` from index 0; answers how many. Refills and never clears (0070). A function of `until`
   * alone and never of when it was asked, which is what lets a render's pump and the live one
   * agree (0204).
   */
  edges(until: number, out: HoldEdge[]): number;
  /** The instant of the next check, or null where the grid has no beat to lay one on. */
  nextAt(): number | null;
  /** Whether the deck is held between a hold handed out and its release. */
  resting(): boolean;
  /** The instant the last edge handed out stands at — how far the draws have been spent. */
  spent(): number;
  /** The transport moved by hand at `at`: the checks count again from there, on the same draws. */
  reset(at: number): void;
};

/**
 * `secs` rounded onto the beat: whole beats above one, and the beat's own divisions below it —
 * nearest in ratio, the way a burst is held to the beat (playerBurst.ts), because the dial that
 * says the length is logarithmic.
 */
export function beatLength(secs: number, bpm: number): number {
  if (!(bpm > 0)) throw new RangeError(`a beat needs a tempo: ${bpm}bpm`);
  const beat = 60 / bpm;
  if (secs >= beat) return beat * Math.max(1, Math.round(secs / beat));
  let best = beat;
  let nearest = Infinity;
  for (const division of PLAYER_BEAT_DIVISIONS) {
    const away = Math.abs(Math.log((beat * division) / secs));
    if (away >= nearest) continue;
    nearest = away;
    best = beat * division;
  }
  return best;
}

// One closure over one cursor and the rest it has laid ahead: `edges` and `nextAt` read the same
// standing release, and a helper per branch would hand that around with one caller each (0007).
// oxlint-disable-next-line max-lines-per-function
export function createLull(
  spec: LullSpec,
  random: () => number,
  born: number,
  grid: LullGrid,
): LullCursor {
  // A cursor born nowhere lays every edge nowhere, and `edges` below would walk that forever:
  // refused here, where the number came from, rather than found as a hang (principle 5).
  if (!Number.isFinite(born)) throw new RangeError(`a lull is born on a clock: ${born}`);
  /** Where the cursor stands: the last edge handed out, or where a reset put it. */
  let at = born;
  /** The instant the standing rest is let go at, or null while the deck plays. */
  let releaseAt: number | null = null;

  // A length that is none would lay every edge on the one it counts from, and `edges` below
  // would walk that forever: refused where the number came from (principle 5).
  const length = (secs: number): number => {
    if (!(secs > 0)) throw new RangeError(`a lull's lengths are seconds: ${secs}`);
    if (grid === null) return secs;
    return clamp(beatLength(secs, grid.bpm), LULL_LENGTH_MIN, LULL_LENGTH_MAX);
  };
  const snap = (when: number): number => syncedFrom(when, grid?.sync ?? null);
  /** The next edge: the rest's own end while it stands, and otherwise the next check. */
  const next = (): number => releaseAt ?? snap(at + length(spec.check(at)));
  const laying = (): boolean => grid === null || grid.bpm > 0;

  return {
    edges: (until, out) => {
      let n = 0;
      if (!laying()) return n;
      for (;;) {
        const edge = next();
        if (edge > until) break;
        if (releaseAt !== null) {
          // A rest is exactly one rest long, and the checks count again from its end: the deck
          // plays a check's length before the chance is asked again, so the top of the Chance
          // dial is a deck resting every check and never one held for good.
          out[n++] = { t: "release", at: edge };
          releaseAt = null;
        } else if (random() < spec.chance(edge)) {
          out[n++] = { t: "hold", at: edge };
          releaseAt = snap(edge + length(spec.rest(edge)));
        }
        at = edge;
      }
      return n;
    },
    nextAt: () => (laying() ? next() : null),
    resting: () => releaseAt !== null,
    spent: () => at,
    reset: (when) => {
      if (!Number.isFinite(when)) throw new RangeError(`a lull is reset on a clock: ${when}`);
      at = when;
      releaseAt = null;
    },
  };
}
