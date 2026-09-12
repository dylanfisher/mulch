/**
 * @role What a lull asks of the transport, as a cursor over its own draws: a gap, a roll against
 *   the chance, and — where the roll hit — a rest the deck is held for and a jump it resumes from,
 *   each length drawn inside its own range and, on the beat, rounded onto a beat's divisions and
 *   snapped onto the session clock. Pure maths — no clock, no context, and no generator of its
 *   own: `random` is the caller's, because the order of the draws is the whole of what a seed
 *   promises (0204, 0371).
 * @instead The transport that holds and releases on these edges → src/audio/deck.ts. The one
 *   generator a seed is spent through → src/lib/random.ts.
 */
import { syncedFrom } from "./playerClock.ts";
import { PLAYER_BEAT_DIVISIONS } from "./playerBurst.ts";
import { clamp, denormalize } from "./range.ts";

/** How long a rest may hold the deck: a hair, or a minute. */
export const LULL_REST_MIN = 0.01;
export const LULL_REST_MAX = 60;
/** How long the deck plays between two chances of a rest. */
export const LULL_GAP_MIN = 0.01;
export const LULL_GAP_MAX = 120;
/** How far, either way, a resume may land from where the rest held it, in seconds. */
export const LULL_SKIP_MAX = 10;

/**
 * One edge the transport is asked for: a hold at an instant, or a release at one carrying how far
 * the playhead resumes from where it was held — signed, and nought for "where it was".
 */
export type HoldEdge = { t: "hold"; at: number } | { t: "release"; at: number; jump: number };

export type LullSpec = {
  /** Read at each roll rather than copied, so a lane on it is heard at the next chance. */
  chance: () => number;
  rest: readonly [min: number, max: number];
  gap: readonly [min: number, max: number];
  skip: number;
};

/**
 * The beat every length is rounded onto and the clock every edge is snapped onto, or null where
 * the lull runs free. A tempo of nought is a yard with no beat found: on the grid it lays nothing,
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
  /** The instant of the next edge, or null where the grid has no beat to lay one on. */
  nextAt(): number | null;
  /** Whether the deck is held between a hold handed out and its release. */
  resting(): boolean;
  /** The transport moved by hand at `at`: the gap counts again from there, on the same draws. */
  reset(at: number): void;
};

/**
 * `secs` rounded onto the beat: whole beats above one, and the beat's own divisions below it —
 * nearest in ratio, the way a burst is held to the beat (playerBurst.ts), because the dials that
 * draw these lengths are logarithmic.
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

// One closure over one cursor and the cycle it has drawn ahead: `edges` and `nextAt` read the same
// pending draw, and a helper per branch would hand that pair around with one caller each (0007).
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
  let resting = false;
  /**
   * The cycle drawn and not yet handed out: every cycle spends its four draws in one order — gap,
   * roll, rest, jump — whatever the chance said, so the stream is a function of the seed and the
   * count of cycles alone, and never of the knob's history (0134, 0204). Drawn once its turn
   * comes and kept until the horizon reaches it.
   */
  let pending: { holdAt: number; hit: boolean; releaseAt: number; jump: number } | null = null;

  const length = (fraction: number, range: readonly [number, number]): number => {
    const secs = denormalize(fraction, range[0], range[1], "log");
    if (grid === null) return secs;
    return clamp(beatLength(secs, grid.bpm), range[0], range[1]);
  };
  const snap = (when: number): number => syncedFrom(when, grid?.sync ?? null);

  function draw(): void {
    if (pending !== null) return;
    const gap = length(random(), spec.gap);
    const hit = random() < spec.chance();
    const rest = length(random(), spec.rest);
    // Spent whatever the skip says, so a skip turned up mid-run moves no draw out of turn; and
    // an exact nought with none, because a negative nought is a jump a test can tell apart.
    const swing = random() * 2 - 1;
    const jump = spec.skip === 0 ? 0 : swing * spec.skip;
    const holdAt = snap(at + gap);
    pending = { holdAt, hit, releaseAt: snap(holdAt + rest), jump };
  }

  const laying = (): boolean => grid === null || grid.bpm > 0;

  return {
    edges: (until, out) => {
      let n = 0;
      if (!laying()) return n;
      for (;;) {
        draw();
        if (pending === null) throw new Error("a lull drew no cycle");
        if (resting) {
          if (pending.releaseAt > until) break;
          out[n++] = { t: "release", at: pending.releaseAt, jump: pending.jump };
          at = pending.releaseAt;
          resting = false;
          pending = null;
          continue;
        }
        if (pending.holdAt > until) break;
        if (pending.hit) {
          out[n++] = { t: "hold", at: pending.holdAt };
          resting = true;
        } else {
          at = pending.holdAt;
          pending = null;
        }
      }
      return n;
    },
    nextAt: () => {
      if (!laying()) return null;
      draw();
      if (pending === null) throw new Error("a lull drew no cycle");
      return resting ? pending.releaseAt : pending.holdAt;
    },
    resting: () => resting,
    reset: (when) => {
      if (!Number.isFinite(when)) throw new RangeError(`a lull is reset on a clock: ${when}`);
      at = when;
      resting = false;
      pending = null;
    },
  };
}
