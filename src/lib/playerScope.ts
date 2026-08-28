/**
 * @role The scope's geometry: a window of `PlayerStep`s folded into blocks on the slot grid —
 *   where each begins, how wide it is, how it is split, and which of them the clock is inside.
 *   Pure maths: no canvas, no clock, no React.
 * @instead What a painting of it is made of, in device pixels → src/ui/playerScopeCanvas.ts. The
 *   surface that keeps the window fed and asks for the paintings → src/ui/PlayerScope.tsx. How
 *   long one repeat of a landing is, which this spends rather than restates → `repeatSpans`,
 *   src/lib/player.ts. The module's one moiré row, which says how fast the pattern is going and
 *   never where it goes → src/lib/playerDrift.ts.
 */
import { landingSecs, PLAYER_FADE_SECS, repeatSpans } from "./player.ts";
import type { PlayerStep } from "./playerWalk.ts";

/**
 * How many landings the scope draws at once, counting the one sounding. Enough that a pattern's
 * shape is a shape rather than a handful of marks, and few enough that a landing is still wide
 * enough on a card-width canvas to show its own repeats split — which is the whole thing the
 * picture is for. Fixed rather than fitted to the canvas: a window that grew with the browser
 * would make the same pattern a different picture at two widths (0098).
 */
export const PLAYER_SCOPE_LANDINGS = 24;

/**
 * How many times a second the scope is drawn — its own cadence, declared here for the reason
 * `DRIFT_PAINT_HZ` is declared beside the drift (0144, src/lib/moire.ts). The picture is a
 * visualization of the walk and never the walk: it may lag, drop frames and arrive late, and
 * nothing about the instrument may wait on it. So the painter takes a *budget* on the one frame
 * loop (`paced`, src/ui/frame.ts) rather than a frame of it, and the hand, the playheads and the
 * meters go on at the loop's own rate whatever this is set to.
 *
 * Slower than the drift's, and it can be: what moves in this picture is which landing is lit and
 * how far the playhead is across it, and both of those step at a landing boundary — a few times a
 * second on a default pattern — where a moiré row slides continuously.
 */
export const PLAYER_SCOPE_PAINT_HZ = 20;

/** The same cadence as the gap between two paintings, in milliseconds — what the budget is spent in. */
export const PLAYER_SCOPE_PAINT_MS = 1000 / PLAYER_SCOPE_PAINT_HZ;

/** The ghost a landing throws, where it reads and how far into its landing it opens. */
export type ScopeSpark = {
  /** Which of `PLAYER_SLOTS` it reads — an ordinary jump from the landing's own (P123). */
  slot: number;
  /** Where it opens, as a fraction of the whole window, and how loud it is, 0…1. */
  at: number;
  level: number;
};

/** One landing, laid out across the window as fractions of it. */
export type ScopeBlock = {
  /** Which of `PLAYER_SLOTS` this landing reads. */
  slot: number;
  /** Where it begins and ends, both fractions of the whole window. */
  from: number;
  to: number;
  /**
   * Where each of its repeats ends, as fractions of the window — the split marks, and the
   * shortening across them a ratchet makes, in one list. Off `repeatSpans`, which is the one place
   * a repeat's length is computed and is what the transport ends the landing at (principle 1,
   * P118). The last entry is `to`.
   */
  splits: number[];
  /** The fraction of each repeat that sounds before the gate closes — 1 is a repeat nothing cuts. */
  gate: number;
  /** Whether it is a hole, drawn hollow, and whether it reads its slot backwards, drawn mirrored. */
  dropped: boolean;
  reversed: boolean;
  /**
   * Whether the loop moved to another bed to reach this landing, drawn as a break in the thread
   * running into it. A boolean and not the bed itself: the picture is cut on the slot grid, and a
   * bed is where that grid *is* rather than a position inside it — a row for it would be a second
   * axis on a canvas this size. What a glance needs is that the ground changed here (0183).
   */
  moved: boolean;
  /** The ghost it threw, or null where it threw none. */
  spark: ScopeSpark | null;
};

/** The window as a whole: the landings in it, and how many seconds of pattern it spans. */
export type ScopeGeometry = {
  blocks: ScopeBlock[];
  secs: number;
};

/**
 * How long one landing occupies the window, in wall seconds: the landing itself, through the one
 * name that measures one — the same sum the transport ends a landing at and the drift runs its own
 * row on (`landingSecs`, src/lib/player.ts; 0159, principle 1) — plus the wait the pattern takes
 * before the next. `rest` is in slots, which is why the caller hands the slot's own length in: the
 * lib may reach nothing above it, and a grid is the transport's (`windowOf`, src/audio/player.ts).
 */
const stepSecs = (step: PlayerStep, slotSecs: number): number =>
  landingSecs(step.burst, step.repeats, step.ratchet) + step.rest * slotSecs;

/**
 * The window of `steps` beginning at the ordinal `at`, folded into blocks on the slot grid.
 *
 * **Forward only, and that is a decision rather than a shortcut.** `rearm` re-derives the tail of
 * the pattern under whatever spec is held now, while the landings that already sounded were laid
 * down under the one before it — so a re-walk from zero would draw a past that was never played,
 * which is a picture disagreeing with the sound and is the one thing 0159 names as worse than no
 * picture at all. The window therefore begins at the landing the clock is inside, which is the
 * first block and the only one that has sounded.
 *
 * `standing` is the landing the transport is actually inside, off the peek, and it replaces the
 * first block rather than being trusted to equal it. A knob moved mid-landing re-derives the
 * *tail*: `rearm` keeps the entry already sounding and lays the ones after it down again, so the
 * caller's own walk of the spec held now agrees with the sound from the second block on and not at
 * the first. The transport is the authority on the block the playhead is running across, and it
 * hands that block over (0180).
 *
 * Pure, and called when the window moves rather than when it is painted: `at` steps once a
 * landing, so the geometry is rebuilt a few times a second and every painting between two of those
 * draws the one already held (0070, src/ui/PlayerScope.tsx).
 */
// One block per landing and one field per thing a block has to say, each laid out against the
// running total this walk is the only holder of. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function scopeGeometry(
  steps: readonly PlayerStep[],
  at: number,
  slotSecs: number,
  standing: PlayerStep | null = null,
): ScopeGeometry {
  const window =
    standing === null
      ? steps.slice(at, at + PLAYER_SCOPE_LANDINGS)
      : [standing, ...steps.slice(at + 1, at + PLAYER_SCOPE_LANDINGS)];
  const secs = window.reduce((total, step) => total + stepSecs(step, slotSecs), 0);
  // A window of nothing, and a window whose every landing is at the floor of nothing: neither can
  // be laid out, and both are the picture drawing no blocks rather than dividing by zero.
  if (secs <= 0) return { blocks: [], secs: 0 };
  const blocks: ScopeBlock[] = [];
  let began = 0;
  /** The bed the landing before this one read in, so a block can say the ground changed under it.
   *  Null before the first, which is a window opening rather than a move (0183). */
  let previous: number | null = null;
  for (const step of window) {
    const own = repeatSpans(step.burst, step.repeats, step.ratchet);
    const from = began / secs;
    const splits: number[] = [];
    let end = began;
    for (const span of own) {
      end += span;
      splits.push(end / secs);
    }
    const to = end / secs;
    blocks.push({
      slot: step.slot,
      from,
      to,
      splits,
      gate: step.gate,
      dropped: step.dropped,
      reversed: step.reversed,
      moved: previous !== null && step.bed !== previous,
      // Where the transport opens it: a fraction of the landing's own window less a seam, which is
      // the same arithmetic `armStep` writes the ghost's own fade at (0175, src/audio/player.ts).
      spark:
        step.sparked === null
          ? null
          : {
              slot: step.sparked.slot,
              at: from + (step.sparked.delay * Math.max(0, end - began - PLAYER_FADE_SECS)) / secs,
              level: step.sparked.level,
            },
    });
    began += stepSecs(step, slotSecs);
    previous = step.bed;
  }
  return { blocks, secs };
}
