/**
 * @role The scope's geometry: one sheet of `PlayerStep`s folded into blocks on the slot grid —
 *   where each begins, how wide it is, how it is split, and which of them the clock is inside.
 *   Pure maths: no canvas, no clock, no React.
 * @instead What a painting of it is made of, in device pixels → src/ui/playerScopeCanvas.ts. The
 *   surface that keeps the sheet fed and asks for the paintings → src/ui/PlayerScope.tsx. How
 *   long one repeat of a landing is, which this spends rather than restates → `repeatSpans`,
 *   src/lib/player.ts. The module's one moiré row, which says how fast the pattern is going and
 *   never where it goes → src/lib/playerDrift.ts.
 */
import { landingSecs, PLAYER_FADE_SECS, repeatSpans } from "./player.ts";
import type { SongPlace } from "./playerAlbum.ts";
import type { PlayerStep } from "./playerWalk.ts";
import { PLAYER_REPEATS_MAX, PLAYER_REPEATS_MIN } from "./playerRepeats.ts";
import { PLAYER_DISTANCE_MAX, PLAYER_DISTANCE_MIN } from "./playerSlots.ts";

/**
 * How many landings one **sheet** of the scope is. Enough that a pattern's shape is a shape rather
 * than a handful of marks, and few enough that a landing is still wide enough on a card-width
 * canvas to show its own repeats split — which is the whole thing the picture is for. Fixed rather
 * than fitted to the canvas: a window that grew with the browser would make the same pattern a
 * different picture at two widths (0098).
 *
 * The pass is cut into sheets of this many landings at fixed ordinals, so a sheet holds still
 * while the clock crosses it and turns over whole (0187).
 */
export const PLAYER_SCOPE_LANDINGS = 24;

/** Which sheet the landing `at` is on, as the ordinal that sheet begins at. */
export const scopeSheet = (at: number): number => at - (at % PLAYER_SCOPE_LANDINGS);

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
  /** Where it opens, as a fraction of the whole sheet, and how loud it is, 0…1. */
  at: number;
  level: number;
};

/** One landing, laid out across the sheet as fractions of it. */
export type ScopeBlock = {
  /** Which of `PLAYER_SLOTS` this landing reads. */
  slot: number;
  /** Where it begins and ends, both fractions of the whole sheet. */
  from: number;
  to: number;
  /**
   * Where each of its repeats ends, as fractions of the sheet — the split marks, and the
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
   * Whether the ground moved under this landing, drawn as a break in the thread running into it.
   * A boolean and not the offset itself: the picture is cut on the slot grid, and the ground is
   * where that grid *is* rather than a position inside it — a row for it would be a second axis on
   * a canvas this size. What a glance needs is that the ground changed here (0183).
   *
   * True for a crawl of one sixteenth as readily as for a whole bed (0185), and deliberately: the
   * break says the window the slots are cut from is not the one before it, and a window overlapping
   * its predecessor by fifteen sixteenths is still a different window. How *far* it moved is the
   * thing this row does not carry and P140 is about to give the picture an axis for.
   */
  moved: boolean;
  /**
   * Where the wait after this landing begins and ends, both fractions of the sheet, or null where
   * the pattern does not rest here. Off the one sum the sheet is already laid out against and never
   * a second one (principle 1): the wait begins at `to` and ends at `stepSecs`' own end, which is
   * exactly where the next landing starts.
   *
   * Said rather than left as the gap it already is, because a gap is not readable: two landings
   * that follow each other immediately have a seam between them that looks like a short wait, so a
   * hand cannot see a wait at all until the picture draws one (P156).
   */
  wait: { from: number; to: number } | null;
  /** Which tier's round this landing is the last jump of, or null where the run carries straight
   *  on. Off the `place` the step carries, which is the one thing that advances the tiers (0221). */
  edge: ScopeEdge;
  /** The ghost it threw, or null where it threw none. */
  spark: ScopeSpark | null;
};

/**
 * Which boundary stands after a landing, deepest tier first: an album's round ending is a song's
 * ending is a part's, so one landing wears the tallest of the three and never a list of them.
 */
export type ScopeEdge = "part" | "song" | "album" | null;

/** Which of the three ends after the jump this place is on. Nought is the last jump of the thing it
 *  counts, and each count already includes the tier under it, so this reads down from the top. */
const edgeOf = (place: SongPlace | null): ScopeEdge => {
  if (place === null) return null;
  if (place.albumLeft === 0) return "album";
  if (place.songLeft === 0) return "song";
  return place.partLeft === 0 ? "part" : null;
};

/** The sheet as a whole: the landings on it, how many seconds of pattern it spans, and which of
 *  its blocks the clock is inside — the one drawn at full ink, and the one the playhead is
 *  crossing (0187). */
export type ScopeGeometry = {
  blocks: ScopeBlock[];
  secs: number;
  at: number;
};

/**
 * How long one landing occupies the sheet, in wall seconds: the landing itself, through the one
 * name that measures one — the same sum the transport ends a landing at and the drift runs its own
 * row on (`landingSecs`, src/lib/player.ts; 0159, principle 1) — plus the wait the pattern takes
 * before the next. `rest` is in slots, which is why the caller hands the slot's own length in: the
 * lib may reach nothing above it, and a grid is the transport's (`windowOf`, src/audio/player.ts).
 *
 * Exported for the arrangement's own countdown, which is this length times the jumps a row has
 * still to come: how long a landing occupies is one spelling whether it is being laid out or
 * counted down (principle 1, src/ui/PlayerSong.tsx).
 *
 * Four numbers rather than a step, because a countdown is priced off the *dials* and a step is
 * what those dials drew: `burst` strays, `rest` is rolled or placed per jump, and a row costing
 * every jump still to come at the last one drawn would bounce by a factor at every landing without
 * a hand touching anything. A `PlayerStep` is one of these and so is a `PlayerVoice`.
 */
export type StepSpan = Pick<PlayerStep, "burst" | "repeats" | "ratchet" | "rest">;
export const stepSecs = (step: StepSpan, slotSecs: number): number =>
  landingSecs(step.burst, step.repeats, step.ratchet) + step.rest * slotSecs;

/**
 * One sheet: the `steps` of it folded into blocks on the slot grid, with `at` saying which of them
 * the clock is inside.
 *
 * **A sheet, and not a window that follows the clock.** The landings are laid out from the sheet's
 * own first one to its last, so nothing in the picture moves while the clock crosses it — the
 * playhead runs left to right and the sheet turns over whole at the end (0187). What the caller
 * hands in is therefore a sheet's worth of steps and the *index* into it, not an ordinal to slice
 * from.
 *
 * The landings before `at` are the ones that sounded, and they are the caller's to keep: a re-walk
 * of them under a spec that has since moved would draw a past nobody heard, which is a picture
 * disagreeing with the sound and is the one thing 0159 names as worse than no picture at all
 * (0180, `useScopeWindow` in src/ui/PlayerScope.tsx).
 *
 * `standing` is the landing the transport is actually inside, off the peek, and it replaces the
 * block at `at` rather than being trusted to equal it. A knob moved mid-landing re-derives the
 * *tail*: `rearm` keeps the entry already sounding and lays the ones after it down again, so the
 * caller's own walk of the spec held now agrees with the sound from the block after it on and not
 * at it. The transport is the authority on the block the playhead is running across, and it hands
 * that block over (0180).
 *
 * Pure, and called when the sheet moves rather than when it is painted: `at` steps once a landing,
 * so the geometry is rebuilt a few times a second and every painting between two of those draws
 * the one already held (0070, src/ui/PlayerScope.tsx).
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
  const sheet = steps.slice(0, PLAYER_SCOPE_LANDINGS);
  if (standing !== null && at < sheet.length) sheet[at] = standing;
  const secs = sheet.reduce((total, step) => total + stepSecs(step, slotSecs), 0);
  // A sheet of nothing, and a sheet whose every landing is at the floor of nothing: neither can be
  // laid out, and both are the picture drawing no blocks rather than dividing by zero.
  if (secs <= 0) return { blocks: [], secs: 0, at };
  const blocks: ScopeBlock[] = [];
  let began = 0;
  /** The ground the landing before this one read on, so a block can say it changed underneath.
   *  Null before the first, which is a sheet opening rather than a move (0183). */
  let previous: number | null = null;
  for (const step of sheet) {
    const whole = stepSecs(step, slotSecs);
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
      // The wait is the rest of the step's own span, after the landing has finished sounding: both
      // its ends are the layout's own numbers — `to` and `began + whole` — and never
      // `rest * slotSecs` again, so the mark cannot disagree with what it is drawn on.
      //
      // *Whether* there is one is asked of `rest` rather than of those two numbers, because they
      // are the same sum folded in two orders — `landingSecs` from nought and `end` from `began` —
      // and float addition is not associative: about one non-resting landing in ten lands an ulp
      // apart, which as a comparison is a wait of 4e-16 seconds drawn a whole hairline wide.
      wait: step.rest <= 0 ? null : { from: to, to: (began + whole) / secs },
      edge: edgeOf(step.place),
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
    began += whole;
    previous = step.bed;
  }
  return { blocks, secs, at };
}

/**
 * The two numbers a drag across the picture writes: how far a jump travels, and how many bursts
 * one landing is cut into. A hand asking "wander further" or "make it busier" is asking a question
 * the picture already answers in shape — a wider staircase, a taller stack of blocks — so the
 * gesture that changes it is a drag over the shape itself rather than two dials found by name
 * (0197). The same road the ground took: `player.bed` is turned by its dial and dragged on its own
 * picture, and both send the one field (0191).
 *
 * Across for the distance and up for the count, because that is the way the picture is already
 * read: the sheet runs left to right in jumps, and a landing stacks upward from the line.
 *
 * Both are counted knobs, so both land on whole numbers here rather than at the caller — the same
 * rounding `PlayerDial` does before it patches, for the same reason: `assertPlayer` refuses a
 * fractional one loudly (src/lib/playerKnobs.ts, `isWholeKnob`).
 */
export const scopeAim = (across: number, up: number): { distance: number; repeats: number } => ({
  distance: aimed(across, PLAYER_DISTANCE_MIN, PLAYER_DISTANCE_MAX),
  repeats: aimed(up, PLAYER_REPEATS_MIN, PLAYER_REPEATS_MAX),
});

/** One fraction of the picture as one whole number of a knob's own range, clamped to it. */
const aimed = (fraction: number, min: number, max: number): number =>
  Math.round(min + (max - min) * Math.min(1, Math.max(0, fraction)));

/**
 * One point on the picture, 0…1 each: how far across it is, and how far up from the line the sheet
 * is drawn on. What the crosshair is drawn at and what a drag is read as — the two ends of one
 * mapping, so the painter takes the same shape the gesture produces.
 */
export type ScopeAim = { across: number; up: number };

/**
 * Where those two numbers stand on the picture, 0…1 each: `scopeAim` read the other way. The one
 * inverse rather than a second reading of the ranges, so the crosshair a hand grabs is drawn at
 * exactly the point a press there would write — a marker a fraction off its own gesture is worse
 * than no marker, because it says the mapping is something other than what it is (principle 1,
 * 0198).
 *
 * `up` is measured from the bottom, the way `scopeAim` takes it: a landing stacks upward from the
 * line the sheet is drawn on, so the painter is the one that flips it into a y.
 *
 * Clamped, because a spec is not obliged to sit inside these ranges for this to have an answer:
 * `PLAYER_DISTANCE_MAX` is the distance a *drag* may ask for and a dial may be turned past it, and
 * a marker off the edge of the picture is one a hand cannot grab.
 */
export const scopeMark = (distance: number, repeats: number): ScopeAim => ({
  across: marked(distance, PLAYER_DISTANCE_MIN, PLAYER_DISTANCE_MAX),
  up: marked(repeats, PLAYER_REPEATS_MIN, PLAYER_REPEATS_MAX),
});

/** One whole number of a knob's own range as a fraction of the picture, clamped to it. */
const marked = (value: number, min: number, max: number): number =>
  max === min ? 0 : Math.min(1, Math.max(0, (value - min) / (max - min)));
