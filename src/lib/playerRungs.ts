/**
 * @role What the read rate of a jumping pattern does: the closed ladder of ratios it walks, the
 *   four amounts saying how often it lets go, how far it strays, how far one change leaps and how
 *   far it climbs between the repeats of one landing, and the ladder one landing climbs (0118,
 *   0167). Pure maths: no clock, no PRNG and no knowledge of what a step is, because a climb is a
 *   function of a rung and a count and nothing else.
 * @instead The step these are drawn onto, and the draw that reads them → `drawRung` and
 *   `climbRungs`'s caller in src/lib/playerWalk.ts. Everything else a step is drawn from →
 *   src/lib/player.ts, which holds the spec these five fields are part of. What a landing does
 *   with the ladder it is handed → src/audio/player.ts. The dial each is turned on →
 *   src/lib/playerKnobs.ts; the door they are drawn behind → src/ui/PlayerRate.tsx.
 */
/**
 * How many jumps hold one read rate before a new one is drawn. Zero holds one rate forever — the
 * deck's own is then the only one the pattern reads at — and anything else is what makes a
 * pattern evolve rather than repeat.
 */
export const PLAYER_HOLD_MIN = 0;
export const PLAYER_HOLD_MAX = 16;

/**
 * The read rates a hold lets go of, as ratios of the deck's own — a ladder rather than a set, and
 * walked in rungs exactly as the loop is walked in slots (0118). Symmetric about unity at the
 * centre, so a rung is a signed distance from the deck's own rate and the two directions are the
 * same size.
 *
 * Still closed rather than a continuous range: what a rate may *be* is the module's decision and
 * these nine are musical intervals, while how far it strays, how far one change leaps, whether it
 * fires at all and how it climbs inside a landing are the performer's, which is what `spread`,
 * `drift`, `chance` and `climb` are.
 */
export const PLAYER_RATES = [0.25, 0.375, 0.5, 0.75, 1, 1.5, 2, 3, 4] as const;

/** Where 1 sits on that ladder: the rung a walk starts on and measures its distance from. */
export const PLAYER_RATE_UNITY = 4;

/** How many rungs either way. The bound on `spread`, and the ceiling on `drift` and `climb`. */
export const PLAYER_RATE_RUNGS = 4;

/**
 * The odds a change that is due actually happens, 0…1. One is a hold that always lets go on its
 * count, which is the whole of what the module did before it could roll; zero holds the rate it
 * is on forever whatever the count says. The roll is taken every jump the hold is due on, so a
 * failed one is not a change deferred — it is the same odds again on the next jump.
 */
export const PLAYER_CHANCE_MIN = 0;
export const PLAYER_CHANCE_MAX = 1;

/**
 * How far from the deck's own rate a drawn rate may sit, in rungs. Zero never leaves it — the
 * pattern is then jumps at one speed, which `hold: 0` also gives and by a different road. Two is
 * the ladder this module had before it had a knob for it, 0.5…2; the whole of it is an octave
 * either way.
 *
 * The bound on where a climb may reach as well as on where a draw may land, which is what makes
 * the four amounts one walk rather than two: a landing's arpeggio runs up and down the same
 * ladder its jumps let go onto, and a spread of zero silences both (0167).
 */
export const PLAYER_SPREAD_MIN = 0;
export const PLAYER_SPREAD_MAX = PLAYER_RATE_RUNGS;

/**
 * The most rungs one change may travel from the rate it is on. One steps to a neighbouring rate
 * and never further, so a pattern slides; the whole ladder may leap anywhere inside the spread,
 * which is what the uniform draw this replaced always did. It is `distance` a rung down, and it
 * is bounded by the spread rather than by itself.
 */
export const PLAYER_DRIFT_MIN = 1;
export const PLAYER_DRIFT_MAX = PLAYER_RATE_RUNGS;

/**
 * How far the ladder moves between one repeat of a landing and the next, in rungs. Zero is a
 * landing that reads at one rate for its whole length, which is every landing the module played
 * before it could climb — so a switch pressed today sounds like a switch pressed before 0167.
 *
 * Signed, because an arpeggio that could only rise would be half an idea: below zero each repeat
 * reads slower than the one before it. Whole and bounded by the ladder's own reach, like the
 * drift it is the inside-a-landing twin of — a climb of four crosses the whole spread in one
 * repeat, which is the arpeggio a hand asks for when it wants an interval rather than a slide.
 */
export const PLAYER_CLIMB_MIN = -PLAYER_RATE_RUNGS;
export const PLAYER_CLIMB_MAX = PLAYER_RATE_RUNGS;

/**
 * The five fields of a `PlayerSpec` the read rate is shaped by, declared here because this is
 * what the rate walk is — the same arrangement `RestSpec`, `FigureSpec` and `TravelSpec` have,
 * and for the same reason (src/lib/playerRest.ts).
 */
export type RateSpec = {
  /** How many jumps hold one read rate before a new one is drawn. Whole; zero holds one forever. */
  hold: number;
  /** The odds a due change fires, 0…1. */
  chance: number;
  /** How far from the deck's own rate a rate may sit, in rungs, 0…PLAYER_RATE_RUNGS. Whole. */
  spread: number;
  /** The most rungs one change may travel, 1…PLAYER_RATE_RUNGS. Whole. */
  drift: number;
  /**
   * How far the ladder moves between the repeats of one landing, in rungs,
   * PLAYER_CLIMB_MIN…PLAYER_CLIMB_MAX. Whole; zero reads the whole landing at one rate.
   */
  climb: number;
};

/**
 * The ladder one landing climbs: the ratio each of its repeats reads at, in order, starting from
 * the rung the walk let it go onto and moving `climb` rungs per repeat inside the spread.
 *
 * One array rather than one number, because the whole of what P124 moves is that a rate no longer
 * stands still for a landing: the transport writes each of these onto the landing's own source at
 * that repeat's boundary, and the cursor sums the repeats it has finished at the rungs they were
 * read at rather than multiplying by one rate (src/audio/player.ts, 0167).
 *
 * A spread of zero is the one setting that silences a climb — there is nowhere on the ladder to go,
 * which is the answer `drawRung` already gives. Every other pairing of the two dials moves.
 */
export function climbRungs(rung: number, repeats: number, climb: number, spread: number): number[] {
  const rungs: number[] = [];
  let at = rung;
  let step = climb;
  for (let repeat = 0; repeat < repeats; repeat++) {
    rungs.push(PLAYER_RATES[PLAYER_RATE_UNITY + at] ?? 1);
    // A step that would leave the window turns round instead, and one that would overshoot the far
    // end lands on it. Which is why this is walked rather than computed: a triangle over the window
    // is the same shape until the step is half its period, and there it stands still — a climb of
    // four inside a spread of two would be every repeat at unity, the dial at its own maximum doing
    // nothing. Turning round and landing on the end has no such pair: past the first repeat the
    // ladder alternates between the two ends, which is the widest interval the spread allows and
    // exactly what a climb that large is asking for.
    const ahead = at + step;
    if (ahead > spread || ahead < -spread) step = -step;
    at = Math.max(-spread, Math.min(spread, at + step));
  }
  return rungs;
}
