/**
 * @role The draws one step of the pattern is made of: where a rate change lands, how long a
 *   landing sounds, which count the next hold is kept at, how far one leaning move goes and which
 *   way, and how long the walk waits before the next jump. One function per amount a step carries,
 *   each a pure function of the stream it is handed — no cursor, no clock and no spec beyond the
 *   voice it is drawn from.
 * @instead The walk that calls them, in the order that order is the contract of, and the step they
 *   are drawn onto → src/lib/playerWalk.ts. Split off when that file reached the hard 800-line
 *   cap, where no waiver reaches (0045, the reason src/audio/playerGrid.ts is where it is). The
 *   ground `leanStep` is spent over one grid up, and the three words it is handed there →
 *   src/lib/playerBed.ts; the session's own, drawn by the same move → src/lib/sessionGround.ts.
 *   The figure that keeps a run of these → src/lib/playerFigure.ts.
 */
import { PLAYER_BURST_MIN, type PlayerVoice } from "./player.ts";
import { PLAYER_REPEATS_MAX, PLAYER_REPEATS_MIN } from "./playerRepeats.ts";
import { restIsPlaced } from "./playerRest.ts";

/**
 * Where a rate change lands, in rungs from unity: uniform over the rungs the drift can reach and
 * the spread allows, with the one it is already on taken out — so a change always changes
 * something, and neither end of the ladder is over-represented the way clamping a leap into range
 * would make it (0118).
 *
 * `rung` is always inside `[-spread, spread]`: a walk starts at zero, zero is inside every spread,
 * and every draw lands in the window. So `hi - lo` counts the reachable rungs exactly once the
 * current one is removed, and the shift below turns a pick at or above it into the rung past it.
 */
export function drawRung(
  random: () => number,
  rung: number,
  spread: number,
  drift: number,
): number {
  const lo = Math.max(-spread, rung - drift);
  const hi = Math.min(spread, rung + drift);
  const reach = hi - lo;
  // A spread of zero: there is nowhere to go, and holding the deck's own rate is the point of it.
  if (reach <= 0) return rung;
  const pick = lo + Math.floor(random() * reach);
  return pick >= rung ? pick + 1 : pick;
}

/**
 * How long one landing sounds: the burst, strayed by as much as `vary` either way — on the
 * landings the chance lets stray. A spec that never varies rolls nothing, so the stream it lays
 * down is the one it laid before the chance existed (P87).
 */
export function drawBurst(random: () => number, spec: PlayerVoice): number {
  const stray = spec.vary > 0 && random() < spec.varyChance ? spec.vary : 0;
  return Math.max(PLAYER_BURST_MIN, spec.burst + stray * (2 * random() - 1));
}

/**
 * Which count the next hold is kept at: uniform over the whole numbers within `repeatsSpread` of
 * the dial, clipped to the range the dial itself has. Called only where the spread is above zero,
 * so the window always holds at least two counts. Clipped rather than wrapped, so a spread
 * wider than the room below the dial simply reaches the floor — and drawn fresh rather than
 * travelled from the count it is on, which is why there is no drift beside it (0135).
 */
export function drawRepeats(random: () => number, spec: PlayerVoice): number {
  const lo = Math.max(PLAYER_REPEATS_MIN, spec.repeats - spec.repeatsSpread);
  const hi = Math.min(PLAYER_REPEATS_MAX, spec.repeats + spec.repeatsSpread);
  return lo + Math.floor(random() * (hi - lo + 1));
}

/**
 * The four amounts one leaning move is drawn under, whatever grid it is a move over. The jump's
 * own four are `TravelSpec`; the bed's are three of them and no stride (0183).
 */
export type Lean = { distance: number; bias: number; stride: number; home: number };

/**
 * How far one leaning move goes and which way, or **null** where it comes home instead — the one
 * piece of arithmetic this module moves by, spent by the jump over the loop's sixteen slots and by
 * the bed over the source's sixteenths of one (0185). Signed and unwrapped: what a move lands on is the
 * caller's, because the two grids wrap at different widths and one of them does not wrap here at
 * all (`bedWrap`, src/lib/playerBed.ts).
 *
 * The draws, in this order and no other: the home roll, taken only above zero and short-circuiting
 * the rest, because coming home is *instead of* travelling and not a travel of its own; then the
 * stride's, again only above zero; then the distance; then the side. A caller with no stride dial
 * passes zero, which is the value that rolls nothing — the same reading `PLAYER_STRIDE_MIN` has, so
 * a bed's walk is a jump's walk with one amount it does not offer (0134, 0162).
 *
 * **The order is the contract.** A pattern is a pure function of its seed, so moving a draw here
 * would re-derive every tail in every stored session (0089, 0096).
 */
export function leanStep(random: () => number, lean: Lean): number | null {
  if (lean.home > 0 && random() < lean.home) return null;
  const far =
    lean.stride > 0 && random() < lean.stride
      ? lean.distance
      : 1 + Math.floor(random() * lean.distance);
  return random() < (1 - lean.bias) / 2 ? -far : far;
}

/**
 * How long the pattern waits before the next jump, in slots — from whichever of the field's two
 * authors is live (0163). `placed` is what the pattern says about this jump, and where it is
 * placing them the two rolled amounts are not read and no draw is taken: a placed pattern leaves
 * the walk's stream exactly where it found it, which is what makes it the author rather than a
 * third amount the roll consults.
 *
 * Rolled instead: the rest, taken on the jumps the chance allows and strayed by as much as
 * `restSpread` either way. A pattern that never rests rolls nothing whichever author is live. A
 * refused wait is zero rather than a shorter one — the whole of what "no wait" means here is the
 * steps butting up, which is what a rest of zero already gives (P87).
 */
export function drawRest(random: () => number, spec: PlayerVoice, placed: boolean): number {
  if (spec.rest === 0) return 0;
  if (restIsPlaced(spec)) return placed ? spec.rest : 0;
  if (random() >= spec.restChance) return 0;
  return spec.rest * (1 + spec.restSpread * (2 * random() - 1));
}
